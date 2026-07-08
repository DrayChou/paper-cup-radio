$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$desktopRoot = Split-Path $PSScriptRoot -Parent
$liteRoot = Join-Path $desktopRoot 'dist\release-preview-lite'
$liteDir = Join-Path $liteRoot 'PaperCupRadioLite'

Set-Location $repoRoot
npm run build

if (Test-Path $liteRoot) {
  Remove-Item -Recurse -Force $liteRoot
}
New-Item -ItemType Directory -Force -Path $liteDir | Out-Null

deno compile --sloppy-imports --node-modules-dir=manual --allow-net --allow-read --allow-write --allow-run --allow-env --allow-sys --output (Join-Path $liteDir 'server-lite.exe') .\src\server.ts
Copy-Item .\desktop-host\lite-launcher.bat (Join-Path $liteDir 'PaperCupRadioLite.bat') -Force
Copy-Item .\public (Join-Path $liteDir 'public') -Recurse -Force

$zipPath = Join-Path $liteRoot 'PaperCupRadioLite-windows.zip'
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -Path (Join-Path $liteDir '*') -DestinationPath $zipPath -Force

Get-ChildItem -Recurse $liteRoot | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
