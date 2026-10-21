# Europapokal-Startplätze sind Daten, keine Regel

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Die Archivtabelle der Bundesliga färbt die Europaplätze aus `app/europa_data.js` – je Saison recherchiert,
**nicht** nach der heutigen Staffelung. Warum das kein Übereifer ist, zeigen drei gemessene Saisons:

| Saison | was tatsächlich galt |
|---|---|
| 1963/64, 1968/69 | **nur Platz 1** (Landesmeister-Pokal); der zweite Starter kam über den Pokal |
| 2013/14 | 1–3 CL, 4 CL-Qualifikation, 5 EL, 6–7 EL-Qualifikation |
| 2023/24 | **fünf** CL-Plätze (Fünfjahreswertung), 6–7 EL, 8 ECL-Qualifikation |

Die feste Regel der Live-Tabelle (1–4 CL, 5 EL, 6 ECL) wäre in jeder dieser Saisons falsch. 75 der 351 Plätze
kamen zudem **nicht über die Liga**, sondern über den Pokal (Pokalsieger/-finalist) – das steht als Vermerk dran.

```bash
node tools/wiki_europa.mjs      # 62 Saisonartikel -> tools/wiki_europa.json
node tools/europa_einbau.mjs    # -> app/europa_data.js
```

**Zwei Quellenformen, beide gemessen.** Bis ca. 2012 erklärt eine `{{Farblegende}}` die Zeilenfarbe, danach trägt
jede Zeile eine **Anmerkungsspalte** (`|| M/CL`, `|| rowspan="4" | CL`, Klammern = Qualifikation). Wo es beide
gibt, gewinnt die Anmerkung – sie ist eindeutiger.

> **Der Wettbewerb steht im HAUPTSATZ der Legende.** „Teilnahme an der *Europa League* 2015/16: FC Augsburg
> (da sich der Pokalsieger über die Liga für die *Champions League* qualifiziert hat)“ – wer im ganzen Text
> sucht, findet den falschen Wettbewerb im Nebensatz. Gemessen: 2014/15 stand danach dreimal CL statt EL.
> Deshalb wird nur bis zum ersten `:`, `(` oder „, da/weil/sofern“ ausgewertet.
