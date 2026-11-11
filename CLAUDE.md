# Bundesliga Architect – Claude Regeln

Modulares HTML-Projekt. `template.html` + `app/*.js` + `game_engine.js` + `game_data.js` sind die Quellen; `manage-v` inliniert
alles zum Monolithen `index.html` (GitHub Pages, Handy) – **`index.html` nie von Hand editieren.** Dateien mit „**erzeugt** von
`tools/…`“ (`app/history_ext.js`, `*_data.js`, `app/nav_stil.js`) nie von Hand ändern. Engine braucht nur `game_data.js`,
`app/history_data.js`, `game_engine.js`. Vollständige Dateiliste, neues Modul, Wappen: `docs/DATEIEN.md`.

Spiellogik-Priorität: plausibel vor perfekt, emergent vor gescriptet. Chirurgische Eingriffe, Token sparen.

## Fachthemen – vor Arbeit am Thema die Datei lesen

Neues Fachwissen kommt nach `docs/THEMA.md`, hier nur eine Zeile mit der Kurzregel. Ab 250 Zeilen bekommt eine Themendatei oben
`## Kurzfassung` (≤ 20 Zeilen). **Diese Datei bleibt unter 200 Zeilen** (`manage-v` warnt).

| Thema | Datei | Nie vergessen |
|---|---|---|
| Arbeitsregeln (Langfassung) | `docs/ARBEITSREGELN.md` | Herkunft der Regeln unten |
| Historische Vereine | `docs/HISTORIE_VEREINE.md` | **vor jeder Arbeit daran lesen**; `historie_dryrun.mjs` nie ohne Zwischenspeicher; vor jedem Einspielen `historie_neuaufbau_vergleich.cjs`; neue Lieferung = ID-Anker; gemeinsame Saison = Fusion |
| Archiv-Ziellinks | `docs/ARCHIV_NAVIGATION.md` | laufende Saison rendert in `loadLeague`, Archiv in `_renderArchivedSeason` – BEIDE anfassen; Prüfung klickt |
| Europapokal-Startplätze | `docs/EUROPAPOKAL.md` | Daten je Saison (`app/europa_data.js`), keine feste Regel; gilt nur für `lid === '1'` |
| Einzelspiele → Rekorde | `docs/EINZELSPIELE.md` | Zuordnung über die Zahlen; ein Spiel zählt nur, wenn BEIDE Vereine die Gegenprobe bestehen; Saison heißt `1999/2000` |
| Ebene 5–8 aus fussball.de | `docs/FBDE_EBENE58.md` | `fe:1` = damals andere Ebene (Schalter, Standard an); unvollständige Saisons stellen keinen Zählrekord |
| Gemeinde/Einwohner, Standort, Dynastien | `docs/STANDORT_STAERKE.md` | nach jeder Koordinaten-/Stadionkorrektur die drei Gemeinde-Befehle wiederholen; je Einstellung ≥ 4 Läufe |
| Aufstiegsrunden, Relegation | `docs/AUFSTIEGSRUNDEN.md` | nie in eine Ewige Tabelle; Gruppenspiel ≠ Duell; Plan rechnet mit `getPromotionInfo` wie die Simulation |
| Tormodell gegen echte Daten | `docs/TORMODELL_PRUEFUNG.md` | nach jeder Änderung `node tools/tor_pruefung.cjs 14` + `node tools/sensation_check.cjs`; Schnitt, Verteilung UND Balance, alle acht Ebenen |
| Kalibrierung Tormodell/Stärken | `docs/SPIELLOGIK_KALIBRIERUNG.md` | zehn verworfene Ansätze mit Zahlen – vorher lesen, nicht erneut probieren |
| Ligabetrieb, Drift, Rekorde | `docs/LIGABETRIEB.md` | „nie 0 %“; Drift-Referenz = echter Spielstand mit 214 Saisons; Rekorde aus `seasonResults`, nie `matchdayHistory` (fastMode filtert) |
| Headless-Sim, Ligagrößen-Bänder | `docs/HEADLESS_SIM.md` | Node-Shims statt Browser; Band-Änderung erst nach `trend` ≥ 100 Saisons, Modus statt Ø, `min` niedrig lassen |
| Karte: Mini-Polygone | `docs/KARTE_NARBEN.md` | drei Erzeuger, überall `MINI_BREITE_M`, metrisch, Breite statt Fläche; `node tools/karte_narben.mjs` |
| Historischer DFB-Pokal | `docs/POKAL_HISTORIE.md` | Maßstab = offizielle Ewige Tabelle (nur Hauptrunden, Quali raus, Wertung zählt, i.E. = U); `pokal_ewig_vergleich.mjs --ids` + `pokal_hist_test.cjs` |
| Ligen-Chronik | `docs/LIGA_CHRONIK.md` | Vorlauf ab frühester Saison aller Ligen desselben Artikels + Vorgänger; Artikel nur bei genauem Titel, Jahr nach Datenbeginn verworfen |
| Fehlende Vereine (laufende Saison) | `docs/VEREINSBESTAND.md` | erst Schreibweise prüfen (nächster Verein per Koordinate), dann historische ID übernehmen, ligalos = Amateurpokal; Gemeinde-Kette danach |
| Deutsche Amateurmeisterschaft | `docs/AMATEURMEISTERSCHAFT.md` | Pokal-Kette mit `--amateur`; „Am.“ = Reserve; Teilnehmerliste ist Instanz für Reserve; Rückspiel-Fettung = Tagessieger; `amateur_dm_test.cjs` |
| Punktabzug, Verzicht, Zwangsabstieg, Rückzug | `docs/STRAFEN_RUECKZUG.md` | Werte gemessen, nicht geschätzt; fest je Spielstand+Verein+Saison; Zwangsabsteiger zählt als Absteiger seiner Liga; `strafen_check.cjs` + Drift vor/nach |
| Patch-Skripte | `docs/PATCHSKRIPTE.md` | `\\` überlebt die Bash-Zeile nicht (auch kein Heredoc) → Skript mit dem Write-Tool anlegen; alle Ersetzungen einmal am Schluss schreiben; Anker aus der Datei kopieren |
| manage-v, drei Stände | `docs/MANAGE_V_ARCHIV.md` | kein `archive/`, die drei neuesten `bundesliga-v*.html` bleiben |
| Fix-Liste ↔ Google Sheet | `docs/fixes-sync/KONZEPT.md` | s. unten |

## Arbeitsregeln (Langfassung + Herkunft: `docs/ARBEITSREGELN.md`)

- **Wiederkehrender „behobener“ Fehler = zuerst alter Datenbestand prüfen, nicht die Logik.** Zeitstempel in Kennungen verraten
  den Durchlauf. Nie ohne Beleg entwarnen. Ein Quell-Fix heilt alte Spielstände nicht. Gespeichert wird in `localStorage`
  (`ba_save_v66`, `ba_arch_v66`, `ba_res_v66`) **und** IndexedDB (`ba_archive_v1`); nur `App.reset()` leert beide.
- **Widerspricht der Befund dem Auftrag, ist der Auftrag zu Ende.** Befund melden, nicht umdeuten oder erweitern.
- **Eine Prüfung, die nicht durchfallen kann, prüft nichts.** Einmal gegen einen Zustand laufen lassen, in dem sie scheitern
  MUSS. Echte Funktion rufen statt nachbauen; Aufrufer mitlesen; gegen den richtigen Stand prüfen; bei < 3 erwarteten Fällen ist
  eine Null keine Aussage.
- **Fakten selbst nachschlagen** (`tools/hist_verhaeltnis.json`, `tools/hist_fusion.json`, dann Wikipedia) und Befund + Quelle
  + Vorschlag vorlegen; nachfragen nur bei widersprüchlichen Quellen oder Geschmackssache.
- Diff-Modus, nur die betroffenen Blöcke lesen, kurz das Warum erklären. **Vor mehr als 3 Stellen gleichzeitig nachfragen.**
- **Mobil-Pflicht bei jeder UI-Änderung:** Zielgerät Android-PWA. Media-Queries in `template.html` (`(max-width:768px),
  (pointer:coarse)`); Pkt-Spalte der `.ltab` darf mobil nicht abschneiden; Namen schrumpfbar + Ellipsis.
- **Memory-Index** (`MEMORY.md`): eine kurze Zeile je Eintrag – *wann* er relevant ist; was in CLAUDE.md steht, kommt nicht
  zusätzlich in die Memory; Abgeschlossenes nach `memory/_archiv/`. `node tools/memory_check.cjs` (SessionStart-Hook) meldet
  Größe, Waisen und alte Statusmarken (OFFEN, zurückgestellt, historisch …) – dann den Nutzer darauf ansprechen.
- UI-Prüfung im Browser (run-Skill, Playwright) immer gegen **`template.html`**, nicht `index.html`.
- **Außerhalb des Projektordners** (Datei öffnen, Fenster, Desktop/Downloads, externer Dienst): vorher in einem Satz ansagen.
  Ergebnisse an einen Ort legen, den der Nutzer kennt, und den Pfad nennen. Rechte-Fragen mit der echten Konfiguration
  beantworten (`.claude/settings.local.json`); Freigaben als gezielte Muster, nie nackter Tool-Name.

## Schema-Pflicht

- Jede neue/geänderte Funktion sofort in `schemas/functions.schema.json` (Name, Datei, Zeile, Beschreibung). Vor Zugriff auf
  `Engine`-/`App`-State das Schema lesen; Zeilennummern von dort, bei Abweichung `grep -n`.
- Nach jedem Coding-Task `python tools/schema_check.py` (Lücke, Karteileiche, Drift; Exit 1 = Befund → Nutzer unaufgefordert
  hinweisen; reine Drift mit `--fix`). Erst danach `./manage-v` vorschlagen. Build-Drift zieht `manage-v` selbst nach.

## Fix-Liste mit Google-Sheet-Spiegel

`FIXES_OFFEN.md` ist die Quelle, das Sheet [Bundesliga Fixes – Ist-Stand](https://docs.google.com/spreadsheets/d/1-HxK0Q9Q-qjm7o4RpbuFcUqxggs2JTJpsGyktR9YeYU/edit)
ihr Spiegel (Nutzer trägt vom Handy ein). Der Stop-Hook (`node tools/spiegel-fixes.cjs --hook`) nennt die Schritte: **vor jedem
Überschreiben** `Fixes!A:F` lesen und per `--uebernehmen` holen, ✚-Zeilen nie löschen oder umformulieren; bei neuer Version
Changelog gegen offene Punkte (`--seit`, `--geprueft`). Fallen (de_DE `;`, Apostroph vor jeder Zelle): `docs/fixes-sync/KONZEPT.md`.

## Build, Git, Versionen

- **Bestätigung vor `./manage-v`, `git push` und manuellen Commits:** „1“/y = ja, „2“/n = nein. Nie eigenmächtig; nur eine
  eindeutige Formulierung („push ausführen“) zählt als Bestätigung.
- Nach abgeschlossenem Task vorschlagen:
  `./manage-v -NewVersion "0.1.1" -CommitMsg "Fix: …" -ChangelogPoints "NEU: Feature;FIX: Bug"` (Wrapper ruft `manage-v.ps1`).
  Das Script patcht VERSION, Titel, Changelog (`app/modal.js`), baut `index.html` + `bundesliga-vX.X.X.html`, behält drei Stände,
  committet und pusht.
- **Versionsnummer nie wiederverwenden** (nach Abbruch erst `git log` prüfen). Kleine Schritte: kleine Nachträge = 4. Stelle
  (vorher fragen, ob der Inhalt reicht – „sonst version zu dünn“), sonst 3. Stelle; 2./1. Stelle nur auf ausdrücklichen Wunsch.
  v1.0 = Ligabetrieb, Transfers, Saison-Archiv, Mobile-UI fertig.
- Changelog in `app/modal.js` (`<!-- CHANGELOG -->`) pflegt `manage-v` über `-ChangelogPoints`.
