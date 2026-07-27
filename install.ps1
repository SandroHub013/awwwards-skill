# Install the "awwwards" Claude Code skill.
#
#   irm https://raw.githubusercontent.com/SandroHub013/awwwards-skill/main/install.ps1 | iex
#
# Re-running updates an existing install. Nothing outside
# ~\.claude\skills\awwwards is touched. Uninstall with:
#   Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\skills\awwwards"

$ErrorActionPreference = 'Stop'

$repo = 'https://github.com/SandroHub013/awwwards-skill.git'
$root = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $env:USERPROFILE '.claude\skills' }
$dest = Join-Path $root 'awwwards'

Write-Host ''
Write-Host '  awwwards skill'
Write-Host "  -> $dest"
Write-Host ''

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host '  git is required. Install git, or download the ZIP:' -ForegroundColor Red
  Write-Host '  https://github.com/SandroHub013/awwwards-skill/archive/refs/heads/main.zip'
  exit 1
}

if ((Test-Path $dest) -and -not (Test-Path (Join-Path $dest '.git'))) {
  Write-Host "  $dest exists and is not a git checkout." -ForegroundColor Red
  Write-Host '  Move or remove it first, then re-run.'
  exit 1
}

if (Test-Path (Join-Path $dest '.git')) {
  Write-Host '  updating...'
  git -C $dest pull --ff-only --quiet
} else {
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  Write-Host '  cloning...'
  git clone --depth 1 --quiet $repo $dest
}

$version = (git -C $dest rev-parse --short HEAD)

Write-Host ''
Write-Host "  installed  ($version)" -ForegroundColor Green
Write-Host ''
Write-Host '  Restart Claude Code, or run /reload-skills, then:'
Write-Host ''
Write-Host '    /awwwards                      read the workflow'
Write-Host '    "build me an awwwards-level site for ..."'
Write-Host '    "score my site against Awwwards criteria"'
Write-Host ''
Write-Host '  Docs   https://sandrohub013.github.io/awwwards-skill/'
Write-Host '  Update re-run this command'
Write-Host "  Remove Remove-Item -Recurse -Force `"$dest`""
Write-Host ''
