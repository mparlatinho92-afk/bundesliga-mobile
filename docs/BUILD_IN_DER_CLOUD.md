# Build in der Cloud (GitHub Actions) – Abwägung und Bauplan

> **Status: zurückgestellt (04.10.2026).** Nutzerentscheidung: „großer Schritt wäre alles, es eilt nicht.“
> Kein Umbau, solange OneDrive die Leitung bremst. Dieses Dokument hält die ganze Abwägung fest, damit
> beim Wiederaufnehmen nichts neu gemessen oder neu überlegt werden muss.
>
> **Der eigentliche Pluspunkt aus Nutzersicht: die Freiheit für ein „Datenmonster“** – viele historische
> Saisons und viele historische Wappen, ohne dass Repo, Push oder Handy daran ersticken.

---

## 1. Ausgangslage (gemessen am 04.10.2026)

| Messgröße | Wert |
|---|---|
| Monolith `index.html` | 46.266.412 Byte (46,3 MB) |
| davon Wappen als Base64 | **36,7 MB (≈ 80 %)**, 1.300 Wappen-Dateien, Ordner `Wappen/` 32 MB |
| `app/history_ext.js` (ALLE Tabellen Ebene 2–4, BRD+DDR, gzip+base64) | 0,5 MB |
| `history_data.js` / `aufstieg_data.js` / `europa_data.js` / `kalender_data.js` | zusammen < 0,5 MB |
| `app/map_regions.js` (Karte) | 2,5 MB |
| Repo lokal | ~1,3 GB (800 MB gepackt + 487 MB lose Objekte), 523 Commits |
| Repo auf GitHub | 838 MB (`size` der API), öffentlich |
| Releases | 51 Versionen in 30 Tagen, 183 in 90 Tagen |
| Pages heute | Auslieferung direkt aus `main` (Branch-Deploy), `ETag` + `Cache-Control: max-age=600` |
| Service Worker | keiner |

**Push-Dauer** (Zeitstempel, nicht geschätzt):

| Version | Build fertig | Commit | Push fertig | Push-Dauer |
|---|---|---|---|---|
| v0.8.188 | 23:35 | 23:35:55 | nach 23:47 | > 12 min |
| v0.8.189 | 14:22:13 | 14:22:27 | 14:41:40 | **~19 min** |

Build + Commit dauern ~2 Minuten, **der Push ist der langsame Teil.** Ab v0.8.190 protokolliert
`manage-v.ps1` jeden Push mit `--progress` und schreibt die Dauer nach `tools/push_zeiten.log`
(„Compressing objects“ = lokales Rechnen, „Writing objects … MiB/s“ = Upload).

### Warum der Push langsam ist

1. **Projektgröße (Hauptursache):** Jede Version lädt einen neuen 46-MB-Brocken hoch – egal wie klein
   die eigentliche Änderung ist (v0.8.189: < 0,8 MB Quellcode). Git muss dafür in riesigen einzeiligen
   Base64-Blöcken nach Unterschieden suchen. Projekte ohne eingebetteten Monolithen (z. B. das F1-RPG)
   haben diesen Posten nicht – deshalb pushen sie spürbar schneller.
2. **OneDrive (temporär):** OneDrive gleicht im Hintergrund den Dokumente-Ordner ab und teilt sich
   dieselbe Upload-Leitung. `C:\Projekte` selbst hängt NICHT an OneDrive (geprüft: kein Link, keine Junction).
3. **Kein Zusatzposten:** `bundesliga-vX.Y.Z.html` und `index.html` sind **bitgleich** (gleicher Blob-Hash) –
   Git speichert und überträgt sie nur einmal.

---

## 2. Die drei Optionen

| # | Option | Wirkung | Preis |
|---|---|---|---|
| 1 | `git gc` | packt die 487 MB losen Objekte; lokale Git-Befehle flotter | Push kaum schneller |
| 2 | Wappen aus dem Monolithen, Pages liefert sie als Dateien | `index.html` ~46 → ~3 MB | Pages-Fassung nicht mehr EINE Datei (Doppelklick offline) |
| **3** | **Bauen auf GitHub (Action)**, nur Quellen werden gepusht | Push in Sekunden, Repo wächst nicht mehr pro Version | einmaliger Umbau am Ablauf von `manage-v` |

**Empfehlung: Option 3**, später ergänzt um Option 2 (s. Abschnitt 5).

### Das stärkste Argument für Option 3: das Dateigrößen-Limit

GitHub **warnt bei Dateien über 50 MB** und **lehnt Dateien über 100 MB ab.** Der Monolith hat 46,3 MB
und wächst mit jedem Wappen, jeder Historie, jedem Korpus. Ohne Umbau bricht irgendwann ein Push mitten
in einem Build ab – ohne Vorwarnung. Mit Option 3 liegt der Monolith gar nicht mehr im Repo.

Dazu: das Repo (838 MB) steht knapp unter der von GitHub empfohlenen Größe von 1 GB und wächst heute
mit jeder Version.

---

## 3. Dafür / Dagegen – mit Lösungen

### Dafür
1. **Push in Sekunden** statt 12–19 Minuten (nur Quelldateien, < 1 MB je Version).
2. **Repo hört auf zu wachsen** – kein 46-MB-Brocken mehr pro Version.
3. **Kein 100-MB-Limit mehr für den Monolithen** → Weg frei fürs Datenmonster (Abschnitt 5).
4. **Pages bleibt standalone** – das Handy bekommt dieselbe eine Datei wie heute.
5. **Kein zweiter Build:** die Action ruft `manage-v.ps1 -BuildOnly` auf. Der Bau bleibt an EINER Stelle.

### Dagegen – und wie man es löst

| # | Einwand | Lösung |
|---|---|---|
| 1 | Einmaliger Umbau (Workflow, `manage-v`, `.gitignore`, Pages-Einstellung) | **Drei getrennt geprüfte Schritte**, jeder einzeln rücknehmbar (Abschnitt 6). Die Pages-Umstellung ist EIN Klick: Settings → Pages → Source „GitHub Actions“ |
| 2 | Fehler wird leiser: scheitert der Bau auf GitHub, bleibt das Handy still auf der alten Version | `manage-v` baut lokal weiter testweise und bricht VOR dem Push ab, wenn das scheitert. Eine fehlgeschlagene Action ist rot, GitHub schickt standardmäßig eine Mail. **Und:** `manage-v` wartet nach dem Push, bis die neue Versionsnummer wirklich auf Pages ausgeliefert wird, und meldet erst dann „live“ – besser als heute, wo „Fertig: ist live!“ erscheint, bevor Pages veröffentlicht hat |
| 3 | Rückgriff auf alte Versionen | Die drei lokalen Snapshots bleiben. Jeder Action-Lauf hebt seinen Monolithen als Download auf (bis 90 Tage). Jede Version bekommt einen Git-Tag (`v0.8.189`); die Action baut jede Version per Knopfdruck (`workflow_dispatch` mit Ref) neu |
| 4 | Altlast 838 MB bleibt in der Historie | Stört nur beim ersten Klonen. Fremd-PC/Cloud: `git clone --filter=blob:limit=5m` lässt die alten Monolithen weg. Historie umschreiben: **nicht empfohlen** |
| 5 | `manage-v.ps1` unter Linux nie erprobt (Umlaut-Pfade wie `Wappen/Südwest`, Kodierung) | Action auf **`windows-latest`** – für öffentliche Repos ebenfalls kostenlos, dieselbe PowerShell wie lokal. Zusätzlich die Prüfung, die durchfallen kann: der Cloud-Monolith muss **bitgleich** zum lokalen sein (Hash-Vergleich) |

### Die 90 Tage sind egal – auch wenn das Projekt ruht

- **Die veröffentlichte Seite läuft nicht ab.** Pages liefert die zuletzt veröffentlichte Version aus,
  bis eine neue kommt – morgen oder in zwei Jahren. Die 90 Tage betreffen nur die zusätzlichen
  Download-Kopien der Action-Läufe.
- **Jede Version bleibt dauerhaft wiederherstellbar** – die Quellen liegen für immer in Git.
- Einschränkung: ein Neubau in ferner Zukunft läuft auf einem neueren Windows-Runner und ist dann
  vielleicht nicht mehr bitgleich, funktional aber dasselbe.

---

## 4. Datenverkehr von GitHub Pages (Grenze: 100 GB/Monat, WEICH)

Grundlage: 51 Versionen/Monat, ein Gerät lädt je neuer Version einmal (ETag, danach „unverändert“).
Ohne Service Worker lädt der Handy-Browser neu, wenn er seinen Cache räumt.

| Szenario | pro Monat |
|---|---|
| Nutzer allein, Handy, jede Version einmal (51 × 46 MB) | ~2,3 GB |
| + zweites Gerät, gelegentliches Neuladen | ~3–8 GB |
| jeder weitere Mitspieler gleichen Verhaltens | +2–3 GB |
| **mit nachgeladenen Wappen** (Update ≈ 3–5 MB) | **< 0,5 GB** für den Nutzer |

Die Grenze ist weich: GitHub meldet sich bei DAUERHAFTER Überschreitung, es wird nicht abgeschaltet.
Mit dem heutigen Monolithen bräuchte es ~30–40 aktive Mitspieler. Mit nachgeladenen Wappen ist sie
kein Thema mehr – auch nicht beim Datenmonster, weil jedes Wappen einmal geladen wird und dann bleibt.
Weitere Pages-Grenze: 1 GB pro veröffentlichter Seite.

---

## 5. Das Datenmonster: viele historische Saisons + viele historische Wappen

**Historische Saisons sind kein Problem.** Alles bisherige zu Ebene 2–4 passt gepackt in 0,5 MB;
zehnmal so viel wären ~5 MB.

**Wappen sind das Problem.** 80 % des Monolithen. Historische Wappen (mehrere je Verein für
verschiedene Epochen) würden diesen Posten vervielfachen.

Option 3 allein hebt das 100-MB-Limit im Repo auf. **Die nächste Grenze ist dann das Handy:** jede
neue Version lädt die ganze Datei, und der Browser hält alle Wappen-Strings im Speicher – auch die,
die nirgends zu sehen sind. Ein 150-MB-Monolith wäre auf dem Handy zäh, selbst wenn GitHub ihn ausliefert.

**Der Weg: Option 3 + Wappen als einzelne Dateien auf Pages (= Option 2 in der Cloud):**
- Ein Wappen wird erst geladen, wenn es zu sehen ist, und danach auf dem Gerät zwischengespeichert –
  ob 1.300 oder 20.000 auf dem Server liegen, ist fast egal.
- Ein Update lädt nur Code und Daten: wenige MB statt 46.
- Das Repo wächst nur, wenn Wappen dazukommen – viele kleine Dateien verträgt GitHub gut.
- **Beide Fassungen aus denselben Quellen:** GitHub baut die schlanke Handy-Fassung, `manage-v` baut
  lokal weiter den eigenständigen Monolithen für den Doppelklick ohne Netz.
- Offen beim Bau: Wie die PWA (Startbildschirm) mit nachgeladenen Dateien umgeht – vermutlich ein
  kleiner Service Worker für den Wappen-Cache. Vorher prüfen.

---

## 6. Bauplan (wenn es so weit ist)

**Schritt 1 – nur bauen und vergleichen (ändert nichts am Bestehenden)**
- `.github/workflows/build.yml`: Trigger `push` auf `main` + `workflow_dispatch`, Runner `windows-latest`,
  ruft `./manage-v.ps1 -BuildOnly`, lädt `index.html` als Artefakt hoch.
- Prüfung: SHA-256 des Cloud-Monolithen == SHA-256 des lokal gebauten. **Muss durchfallen können:**
  einmal gegen einen absichtlich veränderten Stand laufen lassen.
- Pages und `manage-v` bleiben unverändert.

**Schritt 2 – Pages umstellen**
- Workflow um `actions/upload-pages-artifact` + `actions/deploy-pages` ergänzen.
- Nutzer klickt: Settings → Pages → Source „GitHub Actions“.
- Prüfen: Handy lädt die Version aus der Action (Versionsnummer im Titel).

**Schritt 3 – `manage-v` verschlanken**
- `index.html` und `bundesliga-v*.html` in `.gitignore` (Snapshots bleiben LOKAL, `$KeepVersions = 3`).
- Commit enthält nur Quellen (Changelog-Patch in `app/modal.js`/`template.html` bleibt lokal – das sind Quelländerungen).
- Git-Tag je Version.
- Nach dem Push: auf die neue Versionsnummer auf Pages warten, erst dann „live“ melden.
- Lokaler Testbau vor dem Push, Abbruch bei Fehler.

**Schritt 4 (später, eigenes Feature) – schlanke Pages-Fassung mit nachgeladenen Wappen**, s. Abschnitt 5.

---

## 7. Arbeiten von einem fremden PC – nur Browser, nichts installiert

| Weg | wo laufen Python/Node/Tests? | auf dem fremden PC nötig |
|---|---|---|
| **github.dev** (im Repo die Taste `.`) | nirgends – nur Bearbeiten + Committen. **Mit Option 3 baut und veröffentlicht GitHub dann automatisch** | Browser |
| **GitHub Codespaces** | auf einem Cloud-Rechner von GitHub; das Terminal zeigt ihn nur im Browser an. Kostenlos: 120 Kernstunden/Monat (≈ 60 h bei 2 Kernen), 15 GB Speicher | Browser |
| **Claude Code im Web** (claude.ai/code) | in einer Cloud-Umgebung von Anthropic, direkt am GitHub-Repo, auch vom Handy | Browser |

Tests und Werkzeuge gehen also auch unterwegs – sie laufen in der Cloud, nicht auf dem fremden PC.
Einmal einzurichten für Codespaces: PowerShell + Playwright-Browser über eine kleine
Konfigurationsdatei im Repo (`.devcontainer/devcontainer.json`).

**Was unterwegs fehlt – der lokale Ordner bleibt die WERKSTATT:**
Excel-Tabellen (Liga-Zuordnung, Werkstatt), CSV-Dateien (Ligastärkewerte, f-archiv-Material in
Downloads), KMZ/KML-Kartenquellen, das FM-Logopaket, die laufenden fussball.de-Scrapes, `docs/`-Screenshots,
`node_modules`. Wer Daten NEU ERZEUGT (Historie einbauen, Wappen aufbereiten, Karte rechnen), braucht
den eigenen PC. Für Programmieren, Prüfen und Veröffentlichen nicht.

**Claude Code im Web:** die persönlichen Notizen (`C:\Users\lyric\.claude\projects\…\memory\`) liegen
nur auf dem eigenen PC und fehlen dort. `CLAUDE.md` und dieses Dokument liegen im Repo und sind dabei.

**Erst Option 3 macht github.dev und Codespaces richtig nützlich** – heute würde ein Commit von
unterwegs nichts veröffentlichen, weil der Monolith nur lokal gebaut wird.

---

## 8. Nebenbefund derselben Sitzung: OneDrive-Rückkopie (04.10.2026)

Zwischen 03.10. 23:35 und 04.10. ~13:00 wurden in `C:\Projekte` 15 Dateien sowie `.git/refs/heads/main`,
Reflog und `COMMIT_EDITMSG` durch ÄLTERE Fassungen (21.06.–30.09.) ersetzt – Muster einer Kopie aus dem
alten OneDrive-Ordner. Nichts ging verloren (Commit lag lokal + auf GitHub), Reparatur: `git update-ref`,
`git fetch`, `git reset` (nur Index), `git restore -- . ':!<eigene Arbeit>'`, `git fsck`.
Relevanz hier: **mit Option 3 ist GitHub die maßgebliche Quelle**, ein lokal zurückgedrehter Stand
richtet weniger Schaden an.

---

## 9. Klarstellungen (Nachfragen 09.10.2026)

### 9.1 Bleiben beide HTML-Dateien? – Ja.

| Datei | heute | nach Option 3 |
|---|---|---|
| `template.html` | Quelle, im Repo | **unverändert** – Quelle, im Repo, daran wird gearbeitet |
| `index.html` / `bundesliga-vX.html` (Monolith) | lokal gebaut **und** gepusht | weiter **lokal** gebaut (drei Snapshots, Doppelklick ohne Netz), aber **nicht mehr gepusht** (`.gitignore`) – GitHub baut ihn aus denselben Quellen selbst und stellt ihn auf Pages |

Aus Nutzersicht wie heute: lokal ein Monolith, das Handy bekommt eine Datei. Erst Schritt 4
(Wappen nachladen) macht die **Pages**-Fassung schlank; der lokale Monolith bleibt eigenständig.

### 9.2 Braucht es dafür einen „neuen Claude-Chat“? – Nein.

Das PowerShell-Terminal, in dem gearbeitet wird, **ist** Claude Code (die CLI). Option 3 ändert nur,
wo der Monolith gebaut wird – nicht, wie gearbeitet wird. Lange Sessions, lokaler Ordner, Excel,
Playwright und die persönlichen Notizen bleiben.

„Claude Code im Web“ (Abschnitt 7) ist eine **Zusatzmöglichkeit für unterwegs**, kein Ersatz. Dort fehlen:
alles, was nicht im Repo liegt (Excel, Downloads, KMZ, FM-Logopaket), die persönlichen Notizen unter
`C:\Users\lyric\.claude\…`, und die Umgebung startet jedes Mal frisch aus dem Repo – Ergebnisse
kommen nur über Commit + Push zurück. **Das Terminal bleibt die Werkstatt.**

### 9.3 „Den kompletten Projektordner in Git?“ – nur zum Teil Standard

**Standard ist:** Quellen ins Repo, Bauergebnisse **nicht** – die baut die CI (GitHub Actions). Genau
das ist Option 3. Der heutige Zustand (46-MB-Bauergebnis bei jeder Version eingecheckt) ist die Ausnahme.

**Nicht Standard ist, wirklich alles einzuchecken.** Gemessen am 09.10.2026: 64 Einträge,
**≈ 273 MB**, liegen per `.gitignore` außerhalb von Git. Sie fallen in drei Gruppen:

| Gruppe | Beispiele (Größe) | gehört ins Repo? |
|---|---|---|
| regenerierbar | `node_modules/` (32 MB, `npm install`), `tools/_kreise_cache.pkl` (35 MB), `_gemeinden_cache.pkl`, `__pycache__/`, `tools/_dryrun/` | **nein** – überall üblich, entsteht neu |
| große Rohdaten | `tools/Mitteleuropa_border_level4_polygon.kml` (55 MB), `farchiv_output/` (39 MB), `tools/regionen_full.geojson` (36 MB), `Karte-Vorschau/` (24 MB), `*.kmz`, `tools/_ernte*` | wenn überhaupt, per **Git LFS** oder getrennt – nicht als normale Git-Dateien |
| Werkstatt / fremde Daten | Excel-Tabellen, CSVs (Ligastärkewerte, Teilnehmer), f-archiv-Material, FM-Logopaket (liegt außerhalb des Ordners) | **Achtung: das Repo ist öffentlich** – siehe unten |

**Der eigentliche Haken ist „öffentlich“.** Was im Repo liegt, kann jeder lesen und klonen. Das
f-archiv-Material und das FM-Logopaket sind Fremddaten; die Werkstatt-Tabellen sind persönliche
Arbeitsstände. Und GitHub Pages ist im kostenlosen Konto an ein **öffentliches** Repo gebunden –
das Spiel-Repo kann also nicht einfach privat werden.

**Falls die Werkstatt mit in die Cloud soll** (damit unterwegs auch Daten neu erzeugt werden können):
ein **zweites, privates Repo** nur für Werkstattdaten, im Arbeitsordner als Unterordner oder
daneben. Das öffentliche Spiel-Repo bleibt schlank, Pages bleibt kostenlos. Regenerierbares
bleibt in beiden draußen. Eigener Schritt, nicht Teil von Option 3 – vorher entscheiden, was
wirklich unterwegs gebraucht wird.
