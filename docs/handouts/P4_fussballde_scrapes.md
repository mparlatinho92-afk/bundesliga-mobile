# P4 – fussball.de-Scrapes weiterführen (grobe Richtung, Google Drive)

**Anhängen:** `00_KONTEXT.md` + diese Datei. Das Colab-Notebook („cookie cutter“) und die bisherigen
CSVs liegen in Google Drive des Nutzers, dort direkt öffnen.
**Ergebnis:** neue CSVs in Drive + kurzer Bericht `P4_bericht.md` (was gescrapt wurde, was offen ist).

## Stand am PC (23.09.2026)
- `tools/fussballde_bestand.mjs` erzeugt `tools/fussballde_bestand.json` mit **183 bereits vorhandenen
  fussball.de-Staffel-IDs** (exakter Abgleich) und einer Liste aller Tabellen, die das Spiel schon aus
  anderen Quellen hat: Spiel-Historie, f-archiv-CSV, Wikipedia-Ergänzung. Abgleich über normalisierte
  Namens-Tokens. **Die Regel dazu steht im Notebook** (`toks()`), und sie muss mit dem Skript identisch bleiben.
- fussball.de führt Tabellen erst ab ca. **2004/05**, das Skript betrachtet ab 2000.
- Bisher bereinigt vorhanden: `hamburg_tabellen_bereinigt.csv` (in Downloads am PC).

## Aufgabe
1. Im Notebook nachsehen, **wo es stehen geblieben ist** (letzter Verband/letzte Saison) und das kurz im
   Bericht festhalten, bevor irgendetwas weiterläuft.
2. Mit dem Nutzer entscheiden, welcher Verband als Nächstes dran ist. Priorität haben Ligen, die im Spiel
   existieren (Ebene 5–8), vor rein historischen.
3. Weiter scrapen, **Bestand überspringen**. Ohne aktuelle `fussballde_bestand.json` in Drive: nur Verbände
   angehen, die noch gar nicht angefasst wurden.
4. Je Verband eine CSV im selben Format wie `hamburg_tabellen_bereinigt.csv`.

## Wenn etwas nicht passt
- Ändert fussball.de die Seitenstruktur oder sperrt, **anhalten und melden**, nicht umgehen.
- Anmerkungen wie Rückzug oder Punktabzug in eine Spalte `vermerk` übernehmen, nicht in die Zahlen einrechnen.
- Staffeln nie zusammenwerfen. Das war der Fehler im f-archiv-Bestand.

## Zurück am PC
`node tools/fussballde_bestand.mjs <neue CSVs>` aktualisiert den Bestand. Der Einbau ins Archiv ist ein
eigener Schritt und nicht Teil dieses Pakets.
