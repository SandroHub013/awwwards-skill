#!/usr/bin/env sh
# Install the "awwwards" Claude Code skill.
#
#   curl -fsSL https://raw.githubusercontent.com/SandroHub013/awwwards-skill/main/install.sh | sh
#
# Re-running updates an existing install. Nothing outside ~/.claude/skills/awwwards
# is touched. Uninstall with:  rm -rf ~/.claude/skills/awwwards

set -eu

REPO="https://github.com/SandroHub013/awwwards-skill.git"
NAME="awwwards"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/$NAME"

printf '\n  awwwards skill\n  → %s\n\n' "$DEST"

if ! command -v git >/dev/null 2>&1; then
  echo "  git is required. Install git, or download the ZIP:" >&2
  echo "  https://github.com/SandroHub013/awwwards-skill/archive/refs/heads/main.zip" >&2
  exit 1
fi

if [ -e "$DEST" ] && [ ! -d "$DEST/.git" ]; then
  echo "  $DEST exists and is not a git checkout." >&2
  echo "  Move or remove it first, then re-run." >&2
  exit 1
fi

if [ -d "$DEST/.git" ]; then
  echo "  updating…"
  git -C "$DEST" pull --ff-only --quiet
else
  mkdir -p "$(dirname "$DEST")"
  echo "  cloning…"
  git clone --depth 1 --quiet "$REPO" "$DEST"
fi

VERSION=$(git -C "$DEST" rev-parse --short HEAD)

cat <<EOF

  installed  (${VERSION})

  Restart Claude Code, or run /reload-skills, then:

    /awwwards                      read the workflow
    "build me an awwwards-level site for …"
    "score my site against Awwwards criteria"

  Docs   https://sandrohub013.github.io/awwwards-skill/
  Update re-run this command
  Remove rm -rf "$DEST"

EOF
