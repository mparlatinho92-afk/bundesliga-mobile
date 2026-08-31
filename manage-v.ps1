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

# 0. Wachposten: ist die Versionsnummer schon vergeben?
# Am 30. und 31.08.2026 haben zwei parallel laufende Sitzungen je zweimal dieselbe Nummer benutzt.
# Folgen jedes Mal: der zweite Lauf loeschte den Snapshot des ersten als "alte Version", und im
# Changelog standen zwei verschiedene Bloecke unter derselben Nummer. Der Blick in den Log kostet
# nichts und macht genau diesen Fehler unmoeglich - auch dann, wenn der Mensch am Ende der Kette
# gerade an etwas anderes denkt.
if (-not $BuildOnly) {
    $Dup = git log --oneline --all | Select-String -SimpleMatch "v$NewVersion -"
    if ($Dup) {
        Write-Host "ABBRUCH: v$NewVersion ist bereits vergeben:" -ForegroundColor Red
        $Dup | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        Write-Host "Bitte die naechste freie Nummer verwenden." -ForegroundColor Yellow
        return
    }
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

$JsFiles = @("app/lzstring.min.js", "app/idb_store.js", "game_data.js", "app/history_data.js", "data_reports.js", "game_engine.js", "app/save_worker.js", "app/dfb_logo.js", "app/core.js", "app/action.js", "app/conference.js", "app/pokal.js", "app/amateurpokal.js", "app/league.js", "app/livetable.js", "app/reports.js", "app/records.js", "app/modal.js", "app/save_manager.js", "app/map_data.js", "app/map_regions.js", "app/map_admin.js", "app/map.js", "app/map_saison.js", "app/pulltorefresh.js")
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
    # Kein archive/ mehr, aber auch nicht nur EINE Datei: die letzten $KeepVersions Snapshots
    # bleiben liegen (den gerade gebauten mitgezaehlt), aeltere werden geloescht.
    # Grund fuer die Erweiterung von 1 auf 3: am 30.08.2026 haben zwei Sitzungen parallel dieselbe
    # Versionsnummer vergeben. Der zweite Lauf loeschte den Snapshot des ersten als "alte Version" -
    # danach lag GAR KEINE lauffaehige Datei mehr im Projekt, und der naechste Build waere an
    # "Keine bundesliga-v*.html gefunden!" abgebrochen. Mit drei Staenden ist ein Rueckgriff immer da.
    # Kosten: ein Monolith ist ~44 MB, drei also ~130 MB - das alte archive/ waren 7 GB.
    # Sortiert wird nach der VERSIONSNUMMER, nicht nach Dateidatum oder Name: v0.8.9 stuende sonst
    # hinter v0.8.129, und ein aus der Historie zurueckgeholter Stand hat ein frisches Datum.
    $KeepVersions = 3
    $VerSort = @{ Expression = {
        $m = [regex]::Match($_.Name, 'v(\d+)\.(\d+)\.(\d+)')
        [int]$m.Groups[1].Value * 1000000 + [int]$m.Groups[2].Value * 1000 + [int]$m.Groups[3].Value
    } }
    Get-ChildItem bundesliga-v*.html | Sort-Object $VerSort -Descending |
        Select-Object -Skip $KeepVersions | ForEach-Object {
            git rm -f --quiet $_.Name 2>$null
            if (Test-Path $_.Name) { Remove-Item $_.Name -Force }
            Write-Host "Alter Snapshot geloescht: $($_.Name) (liegt in der Git-Historie)" -ForegroundColor DarkGray
        }

    git add index.html template.html
    # Alle behaltenen Snapshots einchecken, nicht nur den neuen - ein zurueckgeholter Stand laege
    # sonst dauerhaft als unversionierte Datei herum.
    Get-ChildItem bundesliga-v*.html | ForEach-Object { git add $_.Name }
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
    # Vereinswappen: werden zwar als Base64 in den Monolith eingebettet, sind aber trotzdem
    # Quelldateien. Ohne diese Zeile zeigte die gebaute Seite neue Wappen, waehrend die PNGs
    # uncommittet liegen blieben – Quelle und Build liefen still auseinander.
    if (Test-Path "Wappen") { git add Wappen }
    # Werkzeuge: erzeugen die Datenlage, die oben eingecheckt wird (gen_regions.py -> map_regions.js,
    # wappen_intake.py -> Wappen/). Blieben sie draussen, waere die gebaute Karte committet und die
    # Regel, die sie erzeugt hat, nicht - beim naechsten Lauf kaeme etwas anderes heraus und niemand
    # wuesste warum. Caches und Zwischenstaende sind per .gitignore ausgenommen.
    if (Test-Path "tools") { git add tools }
    # Und das Script selbst plus .gitignore: sonst faellt genau diese Zeile hier durchs Raster.
    # CLAUDE.md gehoert dazu: die Arbeitsregeln sind eine Quelldatei des Projekts wie das Script
    # auch. Ohne diese Zeile blieb eine neue Regel nach dem Build unversioniert liegen und war
    # beim naechsten Rechnerwechsel weg (aufgefallen am 31.08.2026).
    git add manage-v.ps1 manage-v .gitignore CLAUDE.md 2>$null
    # PWA-Dateien (Homescreen-Icon) – echte URLs, nicht in index.html eingebettet
    if (Test-Path "manifest.webmanifest") { git add manifest.webmanifest }
    if (Test-Path "icons") { git add icons }
    git commit -m "v$NewVersion - $CommitMsg"
    git push origin main

    Write-Host "Fertig: v$NewVersion ist live!" -ForegroundColor Green
} else {
    Write-Host "BuildOnly abgeschlossen. index.html testen, dann manage-v mit -NewVersion ausfuehren." -ForegroundColor Yellow
}
