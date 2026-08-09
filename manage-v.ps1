param (
    [Parameter(Mandatory=$false)] [string]$NewVersion,
    [Parameter(Mandatory=$false)] [string]$CommitMsg,
    [Parameter(Mandatory=$false)] [string]$ChangelogPoints = "",
    [switch]$BuildOnly,
    [switch]$SkipThemeCheck
)

if (-not $BuildOnly -and (-not $NewVersion -or -not $CommitMsg)) {
    Write-Error "NewVersion und CommitMsg sind Pflicht (ausser bei -BuildOnly)."; return
}

# 0. Theme-Farben automatisch normalisieren: hartkodierte Neutralfarben -> CSS-Variablen.
#    Verhindert ein kaputtes Light-Theme, OHNE den Build scheitern zu lassen.
if (-not $SkipThemeCheck) {
    node tools/check_theme_colors.cjs --fix
}

# 1. Aktuellste bundesliga-v*.html finden
$OldFile = Get-ChildItem bundesliga-v*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($BuildOnly) {
    Write-Host "BuildOnly-Modus: nur index.html wird neu gebaut, kein Commit." -ForegroundColor Yellow
} else {
    $NewFileName = "bundesliga-v$NewVersion.html"
    if (-not $OldFile) { Write-Error "Keine bundesliga-v*.html gefunden!"; return }
    Write-Host "Upgrade: $($OldFile.Name) -> $NewFileName" -ForegroundColor Cyan
}

# 2. Monolith aus template.html erstellen und JS-Dateien inlinieren
$Content = Get-Content template.html -Raw -Encoding UTF8

$JsFiles = @("app/lzstring.min.js", "app/idb_store.js", "game_data.js", "app/history_data.js", "data_reports.js", "game_engine.js", "app/save_worker.js", "app/dfb_logo.js", "app/core.js", "app/action.js", "app/conference.js", "app/pokal.js", "app/amateurpokal.js", "app/league.js", "app/livetable.js", "app/reports.js", "app/modal.js", "app/save_manager.js", "app/map_data.js", "app/map_regions.js", "app/map_admin.js", "app/map.js", "app/map_saison.js", "app/pulltorefresh.js")
foreach ($js in $JsFiles) {
    if (Test-Path $js) {
        $JsContent = Get-Content $js -Raw -Encoding UTF8
        $Content = $Content -replace "<script src=`"$js`"></script>", "<script>`n$JsContent`n</script>"
        Write-Host "Inliniert: $js" -ForegroundColor DarkCyan
    }
}

# 2b. Wappen-Pfade in Base64 einbetten (Monolith bleibt standalone)
$WappenPaths = [regex]::Matches($Content, '"(Wappen/[^"]+\.(png|svg|jpg|jpeg))"') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
foreach ($wpath in $WappenPaths) {
    if (Test-Path $wpath) {
        $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $wpath))
        $b64   = [Convert]::ToBase64String($bytes)
        $ext   = [System.IO.Path]::GetExtension($wpath).TrimStart('.').ToLower()
        $mime  = if ($ext -eq 'svg') { 'image/svg+xml' } elseif ($ext -eq 'jpg' -or $ext -eq 'jpeg') { 'image/jpeg' } else { "image/$ext" }
        $Content = $Content.Replace('"' + $wpath + '"', '"data:' + $mime + ';base64,' + $b64 + '"')
    }
}
Write-Host "Wappen eingebettet: $($WappenPaths.Count) Dateien" -ForegroundColor DarkCyan

# 3. Versionsnummer + Titel patchen (nur bei echtem Release)
if (-not $BuildOnly) {
$Content = $Content -replace "const VERSION = ['\`"][^'\`"]*['\`"];", "const VERSION = '$NewVersion';"
$Content = $Content -replace '<title>[^<]*</title>', "<title>Bundesliga Mobile v$NewVersion</title>"
}

# 4. Changelog patchen (nur bei echtem Release)
if (-not $BuildOnly -and $ChangelogPoints -ne "") {
    $Date = Get-Date -Format "dd.MM.yyyy"
    $BulletLines = $ChangelogPoints -split ";" | ForEach-Object {
        "                            <div>&#8226; $_</div>"
    }
    $BulletsJoined = $BulletLines -join "`r`n"
    $NewEntry = "<!-- CHANGELOG -->`r`n                            <div class=`"font-bold text-green-400`">v$NewVersion (aktuell) - $Date</div>`r`n$BulletsJoined"
    $OldPattern = '<div class="font-bold text-green-400">(v[\d.]+\s+\(aktuell\)[^<]*)</div>'
    while ($true) {
        $m = [regex]::Match($Content, $OldPattern)
        if (-not $m.Success) { break }
        $inner = $m.Groups[1].Value -replace ' \(aktuell\)', ''
        $Content = $Content.Substring(0, $m.Index) + '<div class="font-bold text-slate-400">' + $inner + '</div>' + $Content.Substring($m.Index + $m.Length)
    }
    $Content = $Content -replace '<!-- CHANGELOG -->', $NewEntry
}

# 5. Monolith schreiben
function Write-FileRobust($Path, $Text) {
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
    $fs = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
    $fs.Write($bytes, 0, $bytes.Length); $fs.Flush(); $fs.Close()
}
if (-not $BuildOnly) { Write-FileRobust $NewFileName $Content }
Write-FileRobust index.html $Content
if ($BuildOnly) {
    Write-Host "index.html neu gebaut (BuildOnly, kein Commit)" -ForegroundColor Yellow
} else {
    Write-Host "Monolith -> $NewFileName + index.html (GitHub Pages)" -ForegroundColor Cyan
}

# 5b. template.html: Versionsnummer aktualisieren (nur bei echtem Release)
if (-not $BuildOnly) {
$TplContent = Get-Content template.html -Raw -Encoding UTF8
$TplContent = $TplContent -replace "const VERSION = ['\`"][^'\`"]*['\`"];", "const VERSION = '$NewVersion';"
$TplContent = $TplContent -replace '<title>[^<]*</title>', "<title>Bundesliga Mobile v$NewVersion</title>"
Write-FileRobust template.html $TplContent
Write-Host "template.html Versionsnummer aktualisiert" -ForegroundColor Cyan
}

# 5c. app/modal.js: Changelog-Quelldatei patchen (nur bei echtem Release)
if (-not $BuildOnly -and $ChangelogPoints -ne "") {
    $ModalContent = Get-Content "app/modal.js" -Raw -Encoding UTF8
    $BulletLinesModal = $ChangelogPoints -split ";" | ForEach-Object {
        "                    <div>&#8226; $_</div>"
    }
    $BulletsJoinedModal = $BulletLinesModal -join "`r`n"
    $NewEntryModal = "<!-- CHANGELOG -->`r`n                    <div class=`"font-bold text-green-400`">v$NewVersion (aktuell) - $Date</div>`r`n$BulletsJoinedModal"
    $OldPatternModal = '<div class="font-bold text-green-400">(v[\d.]+\s+\(aktuell\)[^<]*)</div>'
    while ($true) {
        $m3 = [regex]::Match($ModalContent, $OldPatternModal)
        if (-not $m3.Success) { break }
        $inner3 = $m3.Groups[1].Value -replace ' \(aktuell\)', ''
        $ModalContent = $ModalContent.Substring(0, $m3.Index) + '<div class="font-bold text-slate-400">' + $inner3 + '</div>' + $ModalContent.Substring($m3.Index + $m3.Length)
    }
    $ModalContent = $ModalContent -replace '<!-- CHANGELOG -->', $NewEntryModal
    Write-FileRobust "app/modal.js" $ModalContent
    Write-Host "app/modal.js Changelog aktualisiert" -ForegroundColor Cyan
}

# 5d. CHANGELOG.md aktualisieren (nur bei echtem Release)
if (-not $BuildOnly -and $ChangelogPoints -ne "" -and (Test-Path "CHANGELOG.md")) {
    $CLBullets = ($ChangelogPoints -split ";") -join "`n- "
    $CLEntry = "## v$NewVersion ($Date)`n- $CLBullets`n`n"
    $CLContent = Get-Content CHANGELOG.md -Raw -Encoding UTF8
    ($CLEntry + $CLContent) | Set-Content CHANGELOG.md -Encoding UTF8
}

# 6+7. Archivieren + Git (nur bei echtem Release)
if (-not $BuildOnly) {
    if (!(Test-Path "archive")) { New-Item -ItemType Directory -Path "archive" | Out-Null }
    Move-Item $OldFile.Name "archive/" -Force
    Write-Host "Archiviert: $($OldFile.Name)" -ForegroundColor Cyan

    git add $NewFileName index.html template.html
    foreach ($js in $JsFiles) { if (Test-Path $js) { git add $js } }
    # Dateien, die dieser Lauf SELBST geaendert hat – ohne sie bleibt jedes Mal ein
    # Nachtrags-Commit von Hand uebrig (CHANGELOG.md schreibt Schritt 5d oben).
    if (Test-Path "CHANGELOG.md") { git add CHANGELOG.md }
    # Der Changelog-Patch in app/modal.js verschiebt jede Funktion darunter -> die Schema-Drift
    # entsteht erst hier und ist vor dem Build nicht sichtbar. --fix aendert NUR Zeilennummern.
    if (Test-Path "tools/schema_check.py") {
        python tools/schema_check.py --fix
        if (Test-Path "schemas/functions.schema.json") { git add schemas/functions.schema.json }
        Write-Host "Schema-Zeilennummern nachgezogen" -ForegroundColor Cyan
    }
    # PWA-Dateien (Homescreen-Icon) – echte URLs, nicht in index.html eingebettet
    if (Test-Path "manifest.webmanifest") { git add manifest.webmanifest }
    if (Test-Path "icons") { git add icons }
    git rm $OldFile.Name 2>$null
    git add "archive/$($OldFile.Name)"
    git commit -m "v$NewVersion - $CommitMsg"
    git push origin main

    Write-Host "Fertig: v$NewVersion ist live!" -ForegroundColor Green
} else {
    Write-Host "BuildOnly abgeschlossen. index.html testen, dann manage-v mit -NewVersion ausfuehren." -ForegroundColor Yellow
}
