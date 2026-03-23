param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubUsername,

  [string]$RepoName = "technodrome"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

if (-not (Test-Path ".github/workflows/deploy-geneva-pages.yml")) {
  throw "Missing workflow file: .github/workflows/deploy-geneva-pages.yml"
}

$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
$existingRemote = (git remote get-url origin 2>$null)

if (-not $existingRemote) {
  git remote add origin $remoteUrl
} elseif ($existingRemote -ne $remoteUrl) {
  git remote set-url origin $remoteUrl
}

git add .

$hasStaged = git diff --cached --name-only
if ($hasStaged) {
  git commit -m "Deploy Geneva page via GitHub Pages"
}

git push -u origin main

Write-Host "Published. URL:" -ForegroundColor Green
Write-Host "https://$GitHubUsername.github.io/$RepoName/geneva-heart-breaker.html" -ForegroundColor Cyan
