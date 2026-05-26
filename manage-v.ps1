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

$JsFiles = @("game_data.js", "data_live.js", "data_logic.js", "game_engine.js")
foreach ($js in $JsFiles) {
    if (Test-Path $js) {
        $JsContent = Get-Content $js -Raw -Encoding UTF8
        $Content = $Content -replace "<script src=`"$js`"></script>", "<script>`n$JsContent`n</script>"
        Write-Host "Inliniert: $js" -ForegroundColor DarkCyan
    }
}

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

# 5. index.html: nur Versionsnummer patchen (Script-Tags bleiben, kein Inlining)
$IndexContent = Get-Content index.html -Raw -Encoding UTF8
$IndexContent = $IndexContent -replace "const VERSION = ['\`"][^'\`"]*['\`"];", "const VERSION = '$NewVersion';"
$IndexContent = $IndexContent -replace '<title>[^<]*</title>', "<title>Bundesliga Architect v$NewVersion</title>"
$IndexContent | Set-Content index.html -Encoding UTF8
Write-Host "index.html Versionsnummer aktualisiert → GitHub Pages zeigt v$NewVersion" -ForegroundColor Cyan

# 6. Alte Datei ins Archiv verschieben
if (!(Test-Path "archive")) { New-Item -ItemType Directory -Path "archive" | Out-Null }
Move-Item $OldFile.Name "archive/" -Force
Write-Host "Archiviert: $($OldFile.Name)" -ForegroundColor Cyan

# 7. Git (neue Version + index.html + archivierte alte Version)
git add $NewFileName index.html
git rm $OldFile.Name 2>$null
git add "archive/$($OldFile.Name)"
git commit -m "v$NewVersion - $CommitMsg"
git push origin main

Write-Host "Fertig: v$NewVersion ist live!" -ForegroundColor Green
