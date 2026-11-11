# Ligabetrieb prüfen: Stärke, Titel, Serien, Durchlässigkeit, Rekorde

> Ausgelagert aus CLAUDE.md am 11.11.2026 (wörtlich).

Neben dem Tormodell (`docs/TORMODELL_PRUEFUNG.md`) gibt es zwei Werkzeuge für alles andere:

| Skript | Was es misst |
|---|---|
| `tools/liga_realismus.cjs` | Meisterpunkte, Titelverteilung, **Drift** und **Durchlässigkeit der Pyramide** – mit `KEY=VALUE` für alle `STR_*` |
| `tools/serien_check.mjs` | Sieg- und Sieglos-Serien gegen echte Bundesligaspiele (openfootball) |

**Zwei harte Nebenbedingungen des Nutzers**, beide gemessen, nicht geschätzt:
- *„nie 0 %. alles ist möglich."* – `sensation_check.cjs`
- *„dass nach 100, 200 Jahren ein Oberligist auf einmal in der Bundesliga spielt, dieser Reiz
  sollte weiterhin seine aktuelle Häufigkeit behalten"* – die Drift-Referenzwerte in
  `liga_realismus.cjs` stammen aus einem **echten Spielstand mit 214 Saisons**. Wer an `STR_*`
  dreht, läuft ihn mit 214 Saisons nach; kürzere Läufe driften weniger und sind nicht vergleichbar.

**Der echte Spielstand des Nutzers ist die beste Messlatte.** Er hat in einem Zug zwei Dinge
entschieden, die sonst falsch gebaut worden wären: die Datenfalle der 55 geteilten Stadien (das
Fritz-Walter-Stadion hängt an vier Vereinen bis hinunter zu einem Achtligisten) und die richtige
Reichweite der Vereinsgröße (nur Liga 1+2, sonst schnürt sie den Aufstiegsweg zu).

## Spiellogik-Kalibrierung
`docs/SPIELLOGIK_KALIBRIERUNG.md` hält das Teilprojekt v0.8.144–v0.8.151 fest: jeden Schritt mit
Befund und Beleg, **die zehn verworfenen Ansätze mit Zahlen**, die harten Nebenbedingungen des
Nutzers, die drei benannten Modellgrenzen und die offenen Schritte. Vor jeder Arbeit am Tormodell
oder an den Stärken dort nachsehen — ohne die Liste probiert man die verworfenen Wege erneut.

## Rekorde: gemessen wird aus `seasonResults`
Wer Spielrekorde aus `matchdayHistory` liest, misst im `fastMode` nur die Ebenen 1–4 –
`_applyResult` filtert dort. `fastMode` läuft bei „Restsaison simulieren“ und im MegaSim, also in
genau den Saisons, die niemand durchklickt. `Engine.seasonResults` ist in beiden Modi vollständig.
Gegenprobe: `node tools/rek_check.cjs fast 3` gegen `node tools/rek_check.cjs slow 3` – beide
müssen alle acht Ebenen melden.
