param (
    [Parameter(Mandatory=$true)] [string]$NewVersion,
    [Parameter(Mandatory=$true)] [string]$CommitMsg,
    [Parameter(Mandatory=$false)] [string]$ChangelogPoints = ""
)

# 1. Aktuellste bundesliga-v*.html finden
$OldFile = Get-ChildItem bundesliga-v*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$NewFileName = "bundesliga-v$NewVersion.html"

if (-not $OldFile) { Write-Error "Keine bundesliga-v*.html gefunden!"; return }

Write-Host "Upgrade: $($OldFile.Name) -> $NewFileName" -ForegroundColor Cyan

# 2. Neue Version aus index.html erstellen und JS-Dateien inlinieren (Monolith für Standalone-Nutzung)
$Content = Get-Content index.html -Raw -Encoding UTF8

$JsFiles = @("game_data.js", "data_live.js", "data_logic.js", "game_engine.js", "app/dfb_logo.js", "app/core.js", "app/pokal.js", "app/league.js", "app/modal.js")
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

$Content | Set-Content $NewFileName -Encoding UTF8

# 3. Versionsnummer patchen
$Content = Get-Content $NewFileName -Raw -Encoding UTF8
$Content = $Content -replace "const VERSION = ['\`"][^'\`"]*['\`"];", "const VERSION = '$NewVersion';"
$Content = $Content -replace '<title>[^<]*</title>', "<title>Bundesliga Architect v$NewVersion</title>"

# 4. Changelog patchen
if ($ChangelogPoints -ne "") {
    $Date = Get-Date -Format "dd.MM.yyyy"
    $BulletLines = $ChangelogPoints -split ";" | ForEach-Object {
        "                            <div>&#8226; $_</div>"
    }
    $BulletsJoined = $BulletLines -join "`r`n"

    $NewEntry = "<!-- CHANGELOG -->`r`n                            <div class=`"font-bold text-green-400`">v$NewVersion (aktuell) - $Date</div>`r`n$BulletsJoined"

    # Alte (aktuell)-Eintraege auf grau setzen
    $OldPattern = '<div class="font-bold text-green-400">(v[\d.]+\s+\(aktuell\)[^<]*)</div>'
    while ($true) {
        $m = [regex]::Match($Content, $OldPattern)
        if (-not $m.Success) { break }
        $inner = $m.Groups[1].Value -replace ' \(aktuell\)', ''
        $replacement = '<div class="font-bold text-slate-400">' + $inner + '</div>'
        $Content = $Content.Substring(0, $m.Index) + $replacement + $Content.Substring($m.Index + $m.Length)
    }

    $Content = $Content -replace '<!-- CHANGELOG -->', $NewEntry
}

$Content | Set-Content $NewFileName -Encoding UTF8

# 5. index.html: Versionsnummer + Changelog patchen (Script-Tags bleiben, kein Inlining)
$IndexContent = Get-Content index.html -Raw -Encoding UTF8
$IndexContent = $IndexContent -replace "const VERSION = ['\`"][^'\`"]*['\`"];", "const VERSION = '$NewVersion';"
$IndexContent = $IndexContent -replace '<title>[^<]*</title>', "<title>Bundesliga Architect v$NewVersion</title>"
if ($ChangelogPoints -ne "") {
    $BulletLinesIdx = $ChangelogPoints -split ";" | ForEach-Object {
        "                            <div>&#8226; $_</div>"
    }
    $BulletsJoinedIdx = $BulletLinesIdx -join "`r`n"
    $NewEntryIdx = "<!-- CHANGELOG -->`r`n                            <div class=`"font-bold text-green-400`">v$NewVersion (aktuell) - $Date</div>`r`n$BulletsJoinedIdx"
    $OldPatternIdx = '<div class="font-bold text-green-400">(v[\d.]+\s+\(aktuell\)[^<]*)</div>'
    while ($true) {
        $m2 = [regex]::Match($IndexContent, $OldPatternIdx)
        if (-not $m2.Success) { break }
        $inner2 = $m2.Groups[1].Value -replace ' \(aktuell\)', ''
        $repl2 = '<div class="font-bold text-slate-400">' + $inner2 + '</div>'
        $IndexContent = $IndexContent.Substring(0, $m2.Index) + $repl2 + $IndexContent.Substring($m2.Index + $m2.Length)
    }
    $IndexContent = $IndexContent -replace '<!-- CHANGELOG -->', $NewEntryIdx
}
$IndexContent | Set-Content index.html -Encoding UTF8

# 5c. app/modal.js: Changelog-Quelldatei patchen (wird beim nächsten Build inliniert)
if ($ChangelogPoints -ne "") {
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
        $repl3 = '<div class="font-bold text-slate-400">' + $inner3 + '</div>'
        $ModalContent = $ModalContent.Substring(0, $m3.Index) + $repl3 + $ModalContent.Substring($m3.Index + $m3.Length)
    }
    $ModalContent = $ModalContent -replace '<!-- CHANGELOG -->', $NewEntryModal
    $ModalContent | Set-Content "app/modal.js" -Encoding UTF8
    Write-Host "app/modal.js Changelog aktualisiert" -ForegroundColor Cyan
}
Write-Host "index.html Versionsnummer aktualisiert → GitHub Pages zeigt v$NewVersion" -ForegroundColor Cyan

# 5b. CHANGELOG.md: neuen Eintrag oben einfügen
if ($ChangelogPoints -ne "" -and (Test-Path "CHANGELOG.md")) {
    $CLBullets = ($ChangelogPoints -split ";") -join "`n- "
    $CLEntry = "## v$NewVersion ($Date)`n- $CLBullets`n`n"
    $CLContent = Get-Content CHANGELOG.md -Raw -Encoding UTF8
    ($CLEntry + $CLContent) | Set-Content CHANGELOG.md -Encoding UTF8
}

# 6. Alte Datei ins Archiv verschieben
if (!(Test-Path "archive")) { New-Item -ItemType Directory -Path "archive" | Out-Null }
Move-Item $OldFile.Name "archive/" -Force
Write-Host "Archiviert: $($OldFile.Name)" -ForegroundColor Cyan

# 7. Git (neue Version + index.html + JS-Quelldateien + archivierte alte Version)
git add $NewFileName index.html
foreach ($js in $JsFiles) { if (Test-Path $js) { git add $js } }
git rm $OldFile.Name 2>$null
git add "archive/$($OldFile.Name)"
git commit -m "v$NewVersion - $CommitMsg"
git push origin main

Write-Host "Fertig: v$NewVersion ist live!" -ForegroundColor Green
