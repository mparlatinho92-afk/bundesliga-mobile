# Amateurpokal

Bundesweiter KO-Wettbewerb der ligalosen Vereine (`leagueId === null`), Engine: `initAmateurpokal` in `game_engine.js`,
Anzeige `app/amateurpokal.js`. Die 16 Sieger des Sechzehntelfinals steigen in die Bodenliga ihrer Region auf, je Bodenliga
verlässt dafür der Tabellenletzte die Pyramide (1:1).

## Wer muss in die Qualifikation? (Konzept, Stand 05.11.2026)

- **Setzliste nach Stärke**, analog zu den Lostöpfen im DFB-Pokal, kein Zufall bei der Auswahl.
- Die 1. Runde braucht eine Zweierpotenz an Vereinen: `pow2 = 2^floor(log2(n))`, bei 261–511 Vereinen also 256.
- Überzählig sind `q = n − pow2` Plätze. Die **schwächsten `2·q` Vereine** spielen `q` Qualifikationsspiele (zufällig gepaart),
  die Sieger füllen das Feld auf `pow2` auf. Alle anderen haben ein **Freilos** (`amateurpokal.byes`).
- Beispiele: 261 Vereine → 10 in der Quali (5 Spiele). 274 → 36 (18 Spiele).
- Folge: Frisch Abgestiegene sind fast immer stark genug für ein Freilos und praktisch nie in der Qualifikation.
- Ist `n` genau eine Zweierpotenz, entfällt die Qualifikation.

## Anzeige (seit 05.11.2026)

- Teilnehmerfeld: Absteiger der Vorsaison mit ▼-Marke (Vorsaison in `Engine.history[letzte].teams[id].leagueId` gesetzt, jetzt
  ligalos), Filter „Absteiger“, Gruppe Regionalverband (`regions[0]`) / Landesverband (`Engine._verbandOf`) / keine,
  Sortierung Stärke / Name. Erklärung der Qualifikation als aufklappbarer Text.
- Stand nur über das Häkchen „Stand zeigen“ (Filter „Noch dabei“, Sortierung „Runde“, Rundenmarke), beim Öffnen des Pokals
  immer wieder aus – kein Spoiler. Dazu der Reiter „Stand“ (Trichter + Vereine nach Runde), gemeinsam mit dem DFB-Pokal
  (`App._cupStandAnsicht`).

## Zum Vergleich: DFB-Pokal – Teilnehmer und Lostöpfe (seit 05.11.2026)

- Maßstab ist die **Qualifizierungs-Saison = Vorsaison** (wie beim DFB): 18 BL + 18 2.BL der Vorsaison (auch deren Absteiger)
  + die 4 bestplatzierten der 3. Liga ohne Reserven. Topf 1 = 18 BL + 2.BL Platz 1–14, Topf 2 = der Rest.
- Vorher mischte `initPokal` die Liga der NEUEN Saison mit dem Platz der alten: BL-Absteiger landeten in Topf 2,
  Drittliga-Aufsteiger in Topf 1, Zweitliga-Absteiger fehlten, dafür spielten Platz 5/6 der 3. Liga mit.
- Prüfung: `node tools/pokal_topf_check.cjs [saisons]` (lost wie am 1. Spieltag neu aus; nach dem Saisonwechsel liegt
  sonst noch der alte Pokal – damit war die erste Messung falsch). Gegen den alten Stand meldet sie die Fehler.
- Teilnehmerfeld: Gruppen „Bundesliga 2026/27“ usw. nach Vorsaison, Reihenfolge = deren Abschlusstabelle, Platz davor,
  ▲/▼ für den Ligawechsel seither (`entrants.vl/vr`). Auslosungen vor v0.8.228.70 haben das Feld nicht, dort ordnet die
  Anzeige nach Ebene und Platz der Vorsaison innerhalb der heutigen Liga.
- **Zeitpunkt der Auslosung:** seit v0.8.228.70 am Ende des Saisonwechsels (`Engine._pokaleAuslosen`), nicht erst am
  1. Spieltag. Vorher lag zum „Start“ die zurückgesetzte Auslosung der Vorsaison im Spielstand – das Teilnehmerfeld bezog
  sich dann eine Saison zu weit zurück (Nutzerbefund 2085/86 → 83/84 statt 84/85). Jede Auslosung trägt `y` (Saison) und
  `vj` (Qualifizierungs-Saison), `_beginMatchday` lost nur bei fehlendem oder fremdem `y` neu aus, `loadGame` heilt Altstände
  zum Start. Prüfung mit echtem Spielstand: `node .claude/skills/run/save_pokal_feld_check.mjs <datei.json>`.
