$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Join-Path $root "native\PomodoroLite.cs"
$dist = Join-Path $root "dist-lite"
$output = Join-Path $dist "PomodoroLite.exe"
$compiler = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $compiler)) {
  $compiler = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $compiler)) {
  throw "C# compiler not found."
}

New-Item -ItemType Directory -Force $dist | Out-Null

& $compiler `
  /nologo `
  /target:winexe `
  /optimize+ `
  /codepage:65001 `
  /out:$output `
  /reference:System.dll `
  /reference:System.Core.dll `
  /reference:System.Drawing.dll `
  /reference:System.Windows.Forms.dll `
  $source

$launcher = Join-Path $root "start-pomodoro-lite.bat"
$launcherContent = @"
@echo off
cd /d "%~dp0"
start "" "%~dp0dist-lite\PomodoroLite.exe"
"@
Set-Content -LiteralPath $launcher -Value $launcherContent -Encoding ASCII

Write-Host "Lite executable:" $output
Write-Host "Launcher:" $launcher
