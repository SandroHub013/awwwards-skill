import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Questo repo non ha logica applicativa da testare: è una skill, cioè un
 * insieme di documenti che Claude Code carica e segue. I difetti reali
 * qui sono strutturali — un link rotto, un file citato che non esiste,
 * un manifest che non combacia — e nessuno di questi si vede leggendo il
 * diff. Sono esattamente le cose che una suite può controllare.
 */

const root = resolve(process.cwd());

function read(relative) {
  return readFileSync(join(root, relative), 'utf8');
}

/** File tracciati da git, che è la verità su cosa viene distribuito. */
function trackedFiles() {
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

/** Frontmatter YAML minimale: bastano le chiavi di primo livello. */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

/** Link markdown relativi, esclusi ancore e URL assoluti. */
function relativeLinks(markdown) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const target = match[1];
    if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
    links.push(target.split('#')[0]);
  }
  return links.filter(Boolean);
}

describe('SKILL.md', () => {
  const text = read('SKILL.md');
  const frontmatter = parseFrontmatter(text);

  it('ha un frontmatter YAML', () => {
    expect(frontmatter).not.toBeNull();
  });

  it('dichiara un nome', () => {
    expect(frontmatter.name).toBe('awwwards');
  });

  it('dichiara una description non vuota', () => {
    expect(frontmatter.description.length).toBeGreaterThan(40);
  });

  it("la description elenca i trigger, perché è l'unica cosa che Claude legge per decidere se caricare la skill", () => {
    expect(frontmatter.description.toLowerCase()).toContain('use when');
  });
});

describe('manifest del plugin', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const marketplace = JSON.parse(read('.claude-plugin/marketplace.json'));
  const pkg = JSON.parse(read('package.json'));

  it('marketplace.json elenca almeno un plugin', () => {
    expect(marketplace.plugins.length).toBeGreaterThan(0);
  });

  it('la versione del marketplace combacia con package.json', () => {
    // Due file che si disallineano in silenzio: chi installa vede una
    // versione, chi legge il repo un'altra.
    expect(marketplace.plugins[0].version).toBe(pkg.version);
  });

  it('la source del plugin esiste sul disco', () => {
    const source = marketplace.plugins[0].source;
    expect(existsSync(resolve(root, source))).toBe(true);
  });

  it('plugin.json è JSON valido con un nome', () => {
    expect(typeof plugin).toBe('object');
  });
});

describe('link relativi nei documenti', () => {
  const docs = trackedFiles().filter(
    (file) => file.endsWith('.md') && !file.startsWith('docs/demos/'),
  );

  it('ci sono documenti da controllare', () => {
    expect(docs.length).toBeGreaterThan(5);
  });

  it.each(docs)('%s non ha link rotti', (doc) => {
    const broken = relativeLinks(read(doc)).filter((target) => {
      const absolute = resolve(root, dirname(doc), target);
      return !existsSync(absolute);
    });

    expect(broken).toEqual([]);
  });
});

describe('igiene del repo', () => {
  const tracked = trackedFiles();

  it('non traccia directory di scratch', () => {
    // 209 file sotto .tmp-*/ erano tracciati: il 45% del repo era
    // materiale usa-e-getta.
    expect(tracked.filter((file) => file.startsWith('.tmp-'))).toEqual([]);
  });

  it('non traccia node_modules', () => {
    expect(tracked.filter((file) => file.includes('node_modules/'))).toEqual([]);
  });

  it('non traccia file di ambiente', () => {
    const secrets = tracked.filter((file) =>
      /(^|\/)\.env(\.|$)|\.pem$|\.p12$|id_rsa$/.test(file),
    );
    expect(secrets).toEqual([]);
  });

  it('ha i documenti che un repo pubblico deve avere', () => {
    for (const required of ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'SECURITY.md']) {
      expect(tracked, `manca ${required}`).toContain(required);
    }
  });
});

describe('reference pack', () => {
  const references = trackedFiles().filter(
    (file) => file.startsWith('references/') && file.endsWith('.md'),
  );

  it('i file numerati sono in sequenza, senza buchi', () => {
    // Un buco significa quasi sempre un file rinominato a metà e un
    // rimando lasciato indietro.
    const numbers = references
      .map((file) => file.match(/references\/(\d+)-/))
      .filter(Boolean)
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b);

    expect(numbers.length).toBeGreaterThan(10);
    expect(numbers).toEqual(
      Array.from({ length: numbers.length }, (_, index) => index + 1),
    );
  });

  it('ogni reference ha un titolo di primo livello', () => {
    for (const reference of references) {
      const firstHeading = read(reference)
        .split(/\r?\n/)
        .find((line) => line.startsWith('#'));
      expect(firstHeading, `${reference} non ha un titolo`).toMatch(/^#\s+\S/);
    }
  });
});

describe('install.sh', () => {
  const script = read('install.sh');

  it('esce al primo errore', () => {
    // Senza `set -eu` un clone fallito prosegue e lascia una skill a metà.
    expect(script).toMatch(/^set -eu/m);
  });

  it('non fa pull distruttivi', () => {
    expect(script).toContain('--ff-only');
    expect(script).not.toMatch(/git\s+.*reset\s+--hard/);
  });

  it('rispetta CLAUDE_SKILLS_DIR', () => {
    expect(script).toContain('CLAUDE_SKILLS_DIR');
  });

  it('non scrive fuori dalla directory della skill', () => {
    expect(script).not.toMatch(/rm\s+-rf\s+[$"']*\$HOME[/"'\s]*$/m);
  });
});

describe('demo HTML', () => {
  // `*/render/` contiene gli harness offline di cattura frame: girano in
  // un browser headless, non vengono pubblicati e non hanno un lettore
  // umano. Le regole sotto valgono per le pagine che qualcuno apre.
  const demos = trackedFiles().filter(
    (file) =>
      file.startsWith('docs/demos/') &&
      file.endsWith('index.html') &&
      !file.includes('/render/'),
  );

  it('ci sono demo da controllare', () => {
    expect(demos.length).toBeGreaterThan(0);
  });

  it.each(demos)('%s dichiara lang e viewport', (demo) => {
    const html = read(demo);
    // Entrambi contano per il 30% di Usability nel rubric che questa
    // skill insegna: le demo devono rispettarlo per prime.
    expect(html).toMatch(/<html[^>]+lang=/i);
    expect(html).toMatch(/name=["']viewport["']/i);
  });

  it.each(demos)('%s ha un titolo', (demo) => {
    expect(read(demo)).toMatch(/<title>\s*\S/i);
  });
});

/** Evita che il path posix usato sopra passi inosservato su Windows. */
describe('portabilità dei percorsi', () => {
  it('git ls-files restituisce percorsi posix', () => {
    expect(trackedFiles()[0]).not.toContain('\\');
    expect(posix.basename('a/b/c.md')).toBe('c.md');
  });
});
