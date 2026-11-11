# Dateien und Module – Langfassung

> Ausgelagert aus CLAUDE.md am 11.11.2026 (wörtlich). In CLAUDE.md steht nur noch die Kurzliste.

Modular aufgeteiltes HTML-Projekt (seit v0.3.43). `manage-v` inliniert alle Module → GitHub Pages Monolith bleibt standalone.

| Pfad | Inhalt |
|---|---|
| `template.html` | HTML-Gerüst + CSS (kein JS) – Quelldatei für manage-v |
| `index.html` | Monolith (GitHub Pages + Handy) – von manage-v generiert, nie manuell editieren |
| `app/` | App-UI-Module – thematisch aufgeteilt, `manage-v` inliniert alle |
| `game_engine.js` | Spiellogik (`Engine`-Objekt) |
| `game_data.js` | Statische Ligadaten (Ligen mit `min`/`max`/`target`, Teams, Wappen-Pfade) |
| `app/history_data.js` | `HISTORY_SEED` + `RELEGATION_SEED` – historische Abschlusstabellen |
| `app/history_ext.js` | **erzeugt** von `tools/historie_einbau.mjs`: Ebene 2–3 vor dem Sim-Start (BRD 1963–2024, DDR 1963–91), Ebene 4 vor 1994 (Landes-/Verbandsligen, 2. Amateurligen; s. `docs/EBENE4_PROBELAUF.md`), Oberligen 1994–2008 (Ebene 4), Verbandsligen Ebene 5 1994–~2001 und Vorläufer der Landes-/Bezirksligen ab 1978 (`docs/EBENE5_1994.md`), Spiel-Ligen Ebene 5–8 ab 2001 aus fussball.de (`fe`/`an`, s. `docs/FBDE_EBENE58.md`), Tabellen gzip+base64 – nie von Hand ändern. `ligaNachfolger`: historische Liga → heutige Liga (nur eindeutige Fälle, s. `docs/HISTORIE_DRYRUN.md`; seit v0.8.228.29 88 Ligen unter 35, Hinweis über der Ewigen Tabelle) |
| `app/aufstieg_data.js` | **erzeugt** von `tools/aufstieg_einbau.mjs`: Aufstiegsrunden, Entscheidungsspiele und Relegation zu Bundesliga / 2. Bundesliga / 3. Liga (1963/64–2024/25) – nie von Hand ändern |
| `app/europa_data.js` | **erzeugt** von `tools/europa_einbau.mjs`: Europapokal-Startplätze der Bundesliga je Saison 1963/64–2024/25 – nie von Hand ändern |
| `app/einzelspiele_data.js` | **erzeugt** von `tools/einzelspiele_einbau.cjs`: Spielrekorde (höchster Sieg/Niederlage, torreichstes Spiel) aus ~200.000 historischen Einzelspielen, offline vorgerechnet – nie von Hand ändern |
| `app/pokal_hist_data.js` | **erzeugt** von `tools/pokal_hist_einbau.mjs`: alle Hauptrunden-Spiele des DFB-/Tschammerpokals 1935–2024/25 (de.wikipedia), Anzeige in `app/pokal_hist.js` – nie von Hand ändern, s. `docs/POKAL_HISTORIE.md` |
| `app/amateur_dm_data.js` | **erzeugt** von `tools/amateur_dm_einbau.mjs`: Deutsche Amateurmeisterschaft 1951–1998 je Jahr Teilnehmer + Runde + Teilnahmegrund + alle Spiele (de.wikipedia), Anzeige ganz unten im Steckbrief und als letzter Seitenleisten-Eintrag (`app/amateur_dm.js`, `__amdm__`) – nie von Hand ändern, s. `docs/AMATEURMEISTERSCHAFT.md` |
| `app/liga_chronik_data.js` | **erzeugt** von `tools/liga_chronik.mjs`: je Liga erste/letzte Saison in den Daten + Gründung laut de.wikipedia (···-Menü „Ligen-Chronik“, `app/liga_chronik.js`) – nie von Hand ändern, nach jedem Historie-Neuaufbau neu, s. `docs/LIGA_CHRONIK.md` |
| `app/aufstieg.js` | `App.showAufstieg`: eigener Wettbewerbs-Einstieg (`__aufstieg__`) mit Reitern je Ziel-Liga + Bilanz |
| `app/nav_stil.js` | **geschrieben vom Stil-Modus** (··· → 🎨 Stil-Modus → Speichern): drei Namen je Liga (mittel/kurz), Schrift/„…“/Pfeile je Geschwisterblock, Seitenleisten-Schrift – nie von Hand ändern. Der Nutzer stellt am echten Spiel ein, sagt „ok“, dann lesen, prüfen, bauen |
| `app/stil_modus.js` | Stil-Modus: `template.html?stil` = Editor, `?stilvorschau` = eingefrorenes Spiel im Rahmen (liest den Spielstand, schreibt nichts – Wächter im `<head>`, `idb_store.js` writeTx, `initTabLock`) |
| `app/hist_ext.js` | `HistExt`: entpackt `history_ext.js` erst bei Bedarf, mischt Vereins-/Era-Namen; Engine faltet daraus asynchron die Ewigen Tabellen |
| `data_reports.js` | Textkorpus für Spieltags-Schlagzeilen (von Fable geschrieben) |
| `Wappen/` | Vereins- und Liga-Logos |
| `schemas/` | Navigations-Schemata (functions.schema.json) |
| ~~`archive/`~~ | **entfällt seit v0.8.96** – s. `docs/MANAGE_V_ARCHIV.md` |
| `tools/` | Analyse-/Crawl-Skripte, nicht Teil der App |

> `data_live.js` / `data_logic.js` gibt es **nicht mehr** (gelöscht in `0de9abe`, „Toten Code entfernt").
> Die Engine braucht genau drei Dateien: `game_data.js`, `app/history_data.js`, `game_engine.js`.
> Die historischen Ligen sind optional (`typeof HistExt`-Guard); mitprüfen: `node tools/historie_einbau_test.cjs` (mit `--selbsttest`).

## Neues App-Modul hinzufügen
1. `app/xxx.js` erstellen: `Object.assign(App, { method: function() {...} });`
2. `template.html`: `<script src="app/xxx.js"></script>` einfügen (nie `index.html`, das baut manage-v)
3. `manage-v.ps1`: `"app/xxx.js"` zur `$JsFiles`-Liste hinzufügen
4. `schemas/functions.schema.json` aktualisieren
> Faustregel: logisch zusammenhängende Gruppe >150 Zeilen → eigenes Modul.

## Vereinswappen (ab v0.3.46)
- Wappen als Dateien in `Wappen/Vereinswappen/{teamId}.png` (oder `.svg`)
- `game_data.js` referenziert nur den Pfad: `"thumb": "Wappen/Vereinswappen/{teamId}.png"`
- `manage-v` bettet alle `Wappen/...`-Pfade beim Bauen automatisch als Base64 ein → Monolith bleibt standalone
- **Neue Wappen hinzufügen:** Datei in `Wappen/Vereinswappen/` ablegen, `thumb`-Feld in `game_data.js` setzen – fertig

## Nach PC-Neustart
Git Bash im Projektordner öffnen, weiterarbeiten – kein Server nötig, index.html direkt im Browser öffnen.
