#!/usr/bin/env sh
# Install the "awwwards" skill for Antigravity and Claude Code.
#
#   curl -fsSL https://raw.githubusercontent.com/SandroHub013/awwwards-skill/main/install.sh | sh
#
# By default, detects Antigravity (~/.agents/skills) and Claude Code (~/.claude/skills).
# If both or neither exist, installs to both.
# Target a specific agent with:
#   TARGET=antigravity sh install.sh
#   TARGET=claude sh install.sh
# Or via environment variables:
#   AGENTS_SKILLS_DIR / CLAUDE_SKILLS_DIR
#
# Re-running updates an existing install. Nothing outside destination directories
# is touched. Uninstall with:
#   rm -rf ~/.agents/skills/awwwards
#   rm -rf ~/.claude/skills/awwwards

set -eu

REPO="https://github.com/SandroHub013/awwwards-skill.git"
NAME="awwwards"
TARGET="${TARGET:-all}"

AGENTS_ROOT="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
CLAUDE_ROOT="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

DESTS=""

if [ "$TARGET" = "antigravity" ]; then
  DESTS="$AGENTS_ROOT/$NAME"
elif [ "$TARGET" = "claude" ]; then
  DESTS="$CLAUDE_ROOT/$NAME"
else
  HAS_AGENTS=0
  HAS_CLAUDE=0
  [ -d "$AGENTS_ROOT" ] || [ -d "$HOME/.agents" ] && HAS_AGENTS=1
  [ -d "$CLAUDE_ROOT" ] || [ -d "$HOME/.claude" ] && HAS_CLAUDE=1

  if [ "$HAS_AGENTS" -eq 1 ] && [ "$HAS_CLAUDE" -eq 0 ]; then
    DESTS="$AGENTS_ROOT/$NAME"
  elif [ "$HAS_CLAUDE" -eq 1 ] && [ "$HAS_AGENTS" -eq 0 ]; then
    DESTS="$CLAUDE_ROOT/$NAME"
  else
    DESTS="$AGENTS_ROOT/$NAME
$CLAUDE_ROOT/$NAME"
  fi
fi

if ! command -v git >/dev/null 2>&1; then
  echo "  git is required. Install git, or download the ZIP:" >&2
  echo "  https://github.com/SandroHub013/awwwards-skill/archive/refs/heads/main.zip" >&2
  exit 1
fi

echo "$DESTS" | while IFS= read -r DEST; do
  [ -z "$DEST" ] && continue

  printf '\n  awwwards skill\n  → %s\n\n' "$DEST"

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
  echo "  installed  (${VERSION})"
done

cat <<EOF

  Restart Antigravity or Claude Code (or run /reload-skills), then:

    /awwwards                      read the workflow
    "build me an awwwards-level site for …"
    "score my site against Awwwards criteria"

  Docs   https://sandrohub013.github.io/awwwards-skill/
  Update re-run this command

EOF
