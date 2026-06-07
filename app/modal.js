Object.assign(App, {
showChangelog: function() {
    const html = `
        <div style="font-family:monospace; font-size:13px; line-height:1.8;">
        <!-- CHANGELOG -->
                    <div class="font-bold text-green-400">v0.4.7 (aktuell) - 07.06.2026</div>
                    <div>&#8226; FIX: Karte – alle 1265 Vereine haben Regionen (PIP-Fallback)</div>
                    <div>&#8226; FIX: Karte – Westmünsterland-Polygon korrigiert (Gronau/Borken/Vreden)</div>
                    <div>&#8226; FIX: Karte – Bremerhaven als Teil von Bremen</div>
                    <div>&#8226; NEU: Karte – Sonderregion südlich Bremen</div>
                    <div>&#8226; FIX: Karte – Niedersachsen-Polygone blau statt grün</div>
                    <div class="font-bold text-slate-400">v0.4.6 - 07.06.2026</div>
                    <div>&#8226; NEU: Bracket-Teams anklickbar (Steckbrief-Modal)</div>
                    <div>&#8226; NEU: Stärkewerte in Teilnehmerfeld, Paarungen und Bracket</div>
                    <div class="font-bold text-slate-400">v0.4.5 - 07.06.2026</div>
                    <div>&#8226; NEU: Vereinsnamen überall anklickbar – Steckbrief mit Wappen, Liga, Historie, Häufigkeit als Modal</div>
                    <div class="font-bold text-slate-400">v0.4.4 - 07.06.2026</div>
                    <div>&#8226; FIX: Wappen Hamborn 07, TuRU Düsseldorf, SC Düsseldorf-West, 1. FC Mühlhausen, BSG Stahl Brandenburg</div>
                    <div>&#8226; FIX: Liga-Wappen 5-1 (Oberliga RLP/Saar) und 6-1 (Verbandsliga Südwest) getauscht</div>
                    <div class="font-bold text-slate-400">v0.4.3 - 07.06.2026</div>
                    <div>&#8226; FIX: Reserve-Sperre – II-Mannschaften maximal bis 3. Liga (nie 2. Bundesliga oder höher)</div>
                    <div class="font-bold text-slate-400">v0.4.2 - 07.06.2026</div>
                    <div>&#8226; FIX: Reserves in Pokal-Regionalliga-Restliste (restRl) jetzt korrekt ausgeschlossen</div>
                    <div class="font-bold text-slate-400">v0.4.1 - 07.06.2026</div>
                    <div>&#8226; NEU: Reserveteams vom DFB-Pokal ausgeschlossen</div>
                    <div>&#8226; NEU: Reserve-Sperre – II-Mannschaft nicht auf gleichem/höherem Level wie Elternverein</div>
                    <div>&#8226; NEU: Reserve-Cascade – Eltern abgestiegen pusht Reserve weiter runter</div>
                    <div>&#8226; FIX: parentId-Datenpflege (82/84 Reserves korrekt verknüpft)</div>
                    <div class="font-bold text-slate-400">v0.4.0 - 06.06.2026</div>
                    <div>&#8226; FIX: Landesliga Niederrhein Gruppe 1/2 je 14 Teams</div>
                    <div>&#8226; FIX: Verbandsliga Hessen Nord/Mitte/Sued targets auf Ist angepasst</div>
                    <div class="font-bold text-slate-400">v0.3.99 - 06.06.2026</div>
                    <div>&#8226; FIX: Landesliga Hamburg Hammonia/Hansa je 10 Teams</div>
                    <div class="font-bold text-slate-400">v0.3.98 - 06.06.2026</div>
                    <div>&#8226; FIX: Hessenliga (ex Oberliga Hessen) target 18 + korrekter Kader</div>
                    <div>&#8226; FIX: SKV Rot-Weiss Darmstadt neu angelegt</div>
                    <div>&#8226; FIX: Bezirksliga Rheinland 10-10-10</div>
                    <div class="font-bold text-slate-400">v0.3.97 - 06.06.2026</div>
                    <div>&#8226; FIX: Überschuss-Stopp adaptiv – cap min(target+4,20) mit Mindestpuffer target+3</div>
                    <div class="font-bold text-slate-400">v0.3.96 - 06.06.2026</div>
                    <div>&#8226; FIX: Überschuss-Stopp auf Level 6+ beschränkt – Bundesliga/Regionalligen/Oberligen behalten feste Zielgrößen</div>
                    <div class="font-bold text-slate-400">v0.3.95 - 06.06.2026</div>
                    <div>&#8226; FIX: Liga-Schutz – kein Move wenn Quell-Liga dadurch unter 6 Teams fiele</div>
                    <div>&#8226; FIX: Überschuss-Stopp – kein Abstieg in volle Bottom-Ligen (kein DOWN_MAP) über Soll hinaus</div>
                    <div class="font-bold text-slate-400">v0.3.94 - 06.06.2026</div>
                    <div>&#8226; FIX: MegaSim läuft durch Ligastruktur-Anomalien durch (sanityCheck nicht mehr fatal, Auto-Heal Orphans)</div>
                    <div>&#8226; FIX: Kein Liga-Schrumpf unter 6 Teams – universeller Mindestschutz für alle Ligen</div>
                    <div>&#8226; NEU: Liga-Größen-Button in Save-Bar – zeigt Teams/Soll/Diff mit Anomalie-Warnung</div>
                    <div class="font-bold text-slate-400">v0.3.93 - 06.06.2026</div>
                    <div>&#8226; PERF: History-Teams als 7-Element-Array gespeichert (~40 statt ~150 Bytes) – 100-Saisons-Spielstand erstmals exportierbar</div>
                    <div>&#8226; FIX: Backwards-Kompatibel – alte Spielstände werden automatisch konvertiert</div>
                    <div class="font-bold text-slate-400">v0.3.92 - 06.06.2026</div>
                    <div>&#8226; FIX: Kompletter Neustart setzt jetzt wirklich alles zurück (History/Saison/Pokal)</div>
                    <div>&#8226; FIX: Spielstand-Export nach Saison löschen immer verfügbar (saveGame Fallback korrigiert)</div>
                    <div class="font-bold text-slate-400">v0.3.91 - 06.06.2026</div>
                    <div>&#8226; FIX: Wappen in vergangenen Saisons-Ansichten nicht mehr verschwunden</div>
                    <div>&#8226; FIX: Reset-Center sofort statt 10-15s Ladezeit (kein Seiten-Reload mehr)</div>
                    <div class="font-bold text-slate-400">v0.3.90 - 06.06.2026</div>
                    <div>&#8226; NEU: manage-v liest aus template.html statt index.html – BuildOnly-Flag für schnellen Rebuild</div>
                    <div>&#8226; CLEANUP: Alte Flat-Module (app.*.js) entfernt – nur noch app/-Verzeichnis</div>
                    <div>&#8226; FIX: Schema vervollständigt – sanityCheck, generateSchedule, h2hTiebreak, _sos* eingetragen</div>
                    <div class="font-bold text-slate-400">v0.3.89 - 06.06.2026</div>
                    <div>&#8226; FIX: Import schlägt nie mehr fehl – Retry-Logik wenn localStorage voll</div>
                    <div>&#8226; FIX: loadGame-Fehler meldet sich mit Alert statt still zu versagen</div>
                    <div>&#8226; FIX: Backup-Download vor Import (DOM-kompatibel)</div>
                    <div>&#8226; PERF: Save-Größe 10x kleiner – nur dynamische Teamfelder, kein mdH in History, Top-4-Filter</div>
                    <div>&#8226; NEU: Autosave auf sessionStorage – kein localStorage-Konflikt mehr</div>
                    <div>&#8226; NEU: manage-v liest aus template.html + BuildOnly-Flag</div>
                    <div class="font-bold text-slate-400">v0.3.88 - 06.06.2026</div>
                    <div>&#8226; PERF: sanityCheck 60x schneller (O(n) statt O(n²))</div>
                    <div>&#8226; PERF: History-Snapshot nur noch notwendige Felder (kein homeStats/thumb/coord)</div>
                    <div class="font-bold text-slate-400">v0.3.87 - 06.06.2026</div>
                    <div>&#8226; PERF: Simulieren-Button nutzt jetzt fastMode (kein saveGame/sortTables pro Spieltag)</div>
                    <div class="font-bold text-slate-400">v0.3.86 - 06.06.2026</div>
                    <div>&#8226; PERF: MegaSim fastMode – kein saveGame/sortTables pro Spieltag</div>
                    <div>&#8226; NEU: Ø ms/Saison Anzeige im MegaSim-Overlay</div>
                    <div class="font-bold text-slate-400">v0.3.85 - 06.06.2026</div>
                    <div>&#8226; FIX: MegaSim läuft in 5er-Batches (5x schneller)</div>
                    <div>&#8226; FIX: Simulieren-Button friert UI nicht mehr ein</div>
                    <div class="font-bold text-slate-400">v0.3.84 - 05.06.2026</div>
                    <div>&#8226; NEU: Multi-Simulation mit Ladebalken + Abbrechen-Button</div>
                    <div>&#8226; NEU: Auto-Save nach MegaSim</div>
                    <div class="font-bold text-slate-400">v0.3.83 - 05.06.2026</div>
                    <div>&#8226; NEU: Vereinskarte öffnet sich nach Reload automatisch wieder</div>
                    <div>&#8226; NEU: Stärken schwanken organisch bis 99 (Basis BL: 99, war 90)</div>
                    <div>&#8226; FIX: calculateStrengths wird jetzt jede Saison aufgerufen</div>
                    <div class="font-bold text-slate-400">v0.3.82 - 05.06.2026</div>
                    <div>&#8226; NEU: Saison-Overlay mit Wappen/Sp/TD + Auf-/Abstieg-Markierung</div>
                    <div>&#8226; NEU: Overlay per ‹/› oder Pfeiltasten durch Vereins-Saisons blättern</div>
                    <div>&#8226; FIX: Saison-Historie im Steckbrief hat eigene Scrollbar</div>
                    <div>&#8226; FIX: History-Tiefe auf 50 Saisons erhöht (war 10)</div>
                    <div class="font-bold text-slate-400">v0.3.81 - 04.06.2026</div>
                    <div>&#8226; NEU: Saisonklick zeigt Tabellen-Overlay auf der Karte</div>
                    <div>&#8226; NEU: Liga-Häufigkeit mit Balken im Steckbrief</div>
                    <div>&#8226; FIX: Steckbrief vollständig scrollbar</div>
                    <div class="font-bold text-slate-400">v0.3.80 - 04.06.2026</div>
                    <div>&#8226; NEU: Vereinskarte – Klick öffnet Steckbrief mit Wappen, Liga, Regionen, Koordinaten + sortierbare Saison-Historie mit direktem Liga-Link</div>
                    <div class="font-bold text-slate-400">v0.3.79 - 04.06.2026</div>
                    <div>&#8226; NEU: Vereinskarte mit Region-Suche, Eltern/Kinder/Geschwister-Filter, Konvexhüllen und echten Grenzen</div>
                    <div class="font-bold text-slate-400">v0.3.78 - 04.06.2026</div>
                    <div>&#8226; NEU: Vereinskarte – alle 1264 Vereine auf interaktiver Karte (🗺-Button in Sidebar)</div>
                    <div class="font-bold text-slate-400">v0.3.77 - 04.06.2026</div>
                    <div>&#8226; FIX: 131 fehlende Koordinaten via Nominatim-Geocoding ergänzt (jetzt 1264/1264)</div>
                    <div class="font-bold text-slate-400">v0.3.76 - 04.06.2026</div>
                    <div>&#8226; FIX: Vereinsnamen in allen Dateien synchronisiert (SG Neitersen/Altenkirchen, SG Vordereifel/SV Laubach, SG Viertäler Oberwesel, FC Emmelshausen-Karbach)</div>
                    <div>&#8226; FIX: SG Vordereifel Wappen – Innenbereich weiß erhalten</div>
                    <div class="font-bold text-slate-400">v0.3.75 - 04.06.2026</div>
                    <div>&#8226; FIX: 20+ Vereinswappen korrigiert/ersetzt (Frankfurt, Auggen, Hohenecken, Mondorf u.v.m.)</div>
                    <div>&#8226; FIX: FC Emmelshausen-Karbach Fusion (game_data)</div>
                    <div>&#8226; FIX: SG Viertäler Oberwesel Umbenennung</div>
                    <div>&#8226; FIX: Bezirksliga Rheinland-Mitte Sollzahl -1</div>
                    <div class="font-bold text-slate-400">v0.3.74 - 03.06.2026</div>
                    <div>&#8226; NEU: Siegerliste-Tab bei allen Ligen (Sieger-Historie + Rangliste)</div>
                    <div>&#8226; NEU: DFB-Pokal Sieger-Tab mit Rekordsieger-Widget</div>
                    <div class="font-bold text-slate-400">v0.3.73 - 03.06.2026</div>
                    <div>&#8226; NEU: DFB-Pokal Ewige Tabelle – sortierbar, responsive, Season-Sync</div>
                    <div>&#8226; FIX: App-State-Sanitize nach Import – kein Crash bei Pokal-View</div>
                    <div class="font-bold text-slate-400">v0.3.72 - 03.06.2026</div>
                    <div>&#8226; FIX: Saison löschen stellt Vorsaison-Endstand wieder her statt resetSeason()</div>
                    <div class="font-bold text-slate-400">v0.3.71 - 03.06.2026</div>
                    <div>&#8226; NEU: Spielstand-Leiste unten (Export, Import, Quick-Save, Auto-Save, Reset-Center, Datensätze)</div>
                    <div>&#8226; NEU: Auto-Save nach jedem Spieltag automatisch</div>
                    <div>&#8226; NEU: Reset-Center mit Spieltag-Undo / Saison zurücksetzen / Saison löschen</div>
                    <div class="font-bold text-slate-400">v0.3.70 - 03.06.2026</div>
                    <div>&#8226; NEU: Liga-Pyramiden-Navigation (europlan-Stil, einklappbar)</div>
                    <div>&#8226; NEU: Kurznamen in Pyramide (LL, RL, NW, Rhld...)</div>
                    <div>&#8226; FIX: Ewige Tabelle synchronisiert mit Saisonansicht</div>
                    <div>&#8226; FIX: BL/2BL/3L Pyramide vollständig</div>
                    <div class="font-bold text-slate-400">v0.3.69 - 03.06.2026</div>
                    <div>&#8226; NEU: Ewige Tabelle pro Liga (Tab)</div>
                    <div>&#8226; NEU: Saisonweise Navigation in ewiger Tabelle</div>
                    <div>&#8226; NEU: Vergleichspfeile ▲▼ / NEU-Badge</div>
                    <div>&#8226; NEU: Titel- und Aufstiegs-Spalten</div>
                    <div class="font-bold text-slate-400">v0.3.68 - 03.06.2026</div>
                    <div>&#8226; NEU: calcZones() – hypothetische Auf-/Abstiegs-Kalkulation per Two-Pass live</div>
                    <div>&#8226; NEU: Zonen-Farben für alle Ligen (Level 1–8) inkl. variabler Abstieg orange</div>
                    <div>&#8226; NEU: Ziel-Liga pro Team in Tabelle (▼ Oberliga Westfalen statt Abstieg)</div>
                    <div>&#8226; NEU: Vorsaison-Badges M/V/N↑/A↓/P/R rückwirkend aus History</div>
                    <div>&#8226; FIX: Playoff-Ligen kein falsches Overflow-Orange</div>
                    <div>&#8226; FIX: Blatt-Ligen (z.B. Sachsenliga) zeigen Aufstiegszone</div>
                    <div class="font-bold text-slate-400">v0.3.67 - 02.06.2026</div>
                    <div>&#8226; NEU: Spieltag-Pfeile (innen=Spieltag, außen=Saison) mit Tabellen- und Ergebnisanzeige pro Spieltag</div>
                    <div>&#8226; NEU: Tabellenrekonstruktion aus Spielergebnissen (kein Snapshot-Speicher)</div>
                    <div>&#8226; NEU: Letzte Liga wird beim Reload wiederhergestellt</div>
                    <div>&#8226; FIX: DFB-Pokal NEU-Badge bleibt nach Öffnen korrekt weg</div>
                    <div>&#8226; NEU: Alle Ligen im Spieltag-Browsing (aktuelle Saison)</div>
                    <div>&#8226;  Level 1-4 auch in archivierten Saisons</div>
                    <div class="font-bold text-slate-400">v0.3.66 - 02.06.2026</div>
                    <div>&#8226; NEU: Alle 1265 Vereinswappen normalisiert – einheitliches 8% Padding + Quadrat</div>
                    <div>&#8226; NEU: Ligen-Wappen Seitenleiste normalisiert – 4% Padding, Hoehe 24px, Querformate korrekt</div>
                    <div>&#8226; FIX: Mittelrheinliga – weisser Hintergrund entfernt</div>
                    <div class="font-bold text-slate-400">v0.3.65 - 02.06.2026</div>
                    <div>&#8226; FIX: Tabellenlogos von 24px auf 32px vergrößert</div>
                    <div>&#8226; FIX: Wappen RB Leipzig, DSC Arminia Bielefeld – auf Inhalt gecroppt</div>
                    <div>&#8226; FIX: Korrekte TM-Logos für Stern Britz, Spandau 06, SC Birkenfeld</div>
                    <div>&#8226; FIX: FV Lebach → SG Lebach-Landsweiler umbenannt + korrektes Wappen</div>
                    <div class="font-bold text-slate-400">v0.3.64 - 02.06.2026</div>
                    <div>&#8226; NEU: Hell/Dunkel-Umschalter im Header (Einstellung gespeichert)</div>
                    <div>&#8226; FIX: SV Liebshausen → SG Liebshausen/Mörschbach/Argenthal – umbenannt + neues Wappen</div>
                    <div>&#8226; FIX: Wappen TuS Immendorf, SG Mendig/Bell, FV Rübenach – neue TM-Logos</div>
                    <div>&#8226; FIX: FV Rübenach – weißer Hintergrund für Sichtbarkeit auf dunklem Grund</div>
                    <div class="font-bold text-slate-400">v0.3.63 - 02.06.2026</div>
                    <div>&#8226; FIX: Wappen FC Fortuna Mombach + TuS Schaidt – Hintergrund transparent</div>
                    <div>&#8226; FIX: SV 1930 Rot-Weiss Seebach – korrektes Vereinswappen</div>
                    <div>&#8226; NEU: manage-v -BuildOnly fuer lokalen Test vor Commit</div>
                    <div class="font-bold text-slate-400">v0.3.62 - 02.06.2026</div>
                    <div>&#8226; FIX: 4 weitere Wappen-Hintergründe auf transparent gesetzt (SC Lahr, SV Oberzissen, TuS Ahrbach, TuS Montabaur)</div>
                    <div class="font-bold text-slate-400">v0.3.61 - 02.06.2026</div>
                    <div>&#8226; FIX: 18 Vereinswappen hatten weißen Hintergrund – per Flood-Fill auf transparent gesetzt</div>
                    <div class="font-bold text-slate-400">v0.3.60 - 02.06.2026</div>
                    <div>&#8226; NEU: Letzte 7 Vereinswappen manuell ergänzt (SV Vettelschoß, VfL Mannweiler, SV Niederwörresbach u.a.)</div>
                    <div>&#8226; INFO: 1265/1265 Vereine haben jetzt ein Wappen – 100% Abdeckung</div>
                    <div class="font-bold text-slate-400">v0.3.59 - 02.06.2026</div>
                    <div>&#8226; NEU: TB Uphusen und VfB Ottersleben Wappen ergänzt</div>
                    <div>&#8226; INFO: 7 Vereine ohne auffindbare Logos (Spielgemeinschaften ohne eigenes Wappen)</div>
                    <div class="font-bold text-slate-400">v0.3.58 - 02.06.2026</div>
                    <div>&#8226; NEU: 43 weitere Vereinswappen via FuPa.net (Bezirks- und Kreisligen)</div>
                    <div>&#8226; INFO: 1263 von 1265 Vereinen haben nun ein Wappen (2 unauffindbar)</div>
                    <div class="font-bold text-slate-400">v0.3.57 - 02.06.2026</div>
                    <div>&#8226; FIX: manage-v schreibt index.html/template.html/modal.js jetzt auch bei geöffnetem Browser zuverlässig</div>
                    <div class="font-bold text-slate-400">v0.3.56 - 02.06.2026</div>
                    <div>&#8226; FIX: index.html v0.3.56 korrekt gesetzt</div>
                    <div class="font-bold text-slate-400">v0.3.56 - 02.06.2026</div>
                    <div>&#8226; NEU: 328 fehlende Vereinswappen heruntergeladen (Transfermarkt-CDN)</div>
                    <div>&#8226; FIX: thumb-Felder in game_data.js für 318 Vereine ergänzt</div>
                    <div>&#8226; FIX: thumb-Felder in data_live.js für 324 Vereine gesetzt (inkl. Hertha BSC, Mainz 05, Köln, Freiburg u.a.)</div>
                    <div class="font-bold text-slate-400">v0.3.55 - 02.06.2026</div>
                    <div>&#8226; FIX: DSC Arminia Bielefeld – Präfix ergänzt</div>
                    <div>&#8226; FIX: SpVgg Ingelheim – Tippfehler (1ngelheim) korrigiert</div>
                    <div>&#8226; FIX: TSV Schwaben Augsburg – Präfix ergänzt</div>
                    <div>&#8226; FIX: FK 03 Pirmasens – Jahreszahl ergänzt</div>
                    <div>&#8226; FIX: SV Viktoria 01 Aschaffenburg – Jahreszahl ergänzt</div>
                    <div>&#8226; FIX: VfR Krefeld-Fischeln – Stadtname ergänzt</div>
                    <div class="font-bold text-slate-400">v0.3.54 - 02.06.2026</div>
                    <div>&#8226; FIX: Spielstand-Sanitizer – alle GAME_DATA-Felder (Name, Wappen, Regions …) werden beim Laden automatisch aktualisiert</div>
                    <div class="font-bold text-slate-400">v0.3.53 - 02.06.2026</div>
                    <div>&#8226; FIX: 54 Vereinsnamen in data_live.js korrigiert (1.FC → 1. FC) – betraf alle Ligen</div>
                    <div class="font-bold text-slate-400">v0.3.52 - 02.06.2026</div>
                    <div>&#8226; FIX: 54 Vereinsnamen korrigiert – 1.FC/1.FSV/1.SC → korrekte Schreibweise mit Leerzeichen</div>
                    <div class="font-bold text-slate-400">v0.3.51 - 02.06.2026</div>
                    <div>&#8226; FIX: Vereinswappen in Liga-Tabelle hatten keine Höhenbeschränkung – jetzt 24×24px mit object-fit</div>
                    <div class="font-bold text-slate-400">v0.3.50 - 02.06.2026</div>
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
    Engine.saveGame();

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

showLeagueSizes: function() {
    const counts = {};
    Object.values(Engine.teams).forEach(t => { if (t.leagueId) counts[t.leagueId] = (counts[t.leagueId] || 0) + 1; });
    const sorted = Object.values(Engine.leagues).sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));
    const rows = sorted.map(l => {
        const n = counts[l.id] || 0;
        const tgt = l.target || 18;
        const diff = n - tgt;
        let col = n < 6 ? '#dc2626' : n < 10 ? '#f59e0b' : diff > 5 ? '#f97316' : diff >= 0 ? '#10b981' : '#64748b';
        return `<tr style="border-bottom:1px solid #1e293b">
            <td style="padding:2px 6px;color:#64748b;font-size:11px">${l.level}</td>
            <td style="padding:2px 6px;white-space:nowrap">${l.name}</td>
            <td style="padding:2px 6px;text-align:center;font-weight:bold;color:${col}">${n}</td>
            <td style="padding:2px 6px;text-align:center;color:#475569">${tgt}</td>
            <td style="padding:2px 6px;text-align:center;color:${diff > 5 ? '#f97316' : diff < -2 ? '#f59e0b' : '#475569'}">${diff > 0 ? '+' : ''}${diff}</td>
        </tr>`;
    }).join('');
    const anomalien = sorted.filter(l => (counts[l.id]||0) < 6 || (counts[l.id]||0) > (l.target||18)+5).length;
    App.openModal(`⚖️ Liga-Größen${anomalien ? ' ⚠ '+anomalien+' Anomalien' : ''}`,
        `<div style="font-size:12px;max-height:70vh;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#0f172a;color:#64748b;font-size:11px">
                <th style="padding:3px 6px;text-align:left">Lvl</th>
                <th style="padding:3px 6px;text-align:left">Liga</th>
                <th style="padding:3px 6px">Teams</th>
                <th style="padding:3px 6px">Soll</th>
                <th style="padding:3px 6px">Diff</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`, false);
},

megaSim: function() {
    const n = parseInt(prompt("Wie viele Saisons simulieren?", "10"));
    if (!n || n < 1 || n > 500) return;

    const overlay = document.getElementById('megasim-overlay');
    const bar = document.getElementById('megasim-bar');
    const counter = document.getElementById('megasim-counter');
    const seasonEl = document.getElementById('megasim-season');
    overlay.style.display = 'flex';
    bar.style.width = '0%';
    counter.textContent = `0 / ${n} Saisons`;
    seasonEl.textContent = '–';

    let done = 0, totalMs = 0;
    App._megaSimCancelled = false;
    Engine.fastMode = true;
    App._megaSimCancel = function() { App._megaSimCancelled = true; };

    const self = this;
    const finish = (msg) => {
        Engine.fastMode = false;
        counter.textContent = msg;
        bar.style.width = '100%';
        setTimeout(() => {
            overlay.style.display = 'none';
            self.renderSidebar();
            self.loadLeague(self.activeLeague);
            self.updateStatus();
        }, 1200);
    };

    const BATCH = 5;
    const step = () => {
        if (App._megaSimCancelled) {
            Engine.fastMode = false;
            overlay.style.display = 'none';
            self.renderSidebar();
            self.loadLeague(self.activeLeague);
            self.updateStatus();
            return;
        }
        if (done >= n) {
            Engine.saveGame();
            const avg = done ? Math.round(totalMs / done) : 0;
            finish(`✓ ${done} Saisons · Ø ${avg} ms/Saison`);
            return;
        }
        const t0 = performance.now();
        for (let b = 0; b < BATCH && done < n && !App._megaSimCancelled; b++) {
            try {
                Engine.simulateFullSeason();
                const pre = Engine.sanityCheck();
                if (pre.length) Engine.log('warn', `Pre-Transition S${done+1}: ${pre.join(' | ')}`);
                Engine.processSeasonTransition();
                const post = Engine.sanityCheck();
                if (post.length) {
                    // Orphans = fatal; Ligen mit <2 Teams = Warnung, weiter simulieren
                    const orphanIssue = post.find(s => s.includes('Teams ohne Liga'));
                    if (orphanIssue) {
                        // Auto-Heal: Orphans aus GAME_DATA zurück in Startliga
                        Object.values(Engine.teams).forEach(t => {
                            if (!t.leagueId || !Engine.leagues[t.leagueId]) {
                                const ref = GAME_DATA.teams[t.id];
                                if (ref && ref.leagueId && Engine.leagues[ref.leagueId]) t.leagueId = ref.leagueId;
                                else Engine.log('error', `Orphan ohne Fallback: ${t.name}`);
                            }
                        });
                        Engine.log('warn', `Auto-Heal Orphans S${done+1}: ${orphanIssue}`);
                    } else {
                        Engine.log('warn', `SanityCheck S${done+1}: ${post.join(' | ')}`);
                    }
                }
                done++;
            } catch(e) {
                Engine.log('error', `Exception S${done+1}: ${e.message}`);
                finish(`⚠ Exception nach ${done} Saisons`);
                return;
            }
        }
        totalMs += performance.now() - t0;
        const avg = done ? Math.round(totalMs / done) : 0;
        bar.style.width = Math.round((done / n) * 100) + '%';
        counter.textContent = `${done} / ${n} Saisons`;
        seasonEl.textContent = `Ø ${avg} ms/Saison`;
        setTimeout(step, 0);
    };

    setTimeout(step, 0);
},

showSteckbrief: function(teamId) {
    const t = GAME_DATA.teams[teamId];
    if (!t) return;
    const live = typeof Engine !== 'undefined' ? Engine.teams[teamId] : null;
    const leagueId = live?.leagueId || t.leagueId;
    const liga = GAME_DATA.leagues[leagueId];
    const level = liga?.level || 99;
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const thumb = live?.thumb || t.thumb;

    const regs = (typeof MAP_TEAM_REGIONS !== 'undefined' ? MAP_TEAM_REGIONS[t.name] : null) || [];
    const regsHtml = regs.length
        ? regs.map(r => `<span style="display:inline-block;background:#252540;padding:1px 6px;border-radius:3px;margin:1px 2px 1px 0;font-size:11px">${r}</span>`).join('')
        : '<span style="color:#555;font-size:11px">–</span>';

    const rows = [];
    const hist = (typeof Engine !== 'undefined' && Engine.history) ? Engine.history : [];
    hist.forEach((h, idx) => {
        const ht = h.teams?.[teamId];
        if (!ht?.leagueId) return;
        const l = GAME_DATA.leagues[ht.leagueId];
        rows.push({ year: h.year || `Saison ${idx+1}`, leagueId: ht.leagueId, ligaName: l?.name || ht.leagueId, rank: ht.rank || '–', isCurrent: false });
    });
    if (leagueId) rows.push({ year: (typeof Engine !== 'undefined' ? Engine.currentSeason : '–') || 'Aktuell', leagueId, ligaName: liga?.name || leagueId, rank: live?.rank || '–', isCurrent: true });
    const sorted = rows.slice().reverse();

    const ligaCount = {};
    rows.forEach(r => {
        if (!ligaCount[r.leagueId]) ligaCount[r.leagueId] = { name: r.ligaName, count: 0, level: GAME_DATA.leagues[r.leagueId]?.level || 99 };
        ligaCount[r.leagueId].count++;
    });
    const ligaSorted = Object.values(ligaCount).sort((a, b) => a.level - b.level || b.count - a.count);
    let freqHtml = '';
    if (ligaSorted.length > 1) {
        freqHtml = `<div style="border-top:1px solid #2a2a3a;padding-top:8px;margin:8px 0 4px"><div style="font-size:11px;font-weight:bold;color:#888;margin-bottom:5px">LIGA-HÄUFIGKEIT</div>`;
        ligaSorted.forEach(l => {
            const col = LC[l.level] || '#777';
            const bar = Math.round((l.count / rows.length) * 140);
            freqHtml += `<div style="margin-bottom:3px"><div style="display:flex;justify-content:space-between;font-size:10px;color:#aaa;margin-bottom:1px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${l.name}</span><span style="flex-shrink:0;margin-left:4px;color:#666">${l.count}×</span></div><div style="height:4px;border-radius:2px;background:#2a2a3a"><div style="height:100%;width:${bar}px;max-width:100%;border-radius:2px;background:${col}"></div></div></div>`;
        });
        freqHtml += '</div>';
    }

    let histHtml = `<div style="border-top:1px solid #2a2a3a;padding-top:8px"><div style="font-size:11px;font-weight:bold;color:#888;margin-bottom:6px">SAISON-HISTORIE</div>`;
    if (!sorted.length) {
        histHtml += '<div style="font-size:11px;color:#555">Keine Daten</div>';
    } else {
        sorted.forEach(r => {
            const lv = GAME_DATA.leagues[r.leagueId]?.level || 99;
            const dot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LC[lv]||'#888'};margin-right:4px;flex-shrink:0"></span>`;
            const bg = r.isCurrent ? '#1a2a1a' : '';
            histHtml += `<div onclick="App.loadLeague('${r.leagueId}')" style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:4px;cursor:pointer;background:${bg};margin-bottom:1px" onmouseover="this.style.background='#1e2a3a'" onmouseout="this.style.background='${bg}'">${dot}<div style="flex:1;min-width:0"><div style="font-size:11px;${r.isCurrent?'font-weight:bold;':''}color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.ligaName}</div><div style="font-size:10px;color:#666">${r.year}</div></div><div style="font-size:11px;color:#aaa;flex-shrink:0">${r.rank !== '–' ? 'Pl. '+r.rank : '–'}</div></div>`;
        });
    }
    histHtml += '</div>';

    const body = `<div style="text-align:center;padding:8px 0 4px">${thumb ? `<img src="${thumb}" width="64" height="64" style="object-fit:contain;display:block;margin:0 auto 8px">` : ''}<div style="font-size:17px;font-weight:bold;margin-bottom:4px">${t.name}</div>${liga ? `<span style="font-size:11px;padding:2px 7px;border-radius:3px;background:${LC[level]};color:#fff">Level ${level}</span>` : ''}</div><div style="margin-top:8px;font-size:11px;color:#888">LIGA</div><div style="font-size:13px;cursor:pointer;color:#6af;margin-bottom:2px" onclick="App.loadLeague('${leagueId}')">${liga?.name || '–'}</div><div style="margin-top:8px;font-size:11px;color:#888">REGIONEN</div><div style="margin-top:2px">${regsHtml}</div><div style="margin-top:8px;font-size:11px;color:#888">KOORDINATEN</div><div style="font-size:11px;color:#aaa">${t.lat?.toFixed(5)}, ${t.lon?.toFixed(5)}</div>${freqHtml}${histHtml}`;
    this.openModal(t.name, body, false);
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
reset: function() {
    if(confirm("Reset?")) {
        localStorage.removeItem('ba_save_v66');
        sessionStorage.removeItem('ba_autosave_v66');
        Engine.init();
        App._sanitizeAppState();
        document.getElementById('modal').style.display = 'none';
        App.renderSidebar();
        App.loadLeague(App.activeLeague);
        App.updateStatus();
        App.updateSaveStatus('🔄 Neugestartet');
    }
}
});





