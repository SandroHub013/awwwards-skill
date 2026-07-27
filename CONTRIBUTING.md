# Contributing

Issues and PRs welcome. What this file adds to the README's Contributing section is the
repo-specific conventions: what to work on, how contributions are formatted, what has to
stay in sync, and what gets rejected.

## Where to contribute

The repo's value is accuracy, so corrections outrank additions. In priority order:

**Always welcome — the issue is a formality here: title plus source, then open the PR:**

- **Corrections with a primary source.** Scoring thresholds, rubric weights, browser
  support, library versions, API behavior. Cite the spec, MDN BCD, caniuse or the
  project changelog in the PR. A claim that can't be sourced can't go in — this repo's
  own doctrine is "measure, do not guess" (`references/15-audit.md`).
- **Audit steps that catch a real failure.** Something `references/15-audit.md` or
  `assets/checklists/pre-flight.md` misses that actually cost a site points or a
  submission. Name the concrete failure, not the category ("fonts swap after the hero
  measures, shifting the pinned scene", not "improve CLS checks").
- **Idea cards** in `references/inspiration/` — dissect a current awarded site into
  transferable reasoning, following `references/18-deepdive.md`. Evidence, not adjectives.
- **Newer library versions** in `references/06-stack.md`, with the release that changed
  the recommendation linked.

**Open an issue first — these are rejected as drive-by PRs:**

- New references, new templates, new workflow phases.
- New dependencies or stack recommendations.
- Additional art-direction registers for `references/02-concept.md`.
- Anything that changes the scoring model in `references/01-scoring.md`.

**Not wanted:**

- Translations. These files are loaded into an agent's context window; English only.
- Tooling: linters, CI, formatters, GitHub Actions. The repo is dense prose plus
  runnable templates and stays clone-and-read.
- Changelogs, badges, roadmap files. Git history is the changelog.

## Ground rules

1. **Verifiable claims only.** Award thresholds, rubric weights, library versions and
   browser support must be checkable — cite the source in the PR.
2. **Dense prose.** Every line costs tokens and competes with the user's code. If a
   sentence doesn't change what the agent builds, delete it.
3. **Practitioner voice.** Write like the person who was paged for the mistake, not like
   a tutorial. "Two RAF loops (Lenis + your own) causing DOM/canvas desync", not
   "You should consider avoiding multiple animation loops".
4. **No placeholder content, no AI slop.** The repo exists to kill both; a contribution
   containing either is a contradiction.

## Reference conventions

References live in `references/NN-name.md`, numbered in workflow order. When adding or
editing one:

- **Length**: ~100–200 lines. Long enough to be decisive, short enough to be loaded whole.
- **Structure**: doctrine first (the *why*, as rules), then recipes/budgets (tables,
  commands, code), then anti-patterns last. Cross-link sibling references with relative
  paths (`references/11-performance.md`).
- **Gating**: every reference gets a "Read when" row in the SKILL.md reference map, so
  agents load it only in the right phase. If the reference is conditional (like
  `08-webgl.md` or `17-video.md`), say what condition triggers it.

## Formatting

- **Prose wraps at 100 columns.** Code blocks and tables may exceed it; prose may not.
- **Headings**: ATX (`##`), sentence case, no trailing punctuation. One `#` per file.
- **Tables for facts.** Budgets, versions, thresholds, support matrices, checklists — if
  it's a list of facts, it's a table, not prose. If it's an argument, it's prose, not
  bullets.
- **Fenced code always carries a language** (`css`, `ts`, `bash`, `glsl`, `html`). Code
  in references must be copy-paste runnable, not pseudo-code.
- **No HTML, no images, no emoji** in references. Markdown that renders as plain text
  without loss, because that is how agents read it.
- **Relative links** between repo files (`references/11-performance.md`,
  `assets/checklists/pre-flight.md`), absolute URLs only for external sources.
- American English, present tense, imperative mood for rules.

## The sync checklist

Adding, renaming or removing a reference touches more than one file:

- [ ] `SKILL.md` — reference map row, plus the workflow phase text that points to it
- [ ] `README.md` — the reference table, and the count in the intro line and in
      "What you get". This is the file readers see first, and the one that has already
      gone stale once (#5)
- [ ] `docs/index.html` — refs grid card, section heading count, meta description count
- [ ] `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — the description
      if it quotes a count, **and bump `version`**. Claude Code only ships updates to
      plugin installs when that field changes, so forgetting it silently pins every plugin
      user to the previous snapshot (#8). Clone and one-liner installs are unaffected,
      which is exactly why this one goes unnoticed
- [ ] `docs/og.png` — only if the card's copy changed. It deliberately quotes no counts,
      so a new reference does not touch it. Regenerate from `docs/og.html`, which carries
      the recipe in a comment and pulls the brand tokens from `docs/styles.css`
- [ ] `assets/checklists/pre-flight.md` — if the change adds a shippable requirement
- [ ] `assets/templates/README.md` — if templates are affected

Both entries above that cite an issue number are there because the repo actually shipped
that mistake. Add to this list the same way: after something breaks, not from memory.

## Commits, tags and PRs

- **Conventional Commits**, imperative, lowercase after the colon. Scopes in use:
  `references`, `docs`, `templates`, `plugin`, `webgl`, `checklists`. A change that needs
  a new scope probably needs an issue first.
- **One concern per PR.** A scoring correction and a new template are two PRs. Two
  corrections of the same class, found in one pass, are one PR.
- **PR title = the commit message** it will be squash-merged as. The body carries: the
  source for every factual claim, the checks run, and before/after output for anything
  user-visible. Templates and example code must run — "working templates" is the claim;
  keep it true.
- **Every PR closes an issue** (`Closes #N`). No issue, no review: the issue decides
  "should this exist?"; the PR only decides "is this done right?".
- **Labels**: `bug` for wrong facts and broken templates, `enhancement` for new
  references/templates/registers, `documentation` for prose that isn't either.
  Maintainers apply them; don't open a PR to ask for one.
- **Versioning is semver**, bumped in both `.claude-plugin/*.json` files:
  - *patch* — corrections, template fixes, support-table updates
  - *minor* — new reference, template, register or idea card
  - *major* — workflow or scoring-model changes
- **On merge of a version bump, the merge commit gets tagged `vX.Y.Z`** (no tags exist
  yet; the first bump after this file lands starts the practice). Tags are what make a
  plugin version installable by reference instead of by branch.

## What will be rejected

- Unverifiable scoring claims ("jurors love X") without a source
- New dependencies in templates without a doctrine reason
- Style-only reformatting of references (line-ending and whitespace noise)
- PRs that mix concerns, or that restructure what they were asked to fix
- Anything that reads like it was generated and pasted — this repo's readers will notice
  faster than any jury
