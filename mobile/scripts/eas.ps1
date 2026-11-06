# Runs EAS CLI with the store credentials from the repo's .env.local (paths and IDs only;
# the key files themselves live outside the repo). Usage, from mobile/:
#   .\scripts\eas.ps1 build --platform ios --profile production --auto-submit
param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $EasArgs)

$envFile = Join-Path $PSScriptRoot '..\..\.env.local'
if (-not (Test-Path $envFile)) { throw ".env.local not found at $envFile" }

$wanted = 'EXPO_TOKEN', 'ASC_API_KEY_PATH', 'ASC_API_KEY_ID', 'ASC_API_KEY_ISSUER_ID', 'APPLE_TEAM_ID', 'ASC_APP_ID', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH'
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z_]+)=(.*)$' -and $wanted -contains $Matches[1]) {
    Set-Item -Path "env:$($Matches[1])" -Value $Matches[2].Trim()
  }
}

# EAS reads these to manage Apple credentials with the App Store Connect API key
# instead of an Apple ID password.
$env:EXPO_ASC_API_KEY_PATH = $env:ASC_API_KEY_PATH
$env:EXPO_ASC_KEY_ID = $env:ASC_API_KEY_ID
$env:EXPO_ASC_ISSUER_ID = $env:ASC_API_KEY_ISSUER_ID
$env:EXPO_APPLE_TEAM_ID = $env:APPLE_TEAM_ID
$env:EXPO_APPLE_TEAM_TYPE = 'COMPANY_OR_ORGANIZATION'

Push-Location (Join-Path $PSScriptRoot '..')
try {
  npx -y eas-cli@latest @EasArgs
} finally {
  Pop-Location
}
