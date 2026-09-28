# Kontext für Browser-Claude – Bundesliga Architect

> Diese Datei immer zuerst anhängen. Sie ersetzt das Gedächtnis der PC-Sitzung in Kurzform.
> Stand: 28.09.2026, Spielversion v0.8.182.

## Was das Projekt ist
Eine Fußballsimulation im Browser (HTML/JS, ohne Server), gespielt als Android-PWA. Die gesamte
deutsche Ligapyramide mit 1262 Vereinen läuft über **Ebene 1 bis 8** (Bundesliga bis Bezirks-/Landesliga).
Dazu kommen der DFB-Pokal, ein Amateurpokal für 261 ligalose Vereine und ein Archiv mit echten
historischen Tabellen ab 1963 (BRD und DDR).
Man simuliert Saison um Saison, auch über hunderte Jahre. Der echte Spielstand des Nutzers hat über 200 Saisons.

Aufbau: `game_engine.js` (Spiellogik, Objekt `Engine`), `game_data.js` (Vereine, Ligen), `app/*.js`
(Oberfläche, Objekt `App`), `data_reports.js` (Schlagzeilen-Texte). Die Schreibarbeit an der Codebasis
passiert **am PC in einer anderen Sitzung**. Du lieferst Vorarbeit zu, die dort eingebaut wird.

## Deine Rolle hier
- **Du lieferst Dateien, keinen Code-Umbau.** Das sind Konzepte (Markdown), Recherche-Ergebnisse (JSON/CSV)
  und Texte. Kleine Code-Skizzen sind in Ordnung, aber als Vorschlag gekennzeichnet.
- **Jede Aussage über reale Vereine oder Ligen braucht einen Beleg** (URL + kurzes Zitat). Ohne Beleg lautet
  das Ergebnis „offen“, nicht „wahrscheinlich“.
- **Nichts erfinden.** Unsicher = offen lassen. Eine falsche Zuordnung kostet später mehr als eine fehlende.
- Am Ende jeder Portion: **eine Datei zum Herunterladen**, benannt wie im Paket angegeben.

## Harte Nutzerregeln (nicht verhandelbar)
1. **„Nie 0 %. Alles ist möglich.“** Kein Ergebnis darf strukturell unmöglich sein, kein Deckel und kein
   festes Maximum. Ein Achtligist kann den Bundesligisten schlagen, selten, aber nie null.
2. **Durchlässigkeit der Pyramide bleibt.** Dass nach 100 oder 200 Jahren ein Oberligist in der Bundesliga
   spielt, soll so häufig bleiben wie jetzt.
3. **Plausibel vor perfekt, emergent vor gescriptet.** Keine Sonderregeln für einzelne Vereine, keine Boni
   nach Namen. Ergebnisse entstehen aus Stärkewerten.
4. **Pokale haben keine eigenen Wahrscheinlichkeiten.** DFB-Pokal, Amateurpokal und Verbandspokal nutzen
   dasselbe Tormodell wie die Liga. Genau deshalb sind sie der schärfste Test.
5. **Der Realität wird nicht hinterhergelaufen.** Echte Daten sind Startpunkt und Messlatte, keine laufende
   Nachführung.
6. **Scope bleibt eng.** Nur das Bestellte bearbeiten. Wer beim Nachsehen feststellt, dass die Annahme des
   Auftrags nicht stimmt, **meldet das und hört auf**, statt die Aufgabe umzudeuten.

## Wie der Nutzer arbeitet
- Er entscheidet selbst und bringt oft Aspekte ein, an die niemand gedacht hat. **Bei Designfragen keine
  Multiple-Choice-Auswahl**, sondern den Befund darlegen und offen fragen.
- Er mag Messungen und Belege, keine Beruhigung. „Sollte passen“ ist keine Aussage.
- Deutsch, direkt, ohne Floskeln.

## Lehren, die hier teuer bezahlt wurden
- Ein stimmender **Mittelwert** sagt nichts über die **Verteilung**.
- Eine gemeldete **Null** ist oft eine Stichproben-Null. Vorher fragen, wie viele Fälle überhaupt zu erwarten
  wären. Unter drei ist die Zahl keine Aussage.
- **Gleicher Ort ist nicht gleicher Verein.** Weiterleitungen bei Wikipedia verdecken Fusionen.
- Eine Prüfung, die nicht durchfallen kann, prüft nichts.

## Fachbegriffe im Projekt
| Begriff | Bedeutung |
|---|---|
| Ebene / Level | 1 = Bundesliga … 8 = unterste Spielliga |
| Bodenliga | unterste Liga eines Gebiets (keine Liga darunter, Ebene ≥ 5) |
| ligalos | Verein ohne Liga (`leagueId: null`), spielt nur den Amateurpokal |
| Landesverband / Verband | einer der 21 DFB-Landesverbände (Bayern, Westfalen, Niederrhein, Südbaden, …) |
| Reserve / II | zweite Mannschaft eines Vereins; „A“, „Am.“, „Amateure“ gelten als II (Ausnahme Jeddeloh II) |
| hist-ID | eigene Kennung für einen historischen Verein, den es im Spiel nicht gibt |
| Fusion | Vorgänger behalten eigene IDs und eigene Zahlen, der Steckbrief verbindet sie |
| Umbenennung | derselbe Verein, anderer Name, eine ID |
