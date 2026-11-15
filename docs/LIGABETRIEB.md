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

## „Steht fest“ – Meister, Aufstieg, Europapokal, Relegation, Abstieg (v0.8.233, Nutzer 14.11.2026)

`Engine.stehtFest(lid, bisMd)`: je Verein beste und schlechteste mögliche Endplatzierung aus Punkten (Abzug erst ab seinem Spiel,
`_abzugPlan`) und Restspielen **laut Spielplan** (`this.schedule`); Gleichstand gilt als verloren (lieber einen Spieltag später). Nur feste
Zonen: Meister, Aufstieg (`fixUp`, nur sicher Berechtigte – keine Reserve, kein Verzicht), Europapokal nach Wettbewerb (Live-Regel 1–4 CL blau, 5 EL orange, 6 ECL grün – gezeigt wird, was MINDESTENS sicher ist; Nutzer: „aufgliedern“), Relegation
oben (`varUp`) und unten (Liga 1/2 Platz 16), Abstieg nur so viele Plätze, wie **sicher** absteigen (`_abstiegSicher`):
- Schrumpf-Schutz (Saisonwechsel 4b) streicht feste Abstiege, wenn die Liga unter `min` fiele – gerechnet mit höchstens möglichen
  Abgängen und nur sicheren Zugängen; Überschuss-Stopp (Zielliga ab Ebene 6 voll: `min(max+3, 20)`) – die vollste Zielliga zählt.
  Beides gemessen: ohne das standen 3. Liga Platz 17, Sachsenliga, Berlin, Landesliga Südwest Ost „fest“ und blieben drin.
- Meister-Pokal mit Zusatz (Nutzer 15.11.2026, „ein Meister steigt nicht automatisch auf“; Varianten-Bilder docs/steht-fest/meisterpokal_*.png):
  ✓ meister_auf (sicherer direkter Platz, berechtigt, Liga > 8 – sonst Liga-Schutz), ↕ meister_rele (Liga ohne Direktaufstieg →
  Aufstiegsspiel), ✗ meister_nein (Zwangsabsteiger, Verzicht ab letztem Saisonviertel), ohne Zeichen = Bundesliga oder offen (Reserve:
  Recht hängt an der Ersten). „Kein Aufstieg“ wahlweise als ausgegrauter Pokal: ··· → ⚙️ Einstellungen (`ba_meister_stil`, Nutzer).
  Abgeschlossene Saisons (Liga-Fenster UND `_renderArchivedSeason`): tatsächlicher Ausgang – ✓ höher, ✗ gleiche/tiefere Ebene
  (`_archMeisterArt`). Prüfung `.claude/skills/run/meister_pokal_check.mjs`, Ausgang gegen Engine in `tools/steht_fest_check.cjs`.
- Bodenligen: kein Abstiegs-Kennzeichen (Amateurpokal und Zwangsabsteiger der ganzen Pyramide entscheiden erst im Saisonwechsel).
- Ein Lizenzentzug ANDERER am letzten Spieltag kann einen „feststehenden“ Absteiger retten – gewollt (Havelse 2026), gezählt.
Anzeige: gefülltes Kästchen an der **Platzzahl** (🏆 ⬆ ★ ↕ ⬇) – Vorjahres-Kürzel stehen als „(M, N ↑)“ hinter dem Namen (Nutzer:
„unterscheiden können“); Zeile unter den Spieltagsergebnissen an dem Spieltag, an dem es feststand; nicht im Kalender (Nutzer).
Prüfung `node tools/steht_fest_check.cjs 25` (jeder Spieltag nachgerechnet gegen den echten Ausgang, `--kaputt` versteckt die
Restspiele → muss durchfallen), Browser `.claude/skills/run/steht_fest_ui_check.mjs` (`--selbsttest` gegen index.html).
