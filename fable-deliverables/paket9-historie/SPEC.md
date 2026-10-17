# Paket 9 — Historie-Schlagzeilen (Spiel des Tages mit Historien-Anlass)

> **Erstbefüllung durch Opus (Claude), NICHT durch Fable** (17.10.2026, Nutzerwunsch: Fable kostet
> Extra-Credits). Interface, Klassifikator und Texte stehen. Eine spätere Fable-Session kann die
> Pools erweitern oder ersetzen — Slots, Pool-Namen und die Verbote unten bleiben.

**Deliverable:** `window.REPORTS_HIST` (Ergebnis-Schlagzeilen) und `window.REPORTS_HIST_PREVIEW`
(Vorschau-Anrisse) in `data_reports.js`.

## 1. Einbau-Ort & Wirkung
- Die Historie ist ein **sechstes Signal** in `_matchInterest` (`_histSignals`), gewichtet in
  `_REPORT_W.hist*`. Gewinnt ein Historien-Signal die Begründung, zieht das Spiel des Tages seine
  Schlagzeile (`_matchHeadline`) bzw. seinen Vorschau-Anriss (`_previewTeaser`) aus diesen Banks.
- Leerer Pool → bisheriger Fallback (Score-Schlagzeile bzw. „Spiel des Tages · {Label}").
- Gemessen an zufälligen Spieltagen der Startsaison: Historien-Anlass an ~24 % der Spieltage.

## 2. Anlässe & Slots
| Key | feuert wenn | Slots |
|---|---|---|
| `wiedersehen` | letzte gemeinsame Ligasaison ≥ 10 Jahre her | `{jahre}` (≥ 10), `{seit}` (Saison) |
| `erstduell` | keine gemeinsame Ligasaison, beide ≥ 15 erfasste Saisons | `{von}` (erste Saison, für die BEIDE Tabellen haben) |
| `dauerduell` | ≥ 25 gemeinsame Saisons inkl. der laufenden | `{n}` (nur als „{n}.“) |
| `rueckkehr` | {verein}: letzte Saison in dieser Liga ≥ 10 Jahre her | `{verein}` `{gegner}` `{jahre}` `{seit}` |
| `exmeister` | {verein}: Titel einer Liga der Ebenen 1–2, ≥ 2 Ebenen über der jetzigen | `{verein}` `{gegner}` `{liga}` `{jahr}` |
| `rekordmeister` | {verein}: meiste Titel dieser Liga (≥ 3, allein vorn) | `{verein}` `{gegner}` `{n}` (Titel) |
| `revanche` | {verein} verlor das Hinspiel dieser Saison mit ≥ 3 Toren | `{verein}` `{gegner}` `{hinspiel}` (aus Sicht {verein}) |

Dazu immer `{heim}` `{gast}`, in Ergebnis-Zeilen `{sieger}` `{verlierer}` `{score}` (Sieg: Siegersicht).
Pools: symmetrische Keys `win`/`draw`; Keys mit `{verein}`: `win_v` ({verein} gewinnt, `{score}` aus
seiner Sicht), `win_g` ({gegner} gewinnt), `draw`. Vorschau: ein Array je Key.

## 3. Quelle
Alle Abschlusstabellen: echte Historie (HistExt, alle Ligen) + gespielte Saisons (IndexedDB,
`_idbPending`). Index `App._histIndex()` wird asynchron gebaut. **Keine direkte Bilanz** (Siege/
Niederlagen gegeneinander) — der Spielstand speichert keine Einzelspiele über die Saison hinaus,
der Nutzer hat eine Paar-Bilanz wegen der Speichergröße abgelehnt.

## 4. Fallstricke (Verbote)
- **„erstes Duell überhaupt" ist falsch.** Die Tabellen reichen oben bis 1963, unter Ebene 4 bis
  2001. Immer „erstmals seit {von}". Bayern – Jahn Regensburg trafen sich in den 1950ern.
- **Keine Bilanz-Aussagen** („{verein} gewinnt traditionell", „Angstgegner") — nicht belegt.
- `{verein}`/`{gegner}` nie deklinieren, kein Pronomen (Vereinsnamen sind m/f/n gemischt).
- `{liga}` endet immer auf „-liga" → „der {liga}".
- `rueckkehr` feuert die ganze Saison, nicht nur am ersten Spieltag — kein „gleich zum Auftakt".
- Keine Ortsangaben (heim/auswärts) in Pools mit {verein}/{gegner}: wer Heim ist, ist offen.

## 5. Prüfung
`node .claude/skills/run/historie_schlagzeilen_check.mjs` (Browser, Desktop + Handy, mit `--selbsttest`).
