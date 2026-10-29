param(
    [ValidateSet('Install', 'Uninstall')]
    [string]$Action = 'Install'
)

$ErrorActionPreference = 'Stop'
$state = Get-Content -LiteralPath "$PSScriptRoot\installation.json" -Raw | ConvertFrom-Json
$sourceDir = Join-Path $PSScriptRoot 'source'
$uiDir = Join-Path $state.WebDir 'ui'
$files = @('spotlight.html', 'spotlight.css', 'spotlight-loader.js')

if ([string]::IsNullOrWhiteSpace($env:JELLYFIN_API_KEY)) {
    throw 'JELLYFIN_API_KEY 환경 변수에 Jellyfin 관리자 API 키가 필요합니다.'
}
if (-not (Test-Path -LiteralPath (Join-Path $state.WebDir 'index.html'))) {
    throw 'Jellyfin 웹 빌드의 index.html 파일이 필요합니다.'
}

$env:ABYSS_SETUP_LIB_ONLY = '1'
$env:ABYSS_BRANCH = $state.Revision
$env:ABYSS_REPO = 'AumGupta/abyss-jellyfin'
. (Join-Path $sourceDir 'setup.ps1')
$headers = Get-ApiHeaders $env:JELLYFIN_API_KEY.Trim()

function Invoke-AbyssApi {
    param([string]$Path, [object]$Data)
    $request = @{
        Uri = "$($state.ServerUrl)$Path"
        Headers = $headers
        TimeoutSec = 30
        Method = 'Get'
    }
    if ($PSBoundParameters.ContainsKey('Data')) {
        $request.Method = 'Post'
        $request.Body = [Text.Encoding]::UTF8.GetBytes(($Data | ConvertTo-Json -Depth 20))
    }
    Invoke-RestMethod @request
}

$branding = Invoke-AbyssApi '/Branding/Configuration'
$prefsPath = "/DisplayPreferences/usersettings?userId=$($state.UserId)&client=emby"
$prefs = Invoke-AbyssApi $prefsPath
if (-not $prefs.CustomPrefs) {
    $prefs | Add-Member -NotePropertyName CustomPrefs -NotePropertyValue ([pscustomobject]@{}) -Force
}

foreach ($file in $files) {
    $target = Join-Path $uiDir $file
    if ((Test-Path -LiteralPath $target) -and
        (Get-FileHash -LiteralPath $target).Hash -ne (Get-FileHash -LiteralPath (Join-Path $sourceDir $file)).Hash) {
        throw "설치본과 다른 파일이 있어 확인이 필요합니다: $target"
    }
}

if ($Action -eq 'Install') {
    $null = New-Item -ItemType Directory -Path $uiDir -Force
    foreach ($file in $files) {
        Copy-Item -LiteralPath (Join-Path $sourceDir $file) -Destination (Join-Path $uiDir $file) -Force
    }
    Set-SpotlightLoader $state.WebDir $true
    $customCss = Add-AbyssCssText $branding.CustomCss
    $overridesPath = Join-Path $PSScriptRoot 'overrides.css'
    if (Test-Path -LiteralPath $overridesPath) {
        $overrides = [IO.File]::ReadAllText($overridesPath).TrimEnd()
        $customCss = $customCss.Replace($ABYSS_CSS_END, "$overrides`n$ABYSS_CSS_END")
    }
    $branding | Add-Member -NotePropertyName CustomCss -NotePropertyValue $customCss -Force
    foreach ($name in @('appTheme', 'dashboardTheme')) {
        $prefs.CustomPrefs | Add-Member -NotePropertyName $name -NotePropertyValue 'dark' -Force
    }
} else {
    $branding.CustomCss = Remove-AbyssCssText $branding.CustomCss
    $original = Get-Content -LiteralPath "$PSScriptRoot\backup\display-preferences.json" -Raw | ConvertFrom-Json
    foreach ($name in @('appTheme', 'dashboardTheme')) {
        $property = $original.CustomPrefs.PSObject.Properties[$name]
        if ($null -ne $property) {
            $prefs.CustomPrefs | Add-Member -NotePropertyName $name -NotePropertyValue $property.Value -Force
        } else {
            $prefs.CustomPrefs.PSObject.Properties.Remove($name)
        }
    }
    Set-SpotlightLoader $state.WebDir $false
    foreach ($file in $files) {
        $target = Join-Path $uiDir $file
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
    }
    if (-not $state.UiDirectoryExisted -and (Test-Path -LiteralPath $uiDir) -and
        @(Get-ChildItem -LiteralPath $uiDir -Force).Count -eq 0) {
        Remove-Item -LiteralPath $uiDir
    }
}

Invoke-AbyssApi '/System/Configuration/Branding' $branding | Out-Null
Invoke-AbyssApi $prefsPath $prefs | Out-Null
Write-Host "Abyss $Action 작업을 완료했습니다. 브라우저에서 Ctrl+F5로 새로고침합니다."
