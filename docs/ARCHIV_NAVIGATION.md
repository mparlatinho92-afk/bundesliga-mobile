# Archiv-Navigation: Auf-/Abstiegsziele verlinkt

> Ausgelagert aus CLAUDE.md am 11.11.2026 (wörtlich).

**Auf-/Abstiegsziel ist verlinkt – in JEDER Liga und auch in der laufenden Saison.** Ein Klick auf
„▲ 1. Bundesliga“ springt in die Zielliga der FOLGEsaison (dorthin ging der Verein). Platzhalter ohne echte
Liga („▼ tiefere Liga“, „⇄ Relegation“, Europaplätze) bleiben bewusst ohne Link.

> **Die laufende Saison rendert woanders** – `loadLeague`, nicht `_renderArchivedSeason`. Sie war deshalb
> zuerst vergessen, obwohl das Archiv schon verlinkt war. Wer hier etwas ändert, muss BEIDE Stellen anfassen.
> Und: `EUROPA_SEED` gilt nur fuer `lid === '1'` – eine Prüfung auf `level === 1` hängt der DDR-Oberliga die
> westdeutschen Startplätze an (gemessen, behoben).

Die Browserprüfung **klickt**, statt nur das Attribut zu suchen: ein `onclick`, das nichts bewirkt, fällt
sonst nicht auf.
