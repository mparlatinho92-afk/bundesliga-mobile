Object.assign(App, {
showChangelog: function() {
    const html = `
        <div style="font-family:monospace; font-size:13px; line-height:1.8;">
        <!-- CHANGELOG -->
                    <div class="font-bold text-green-400">v0.3.50 (aktuell) - 02.06.2026</div>
                    <div>&#8226; FIX: GitHub Pages zeigte Wappen-Platzhalter – index.html ist jetzt der Monolith</div>
                    <div>&#8226; NEU: template.html als leichtgewichtige Quelldatei für manage-v</div>
                    <div class="font-bold text-slate-400">v0.3.49 - 02.06.2026</div>
                    <div>&#8226; FIX: Changelog zeigte nur bis v0.3.42 – manage-v patcht jetzt auch app/modal.js direkt</div>
                    <div class="font-bold text-slate-400">v0.3.48 - 02.06.2026</div>
                    <div>&#8226; FIX: Syntax-Fehler core.js und modal.js – App lädt jetzt korrekt</div>
                    <div class="font-bold text-slate-400">v0.3.47 - 01.06.2026</div>
                    <div>&#8226; FIX: App startete nie – App.init()-Aufruf fehlte seit v0.3.44</div>
                    <div>&#8226; FIX: Mobile Sidebar-Drawer und Touch-Swipe wiederhergestellt</div>
                    <div class="font-bold text-slate-400">v0.3.46 - 01.06.2026</div>
                    <div>&#8226; NEU: 885 Vereinswappen als Dateien – game_data.js 6,5 MB → 348 KB</div>
                    <div>&#8226; NEU: manage-v bettet Wappen automatisch als Base64 in Monolith ein</div>
                    <div class="font-bold text-slate-400">v0.3.45 - 01.06.2026</div>
                    <div>&#8226; REFACTOR: App-Module in app/ Unterordner verschoben</div>
                    <div class="font-bold text-slate-400">v0.3.44 - 01.06.2026</div>
                    <div>&#8226; REFACTOR: app.js in 5 Module aufgeteilt (core/pokal/league/modal/dfb_logo)</div>
                    <div class="font-bold text-slate-400">v0.3.43 - 01.06.2026</div>
                    <div>&#8226; REFACTOR: App-Logik in app.js ausgelagert – index.html 280 KB → 12 KB</div>
                    <div class="font-bold text-slate-400">v0.3.42 - 01.06.2026</div>
                    <div>&#8226; NEU: Abschluss – Vereinswappen in Transfers-Tab und Relegations-Tab</div>
                    <div>&#8226; NEU: Abschluss – Liga-Wappen im Ligagrößen-Tab</div>
                    <div class="font-bold text-slate-400">v0.3.41 - 01.06.2026</div>
                    <div>&#8226; NEU: DFB-Pokal Tabs horizontal scrollbar (Touch)</div>
                    <div>&#8226; NEU: Runden-Status-Anzeige (Partien/Abgeschlossen)</div>
                    <div>&#8226; NEU: Ergebnisse ein-/ausklappbar</div>
                    <div>&#8226; NEU: Teilnehmerfeld 2-spaltig auf Mobile</div>
                    <div class="font-bold text-slate-400">v0.3.40 - 01.06.2026</div>
                    <div>&#8226; FIX: Mobile – Tabelle vollständig sichtbar (100dvh, padding-bottom 60px)</div>
                    <div>&#8226; FIX: Mobile – Tabelle ohne horizontales Scrollen (Diff+Info ausgeblendet, font 11px)</div>
                    <div>&#8226; NEU: DFB-Pokal Paarungen als Kartenlayout (kein h-Scroll)</div>
                    <div class="font-bold text-slate-400">v0.3.39 - 01.06.2026</div>
                    <div>&#8226; NEU: Sidebar als Touch-Drawer auf Mobile (Wischgeste + Hamburger-Button)</div>
                    <div>&#8226; NEU: Header zweizeilig auf Mobile – alle Buttons erreichbar</div>
                    <div>&#8226; FIX: Tabelle horizontal scrollbar, linker/unterer Rand auf Mobile</div>
                    <div class="font-bold text-slate-400">v0.3.38 - 31.05.2026</div>
                    <div>&#8226; FIX: Falsch zugewiesene Vereinswappen korrigiert (Sandhausen, Walldorf, Hoffenheim)</div>
                    <div>&#8226; NEU: VfR Aalen und Waldhof U21 Wappen ergänzt</div>
                    <div>&#8226; FIX: DFB-Pokal-Logo jetzt als Base64 – funktioniert auf GitHub Pages</div>
                    <div class="font-bold text-slate-400">v0.3.37 - 31.05.2026</div>
                    <div>&#8226; NEU: Ligen- und Verbandswappen als Mini-Icon in Seitenleiste und Liga-Header</div>
                    <div>&#8226; NEU: DFB-Pokal-Logo in Sidebar und Header</div>
                    <div>&#8226; NEU: Echte Vereinswappen für SV Meppen, Viktoria Aschaffenburg, Borussia Neunkirchen, SSV Ulm, Waldhof Mannheim, SC Freiburg, VfR Aalen</div>
                    <div class="font-bold text-slate-400">v0.3.36 - 31.05.2026</div>
                    <div>&#8226; NEU: Ligen- und Verbandswappen als Mini-Icon in der Seitenleiste</div>
                    <div>&#8226; NEU: Liga-Logo im Header beim Öffnen einer Liga</div>
                    <div class="font-bold text-slate-400">v0.3.35 - 31.05.2026</div>
                    <div>&#8226; NEU: Teilnehmerfeld-Tab im DFB-Pokal – 64 Teams nach Liga gruppiert, Wappen, sortiert nach Vorsaison-Abschlusstabelle</div>
                    <div class="font-bold text-slate-400">v0.3.34 - 31.05.2026</div>
                    <div>&#8226; FIX: Jede Saison hat eigenen DFB-Pokal – History korrekt gespeichert</div>
                    <div>&#8226; FIX: Saisonnavigation (<>) funktioniert jetzt im DFB-Pokal-Tab</div>
                    <div>&#8226; FIX: DFB-Pokal wird in Multi-Saison-Simulation korrekt gespielt (Spieltag 1 initialisiert neuen Pokal)</div>
                    <div class="font-bold text-slate-400">v0.3.33 - 31.05.2026</div>
                    <div>&#8226; FIX: Pokal-Ergebnisse leistungsgerecht – Noise +-8 statt +-20, Tore skalieren mit Staerkeunterschied</div>
                    <div>&#8226; NEU: Wappen in Spielergebnisse und Bracket</div>
                    <div>&#8226; NEU: Volle Vereinsnamen + Liga in Klammern bei Ergebnissen und Bracket</div>
                    <div class="font-bold text-slate-400">v0.3.32 - 31.05.2026</div>
                    <div>&#8226; NEU: DFB-Pokal mit 64 Teams (L1+L2+L3+8xRL4), 6 Runden auf ST 2/8/14/20/27/34</div>
                    <div>&#8226; NEU: Pokal-Tab in Sidebar mit rotem NEU-Badge</div>
                    <div>&#8226; NEU: Bracket-Ansicht mit allen Runden</div>
                    <div class="font-bold text-slate-400">v0.3.31 - 31.05.2026</div>
                    <div>&#8226; FIX: Vereinswappen fehlten in Archiv-Saisons nach Seitenreload (id fehlte im lean-History-Format)</div>
                    <div>&#8226; FIX: History-Sanitize in loadGame: id/thumb/strength werden beim Laden automatisch ergänzt</div>
                    <div class="font-bold text-slate-400">v0.3.30 - 31.05.2026</div>
                    <div>&#8226; FIX: Stärkewerte in Archiv-Ansicht zeigen nun den damaligen Wert (nicht aktuellen)</div>
                    <div>&#8226; FIX: Alte Saves ohne strength-Daten: Schätzung aus historischer Ligastufe (Bundesliga ~90, 8.Liga ~20)</div>
                    <div class="font-bold text-slate-400">v0.3.29 - 31.05.2026</div>
                    <div>&#8226; FIX: Archiv-Saisons zeigten immer aktuelle Saison (viewHistoryOffset vs. history[]-Index-Mismatch nach Reload)</div>
                    <div>&#8226; FIX: Wappen und Stärkewerte in Archiv-Ansicht (strength in lean history gespeichert, thumb aus GAME_DATA als Fallback)</div>
                    <div class="font-bold text-slate-400">v0.3.28 - 31.05.2026</div>
                    <div>&#8226; FIX: Simulieren/Woche-Buttons wurden zu früh deaktiviert wenn aktive Liga kürzer als längste Liga (z.B. BL 34 vs 3.Liga 38 Spieltage)</div>
                    <div class="font-bold text-slate-400">v0.3.27 - 31.05.2026</div>
                    <div>&#8226; FIX: Abschluss-Button blieb nach Archiv-Ansicht dauerhaft deaktiviert</div>
                    <div>&#8226; NEU: Multi-Saison-Button simuliert N Saisons am Stück und stoppt bei erstem Fehler</div>
                    <div>&#8226; NEU: Debug-Log zeigt Engine-Events mit Sanity-Checks (orphane Teams, Liga-Größen, totalMatchdays)</div>
                    <div class="font-bold text-slate-400">v0.3.26 - 31.05.2026</div>
                    <div>&#8226; NEU: Ligastufen-Badges mit Farbverlauf (Gold→Cyan) in der Sidebar</div>
                    <div>&#8226; NEU: Liga-ID in Klammern je Eintrag</div>
                    <div>&#8226; NEU: Weiße Trennlinie zwischen Ligastufen</div>
                    <div>&#8226; NEU: Stärkewert in Klammern hinter Vereinsname</div>
                    <div class="font-bold text-slate-400">v0.3.25 - 31.05.2026</div>
                    <div>&#8226; FIX: k-Parität-Tiebreaker – 18 und 20 Teams: exakt 2H nach 4 Runden und 6H nach 12 Runden (100% aller Shuffles)</div>
                    <div>&#8226; FIX: Spielfrei-Ligen (ungerade Teams): bestmögliche Alternierung trotz Pausen</div>
                    <div class="font-bold text-slate-400">v0.3.24 - 31.05.2026</div>
                    <div>&#8226; FIX: Tag X/N zeigt liga-spezifische Spieltagzahl (BL=34, 3.Liga=38 etc.)</div>
                    <div>&#8226; FIX: Erste Spieltage gleichmäßig verteilt – max. 2 Heimspiele in 3 Runden, max. 2–3 konsekutiv statt 4</div>
                    <div class="font-bold text-slate-400">v0.3.23 - 30.05.2026</div>
                    <div>&#8226; FIX: Greedy H/A-Zuweisung – wer zuletzt auswärts war spielt heim, max. 3–4 konsekutiv statt bis zu 17</div>
                    <div>&#8226; FIX: Spielfrei (ungerade Teamzahl) korrekt behandelt – pausierte Teams behalten letzten Status</div>
                    <div class="font-bold text-slate-400">v0.3.22 - 30.05.2026</div>
                    <div>&#8226; FIX: Berger-Spielplan – kein Looping mehr, jede Liga exakt (n-1)×2 Runden, totalMatchdays dynamisch</div>
                    <div>&#8226; FIX: seasonResults wird gespeichert – homeStats/awayStats nach Reload aus Spielhistorie rekonstruierbar</div>
                    <div class="font-bold text-slate-400">v0.3.22 - 30.05.2026</div>
                    <div>&#8226; NEU: Berger-Algorithmus – fixer Spielplan, jedes Team 1x pro Spieltag, Hinrunde+Rückrunde mit getauschtem Heimrecht</div>
                    <div>&#8226; NEU: leichter Heimvorteil (+3 Performance) in simulateMatch</div>
                    <div class="font-bold text-slate-400">v0.3.21 - 30.05.2026</div>
                    <div>&#8226; FIX: Heim/Auswärts-Toggle funktioniert jetzt auch nach Laden alter Spielstände</div>
                    <div class="font-bold text-slate-400">v0.3.20 - 30.05.2026</div>
                    <div>&#8226; NEU: DFL-Tiebreaker vollständig – Direktvergleich (H2H-Pkt/GD/Tore/Auswärtstore) + alle Auswärtstore</div>
                    <div>&#8226; NEU: Heim- und Auswärtstabelle – Toggle Gesamt/Heim/Auswärts pro Liga</div>
                    <div>&#8226; NEU: Home/Away-Stats werden pro Spieltag separat erfasst</div>
                    <div class="font-bold text-slate-400">v0.3.19 - 30.05.2026</div>
                    <div>&#8226; FIX: Tiebreaker GF statt GA – entspricht DFL-Standard (Freiburg 3:1 vor Heidenheim 2:0 korrekt)</div>
                    <div>&#8226; NEU: Tabellenformat Pl./Mannschaft/Spiele/G./U./V. + geteilte Platzierungen</div>
                    <div>&#8226; FIX: Verlierer in Spieltagsleiste rot</div>
                    <div class="font-bold text-slate-400">v0.3.17 - 30.05.2026</div>
                    <div>&#8226; NEU: Spieltagsanzeige – Paarungen mit Ergebnis oberhalb der Ligatabelle sichtbar</div>
                    <div>&#8226; NEU: Torzahl skaliert mit Leistungsvorsprung (eng=max 2, mittel=max 3, gross=max 4)</div>
                    <div class="font-bold text-slate-400">v0.3.16 - 30.05.2026</div>
                    <div>&#8226; NEU: Spieltag-Simulation als echte 1v1-Duelle (kein Solo-Schwellenwert mehr)</div>
                    <div>&#8226; NEU: simulateMatch proportional — Staerkeunterschied bestimmt Wahrscheinlichkeit mit ±20 Rauschen</div>
                    <div>&#8226; FIX: tote entry()-Funktion aus showChangelog entfernt</div>
                    <div class="font-bold text-slate-400">v0.3.15 - 30.05.2026</div>
                    <div>&#8226; FIX: SyntaxError – showChangelog Template-Literal war nie geschlossen (Spiel lief nie ohne Cache-Save)</div>
                    <div>&#8226; FIX: exportSeasonReport als eigenstaendige Funktion wiederhergestellt</div>
                    <div class="font-bold text-slate-400">v0.3.14 - 30.05.2026</div>
                    <div>&#8226; FIX: Reset-Freeze v2 — direkter Spread-Copy ohne JSON-Overhead</div>
                    <div>&#8226; FIX: Init-Fehler jetzt sichtbar im UI statt stummer Lade...</div>
                    <div class="font-bold text-slate-400">v0.3.13 - 30.05.2026</div>
                    <div>&#8226; FIX: Reset-Freeze — base64-Thumbs werden beim Fresh-Init nicht mehr kopiert (JSON-Replacer)</div>
                    <div class="font-bold text-slate-400">v0.3.12 - 30.05.2026</div>
                    <div>&#8226; FIX: manage-v.ps1 patcht Changelog jetzt auch in index.html (bisher nur in versionierter HTML)</div>
                    <div>&#8226; NEU: CHANGELOG.md – alle 24 Versionen v0.1.2–v0.3.12 dauerhaft im Repo dokumentiert</div>
                    <div class="font-bold text-slate-400">v0.3.11</div>
                                                <div>&#8226; FIX: OL Hessen target 18→17 (neues Gleichgewicht nach Hessen-Swap)</div>
                                                <div>&#8226; FIX: Berlin-Liga 18 Teams lat=0 → 52.52/13.4 (Staffel-Balancing funktioniert jetzt für alle Berliner Teams)</div>
                    <div class="font-bold text-slate-400">v0.3.10</div>
                                                <div>&#8226; FIX: Berlin Landesliga – alle 26 Teams hatten lat=0 → balanceGroup brach ab → kein Ausgleich</div>
                                                <div>&#8226; FIX: lat-Axis nutzt jetzt l.target statt ceil(total/n) → respektiert Liga-Zielgröße bei Überschuss</div>
                    <div class="font-bold text-slate-400">v0.3.9</div>
                                                <div>&#8226; FIX: TuS Rüssingen Regions-Tag korrigiert (Vorderpfalz→Westpfalz) — behebt BL-Kaskade</div>
                                                <div>&#8226; FIX: Hessen-Swap: Griesheim+Darmstadt→VL Süd, Erlensee→VL Süd, Ederbergland+Kassel→OL Hessen</div>
                                                <div>&#8226; FIX: OL Hessen jetzt 6/6/6 Nord/Mitte/Süd → stabiler 1-zu-1-Fluss in alle VL</div>
                                                <div>&#8226; FIX: VL Hessen Targets: Nord=11 Mitte=10 Süd=15 (Gleichgewicht)</div>
                    <div class="font-bold text-slate-400">v0.3.8</div>
                                                <div>&#8226; FIX: 15 Liga-Targets auf Werkstatt TM2026 ausgerichtet (Bayern LL, Westfalenliga, NOFV, u.a.)</div>
                                                <div>&#8226; FIX: Überschuss-Teams genullt (Bayern Südwest -5, Westfalenliga -5, Sachsenliga -3, VL Württemberg -3, u.a.)</div>
                                                <div>&#8226; NEU: NOFV-Oberliga Nord/Süd je +2 Teams aus Null-Pool aufgefüllt</div>
                                                <div>&#8226; NEU: Liga-Zuordnungen.xlsx Soll-Werte + Vereine-Sheet aktualisiert (1003 Teams)</div>
                    <div class="font-bold text-slate-400">v0.3.7</div>
                                                <div>&#8226; FIX: SCHRUMPF-SCHUTZ – maxLimit war hartkodiert 20 statt l.target → OL Niedersachsen +2-Überschuss wird jetzt selbst korrigiert</div>
                                                <div>&#8226; FIX: Westfalenliga 1 (6-25) Zentroid 51.9 → 51.7 (persistenter +1 diff)</div>
                    <div class="font-bold text-slate-400">v0.3.6</div>
                                                <div>&#8226; FIX: LL Bayern Nordost (6-32) Zentroid 49.5/12.0 → 49.7/12.8 (Oberpfalz/Weiden-Achse, behebt -4 Teams über 3 Saisons)</div>
                    <div class="font-bold text-slate-400">v0.3.5</div>
                                                <div>&#8226; FIX: GEO_BLOCKED – Weser-Ems/Lüneburg/Hannover/Braunschweig formal geo_gesperrt</div>
                                                <div>&#8226; FIX: Südbaden-Bug – 'Baden'-Keyword traf 'Südbaden' nicht (case-mismatch), neues Keyword 'Südbaden'</div>
                                                <div>&#8226; FIX: functions.schema.json – Zeilennummern + exportSeasonReport eingetragen</div>
                    <div class="font-bold text-slate-400">v0.3.4</div>
                                                <div>&#8226; NEU: Liga-Zuordnungen.xlsx committed (Ligen-Sheet + Vereine-Sheet mit vollständigem Ligabaum-Pfad)</div>
                    <div class="font-bold text-slate-400">v0.3.3</div>
                                                <div>&#8226; FIX: LEAGUE_CENTERS – Einträge für fix-gesperrte Ligen entfernt (6-14..6-17, 7-1/7-2, 8-1..8-4)</div>
                    <div class="font-bold text-slate-400">v0.3.2</div>
                                                <div>&#8226; FIX: NOFV-Oberliga Nord/Süd als sibling (Grenzregionen SA/Brandenburg)</div>
                                                <div>&#8226; FIX: LL Südwest Ost/West fix gesperrt (war sibling)</div>
                                                <div>&#8226; FIX: LL Weser-Ems/Lüneburg/Hannover/Braunschweig fix gesperrt</div>
                                                <div>&#8226; FIX: BL Rheinhessen/Vorderpfalz/Nahe/Westpfalz fix + korrekte Eltern-Zuordnung</div>
                                                <div>&#8226; FIX: Liga-Zuordnungen.xlsx aktualisiert</div>
                    <div class="font-bold text-slate-400">v0.3.1</div>
                                                <div>&#8226; NEU: Liga-Zuordnungen.xlsx – alle Ligen nach Zuordnungstyp farbkodiert</div>
                                                <div>&#8226; NEU: schemas/league-balancing.schema.json – vollständige Geo-Balancierungs-Dokumentation</div>
                    <div class="font-bold text-slate-400">v0.3.0</div>
                                                <div>&#8226; NEU: axis:'geo' Zentroid-Balancierung fuer alle 13 Sibling-Gruppen</div>
                                                <div>&#8226; NEU: LEAGUE_CENTERS Konstante mit geografischen Schwerpunkten</div>
                                                <div>&#8226; NEU: schemas/league-balancing.schema.json – Ligakategorien + Zentroide dokumentiert</div>
                                                <div>&#8226; FIX: Bayern-Teams Gundelfingen/Ehekirchen/Oberweikertshofen Routing-Konsistenz</div>
                    <div class="font-bold text-slate-400">v0.2.3</div>
                                                <div>&#8226; REVERT: Oberweikertshofen/Gundelfingen leagueId-Änderung rückgängig – Bayern-Routing komplexer als erwartet</div>
                    <div class="font-bold text-slate-400">v0.2.2</div>
                                                <div>&#8226; FIX: Königsdorf/Merten (Mittelrhein-Staffeln), Düneberger SV (Hamburg), Oberweikertshofen/Gundelfingen (Bayern) – leagueId-Mismatches behoben</div>
                    <div class="font-bold text-slate-400">v0.2.1</div>
                                                <div>&#8226; FIX: Phantom-pending_incoming-Bug bei SCHRUMPF-SCHUTZ behoben</div>
                                                <div>&#8226; NEU: SIBLING_GROUPS Geo-Balancierung fuer Bayernligas</div>
                                                <div>&#8226; FIX: baseDownSlots auf Anzahl Feeder-Ligen begrenzt (Math.min)</div>
                    <div class="font-bold text-slate-400">v0.2.0</div>
                                                <div>&#8226; NEU: ID-basiertes Ligabaum-Routing via REGION_TO_LEAGUE_ID + UP_MAP</div>
                                                <div>&#8226; FIX: Terminal-Ligen ohne Abstiegsebene planen keine Fehlrouting-Abstiege mehr</div>
                                                <div>&#8226; FIX: Verbandsliga Südwest Overflow durch Südwest-Namenskollision</div>
                    <div class="font-bold text-slate-400">v0.1.9</div>
                                                <div>&#8226; FIX: REGION_TO_LEAGUE_ID + UP_MAP ersetzen String-Matching in findTarget</div>
                                                <div>&#8226; FIX: HARD_LINKS Level 5-6-7-8 vervollständigt</div>
                                                <div>&#8226; FIX: Südwest-Tie-Breaker eingegrenzt auf Regionalliga Südwest</div>
                    <div class="font-bold text-slate-400">v0.1.8</div>
                                                <div>&#8226; NEU: JSON-Export-Button im Ligagrößen-Tab – lädt vollständigen Saisonbericht als .json herunter</div>
                    <div class="font-bold text-slate-400">v0.1.7</div>
                                                <div>&#8226; FIX: PRE-FLIGHT zählt jetzt Auf- und Abstiege – 3.Liga bleibt exakt auf 20</div>
                                                <div>&#8226; FIX: SCHRUMPF-SCHUTZ nutzt liga-spezifische pending_incoming statt globalen Zähler</div>
                    <div class="font-bold text-slate-400">v0.1.6</div>
                                                <div>&#8226; FIX: Changelog aktuell-Tag dynamisch via VERSION-Konstante</div>
                                                <div>&#8226; FIX: Versionen v0.1.2–v0.1.5 rückwirkend nachgetragen</div>
                    <div class="font-bold text-slate-400">v0.1.5</div>
                                                <div>&#8226; FIX: Regionalliga-Aufstieg zur 3. Liga funktioniert korrekt</div>
                                                <div>&#8226; FIX: Nordost wurde in Jahr 0 fälschlich als Direktaufsteiger gewertet (Substring-Bug)</div>
                    <div class="font-bold text-slate-400">v0.1.4</div>
                                                <div>&#8226; FIX: localStorage voll nach vielen Saisons - History auf 10 Eintraege und Minimaldaten beschraenkt</div>
                    <div class="font-bold text-slate-400">v0.1.3</div>
                                                <div>&#8226; FIX: Level 4->3 Aufstiege funktionierten nie - findTarget gab null zurueck bei nationalen Ligen</div>
                                                <div>&#8226; FIX: Relegation-Tab zeigte immer leer - resetSeason loeschte Ergebnisse vor dem Return</div>
                    <div class="font-bold text-slate-400">v0.1.2</div>
                                                <div>&#8226; NEU: Mindestgroessen-Schutz (3.Liga>=20, Regionalliga>=16, Oberliga>=14) - Ligen schrumpfen nicht mehr unbegrenzt</div>
                                                <div>&#8226; NEU: Relegation-Modal zeigt alle 5 Regionalliga-Ergebnisse (Direktaufsteiger + Playoff)</div>
                                                <div>&#8226; FIX: Relegation-Tab war immer leer - Tab-Reihenfolge korrigiert</div>
                                                <div>&#8226; NEU: Ligatabellen: Direktaufstieg vs. Playoff korrekt beschriftet</div>
        </div>
    `;
    this.openModal('Changelog', html);
},

exportSeasonReport: function() {
    const report = this._lastReport;
    if(!report) return;
    const season = Engine.getFormattedSeason();
    const data = { season: season, migrations: report.migrations, stats: report.stats, relegation: report.relegation };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `saison-${season.replace('/', '-')}-bericht.json`;
    a.click();
},

showRules: function() {
    const info = Engine.getPromotionInfo();
    const html = `<h3>Aufstiegsregelung zur 3. Liga (Jahr ${info.year+1}/3)</h3>
        <p><b>Direkt:</b> ${info.direct.join(", ")}</p>
        <p><b>Relegation:</b> ${info.playoff.join(" vs ")}</p>`;
    this.openModal("Regelwerk", html, false);
},

showSeasonEnd: function() {
    if(Engine.currentMatchday < Engine.totalMatchdays) {
        if(!confirm("Saison nicht beendet. Trotzdem abschließen?")) return;
    }
    const res = Engine.processSeasonTransition();
    
    const tThumb = id => { const s = id && (Engine.teams[id]?.thumb || GAME_DATA.teams[id]?.thumb); return s ? `<img src="${s}" width="20" height="20" style="vertical-align:middle;margin-right:5px;flex-shrink:0;">` : ''; };
    let releHtml = "";
    res.relegation.forEach(r => {
        const isMatch = r.hId && r.aId;
        releHtml += `<div class="relegation-card" style="border-left-color:${r.color||'gold'}">
            <div style="font-size:12px;opacity:0.6;">${r.match}</div>
            ${isMatch
                ? `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">${tThumb(r.hId)}<b style="font-size:18px;">${r.result}</b>${tThumb(r.aId)}</div>`
                : `<div style="font-size:18px;font-weight:bold;margin:4px 0;">${r.result}</div>`}
            <div style="font-size:13px;">Sieger: ${tThumb(r.winnerId)}${r.winner}</div>
        </div>`;
    });

    let logHtml = "";
    res.migrations.sort((a,b) => (a.sortId||"").localeCompare(b.sortId||""));
    res.migrations.forEach(m => {
        let color='#fff', icon='•';
        if(m.type.includes('up')) { color='var(--c-fix-up)'; icon='▲'; }
        if(m.type.includes('down')) { color='var(--c-fix-down)'; icon='▼'; }
        if(m.type==='down_var') { color='var(--c-var-down)'; icon='▼'; }
        if(m.type.includes('rele')) { color='#00bcd4'; icon='⇄'; }
        logHtml += `<div style="padding:5px; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
            <div><span style="color:${color};margin-right:8px;">${icon}</span>${tThumb(m.id)}<b>${m.team}</b></div>
            <div style="color:#888;font-size:11px;">${m.from} &#10142; ${m.to}</div>
        </div>`;
    });

    this._lastReport = res;
    let statsHtml = "<div style='text-align:right;margin-bottom:8px;'><button class='btn btn-info' onclick='App.exportSeasonReport()'>⬇ JSON Export</button></div><table class='stat-table' style='width:100%'><tr><th>Liga</th><th>Soll</th><th>Neu</th><th>Diff</th></tr>";
    Object.entries(res.stats).forEach(([lid, s]) => {
        const diff = s.new - s.target;
        const col = diff === 0 ? 'green' : 'orange';
        const lSrc = leagueLogo(lid);
        const lImg = lSrc ? `<img src="${lSrc}" width="18" height="18" style="vertical-align:middle;margin-right:6px;flex-shrink:0;">` : '';
        statsHtml += `<tr><td style="display:flex;align-items:center;">${lImg}${s.name}</td><td>${s.target}</td><td style="color:${col}">${s.new}</td><td>${diff>0?'+'+diff:diff}</td></tr>`;
    });
    statsHtml += "</table>";

    document.getElementById('modal-tabs').style.display = 'flex';
    document.getElementById('modal-body').innerHTML = `
        <div id="view-rele">${releHtml}</div>
        <div id="view-log" style="display:none;">${logHtml}</div>
        <div id="view-stats" style="display:none;">${statsHtml}</div>
    `;
    this.openModal("Saisonabschlussbericht", null, true);
    this.updateStatus();
    this.loadLeague(this.activeLeague);
},

switchTab: function(tab) {
    ['rele','log','stats'].forEach(t => document.getElementById('view-'+t).style.display = 'none');
    document.getElementById('view-'+tab).style.display = 'block';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
},

openModal: function(title, content, showTabs) {
    document.getElementById('modal-title').innerText = title;
    if(content) document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-tabs').style.display = showTabs ? 'flex' : 'none';
    document.getElementById('modal').style.display = 'flex';
},

setTableView: function(v) { this.tableView = v; this.loadLeague(this.activeLeague); },

megaSim: function() {
    const n = parseInt(prompt("Wie viele Saisons simulieren?", "10"));
    if (!n || n < 1 || n > 500) return;
    let done = 0, stopped = false;
    for (let i = 0; i < n; i++) {
        try {
            Engine.simulateFullSeason();
            const pre = Engine.sanityCheck();
            if (pre.length) Engine.log('warn', `Pre-Transition S${i+1}: ${pre.join(' | ')}`);
            Engine.processSeasonTransition();
            const post = Engine.sanityCheck();
            if (post.length) { Engine.log('error', `Post-Transition S${i+1}: ${post.join(' | ')}`); stopped = true; break; }
            done++;
        } catch(e) {
            Engine.log('error', `Exception S${i+1}: ${e.message}`);
            stopped = true; break;
        }
    }
    this.renderSidebar();
    this.loadLeague(this.activeLeague);
    this.updateStatus();
    alert(stopped ? `⚠ Abbruch nach ${done} Saisons — siehe Log für Details.` : `✓ ${done} Saisons simuliert.`);
},

showDebugLog: function() {
    const colors = { info:'#888', warn:'#ff9800', error:'#f44336' };
    const entries = Engine.debugLog.slice().reverse();
    const html = entries.length === 0
        ? '<p style="opacity:0.5;padding:20px;">Noch keine Einträge.</p>'
        : '<div style="font-family:monospace;font-size:12px;">' +
          entries.map(e =>
            `<div style="padding:4px 0;border-bottom:1px solid #2a2a2a;">` +
            `<span style="color:#444;margin-right:8px;">${e.t}</span>` +
            `<span style="color:#666;margin-right:8px;">${e.season}</span>` +
            `<span style="color:${colors[e.type]||'#888'};font-weight:bold;margin-right:8px;">[${e.type.toUpperCase()}]</span>` +
            `${e.msg}</div>`
          ).join('') + '</div>';
    this.openModal('Debug Log',
        `<button class="btn" style="margin-bottom:10px;" onclick="Engine.debugLog=[];App.showDebugLog()">🗑 Leeren</button>${html}`,
        false);
},

startNextSeason: function() { location.reload(); },
reset: function() { if(confirm("Reset?")) { localStorage.clear(); location.reload(); } }
});
