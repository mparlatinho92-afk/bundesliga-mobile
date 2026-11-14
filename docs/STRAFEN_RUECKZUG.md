# Punktabzug, Aufstiegsverzicht, Zwangsabstieg, Rückzug (v0.8.228.77/78)

Nutzerwunsch (Fix-Liste): Lizenzentzüge, Rückzüge, Punktabzüge und Aufstiegsverzicht nach **echten Häufigkeiten**, je Ebene und
Region, mit Markierung in der Tabelle. „nie 0 %“ gilt auch hier.

## Messung (Grundlage aller Werte in game_engine.js)

| Skript | Was | Ergebnis |
|---|---|---|
| `tools/rueckzug_messung.cjs` → `docs/rueckzug_messung/bericht.txt` | fussball.de 2001–2025 (Rückzug, Punktabzug) + Vereinsfolgen 1995–2025 (Sturz ≥ 2 Ebenen, Meister ohne Aufstieg) | Ost 2–6× höher, Rheinland **nicht** (Nutzervermutung nur für Ost bestätigt) |
| `tools/rueckzug_zeitpunkt.cjs` → `docs/rueckzug_saison/zeitpunkt.txt` | 790 Rückzüge während der Saison: wie gewertet | OL/VL/LL 59 % annulliert · 9 % nur Hinrunde · 8 % bis Rückzug · 24 % alles gewertet; Bezirk 65/5/15/14 |
| `tools/nullzeilen_fbde.cjs` | Zeilen mit 0 Spielen | `-` in fussball.de-Spielen = Spielplan, kein Ergebnis |

Unter 3 Fällen ist eine Zahl keine Aussage – dort Nachbarwert bzw. kleiner Rest.

## Regeln im Spiel

- **Entscheidung fest je Spielstand + Verein + Saison** (`_strafeZahl`, FNV-Hash mit saveId): Anzeige, „Spieltag rückgängig“ und
  Saisonwechsel sehen dasselbe; jeder Spielstand hat eigene Ereignisse.
- **Punktabzug** (`STRAFE_ABZUG`, Median `STRAFE_ABZUG_MED`, 5 % Vielfaches): wirkt ab festem Anteil der eigenen Spiele, steht in
  `stats.abzug`, sortTables setzt ihn nach (auch nach Rückgängig). Archivzeile trägt `ab`.
- **Aufstiegsverzicht** (`STRAFE_VERZICHT`): über `_darfAufsteigen` wie die Reserve-Sperre, der Nächste rückt nach; Anzeige erst ab 75 %.
- **Zwangsabstieg / Rückzug nach der Saison** (`STRAFE_ZWANG`): VOR Relegation und Planung bestimmt (1b), zählt als einer der
  Absteiger seiner Liga (sonst Drift: 2. BL/3. Liga/NOFV zu klein), 2 selten 3 Ebenen, unter der Bodenliga ligalos (Nutzer). Ligalose
  ersetzen den Amateurpokal-Absteiger ihrer Heimat-Bodenliga; kommt dorthin kein Pokalaufsteiger, entscheidet die Sonder-Relegation (unten).
- **„Die Zweite wird zur Ersten“** (Nutzer): fiele die Erste auf/unter die Ebene ihrer höchsten Reserve, übernimmt sie deren Platz, die
  Reserve wird ligalos – so benannt in Archiv und Bericht.
- **Rückzug während der Saison** (`STRAFE_RUECKZUG`, `RUECKZUG_ART`; Nutzer: „nach der echten Häufigkeit alle Varianten“): Ebene 1–4
  immer annulliert; darunter A annulliert / C Hinrunde zählt / D bis Rückzug zählt / B Restspiele 2:0. Annullierte Spiele bleiben in
  `seasonResults` (`r.an`, für Rekorde), zählen in keiner Tabelle und nicht in der Ewigen Tabelle; die Saison zählt als Jahr. Der Verein
  steht am Ende und fällt im Saisonwechsel wie ein Zwangsabsteiger.
- **Sonder-Relegation** (Nutzer 14.11.2026, `_sonderRelegation`): bis dahin rückte der stärkste Ligalose nach – Stärke sieht niemand.
  Gemessen 40 Saisons: 242 Abgänge ins Ligalose, 70 über einen Pokalaufsteiger gedeckt, 172 Lücken (gut 4 je Saison). Feld: bis zu 4
  Ligalose derselben Heimat-Bodenliga nach erreichter Pokalrunde, Gleichstand Ausscheidungsspiel (i.E. vor knapp vor hoch), dann Los;
  Reserve-Sperre (`_darfAufsteigen`) gilt; Heimat fest: nur wessen Heimatliga die freie Liga oder darüber ist – Hannover nie zu Lüneburg (Nutzer), ausgeloste Staffeln (Berlin 1/2) teilen sich das Feld. Ein Platz: Halbfinale + Finale; mehrere: nur so
  viele Spiele wie nötig. Gespielt im Saisonwechsel, Daten in `amateurpokal.sonder` (lean `s`), Sieger zählen über `nachrueck` als
  Aufstieg. Keine Ewige Tabelle, keine Rekorde. Reiter „Sonder-Relegation“ nach dem Finale. Bewusst verworfen: den Platz eine Saison
  frei lassen (Liga schrumpft, Drift wie vor dem 08.11.2026).
- **Ewige Tabelle**: Fußzeile „Anmerkungen“ mit Punktabzügen und Rückzügen (wie echte Ewige Tabellen).

## Prüfungen

`node tools/strafen_check.cjs 30` (Häufigkeiten gegen Soll, Rückgängig für Abzug und Rückzug, Relegationsplatz-Sonderfall, Zweite wird
zur Ersten, Invarianten; `--selbsttest` muss durchfallen) · Browser `.claude/skills/run/strafen_check.mjs` (Desktop + Handy) ·
`node tools/saisonwechsel_check.cjs` · `node tools/sonder_relegation_check.cjs 40` (Gegenproben `--kaputt`, `--kaputt-reserve`) ·
Browser `.claude/skills/run/sonder_relegation_ui_check.mjs` · Drift `node tools/sim_headless.cjs drift 60 4` vor/nach vergleichen.
Entwurfsbilder der Wertungsvarianten: `.claude/skills/run/rueckzug_varianten.mjs` → `docs/rueckzug_saison/`.
