# Changelog — Bundesliga Architect
## v0.3.11 (30.05.2026)
- FIX: OL Hessen target 18→17 (neues Gleichgewicht nach Hessen-Swap)
- FIX: Berlin-Liga 18 Teams lat=0 → 52.52/13.4 (Staffel-Balancing funktioniert jetzt für alle Berliner Teams)

## v0.3.10 (30.05.2026)
- FIX: Berlin Landesliga – alle 26 Teams hatten lat=0 → balanceGroup brach ab → kein Ausgleich
- FIX: lat-Axis nutzt jetzt l.target statt ceil(total/n) → respektiert Liga-Zielgröße bei Überschuss

## v0.3.9 (30.05.2026)
- FIX: TuS Rüssingen Regions-Tag korrigiert (Vorderpfalz→Westpfalz) — behebt BL-Kaskade
- FIX: Hessen-Swap: Griesheim+Darmstadt→VL Süd, Erlensee→VL Süd, Ederbergland+Kassel→OL Hessen
- FIX: OL Hessen jetzt 6/6/6 Nord/Mitte/Süd → stabiler 1-zu-1-Fluss in alle VL
- FIX: VL Hessen Targets: Nord=11 Mitte=10 Süd=15 (Gleichgewicht)

## v0.3.8 (30.05.2026)
- FIX: 15 Liga-Targets auf Werkstatt TM2026 ausgerichtet (Bayern LL, Westfalenliga, NOFV, u.a.)
- FIX: Überschuss-Teams genullt (Bayern Südwest -5, Westfalenliga -5, Sachsenliga -3, VL Württemberg -3, u.a.)
- NEU: NOFV-Oberliga Nord/Süd je +2 Teams aus Null-Pool aufgefüllt
- NEU: Liga-Zuordnungen.xlsx Soll-Werte + Vereine-Sheet aktualisiert (1003 Teams)

## v0.3.7 (29.05.2026)
- FIX: SCHRUMPF-SCHUTZ – maxLimit war hartkodiert 20 statt l.target → OL Niedersachsen +2-Überschuss wird jetzt selbst korrigiert
- FIX: Westfalenliga 1 (6-25) Zentroid 51.9 → 51.7 (persistenter +1 diff)

## v0.3.6 (29.05.2026)
- FIX: LL Bayern Nordost (6-32) Zentroid 49.5/12.0 → 49.7/12.8 (Oberpfalz/Weiden-Achse, behebt -4 Teams über 3 Saisons)

## v0.3.5 (29.05.2026)
- FIX: GEO_BLOCKED – Weser-Ems/Lüneburg/Hannover/Braunschweig formal geo_gesperrt
- FIX: Südbaden-Bug – 'Baden'-Keyword traf 'Südbaden' nicht (case-mismatch), neues Keyword 'Südbaden'
- FIX: functions.schema.json – Zeilennummern + exportSeasonReport eingetragen

## v0.3.4 (29.05.2026)
- NEU: Liga-Zuordnungen.xlsx committed (Ligen-Sheet + Vereine-Sheet mit vollständigem Ligabaum-Pfad)

## v0.3.3 (29.05.2026)
- FIX: LEAGUE_CENTERS – Einträge für fix-gesperrte Ligen entfernt (6-14..6-17, 7-1/7-2, 8-1..8-4)

## v0.3.2 (29.05.2026)
- FIX: NOFV-Oberliga Nord/Süd als sibling (Grenzregionen SA/Brandenburg)
- FIX: LL Südwest Ost/West fix gesperrt (war sibling)
- FIX: LL Weser-Ems/Lüneburg/Hannover/Braunschweig fix gesperrt
- FIX: BL Rheinhessen/Vorderpfalz/Nahe/Westpfalz fix + korrekte Eltern-Zuordnung
- FIX: Liga-Zuordnungen.xlsx aktualisiert

## v0.3.1 (28.05.2026)
- NEU: Liga-Zuordnungen.xlsx – alle Ligen nach Zuordnungstyp farbkodiert
- NEU: schemas/league-balancing.schema.json – vollständige Geo-Balancierungs-Dokumentation

## v0.3.0 (28.05.2026)
- NEU: axis:'geo' Zentroid-Balancierung fuer alle 13 Sibling-Gruppen
- NEU: LEAGUE_CENTERS Konstante mit geografischen Schwerpunkten
- NEU: schemas/league-balancing.schema.json – Ligakategorien + Zentroide dokumentiert
- FIX: Bayern-Teams Gundelfingen/Ehekirchen/Oberweikertshofen Routing-Konsistenz

## v0.2.3 (28.05.2026)
- REVERT: Oberweikertshofen/Gundelfingen leagueId-Änderung rückgängig – Bayern-Routing komplexer als erwartet

## v0.2.2 (28.05.2026)
- FIX: Königsdorf/Merten (Mittelrhein-Staffeln), Düneberger SV (Hamburg), Oberweikertshofen/Gundelfingen (Bayern) – leagueId-Mismatches behoben

## v0.2.1 (27.05.2026)
- FIX: Phantom-pending_incoming-Bug bei SCHRUMPF-SCHUTZ behoben
- NEU: SIBLING_GROUPS Geo-Balancierung fuer Bayernligas
- FIX: baseDownSlots auf Anzahl Feeder-Ligen begrenzt (Math.min)

## v0.2.0 (27.05.2026)
- NEU: ID-basiertes Ligabaum-Routing via REGION_TO_LEAGUE_ID + UP_MAP
- FIX: Terminal-Ligen ohne Abstiegsebene planen keine Fehlrouting-Abstiege mehr
- FIX: Verbandsliga Südwest Overflow durch Südwest-Namenskollision

## v0.1.9 (27.05.2026)
- FIX: REGION_TO_LEAGUE_ID + UP_MAP ersetzen String-Matching in findTarget
- FIX: HARD_LINKS Level 5-6-7-8 vervollständigt
- FIX: Südwest-Tie-Breaker eingegrenzt auf Regionalliga Südwest

## v0.1.8 (27.05.2026)
- NEU: JSON-Export-Button im Ligagrößen-Tab – lädt vollständigen Saisonbericht als .json herunter

## v0.1.7 (27.05.2026)
- FIX: PRE-FLIGHT zählt jetzt Auf- und Abstiege – 3.Liga bleibt exakt auf 20
- FIX: SCHRUMPF-SCHUTZ nutzt liga-spezifische pending_incoming statt globalen Zähler

## v0.1.6 (27.05.2026)
- FIX: Changelog aktuell-Tag dynamisch via VERSION-Konstante
- FIX: Versionen v0.1.2–v0.1.5 rückwirkend nachgetragen

## v0.1.5 (27.05.2026)
- FIX: Regionalliga-Aufstieg zur 3. Liga funktioniert korrekt
- FIX: Nordost wurde in Jahr 0 fälschlich als Direktaufsteiger gewertet (Substring-Bug)

## v0.1.4 (26.05.2026)
- FIX: localStorage voll nach vielen Saisons - History auf 10 Eintraege und Minimaldaten beschraenkt

## v0.1.3 (26.05.2026)
- FIX: Level 4->3 Aufstiege funktionierten nie - findTarget gab null zurueck bei nationalen Ligen
- FIX: Relegation-Tab zeigte immer leer - resetSeason loeschte Ergebnisse vor dem Return

## v0.1.2 (26.05.2026)
- NEU: Mindestgroessen-Schutz (3.Liga>=20, Regionalliga>=16, Oberliga>=14) - Ligen schrumpfen nicht mehr unbegrenzt
- NEU: Relegation-Modal zeigt alle 5 Regionalliga-Ergebnisse (Direktaufsteiger + Playoff)
- FIX: Relegation-Tab war immer leer - Tab-Reihenfolge korrigiert
- NEU: Ligatabellen: Direktaufstieg vs. Playoff korrekt beschriftet

