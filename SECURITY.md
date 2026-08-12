# Security policy

## Reporting a vulnerability

Report privately — do not open a public issue.

- GitHub private advisories: **Security → Report a vulnerability** on this
  repository.
- Email: boni.alessandro997@gmail.com

Expect an acknowledgement within 3 working days and an assessment within
10.

## What this repository is

A Claude Code skill: markdown instructions, reference documents,
templates and browser demos. It ships no service and stores no data. The
attack surface is what runs on a user's machine or in their browser.

## Scope

- **`install.sh` / `install.ps1`** — the only code that runs on a user's
  machine with their permissions. The README advertises the
  `curl … | sh` pattern, so a compromise of this repository would run on
  every installer. Both scripts clone into
  `${CLAUDE_SKILLS_DIR:-~/.claude/skills}/awwwards` and touch nothing
  outside it, refuse to overwrite a non-git directory, and update with
  `git pull --ff-only` so a force-push upstream cannot rewrite a local
  checkout silently. `test/structure.test.js` pins these properties.
- **`assets/templates/`** — starter code that users copy into their own
  projects. A defect here propagates into their sites.
- **`docs/demos/`** — WebGL and scroll demos published on GitHub Pages.
  They render no user input.

## Verifying an install

The installer prints the short commit it checked out. Compare it against
this repository before trusting a fresh install:

```sh
git -C ~/.claude/skills/awwwards rev-parse --short HEAD
```

To skip the piped-shell pattern entirely, clone directly:

```sh
git clone --depth 1 https://github.com/SandroHub013/awwwards-skill.git \
  ~/.claude/skills/awwwards
```

## Secrets

No credentials are tracked. CI asserts that no `.env`, `.pem`, `.p12` or
`id_rsa` file is ever committed.

## Supported versions

The `main` branch is the only supported version.
