# P1 – Verbandspokal-Konzept (Gesprächsaufgabe, mehrere Sitzungen)

**Anhängen:** `00_KONTEXT.md` + diese Datei.
**Ergebnis:** `P1_verbandspokal_konzept_ergebnis.md` (Konzept + offene Entscheidungen) und
`P1_landespokale_real.json` (Recherche).
**Art:** Konzeptarbeit **mit dem Nutzer**, kein Bauplan im Alleingang. Die Entscheidungen trifft er.

## Ist-Zustand im Spiel (aus dem Code gelesen, 28.09.2026)
- Der Verbandspokal wird **nicht ausgespielt**. Es entstehen nur **Sieger**, und die ziehen in den
  DFB-Pokal ein (64 Teilnehmer).
- DFB-Pokal-Feld: alle Vereine aus Bundesliga und 2. Bundesliga, die Top 4 der 3. Liga (nach Vorjahresplatz) und
  die Verbandspokalsieger. Fehlende Plätze füllt ein Zufallsgriff unter den Amateuren.
- Wer Sieger wird, entscheidet `_legacyVerbandCupWinners`: je Landesverband ein einfaches K.o. unter
  **allen** Nicht-Reserve-Vereinen ab Ebene 4, die nicht Profi sind. Die Paarungen werden zufällig gemischt,
  es gibt keine Freilose und keine Heimregel. **Bayern, Niedersachsen und Westfalen** stellen je einen
  zweiten Teilnehmer (Zweitplatzierter des zweiten K.o.-Laufs).
- Alternativ gibt es einen **Verbandspokal-Plan** (`tools/verbandspokal_planner.html`, JSON im Browser unter
  `ba_vp_plan_v1`). Er gilt nur für eine bestimmte Saison und löst Platzhalter-Regeln zu Vereinen auf,
  kennt also schon Freilose (`_simulateVerbandCupAdvanced`).
- Zuordnung Verein → Verband: `_verbandOf` über die Regionsliste des Vereins, 21 Verbände.
- Gezählt werden Verbandspokalsiege je Verein (Titelzahl, längste Serie) und im Steckbrief angezeigt.
- **Vorbereitet:** Bekommt der Verbandspokal echte Runden, erbt er das Tormodell ohne Zusatzcode, und die
  Rekordfunktion `_recordPokalSeason(…, 'v')` funktioniert unverändert.
- Verwandt, aber getrennt: der **Amateurpokal** (bundesweites K.o. der 261 Ligalosen, 16 Sieger steigen
  1:1 in die Bodenligen auf). **Nicht** mit dem Verbandspokal vermischen. Der Nutzer zögert bei jedem
  tieferen Einschnitt dort („ich weiß nicht, ob ich es überhaupt will“).

## Schritt 1: Recherche (allein, mit Belegen)
Für jeden der 21 Landesverbände die **heutige Wirklichkeit** (Saison 2025/26 oder die letzte vollständige):
- Name des Wettbewerbs, Sponsorname weglassen
- Wer ist teilnahmeberechtigt (ab welcher Liga, ob Reserven ausgeschlossen sind, ob 3.-Liga-Vereine mitspielen)?
- Qualifikation über Kreis-/Bezirkspokale ja oder nein, und wie viele Teilnehmer die Verbandsebene hat
- Freilose für höherklassige Vereine: wer, bis zu welcher Runde?
- Heimrecht-Regel (unterklassiger Verein zu Hause?)
- Rundenzahl, Final-Termin (Finaltag der Amateure?)
- Wie viele DFB-Pokal-Plätze der Verband hat (drei Verbände haben zwei; prüfen, ob es heute noch
  Bayern, Niedersachsen und Westfalen sind oder wie der Zweitplatz vergeben wird)

Format `P1_landespokale_real.json`:
```json
{ "Bayern": { "name": "Bayerischer Toto-Pokal", "ab_liga": "…", "reserven": false,
  "vorqualifikation": "…", "freilose": "…", "heimrecht": "…", "runden": 0,
  "dfb_plaetze": 2, "zweitplatz_regel": "…", "belege": ["https://…"] } }
```
Unbekanntes Feld = `null` + Vermerk, niemals raten.

## Schritt 2: Konzeptgespräch mit dem Nutzer
Befund darlegen, dann **offen** fragen. Keine Auswahllisten. Themen, die er wahrscheinlich entscheiden will:
- Soll der Verbandspokal überhaupt **ausgespielt und angezeigt** werden oder weiter nur Sieger liefern?
- Teilnehmerfeld: alle Vereine eines Verbands (in Bayern mehrere Hundert) oder nur ab einer Ebene?
- Freilose für Regionalligisten/Oberligisten wie in echt, oder ein flaches Feld?
- Termine im Spieljahr: parallel zum Ligabetrieb an festen Spieltagen (wie DFB-Pokal und Amateurpokal)?
- Anzeige: eigener Einstieg wie der Amateurpokal, Reiter je Verband, Mobilansicht (Android-PWA ist
  Hauptgerät)
- Speicherplatz: 21 Wettbewerbe mit allen Runden je Saison, über 200 Saisons. Wie viel davon muss
  dauerhaft gespeichert werden? (Nur Sieger + Finale? Alles für die laufende Saison?)

## Nicht tun
- Kein Stärkebonus für Pokalspiele und kein „Pokalfaktor“. Regel 4 im Kontext.
- Keine Änderung am Amateurpokal vorschlagen, es sei denn, der Nutzer bringt es selbst auf.
- Keine Realitäts-Nachführung pro Saison. Die Recherche liefert einmalig die Struktur.
