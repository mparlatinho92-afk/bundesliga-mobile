# Bundesliga Architect – Claude Regeln

## Projektkontext
Modular aufgeteiltes HTML-Projekt (seit v0.3.43). `manage-v` inliniert alle Module → GitHub Pages Monolith bleibt standalone.

| Pfad | Inhalt |
|---|---|
| `template.html` | HTML-Gerüst + CSS (kein JS) – Quelldatei für manage-v |
| `index.html` | Monolith (GitHub Pages + Handy) – von manage-v generiert, nie manuell editieren |
| `app/` | App-UI-Module – thematisch aufgeteilt, `manage-v` inliniert alle |
| `game_engine.js` | Spiellogik (`Engine`-Objekt) |
| `game_data.js` | Statische Ligadaten (Ligen mit `min`/`max`/`target`, Teams, Wappen-Pfade) |
| `app/history_data.js` | `HISTORY_SEED` + `RELEGATION_SEED` – historische Abschlusstabellen |
| `data_reports.js` | Textkorpus für Spieltags-Schlagzeilen (von Fable geschrieben) |
| `Wappen/` | Vereins- und Liga-Logos |
| `schemas/` | Navigations-Schemata (functions.schema.json) |
| `archive/` | Versionierte HTML-Snapshots |
| `tools/` | Analyse-/Crawl-Skripte, nicht Teil der App |

> `data_live.js` / `data_logic.js` gibt es **nicht mehr** (gelöscht in `0de9abe`, „Toten Code entfernt").
> Die Engine braucht genau drei Dateien: `game_data.js`, `app/history_data.js`, `game_engine.js`.

Spiellogik-Priorität: plausibel vor perfekt, emergent vor gescriptet.
Ziel: Maximale Token-Effizienz durch chirurgische Code-Eingriffe.

---

## Arbeitsweise & Schema-Pflicht (Höchste Priorität)

**Funktions-Index-Disziplin:** Jede neue/geänderte Funktion muss sofort in `schemas/functions.schema.json` eingetragen werden (Name, Datei, Zeile, kurze Beschreibung).

**Daten-Integrität:** Vor Zugriffen auf `Engine`-State oder `App`-State zwingend das Schema lesen. Rückschlüsse aus dem Code sind untersagt.

**Navigation & Token-Save:** Nutze `functions.schema.json` für Zeilennummern. Bei Abweichungen (>10 Zeilen) sofort `grep -n` nutzen und Schema danach aktualisieren.

### Minimalismus & Sicherheit
- Arbeite immer im Diff-Modus: Zeige nur Änderungen, nie die ganze Datei.
- Lies nur die im Schema identifizierten Blöcke (~200–300 Zeilen).
- Erkläre kurz das Warum einer Änderung, nicht nur das Was.
- Frage nach, bevor du mehr als 3 Stellen gleichzeitig änderst.
- Bei Unklarheiten: kurz nachfragen, nicht blind handeln.

### Mobil-Pflicht (bei JEDER UI-Änderung)
Zielgerät ist primär **Android als Startbildschirm-Tab (PWA, standalone)**. Bei **jeder** UI-relevanten Änderung die **Mobilansicht mitanpassen/prüfen**, nicht nur Desktop.
- Responsive CSS in `template.html` (Media-Queries, u.a. `@media (max-width:768px), (pointer:coarse)`) mitpflegen; Touch-Geräte bekommen via `(pointer:coarse)` immer das Mobil-Layout.
- Stolperfallen: Tabelle darf die **Pkt-Spalte** mobil nicht abschneiden (Standings-Tabelle hat Klasse `.ltab`, dort Spalten scopen); Flex-Zeilen mit `flex-shrink:0` am Namen brechen auf schmalen Spalten → Name schrumpfbar + Ellipsis. Pull-to-Refresh in `app/pulltorefresh.js` (Schwelle + Halten).

---

## Spiellogik testen: headless in Node (ohne Browser)

Die Engine ist **DOM-frei** bis auf wenige `localStorage`/`document`-Zugriffe. Für alles, was nur
Spiellogik über viele Saisons prüft (Ligagrößen, Auf-/Abstiegsbilanzen, Balancierung), ist Node
der richtige Weg: **~0,5 s pro Saison**, kein Server, kein Playwright.

```bash
node tools/sim_headless.cjs drift  60 4            # alle Ligen gegen ihr min/max-Band
node tools/sim_headless.cjs trend  120 3 6-6       # wächst die Liga oder pendelt sie?
node tools/sim_headless.cjs bands  60 4 6-6 7-8    # Größenverteilung + Band-Varianten
```

Eigene Analyse aufsetzen – die Shims sind das ganze Geheimnis:
```js
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16:s=>s, decompressFromUTF16:s=>s };
['game_data.js','app/history_data.js','game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
Engine.init();
for (…) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
```
> `const` → `var` ist nötig, sonst erzeugt `eval` im globalen Scope keine globalen Bindings.

**Grenze:** Sobald `App.*`, Layout oder Mobilansicht im Spiel sind, reicht das nicht – dann die
**run-Skill** (Playwright) benutzen, und zwar gegen **`template.html`**. `index.html` ist der von
`manage-v` gebaute Monolith und enthält Modul-Änderungen erst nach dem nächsten Build.

### Ligagrößen-Bänder ändern (Reihenfolge einhalten)
1. `trend` über **≥100 Saisons** – eine breite Verteilung kann bloß die Einlaufphase sein (Liga
   springt einmalig vom Startwert auf ihr Niveau). Steht dort „WÄCHST WEITER", ist ein breiteres
   Band nur eine Vertagung; dann Ursache suchen, nicht die Zahl anheben.
2. Erst bei „stabil, pendelt" die Verteilung aus `bands` als Grundlage nehmen – **Modus, nicht Ø**.
3. `min` ist der SCHRUMPF-Schutz (cancelt Abstiege). Ihn anzuheben *drückt die Liga aktiv nach
   oben*, statt sie nur zu deckeln – im Zweifel niedrig lassen und nur `max`/`target` bewegen.
4. Nachher `drift` gegenrechnen. Die **Gesamtzahl** driftender Ligen schwankt stark je Zufallsseed
   – vergleichbar sind nur die Einzelliga-Werte.

---

## Karte: Mini-Polygone („Narben") beseitigen

Splitter, die nichts abdecken, aber einen Haarstrich in eine Fläche zeichnen. Routine:

```bash
python -m http.server 3334          # zweite Konsole
node tools/karte_narben.mjs         # meldet Narben mit Region; Exit 1 = Befund
python tools/gen_regions.py         # nach einer Korrektur neu erzeugen
node tools/karte_narben.mjs         # muss 0 melden
```

**Erkannt wird an der BREITE, nicht an der Fläche.** Ein 5 km langes, 5 m schmales Band hat
0,025 km² und überlebt jede Flächenschwelle:

```
breite = 2 · Fläche / Umfang      metrisch (cos-Breitengrad), Schwelle 166 m
```

Die Schwelle entspricht der Vereinfachungstoleranz `SIMPLIFY` — was schmaler ist als sie, besteht
nur aus ihrem Fehler. Echte Kleininseln (Fehmarn, Rügen, Bremerhaven) sind kompakt und damit um
Größenordnungen breiter; sie bleiben.

> **Die Regionen-Ebene hat DREI Erzeuger.** Wer nur einen filtert, sieht den Fehler weiterhin:
> 1. Waben (Voronoi je Verein) — `tools/gen_regions.py`, `waben_export`
> 2. statische Regionsflächen — `tools/gen_regions.py`, Ausgabe-Schleife
> 3. Laufzeit-Vereinigung — `app/map_saison.js`, `_wabenUnion`
>
> Alle drei müssen dieselbe Schwelle benutzen (`MINI_BREITE_M`, beide Dateien), sonst verwirft der
> Generator Splitter, die die Laufzeit gleich wieder erzeugt. **Und metrisch messen** — in Grad
> hinge die Schwelle von der Ausrichtung des Splitters ab (0,0015° sind nord-süd 166 m, ost-west
> auf 53° Breite nur ~100 m).

**Nicht raten, welche Ebene schuld ist** — `tools/karte_narben.mjs` misst, was der Browser
tatsächlich zeichnet, und nennt über das Tooltip-Label die Region. Ein Blick in die Dateien auf
der Platte übersieht Erzeuger 3 zwangsläufig.

---

## Bestätigungs-Dialog (Git, Push, manage-v)
Vor Schritten mit Wirkung auf **Remote**, **Archiv** oder **Versions-Script** immer zuerst nachfragen:
- **„1"** = ja ausführen, **„2"** = nein, oder **y** / **n**

Betrifft mindestens: **`./manage-v`**, **`git push`**, manuelle Commits.
**Nicht** eigenmächtig pushen oder `manage-v` starten – erst Rückmeldung abwarten.
**Ausnahme:** Nutzer formuliert eindeutig (z.B. „push ausführen") – das zählt als Bestätigung.

---

## Schema-Inventur nach jedem Coding-Task (PFLICHT)
Nach jedem Task der neue Funktionen hinzufügt:
1. `python tools/schema_check.py` – prüft in einem Lauf: **Lücke** (Funktion im Code, nicht im Schema), **Karteileiche** (Eintrag ohne Definition), **Drift** (Zeilennummer >10 daneben). Exit 1 = Befund
2. Bei Befund: Nutzer **unaufgefordert** darauf hinweisen. Neue Funktionen von Hand eintragen (`"file"` + `"line"` + `"desc"`); reine Zeilennummern-Drift erledigt `python tools/schema_check.py --fix` (ändert NUR Zeilennummern, Formatierung + Beschreibungen bleiben)
3. Erst danach `./manage-v`-Befehl vorschlagen
4. **Nach `manage-v` nochmal `--fix` laufen lassen** – der Build schreibt den Changelog in
   `app/modal.js` und verschiebt dadurch jede Funktion darunter (zuletzt 27 Einträge auf einen
   Schlag). Diese Drift entsteht *durch den Build*, die Prüfung davor sieht sie nie. Gehört mit
   in den Nachtrags-Commit.
> Warum: Zeilennummern verschieben sich bei jedem Edit still. Im Juli 2026 waren 130 von 234 Einträgen falsch – das Schema navigierte in die Irre, statt Token zu sparen.

---

## Automatisierter Versions-Workflow
Sobald ein Task abgeschlossen ist, `./manage-v` vorschlagen. Ausführung erst nach Bestätigung.

```bash
./manage-v -NewVersion "0.1.1" -CommitMsg "Fix: Beschreibung" -ChangelogPoints "NEU: Feature;FIX: Bug"
```

**Wrapper:** `manage-v` (ohne Extension) ruft `manage-v.ps1` via PowerShell auf – direkt aus Git Bash nutzbar.
Das Script patcht VERSION, Titel, Changelog in index.html → erstellt `bundesliga-vX.X.X.html` → archiviert alte Version → git commit + push.
> ⚠️ Versionsnummer nie wiederverwenden (Korrektur → nächste Nummer); doppelter Build verschiebt den Root-Snapshot ins `archive/` und bricht den nächsten Lauf.

### Vereinswappen (ab v0.3.46)
- Wappen als Dateien in `Wappen/Vereinswappen/{teamId}.png` (oder `.svg`)
- `game_data.js` referenziert nur den Pfad: `"thumb": "Wappen/Vereinswappen/{teamId}.png"`
- `manage-v` bettet alle `Wappen/...`-Pfade beim Bauen automatisch als Base64 ein → Monolith bleibt standalone
- **Neue Wappen hinzufügen:** Datei in `Wappen/Vereinswappen/` ablegen, `thumb`-Feld in `game_data.js` setzen – fertig

---

## Versionierung
- **Hotfix** (3. Stelle, z.B. 0.1.0 → 0.1.1): Bugfix oder kleine UI-Änderung
- **Patch** (2. Stelle, z.B. 0.1.x → 0.2.x): Abgeschlossene Feature-Gruppe
- **Minor** (1. Stelle, z.B. 0.x → 1.x): Mehrere Feature-Gruppen abgeschlossen
- **v1.0**: Alle Kernfeatures fertig (Ligabetrieb, Transfers, Saison-Archiv, Mobile-UI)

Versionsnummer steht im `<title>`-Tag und in der `VERSION`-Konstante in `index.html`.

---

## Changelog pflegen (PFLICHT bei jeder Versionsänderung)
- Changelog befindet sich im Einstellungen-Bereich der HTML (grep: `<!-- CHANGELOG -->`)
- Format: `v0.1.1 (aktuell)` in grün, darunter `• NEU:` / `• FIX:`-Punkte
- manage-v erledigt das automatisch über `-ChangelogPoints`

---

## Neues App-Modul hinzufügen
1. `app/xxx.js` erstellen: `Object.assign(App, { method: function() {...} });`
2. `index.html`: `<script src="app/xxx.js"></script>` einfügen
3. `manage-v.ps1`: `"app/xxx.js"` zur `$JsFiles`-Liste hinzufügen
4. `schemas/functions.schema.json` aktualisieren
> Faustregel: logisch zusammenhängende Gruppe >150 Zeilen → eigenes Modul.

---

## Schemas (Navigations-Zentrale)

| Datei | Inhalt |
|---|---|
| `schemas/functions.schema.json` | Index aller Funktionen mit Datei, Zeilennummer + Zweck (Pflicht!) |

Schemas bei Strukturänderungen oder größeren Edits mitpflegen.
Zeilennummern verschieben sich – nach signifikanten Edits aktualisieren.

---

## Nach PC-Neustart
1. Git Bash im Projektordner öffnen
2. Weiterarbeiten – kein Server nötig, index.html direkt im Browser öffnen
