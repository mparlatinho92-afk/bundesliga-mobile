# Bundesliga Architect – Claude Regeln

## Projektkontext
Modular aufgeteiltes HTML-Projekt (seit v0.3.43). `manage-v` inliniert alle Module → GitHub Pages Monolith bleibt standalone.

| Pfad | Inhalt |
|---|---|
| `template.html` | HTML-Gerüst + CSS (kein JS) – Quelldatei für manage-v |
| `index.html` | Monolith (GitHub Pages + Handy) – von manage-v generiert, nie manuell editieren |
| `app/` | App-UI-Module – thematisch aufgeteilt, `manage-v` inliniert alle |
| `game_engine.js` | Spiellogik (`Engine`-Objekt) |
| `game_data.js` | Statische Ligadaten |
| `data_live.js` / `data_logic.js` | Hilfsdaten |
| `Wappen/` | Vereins- und Liga-Logos |
| `schemas/` | Navigations-Schemata (functions.schema.json) |
| `archive/` | Versionierte HTML-Snapshots |

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

## Bestätigungs-Dialog (Git, Push, manage-v)
Vor Schritten mit Wirkung auf **Remote**, **Archiv** oder **Versions-Script** immer zuerst nachfragen:
- **„1"** = ja ausführen, **„2"** = nein, oder **y** / **n**

Betrifft mindestens: **`./manage-v`**, **`git push`**, manuelle Commits.
**Nicht** eigenmächtig pushen oder `manage-v` starten – erst Rückmeldung abwarten.
**Ausnahme:** Nutzer formuliert eindeutig (z.B. „push ausführen") – das zählt als Bestätigung.

---

## Schema-Inventur nach jedem Coding-Task (PFLICHT)
Nach jedem Task der neue Funktionen hinzufügt:
1. `grep -c ": function\|= function" app/*.js game_engine.js` vs. Einträge in `functions.schema.json` vergleichen
2. Wenn Lücke > 0: Nutzer **unaufgefordert** darauf hinweisen und neue Funktionen eintragen (mit `"file"` + `"line"` + `"desc"`)
3. Erst danach `./manage-v`-Befehl vorschlagen

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
