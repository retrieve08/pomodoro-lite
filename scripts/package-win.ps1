$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$electronCandidates = @(
  (Join-Path $root "node_modules\electron\dist"),
  (Join-Path $root "vendor\electron")
)
$electronSource = $null
$srcSource = Join-Path $root "src"
$packageSource = Join-Path $root "package.json"
$distRoot = Join-Path $root "dist"
$appDist = Join-Path $distRoot "Pomodoro"
$resourcesApp = Join-Path $appDist "resources\app"
$exeName = "Pomodoro.exe"

foreach ($candidate in $electronCandidates) {
  if (Test-Path (Join-Path $candidate "electron.exe")) {
    $electronSource = $candidate
    break
  }
}

if (-not $electronSource) {
  throw "Electron runtime not found. Run npm install first, or provide vendor\electron\electron.exe."
}

$resolvedRoot = [System.IO.Path]::GetFullPath($root)
$resolvedDist = [System.IO.Path]::GetFullPath($appDist)
if (-not $resolvedDist.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write outside the workspace."
}

if (Test-Path $appDist) {
  Remove-Item -LiteralPath $appDist -Recurse -Force
}

New-Item -ItemType Directory -Force $appDist | Out-Null
Get-ChildItem -LiteralPath $electronSource -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $appDist -Recurse -Force
}

Rename-Item -LiteralPath (Join-Path $appDist "electron.exe") -NewName $exeName

New-Item -ItemType Directory -Force $resourcesApp | Out-Null
Copy-Item -LiteralPath $srcSource -Destination $resourcesApp -Recurse -Force
Copy-Item -LiteralPath $packageSource -Destination $resourcesApp -Force

$launcher = Join-Path $root "start-pomodoro.bat"
$launcherContent = @"
@echo off
cd /d "%~dp0"
start "" "%~dp0dist\Pomodoro\Pomodoro.exe"
"@
Set-Content -LiteralPath $launcher -Value $launcherContent -Encoding ASCII

Write-Host "Packaged app:" $appDist
Write-Host "Executable:" (Join-Path $appDist $exeName)
Write-Host "Launcher:" $launcher
