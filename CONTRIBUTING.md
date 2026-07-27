# Contributing

Issues and PRs welcome, especially: corrections to the scoring facts, newer library
versions, additional art-direction registers, and audit steps that catch something the
current pass misses.

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
- [ ] `docs/index.html` — refs grid card, section heading count, meta description count
- [ ] `docs/og.png` — regenerate if the reference count changed (see the file's history
      for the recipe: 1200×630, brand tokens from `docs/styles.css`)
- [ ] `assets/checklists/pre-flight.md` — if the change adds a shippable requirement
- [ ] `assets/templates/README.md` — if templates are affected

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
