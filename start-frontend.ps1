param(
  [int]$Port = 9528,
  [string]$VerificationTarget = "http://127.0.0.1:8088",
  [string]$NodeHome = "D:\CodexData\ExternalProjects\Documents\Chainmaker front\tools\node-v16.20.2-win-x64"
)

$ErrorActionPreference = "Stop"
$npm = Join-Path $NodeHome "npm.cmd"
if (-not (Test-Path -LiteralPath $npm)) {
  throw "npm was not found at $npm. Install Node.js 16 or pass -NodeHome with a valid Node.js directory."
}

$env:Path = "$NodeHome;$env:Path"
$env:VUE_APP_VERIFICATION_TARGET = $VerificationTarget

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
  & $npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Set-Location -LiteralPath $PSScriptRoot
& $npm run dev -- --port $Port --no-open
exit $LASTEXITCODE
