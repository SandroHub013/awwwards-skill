# Install the "awwwards" skill for Antigravity and Claude Code.
#
#   irm https://raw.githubusercontent.com/SandroHub013/awwwards-skill/main/install.ps1 | iex
#
# By default, detects Antigravity (~/.agents/skills) and Claude Code (~/.claude/skills).
# If both or neither exist, installs to both.
# Target a specific agent with:
#   .\install.ps1 -Target antigravity
#   .\install.ps1 -Target claude
# Or via environment variables:
#   $env:AGENTS_SKILLS_DIR / $env:CLAUDE_SKILLS_DIR
#
# Re-running updates an existing install. Nothing outside destination directories
# is touched. Uninstall with:
#   Remove-Item -Recurse -Force "$env:USERPROFILE\.agents\skills\awwwards"
#   Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\skills\awwwards"

[CmdletBinding()]
param(
  [ValidateSet('all', 'antigravity', 'claude')]
  [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'

$repo = 'https://github.com/SandroHub013/awwwards-skill.git'
$name = 'awwwards'

$antigravityRoot = if ($env:AGENTS_SKILLS_DIR) { $env:AGENTS_SKILLS_DIR } else { Join-Path $env:USERPROFILE '.agents\skills' }
$claudeRoot      = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $env:USERPROFILE '.claude\skills' }

$dests = @()

if ($Target -eq 'antigravity') {
  $dests += Join-Path $antigravityRoot $name
} elseif ($Target -eq 'claude') {
  $dests += Join-Path $claudeRoot $name
} else {
  $hasAgents = (Test-Path $antigravityRoot) -or (Test-Path (Join-Path $env:USERPROFILE '.agents'))
  $hasClaude = (Test-Path $claudeRoot) -or (Test-Path (Join-Path $env:USERPROFILE '.claude'))

  if ($hasAgents -and -not $hasClaude) {
    $dests += Join-Path $antigravityRoot $name
  } elseif ($hasClaude -and -not $hasAgents) {
    $dests += Join-Path $claudeRoot $name
  } else {
    $dests += Join-Path $antigravityRoot $name
    $dests += Join-Path $claudeRoot $name
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host '  git is required. Install git, or download the ZIP:' -ForegroundColor Red
  Write-Host '  https://github.com/SandroHub013/awwwards-skill/archive/refs/heads/main.zip'
  exit 1
}

foreach ($dest in $dests) {
  Write-Host ''
  Write-Host '  awwwards skill'
  Write-Host "  -> $dest"
  Write-Host ''

  if ((Test-Path $dest) -and -not (Test-Path (Join-Path $dest '.git'))) {
    Write-Host "  $dest exists and is not a git checkout." -ForegroundColor Red
    Write-Host '  Move or remove it first, then re-run.'
    exit 1
  }

  $parent = Split-Path -Parent $dest
  if (Test-Path (Join-Path $dest '.git')) {
    Write-Host '  updating...'
    git -C $dest pull --ff-only --quiet
  } else {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Write-Host '  cloning...'
    git clone --depth 1 --quiet $repo $dest
  }

  $version = (git -C $dest rev-parse --short HEAD)

  Write-Host ''
  Write-Host "  installed  ($version)" -ForegroundColor Green
}

Write-Host ''
Write-Host '  Restart Antigravity or Claude Code (or run /reload-skills), then:'
Write-Host ''
Write-Host '    /awwwards                      read the workflow'
Write-Host '    "build me an awwwards-level site for ..."'
Write-Host '    "score my site against Awwwards criteria"'
Write-Host ''
Write-Host '  Docs   https://sandrohub013.github.io/awwwards-skill/'
Write-Host '  Update re-run this command'
Write-Host ''
