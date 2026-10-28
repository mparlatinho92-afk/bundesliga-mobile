# Vereinsbestand: fehlende Vereine der laufenden Saisons

Nutzer 28.10.2026 (Sheet): „Röchling Völklingen, Solingen-Wald + andere aktuelle (2026/27) fehlenden Mannschaften überhalb der
Bodenligen. Zielliga vorerst: Amateurpokal. Bonus: 2025/2026. Mannschaften könnten schon als historische Mannschaften im Spiel sein.
Es geht um die Teilnahme in der Sim.“

## Kette

```
node tools/kader_aktuell.mjs          # Saisonartikel 2026/27 + 2025/26 je Liga über den Bodenligen -> tools/_dryrun/kader_aktuell.txt
                                      # (Cache %TEMP%/kader_wiki_cache; Schreibweisen in tools/kader_aktuell_korrektur.json)
node tools/kader_neu_einbau.cjs       # tools/kader_neu.json (von Hand geprüft) -> game_data.js, ligalos (leagueId null)
python tools/stadion_gemeinden.py && node tools/stadion_gemeinden_einbau.cjs && node tools/stadion_gemeinden_test.cjs
node .claude/skills/run/kader_neu_check.mjs    # Browser: Amateurpokal + Steckbrief (mit --selbsttest)
```

## Regeln

- **Über den Bodenligen** = Ligen mit Kindern in `Engine.DOWN_MAP` oder Ebene < 5 (Bodenliga-Definition wie der Amateurpokal):
  Ebene 1–5 komplett, Verbandsliga Südwest, Rheinland-, Saarland-, Berlin-Liga, Landesliga Südwest Ost/West (28 Ligen).
  Landesliga Südwest Ost/West hat keinen Saisonartikel auf de.wikipedia – Lücke.
- **Erst Schreibweise, dann neu.** Von 54 Rohtreffern waren 43 nur anders geschrieben („SC V/W Billstedt“ = SC Vorwärts-Wacker 04,
  „Sportfreunde Johannistal“ = Johannisthal, „TBS Pinneberg“ = Türk Birlikspor Pinneberg). Nächster Verein per Koordinate entlarvt das
  am schnellsten (0,3 km).
- **Historische ID übernehmen**, wenn der Verein dort schon steht (`hist_fa_*`, `hist_fb_*`, `hist_*`): dann läuft seine Geschichte
  (Ewige Tabellen, Ligazugehörigkeit, Aufstiegsrunden) im Steckbrief weiter. Kein Code behandelt das Präfix `hist_` gesondert.
- Ligalose Vereine und Reserven bekommen aus dem Stadion **keine Vereinsgröße** (`_vereinsGroesse`: nur mit Startliga, nie Reserven) –
  es zählt nur der Standort (Gemeinde/Einwohner). Deshalb Koordinaten in der richtigen Gemeinde wichtiger als Platzname/Kapazität;
  Reserven übernehmen die Spielstätte der Ersten. „Kesselblick“ (Young Boys) lag laut OSM in Engstingen → Ort Reutlingen.
- Die Sim läuft der Realität nicht hinterher: Vereine, die schon im Spiel sind, bleiben in ihrer Sim-Liga (TBS Pinneberg spielt real
  2026/27 Oberliga Hamburg, in der Sim tiefer) – nur Fehlende kommen dazu.
- Regionen-Chips, Regions-Vereinsliste und Kartenfilter lesen die Kartendatei (`MAP_TEAM_REGIONS`, Excel-Übersicht). Für Vereine, die
  dort fehlen, nimmt `App._teamRegionen` seit v0.8.228.45 `team.regions` aus game_data (gemessen: 1259 von 1261 Vereinen tragen in beiden
  Quellen dieselben Labels). Karte: Punkte kommen aus game_data; eine eigene WABE (Fläche, `MAP_WABEN`, nach Vereinsnamen) haben neue
  Vereine erst nach einem Neubau der Karte – gemessen liegen alle in der Wabe eines Nachbarn derselben Staffel (oder in einem
  ungeteilten Verband), nach einem Aufstieg folgt die Fläche aber der Liga des Nachbarn.
