# Validate Musomo Tracker Windows NSIS build artifacts.
$ErrorActionPreference = "Stop"

$expectedVersion = "1.0.21"
$bundleDir = Join-Path $PSScriptRoot ".." "src-tauri" "target" "release" "bundle"
$releaseDir = Join-Path $PSScriptRoot ".." "src-tauri" "target" "release"
$nsisDir = Join-Path $bundleDir "nsis"

Write-Host "Validating Windows build artifacts..."
Write-Host "Bundle root: $bundleDir"

if (-not (Test-Path $bundleDir)) {
  throw "Bundle directory not found: $bundleDir"
}

$installers = @()
if (Test-Path $nsisDir) {
  $installers += Get-ChildItem -Path $nsisDir -Filter "*.exe" -File
}

if ($installers.Count -eq 0) {
  throw "No NSIS installer (.exe) found in $nsisDir"
}

$installer = $installers | Sort-Object Length -Descending | Select-Object -First 1
Write-Host "Installer: $($installer.FullName)"
Write-Host "Installer size: $($installer.Length) bytes"

if ($installer.Length -le 0) {
  throw "Installer file is empty."
}

if ($installer.Name -notmatch "x64|64") {
  throw "Installer name does not indicate x64 architecture: $($installer.Name)"
}

if ($installer.Name -notmatch $expectedVersion) {
  throw "Installer name does not include version $expectedVersion : $($installer.Name)"
}

$appExe = @(
  Get-ChildItem -Path (Join-Path $bundleDir "exe") -Filter "*.exe" -File -ErrorAction SilentlyContinue
  Get-ChildItem -Path $releaseDir -Filter "musomo-tracker.exe" -File -ErrorAction SilentlyContinue
  Get-ChildItem -Path $releaseDir -Filter "Musomo Tracker.exe" -File -ErrorAction SilentlyContinue
) | Where-Object { $_ -and $_.Name -notmatch "setup" } | Select-Object -First 1

if (-not $appExe) {
  throw "Application executable not found under $releaseDir or bundle/exe"
}

Write-Host "Application exe: $($appExe.FullName)"
Write-Host "Application exe size: $($appExe.Length) bytes"

if ($appExe.Length -le 0) {
  throw "Application executable is empty."
}

$productVersion = (Get-Item $appExe.FullName).VersionInfo.ProductVersion
Write-Host "Product version: $productVersion"

if ($productVersion -notmatch "^$expectedVersion") {
  throw "Unexpected product version '$productVersion' (expected $expectedVersion)."
}

Write-Host "Windows artifact validation passed."
