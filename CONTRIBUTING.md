# Contributing

Issues and PRs welcome. What this file adds to the README's Contributing section is the
repo-specific conventions: how references are written, what has to stay in sync, and what
gets rejected.

## Ground rules

1. **Verifiable claims only.** Award thresholds, rubric weights, library versions and
   browser support must be checkable — cite the source in the PR. This repo's own doctrine
   is "measure, do not guess" (`references/15-audit.md`); it applies to contributions too.
2. **Dense prose.** These files are loaded into an agent's context window. Every line
   costs tokens and competes with the user's code. If a sentence doesn't change what the
   agent builds, delete it.
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
- [ ] `docs/og.png` — regenerate if the reference count changed. 1200×630, brand tokens
      from `docs/styles.css`. No generator is committed; match the existing card's layout
- [ ] `assets/checklists/pre-flight.md` — if the change adds a shippable requirement
- [ ] `assets/templates/README.md` — if templates are affected

Both entries above that cite an issue number are there because the repo actually shipped
that mistake. Add to this list the same way: after something breaks, not from memory.

## Commits and PRs

- Conventional Commits, as in the history: `feat(references):`, `fix(docs):`,
  `docs(templates):`, `chore:`. Imperative, lowercase after the colon.
- One concern per PR. A scoring correction and a new template are two PRs.
- Link the issue (`Closes #N`). No issue? For small fixes the PR body alone is fine.
- Templates and example code must run. "Working templates" is the claim; keep it true.

## What will be rejected

- Unverifiable scoring claims ("jurors love X") without a source
- New dependencies in templates without a doctrine reason
- Style-only reformatting of references (line-ending and whitespace noise)
- Anything that reads like it was generated and pasted — this repo's readers will notice
  faster than any jury
