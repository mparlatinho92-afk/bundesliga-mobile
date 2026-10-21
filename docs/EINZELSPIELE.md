# Historische Einzelspiele: Rekorde offline vorgerechnet (v0.8.191)

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Quelle ist das **Scraper-Projekt des Nutzers** auf Google Drive (lokal `G:\Meine Ablage\fussball.de`): Wikipedia-
Kreuztabellen 1963/64–2002/03 (`wikipedia/spiele.csv`), fussball.de je Verband ab 2001/02, dazu openfootball ab 2010/11.
Die App bekommt **keine Einzelspiele**, nur das Ergebnis in den Slot-Formaten von `_recordSeason`.

```bash
node tools/einzelspiele_dryrun.cjs     # Zuordnung + Gegenprobe je Staffel -> tools/einzelspiele_dryrun.json (gitignored)
node tools/einzelspiele_einbau.cjs     # -> app/einzelspiele_data.js
node tools/einzelspiele_test.cjs       # Pruefung, Exit 1 (--selbsttest muss durchfallen); Browser: .claude/skills/run/rekorde_liga_check.mjs
```

**Zuordnung über die Zahlen, nicht über den Namen:** aus den Spielen jeder Staffel die Tabelle nachrechnen und den
Dreier Spiele/Tore/Gegentore in der Spiel-Tabelle derselben Saison suchen (98 % so belegt, Rest Name/Ausschluss).
**Ein Spiel zählt nur, wenn BEIDE Vereine diese Gegenprobe bestehen** – die Wikipedia-Daten tragen keine einzige
Sonderwertung, eine Wertung am Grünen Tisch ist nur an der Abweichung zu erkennen.

> Lücken, die nach „fertig“ aussahen: Bundesliga **2003/04–2009/10** fehlte (Wikipedia endet, openfootball beginnt
> 2010/11) – **seit v0.8.195 geschlossen** über fussball.de, Verband `deutschland/` (BL/2. BL/3. Liga 2001–2024). Die
> Scraper-Lieferung vom 10.10.2026 hatte in `wikipedia/spiele.csv` jedes Spiel doppelt; `einzelspiele_dryrun.cjs` liest
> deshalb je `spiel_id` nur einmal (sonst fallen alle Staffeln durch die Gegenprobe). Die **DDR-Oberliga** ist seit der Lieferung vom 10.10.2026 drin (1963/64–1990/91 zugeordnet), fussball.de unterhalb der Oberliga ist ohne
> Spiel-Tabellen nicht zuzuordnen. **Rundenmodus (seit v0.8.202):** Vorrundengruppen sind eigene Spiel-Tabellen, Spiele
> außerhalb der Hauptrunde werden nur gegen Saisons im Rundenmodus zugeordnet; eine Runde mit übernommenen Vorrundenspielen
> (Bayern Landesliga 2021/22: nur 40 von 72 Spielen) bekommt diese für die Gegenprobe dazu, markiert, und die Rekorde zählen sie
> nur einmal. **Zurückgezogen mit 0 Spielen** in der Tabelle = alle Spiele annulliert (SV Straelen, Oberliga Niederrhein
> 2023/24) – die Spieleliste führt sie weiter, beide Gegenproben lassen sie weg. Serien gehen nie – Kreuztabellen haben keine Reihenfolge. Die Fußzeile im
> Rekordfenster nennt je Verein die tatsächlich erfassten Saisons (`_recAbdeckung`), nicht die der ganzen Liga.
> Das Spiel schreibt die Jahrtausendsaison **`1999/2000`**, nicht `1999/00` – sonst fehlt sie stumm.
