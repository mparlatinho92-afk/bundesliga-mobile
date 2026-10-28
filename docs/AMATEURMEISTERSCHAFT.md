# Deutsche Amateurmeisterschaft 1951–1998

Eingebaut am 28.10.2026 (Nutzer: „historie wird in mannschafts-steckbriefen erwähnt. kommt nach ganz unten, da nicht mehr aktiv.
ich denke, neue IDs wird es kaum geben, weil es fast immer die amateurelite war“ – stimmt: 285 Vereine, 3 neu).

## Kette

```
node tools/wiki_pokal.mjs --amateur            # 48 Saisonartikel de.wikipedia -> tools/wiki_amateur.json (Cache %TEMP%/ama_wiki_cache)
node tools/wiki_pokal_zuordnung.mjs --amateur  # Namen -> IDs -> tools/wiki_amateur_ids.json, Bericht tools/_dryrun/wiki_amateur_zuordnung.txt
node tools/amateur_dm_einbau.mjs               # -> app/amateur_dm_data.js (ERZEUGT, nie von Hand ändern)
node tools/amateur_dm_test.cjs                 # Meister/Vize gegen den Hauptartikel, Reserve, IDs (mit --selbsttest)
node .claude/skills/run/amateur_dm_check.mjs   # Browser, Desktop + Handy (mit --selbsttest)
```

Scraper und Zuordnung sind die des DFB-Pokals (`docs/POKAL_HISTORIE.md`), mit Schalter `--amateur`. Gleiche Vorlagen
(`OneLegResult`, `TwoLegResult`, `Fußball Gruppenspiel`); dazu Gruppentabellen ohne Einzelspiele (`Fußballtabelle/Zeile`, Vorrunde
1953–55, Endrunde 1998), die Teilnehmerliste (Gegenprobe) und der Meister aus der Infobox.

## Zuordnung

Zusätzliche Stufe **P**: dieselbe Nennung (Link bzw. Name, Reserve gleich) ist im DFB-Pokal schon eindeutig zugeordnet (179 Nennungen).
Korrekturen mit Beleg in `tools/wiki_amateur_korrektur.json` (die Pokal-Korrekturen gelten mit). Neue IDs `hist_am_*`: VfL Konstanz (1952),
FC Urbar (1953/54), SC Rapid Köln (1954, Vorgänger von Viktoria Köln über Fusion 1957). Ohne Steckbrief, nur Name in `AMATEUR_DM.namen`.

Fallen, gemessen:
- **„Werder Bremen Am.“ ist die Reserve.** Das Reserve-Muster verfehlte „ Am.“ (`\sAmat?` verlangt „Ama“) – im DFB-Pokal stehen
  dadurch 9 Reservespiele (1991/92, 1998/99) bei der Ersten. Muster am 28.10.2026 korrigiert, Pokal neu gebaut (genau diese 9 Spiele
  gewandert, v0.8.228.43). Stufe P prüft die Reserve trotzdem selbst, statt der Pokal-Zuordnung blind zu folgen.
- Teilnehmertabellen verlinken die Reserve oft auf die Erste („[[Werder Bremen]]“) – nur Gegenprobe, nie Quelle.
- Das Projekt führt einige Vereine unter dem Nachfolger (Hombrucher FV 09, Meister 1958 → `hombruchersv_1259`, BVL 08 Remscheid
  1986 → FC Remscheid); die Amateurmeisterschaft folgt dem Projekt wie der Pokal. 1968 Marathon Remscheid und 1974 VfB Remscheid
  bleiben getrennt (Fusion 1971, `hist_fusion`).

## Stufen

M Meister · F Finale · E Endrunde (1998 Dreiergruppe) · HF · VF · AF · G Gruppenphase (1953–55, 1991–94) · VR Vorrunde · Q Ausscheidungsspiel
(1956–64). Rundennamen wechseln je Jahrgang („1. Runde“ = 1971 Achtelfinale, 1979 Viertelfinale) – ohne festen Namen zählt die
Vereinszahl der Runde. Meister = Infobox; 1979 (Hin-/Rückspiel, Infobox „ESV Ingolstadt-Ringsee“, Finale „ESV Ingolstadt“) aus den Toren.

## Anzeige

`app/amateur_dm.js` `_sbAmateurDM`: letzter Abschnitt im Steckbrief (nach Pokalverlauf/Testspielen), neueste zuerst, Finale mit Ergebnis
aus eigener Sicht und Gegner (verlinkt, sofern er einen Steckbrief hat). „als …“ nur bei echtem Namenswechsel, nicht bei
Reserve-Schreibweisen. Kein Trophäen-Chip oben, keine Ewige Tabelle – nur das Erwähnen im Steckbrief war bestellt.
