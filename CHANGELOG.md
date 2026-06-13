## v0.4.4 (13.06.2026)
- FIX: Steckbrief-Link, Wappen und Badges in archivierten Saisons funktionieren wieder
- NEU: App heißt jetzt Bundesliga Mobile

## v0.4.3 (13.06.2026)
- FIX: Pull-to-Refresh nutzt jetzt Kreis-Pfeil-Symbol (Neu-Laden) statt sich drehendem Richtungspfeil

## v0.4.2 (13.06.2026)
- NEU: Pull-to-Refresh (am Seitenanfang nach unten ziehen laedt neu)
- NEU: Homescreen-Icon / PWA-Manifest (Bundesliga-Logo statt generischem Buchstabe)
- FIX: Offenburger FV aktuelles Vereinslogo

## v0.4.1 (13.06.2026)
- FIX: Liga-Baum-Beschriftung - ohne manuelles Kuerzel wird der volle Liganame gezeigt statt Algorithmus-Abkuerzung (kein Hessliga/Sachliga mehr)

## v0.4.0 (12.06.2026)
- NEU: Liga-Baum zeigt vollen Liga-Namen wenn Platz, sonst Kuerzel (responsiv)
- NEU: Gruppen-Tag fuer gleichnamige Bloecke - RL/LL links statt Wortwiederholung in jedem Button
- NEU: Liga-Kuerzel-Editor (tools/liga-kuerzel-editor.html) zum pixelgenauen Verfassen der Abkuerzungen
- FIX: Abgeschnittene Kuerzel (...) auf schmalen Handys behoben - Nav-Schrift 10px, Gruppen-Block-Raender erweitert

## v0.3.99 (12.06.2026)
- NEU: Responsives Header-Redesign - Navigation mittig, Overflow-Menue als fester Anker, stufenlose clamp-Skalierung
- NEU: Globale Suche in der Action-Bar - am Desktop ausklappbar, mobil als Lupe
- NEU: Saison und Spieltag per Klick waehlbar (Dropdown-Picker)
- NEU: Spielergebnisse-Block einklappbar
- NEU: Saison-Komplettsimulation mit Warnhinweis
- FIX: Liganame und Buttons fuellen freien Platz statt abzuschneiden

## v0.3.98 (11.06.2026)
- FIX: Mobil – alle Header-Buttons sichtbar (Suche kollabierbar)
- NEU: Save-Bar einklappbar (Aktionen ▴/▾, persistiert)
- NEU: Liga-Nav geometrisch symmetrisch (flex:1, kein Pfeil auf aktiver Liga)
- FIX: Weltkarte in Sidebar-Header verschoben
- FIX: Blaue Header-Buttons bei breitem Fenster nicht mehr abgeschnitten

## v0.3.97 (10.06.2026)
- NEU: Action-Bar unter dem Header (Woche/Saison/Multi-Saison)
- NEU: Overflow-Menü (···) für Regeln/Log/Reset
- NEU: Saison-Button wird zu Abschluss am Saisonende
- NEU: Vereinskarte im Header neben Suche
- NEU: Theme-Toggle in Sidebar

## v0.3.96 (10.06.2026)
- NEU: Globale Suche (Lupe) im Header – Liga und Verein mit Wappen
- NEU: App-Titel umbenannt zu Bundesliga Mobile

## v0.3.95 (09.06.2026)
- FIX: Karte – BW geo-Regionen (Baden/Südbaden/Württemberg) entfernt, FV-Hüllen behalten
- FIX: Karte – Rheinland: nur blaues FVR-Polygon (rlp_fvr) behalten, orange+lila Hüllen entfernt

## v0.3.94 (09.06.2026)
- NEU: Karte – Typ-Chips selektieren/deselektieren alle Polygone eines Typs
- NEU: Karte – Dropdown bleibt offen, schließt nur per Klick außerhalb
- NEU: Wappen FT Schweinfurt

## v0.3.93 (09.06.2026)
- NEU: Karte – 4 Niedersachsen-Regierungsbezirke als hochauflösende OSM-Polygone (VW-Badge)
- NEU: Karte – Dropdown zeigt alle Polygone frei filterbar + Alle-abwählen
- FIX: Karte – Dropdown bleibt nach Polygonauswahl offen
- FIX: Karte – Niedersachsen-Kreismerger-Polygone entfernt

## v0.3.92 (07.06.2026)
- NEU: Karte – Südwestdeutscher FV + FV Rheinland als Geo-Regionen (stufe=2) wie Mittelrhein/Niederrhein/Westfalen

## v0.3.91 (07.06.2026)
- FIX: Karte – Koordinaten TuS Steinbach/Donnersberg + VfB Reichenbach 1921
- FIX: Karte – Logo SV 1965 Erlenbach + Tag TuS Rüssingen → Südwest West

## v0.3.90 (07.06.2026)
- FIX: Karte – Koordinaten Geinsheim/Erlenbach/Birkenfeld (Nahe)
- FIX: Karte – Tags Langenlonsheim/TSG KL/Schopp/Bad Kreuznach II → Südwest West

## v0.3.89 (07.06.2026)
- FIX: Voronoi-Seeds kontextsensitiv (Einzugsgebiete folgen echter Vereinsverteilung)
- FIX: 9 falsch-getaggte Teams via MANUAL_ALIASES behoben
- FIX: Bremerhaven realistisches Polygon
- PERF: Hüllen-Buffer 1.08

## v0.4.10 (07.06.2026)
- NEU: Karte – Regionen/Hüllen/Grenzen durch Anklicken ein-/abwählbar (Multi-Select)
-  ausgewählte Polygone hervorgehoben, nicht ausgewählte abgedunkelt
- NEU: Karte – Level-Bereichsfilter statt Einzellevel (L 1–8 frei einstellbar in beide Richtungen)

## v0.4.9 (07.06.2026)
- FIX: Karte – 55 Vereinsnamen in Excel hatten falsches Format (1.FC statt 1. FC), wodurch Regionen fehlerhaft zugewiesen wurden (z.B. 1. FC Bocholt in Westfalen statt Niederrhein)

## v0.4.8 (07.06.2026)
- FIX: Karte – Reserven standardmäßig sichtbar (alle 1265 Teams)
- FIX: Karte – Velbert echte Stadion-Koordinaten (3 getrennte Standorte)
- NEU: Karte – Jitter für standortgleiche Teams
- FIX: Karte – Namenssuche zeigt Reserven auch bei ausgeblendetem Filter

## v0.4.7 (07.06.2026)
- FIX: Karte – alle 1265 Vereine haben Regionen (PIP-Fallback)
- FIX: Karte – Westmünsterland-Polygon korrigiert (Gronau/Borken/Vreden)
- FIX: Karte – Bremerhaven als Teil von Bremen
- NEU: Karte – Sonderregion südlich Bremen
- FIX: Karte – Niedersachsen-Polygone blau statt grün

## v0.4.6 (07.06.2026)
- NEU: Bracket-Teams anklickbar (Steckbrief-Modal)
- NEU: Stärkewerte in Teilnehmerfeld, Paarungen und Bracket

## v0.4.5 (07.06.2026)
- NEU: Vereinsnamen überall anklickbar – Steckbrief mit Wappen, Liga, Historie, Häufigkeit als Modal

## v0.4.4 (07.06.2026)
- FIX: Wappen Hamborn 07, TuRU Düsseldorf, SC Düsseldorf-West, 1. FC Mühlhausen, BSG Stahl Brandenburg
- FIX: Liga-Wappen 5-1 (Oberliga RLP/Saar) und 6-1 (Verbandsliga Südwest) getauscht

## v0.4.3 (07.06.2026)
- FIX: Reserve-Sperre – II-Mannschaften maximal bis 3. Liga (nie 2. Bundesliga oder höher)

## v0.4.2 (07.06.2026)
- FIX: Reserves in Pokal-Regionalliga-Restliste (restRl) jetzt korrekt ausgeschlossen

## v0.4.1 (07.06.2026)
- NEU: Reserveteams vom DFB-Pokal ausgeschlossen
- NEU: Reserve-Sperre – II-Mannschaft nicht auf gleichem/höherem Level wie Elternverein
- NEU: Reserve-Cascade – Eltern abgestiegen pusht Reserve weiter runter
- FIX: parentId-Datenpflege (82/84 Reserves korrekt verknüpft)

## v0.4.0 (06.06.2026)
- FIX: Landesliga Niederrhein Gruppe 1/2 je 14 Teams
- FIX: Verbandsliga Hessen Nord/Mitte/Sued targets auf Ist angepasst

## v0.3.99 (06.06.2026)
- FIX: Landesliga Hamburg Hammonia/Hansa je 10 Teams

## v0.3.98 (06.06.2026)
- FIX: Hessenliga (ex Oberliga Hessen) target 18 + korrekter Kader
- FIX: SKV Rot-Weiss Darmstadt neu angelegt
- FIX: Bezirksliga Rheinland 10-10-10

## v0.3.97 (06.06.2026)
- FIX: Überschuss-Stopp adaptiv – cap min(target+4,20) mit Mindestpuffer target+3

## v0.3.96 (06.06.2026)
- FIX: Überschuss-Stopp auf Level 6+ beschränkt – Bundesliga/Regionalligen/Oberligen behalten feste Zielgrößen

## v0.3.95 (06.06.2026)
- FIX: Liga-Schutz – kein Move wenn Quell-Liga dadurch unter 6 Teams fiele
- FIX: Überschuss-Stopp – kein Abstieg in volle Bottom-Ligen (kein DOWN_MAP) über Soll hinaus

## v0.3.94 (06.06.2026)
- FIX: MegaSim läuft durch Ligastruktur-Anomalien durch (sanityCheck nicht mehr fatal, Auto-Heal Orphans)
- FIX: Kein Liga-Schrumpf unter 6 Teams – universeller Mindestschutz für alle Ligen
- NEU: Liga-Größen-Button in Save-Bar – zeigt Teams/Soll/Diff mit Anomalie-Warnung

## v0.3.93 (06.06.2026)
- PERF: History-Teams als 7-Element-Array gespeichert (~40 statt ~150 Bytes) – 100-Saisons-Spielstand erstmals exportierbar
- FIX: Backwards-Kompatibel – alte Spielstände werden automatisch konvertiert

## v0.3.92 (06.06.2026)
- FIX: Kompletter Neustart setzt jetzt wirklich alles zurück (History/Saison/Pokal)
- FIX: Spielstand-Export nach Saison löschen immer verfügbar (saveGame Fallback korrigiert)

## v0.3.91 (06.06.2026)
- FIX: Wappen in vergangenen Saisons-Ansichten nicht mehr verschwunden
- FIX: Reset-Center sofort statt 10-15s Ladezeit (kein Seiten-Reload mehr)

## v0.3.90 (06.06.2026)
- NEU: manage-v liest aus template.html statt index.html – BuildOnly-Flag für schnellen Rebuild
- CLEANUP: Alte Flat-Module (app.*.js) entfernt – nur noch app/-Verzeichnis
- FIX: Schema vervollständigt – sanityCheck, generateSchedule, h2hTiebreak, _sos* eingetragen

## v0.3.89 (06.06.2026)
- FIX: Import schlägt nie mehr fehl – Retry-Logik wenn localStorage voll
- FIX: loadGame-Fehler meldet sich mit Alert statt still zu versagen
- FIX: Backup-Download vor Import (DOM-kompatibel)
- PERF: Save-Größe 10x kleiner – nur dynamische Teamfelder, kein mdH in History, Top-4-Filter
- NEU: Autosave auf sessionStorage – kein localStorage-Konflikt mehr
- NEU: manage-v liest aus template.html + BuildOnly-Flag

## v0.3.88 (06.06.2026)
- PERF: sanityCheck 60x schneller (O(n) statt O(n²))
- PERF: History-Snapshot nur noch notwendige Felder (kein homeStats/thumb/coord)

## v0.3.87 (06.06.2026)
- PERF: Simulieren-Button nutzt jetzt fastMode (kein saveGame/sortTables pro Spieltag)

## v0.3.86 (06.06.2026)
- PERF: MegaSim fastMode – kein saveGame/sortTables pro Spieltag
- NEU: Ø ms/Saison Anzeige im MegaSim-Overlay

## v0.3.85 (06.06.2026)
- FIX: MegaSim läuft in 5er-Batches (5x schneller)
- FIX: Simulieren-Button friert UI nicht mehr ein

## v0.3.84 (05.06.2026)
- NEU: Multi-Simulation mit Ladebalken + Abbrechen-Button
- NEU: Auto-Save nach MegaSim

## v0.3.83 (05.06.2026)
- NEU: Vereinskarte öffnet sich nach Reload automatisch wieder
- NEU: Stärken schwanken organisch bis 99 (Basis BL: 99, war 90)
- FIX: calculateStrengths wird jetzt jede Saison aufgerufen

## v0.3.82 (05.06.2026)
- NEU: Saison-Overlay mit Wappen/Sp/TD + Auf-/Abstieg-Markierung
- NEU: Overlay per ‹/› oder Pfeiltasten durch Vereins-Saisons blättern
- FIX: Saison-Historie im Steckbrief hat eigene Scrollbar
- FIX: History-Tiefe auf 50 Saisons erhöht (war 10)

## v0.3.81 (04.06.2026)
- NEU: Saisonklick zeigt Tabellen-Overlay auf der Karte
- NEU: Liga-Häufigkeit mit Balken im Steckbrief
- FIX: Steckbrief vollständig scrollbar

## v0.3.80 (04.06.2026)
- NEU: Vereinskarte – Klick öffnet Steckbrief mit Wappen, Liga, Regionen, Koordinaten + sortierbare Saison-Historie mit direktem Liga-Link

## v0.3.79 (04.06.2026)
- NEU: Vereinskarte mit Region-Suche, Eltern/Kinder/Geschwister-Filter, Konvexhüllen und echten Grenzen

## v0.3.78 (04.06.2026)
- NEU: Vereinskarte – alle 1264 Vereine auf interaktiver Karte (🗺-Button in Sidebar)

## v0.3.77 (04.06.2026)
- FIX: 131 fehlende Koordinaten via Nominatim-Geocoding ergänzt (jetzt 1264/1264)

## v0.3.76 (04.06.2026)
- FIX: Vereinsnamen in allen Dateien synchronisiert (SG Neitersen/Altenkirchen, SG Vordereifel/SV Laubach, SG Viertäler Oberwesel, FC Emmelshausen-Karbach)
- FIX: SG Vordereifel Wappen – Innenbereich weiß erhalten

## v0.3.75 (04.06.2026)
- FIX: 20+ Vereinswappen korrigiert/ersetzt (Frankfurt, Auggen, Hohenecken, Mondorf u.v.m.)
- FIX: FC Emmelshausen-Karbach Fusion (game_data)
- FIX: SG Viertäler Oberwesel Umbenennung
- FIX: Bezirksliga Rheinland-Mitte Sollzahl -1

## v0.3.74 (03.06.2026)
- NEU: Siegerliste-Tab bei allen Ligen (Sieger-Historie + Rangliste)
- NEU: DFB-Pokal Sieger-Tab mit Rekordsieger-Widget

## v0.3.73 (03.06.2026)
- NEU: DFB-Pokal Ewige Tabelle – sortierbar, responsive, Season-Sync
- FIX: App-State-Sanitize nach Import – kein Crash bei Pokal-View

## v0.3.72 (03.06.2026)
- FIX: Saison löschen stellt Vorsaison-Endstand wieder her statt resetSeason()

## v0.3.71 (03.06.2026)
- NEU: Spielstand-Leiste unten (Export, Import, Quick-Save, Auto-Save, Reset-Center, Datensätze)
- NEU: Auto-Save nach jedem Spieltag automatisch
- NEU: Reset-Center mit Spieltag-Undo / Saison zurücksetzen / Saison löschen

## v0.3.70 (03.06.2026)
- NEU: Liga-Pyramiden-Navigation (europlan-Stil, einklappbar)
- NEU: Kurznamen in Pyramide (LL, RL, NW, Rhld...)
- FIX: Ewige Tabelle synchronisiert mit Saisonansicht
- FIX: BL/2BL/3L Pyramide vollständig

## v0.3.69 (03.06.2026)
- NEU: Ewige Tabelle pro Liga (Tab)
- NEU: Saisonweise Navigation in ewiger Tabelle
- NEU: Vergleichspfeile ▲▼ / NEU-Badge
- NEU: Titel- und Aufstiegs-Spalten

## v0.3.68 (03.06.2026)
- NEU: calcZones() – hypothetische Auf-/Abstiegs-Kalkulation per Two-Pass live
- NEU: Zonen-Farben für alle Ligen (Level 1–8) inkl. variabler Abstieg orange
- NEU: Ziel-Liga pro Team in Tabelle (▼ Oberliga Westfalen statt Abstieg)
- NEU: Vorsaison-Badges M/V/N↑/A↓/P/R rückwirkend aus History
- FIX: Playoff-Ligen kein falsches Overflow-Orange
- FIX: Blatt-Ligen (z.B. Sachsenliga) zeigen Aufstiegszone

## v0.3.67 (02.06.2026)
- NEU: Spieltag-Pfeile (innen=Spieltag, außen=Saison) mit Tabellen- und Ergebnisanzeige pro Spieltag
- NEU: Tabellenrekonstruktion aus Spielergebnissen (kein Snapshot-Speicher)
- NEU: Letzte Liga wird beim Reload wiederhergestellt
- FIX: DFB-Pokal NEU-Badge bleibt nach Öffnen korrekt weg
- NEU: Alle Ligen im Spieltag-Browsing (aktuelle Saison)
-  Level 1-4 auch in archivierten Saisons

## v0.3.66 (02.06.2026)
- NEU: Alle 1265 Vereinswappen normalisiert – einheitliches 8% Padding + Quadrat
- NEU: Ligen-Wappen Seitenleiste normalisiert – 4% Padding, Hoehe 24px, Querformate korrekt
- FIX: Mittelrheinliga – weisser Hintergrund entfernt

## v0.3.65 (02.06.2026)
- FIX: Tabellenlogos von 24px auf 32px vergrößert
- FIX: Wappen RB Leipzig, DSC Arminia Bielefeld – auf Inhalt gecroppt
- FIX: Korrekte TM-Logos für Stern Britz, Spandau 06, SC Birkenfeld
- FIX: FV Lebach → SG Lebach-Landsweiler umbenannt + korrektes Wappen

## v0.3.64 (02.06.2026)
- NEU: Hell/Dunkel-Umschalter im Header (Einstellung gespeichert)
- FIX: SV Liebshausen → SG Liebshausen/Mörschbach/Argenthal – umbenannt + neues Wappen
- FIX: Wappen TuS Immendorf, SG Mendig/Bell, FV Rübenach – neue TM-Logos
- FIX: FV Rübenach – weißer Hintergrund für Sichtbarkeit auf dunklem Grund

## v0.3.63 (02.06.2026)
- FIX: Wappen FC Fortuna Mombach + TuS Schaidt – Hintergrund transparent
- FIX: SV 1930 Rot-Weiss Seebach – korrektes Vereinswappen
- NEU: manage-v -BuildOnly fuer lokalen Test vor Commit

## v0.3.62 (02.06.2026)
- FIX: 4 weitere Wappen-Hintergründe auf transparent gesetzt (SC Lahr, SV Oberzissen, TuS Ahrbach, TuS Montabaur)

## v0.3.61 (02.06.2026)
- FIX: 18 Vereinswappen hatten weißen Hintergrund – per Flood-Fill auf transparent gesetzt

## v0.3.60 (02.06.2026)
- NEU: Letzte 7 Vereinswappen manuell ergänzt (SV Vettelschoß, VfL Mannweiler, SV Niederwörresbach u.a.)
- INFO: 1265/1265 Vereine haben jetzt ein Wappen – 100% Abdeckung

## v0.3.59 (02.06.2026)
- NEU: TB Uphusen und VfB Ottersleben Wappen ergänzt
- INFO: 7 Vereine ohne auffindbare Logos (Spielgemeinschaften ohne eigenes Wappen)

## v0.3.58 (02.06.2026)
- NEU: 43 weitere Vereinswappen via FuPa.net (Bezirks- und Kreisligen)
- INFO: 1263 von 1265 Vereinen haben nun ein Wappen (2 unauffindbar)

## v0.3.57 (02.06.2026)
- FIX: manage-v schreibt index.html/template.html/modal.js jetzt auch bei geöffnetem Browser zuverlässig

## v0.3.56 (02.06.2026)
- FIX: index.html v0.3.56 korrekt gesetzt

## v0.3.56 (02.06.2026)
- NEU: 328 fehlende Vereinswappen heruntergeladen (Transfermarkt-CDN)
- FIX: thumb-Felder in game_data.js für 318 Vereine ergänzt
- FIX: thumb-Felder in data_live.js für 324 Vereine gesetzt (inkl. Hertha BSC, Mainz 05, Köln, Freiburg u.a.)

## v0.3.55 (02.06.2026)
- FIX: DSC Arminia Bielefeld – Präfix ergänzt
- FIX: SpVgg Ingelheim – Tippfehler (1ngelheim) korrigiert
- FIX: TSV Schwaben Augsburg – Präfix ergänzt
- FIX: FK 03 Pirmasens – Jahreszahl ergänzt
- FIX: SV Viktoria 01 Aschaffenburg – Jahreszahl ergänzt
- FIX: VfR Krefeld-Fischeln – Stadtname ergänzt

## v0.3.54 (02.06.2026)
- FIX: Spielstand-Sanitizer – alle GAME_DATA-Felder (Name, Wappen, Regions …) werden beim Laden automatisch aktualisiert

## v0.3.53 (02.06.2026)
- FIX: 54 Vereinsnamen in data_live.js korrigiert (1.FC → 1. FC) – betraf alle Ligen

## v0.3.52 (02.06.2026)
- FIX: 54 Vereinsnamen korrigiert – 1.FC/1.FSV/1.SC ohne Leerzeichen → korrekte Schreibweise mit Leerzeichen

## v0.3.51 (02.06.2026)
- FIX: Vereinswappen in Liga-Tabelle hatten keine Höhenbeschränkung – jetzt 24×24px mit object-fit

## v0.3.50 (02.06.2026)
- FIX: GitHub Pages zeigte Wappen-Platzhalter – index.html ist jetzt der Monolith
- NEU: template.html als leichtgewichtige Quelldatei für manage-v

## v0.3.49 (02.06.2026)
- FIX: Changelog zeigte nur bis v0.3.42 – manage-v patcht jetzt auch app/modal.js direkt

## v0.3.48 (02.06.2026)
- FIX: Syntax-Fehler core.js (doppelte Klammer) und modal.js (fehlendes Komma) – App lädt jetzt korrekt

## v0.3.47 (01.06.2026)
- FIX: App startete nie – window.onload-Aufruf fehlte seit v0.3.44
- FIX: Mobile Sidebar-Drawer und Touch-Swipe wiederhergestellt

## v0.3.46 (01.06.2026)
- NEU: 885 Vereinswappen als SVG/PNG-Dateien – game_data.js 6,5 MB → 348 KB
- NEU: manage-v bettet Wappen-Pfade automatisch als Base64 in Monolith ein

## v0.3.45 (01.06.2026)
- REFACTOR: app/*.js Unterordner-Struktur
- TECH: functions.schema.json vollständig aktualisiert

## v0.3.44 (01.06.2026)
- REFACTOR: app.js aufgeteilt in app.core/pokal/league/modal.js
- TECH: DFB-Pokal Base64-Logo in app.dfb_logo.js ausgelagert (56KB→Module)

## v0.3.43 (01.06.2026)
- REFACTOR: App-Logik in app.js ausgelagert (index.html 280KB→12KB)
- TECH: manage-v inliniert app.js automatisch in GitHub Pages Monolith

## v0.3.42 (01.06.2026)
- NEU: Abschluss – Vereinswappen in Transfers-Tab und Relegations-Tab
- NEU: Abschluss – Liga-Wappen im Ligagrößen-Tab

## v0.3.41 (01.06.2026)
- NEU: DFB-Pokal Tabs horizontal scrollbar (Touch)
- NEU: Runden-Status-Anzeige (Partien/Abgeschlossen)
- NEU: Ergebnisse ein-/ausklappbar
- NEU: Teilnehmerfeld 2-spaltig auf Mobile

## v0.3.40 (01.06.2026)
- FIX: Mobile – Tabelle vollständig sichtbar (100dvh, padding-bottom 60px)
- FIX: Mobile – Tabelle ohne horizontales Scrollen (Diff+Info ausgeblendet, font 11px)
- NEU: DFB-Pokal Paarungen als Kartenlayout (kein h-Scroll)

## v0.3.39 (01.06.2026)
- NEU: Sidebar als Touch-Drawer auf Mobile (Wischgeste + Hamburger-Button)
- NEU: Header zweizeilig auf Mobile – alle Buttons erreichbar
- FIX: Tabelle horizontal scrollbar, linker/unterer Rand auf Mobile

## v0.3.38 (31.05.2026)
- FIX: Falsch zugewiesene Vereinswappen korrigiert (Sandhausen, Walldorf, Hoffenheim)
- NEU: VfR Aalen und Waldhof U21 Wappen ergänzt
- FIX: DFB-Pokal-Logo jetzt als Base64 – funktioniert auf GitHub Pages

## v0.3.37 (31.05.2026)
- NEU: Ligen- und Verbandswappen als Mini-Icon in Seitenleiste und Liga-Header
- NEU: DFB-Pokal-Logo in Sidebar und Header
- NEU: Echte Vereinswappen für SV Meppen, Viktoria Aschaffenburg, Borussia Neunkirchen, SSV Ulm, Waldhof Mannheim, SC Freiburg, VfR Aalen

## v0.3.36 (31.05.2026)
- NEU: Ligen- und Verbandswappen als Mini-Icon in der Seitenleiste
- NEU: Liga-Logo im Header beim Öffnen einer Liga

## v0.3.35 (31.05.2026)
- NEU: Teilnehmerfeld-Tab im DFB-Pokal – 64 Teams nach Liga gruppiert, Wappen, sortiert nach Vorsaison-Abschlusstabelle

## v0.3.34 (31.05.2026)
- FIX: Jede Saison hat eigenen DFB-Pokal – History korrekt gespeichert
- FIX: Saisonnavigation (<>) funktioniert jetzt im DFB-Pokal-Tab
- FIX: DFB-Pokal wird in Multi-Saison-Simulation korrekt gespielt (Spieltag 1 initialisiert neuen Pokal)

## v0.3.33 (31.05.2026)
- FIX: Pokal-Ergebnisse leistungsgerecht – Noise +-8 statt +-20, Tore skalieren mit Staerkeunterschied
- NEU: Wappen in Spielergebnisse und Bracket
- NEU: Volle Vereinsnamen + Liga in Klammern bei Ergebnissen und Bracket

## v0.3.32 (31.05.2026)
- NEU: DFB-Pokal mit 64 Teams (L1+L2+L3+8xRL4), 6 Runden auf ST 2/8/14/20/27/34
- NEU: Pokal-Tab in Sidebar mit rotem NEU-Badge
- NEU: Bracket-Ansicht mit allen Runden

## v0.3.31 (31.05.2026)
- FIX: Vereinswappen fehlten in Archiv-Saisons nach Seitenreload (id fehlte im lean-History-Format)
- FIX: History-Sanitize in loadGame: id/thumb/strength werden beim Laden automatisch ergänzt

## v0.3.30 (31.05.2026)
- FIX: Stärkewerte in Archiv-Ansicht zeigen nun den damaligen Wert (nicht aktuellen)
- FIX: Alte Saves ohne strength-Daten: Schätzung aus historischer Ligastufe (Bundesliga ~90, 8.Liga ~20)

## v0.3.29 (31.05.2026)
- FIX: Archiv-Saisons zeigten immer aktuelle Saison (viewHistoryOffset vs. history[]-Index-Mismatch nach Reload)
- FIX: Wappen und Stärkewerte in Archiv-Ansicht (strength in lean history gespeichert, thumb aus GAME_DATA als Fallback)

## v0.3.28 (31.05.2026)
- FIX: Simulieren/Woche-Buttons wurden zu früh deaktiviert wenn aktive Liga kürzer als längste Liga (z.B. BL 34 vs 3.Liga 38 Spieltage)

## v0.3.27 (31.05.2026)
- FIX: Abschluss-Button blieb nach Archiv-Ansicht dauerhaft deaktiviert
- NEU: Multi-Saison-Button simuliert N Saisons am Stück und stoppt bei erstem Fehler
- NEU: Debug-Log zeigt Engine-Events mit Sanity-Checks (orphane Teams, Liga-Größen, totalMatchdays)

## v0.3.26 (31.05.2026)
- NEU: Ligastufen-Badges mit Farbverlauf (Gold→Cyan) in der Sidebar
- NEU: Liga-ID in Klammern je Eintrag
- NEU: Weiße Trennlinie zwischen Ligastufen
- NEU: Stärkewert in Klammern hinter Vereinsname

## v0.3.25 (31.05.2026)
- FIX: k-Parität-Tiebreaker – 18 und 20 Teams: exakt 2H nach 4 Runden und 6H nach 12 Runden (100% aller Shuffles)
- FIX: Spielfrei-Ligen (ungerade Teams): bestmögliche Alternierung trotz Pausen

## v0.3.24 (31.05.2026)
- FIX: Tag X/N zeigt liga-spezifische Spieltagzahl (BL=34, 3.Liga=38 etc.)
- FIX: Erste Spieltage gleichmäßig verteilt – max. 2 Heimspiele in 3 Runden, max. 2–3 konsekutiv statt 4

## v0.3.23 (30.05.2026)
- FIX: Greedy H/A-Zuweisung – wer zuletzt auswärts war spielt heim, max. 3–4 konsekutiv statt bis zu 17
- FIX: Spielfrei (ungerade Teamzahl) korrekt behandelt – pausierte Teams behalten letzten Status

## v0.3.22 (30.05.2026)
- FIX: Berger-Spielplan – kein Looping mehr, jede Liga exakt (n-1)×2 Runden, totalMatchdays dynamisch
- FIX: seasonResults wird gespeichert – homeStats/awayStats nach Reload aus Spielhistorie rekonstruierbar

## v0.3.22 (30.05.2026)
- NEU: Berger-Algorithmus – fixer Spielplan, jedes Team 1x pro Spieltag, Hinrunde+Rückrunde mit getauschtem Heimrecht
- NEU: leichter Heimvorteil (+3 Performance) in simulateMatch

## v0.3.21 (30.05.2026)
- FIX: Heim/Auswärts-Toggle funktioniert jetzt auch nach Laden alter Spielstände

## v0.3.20 (30.05.2026)
- NEU: DFL-Tiebreaker vollständig – Direktvergleich (H2H-Pkt/GD/Tore/Auswärtstore) + alle Auswärtstore
- NEU: Heim- und Auswärtstabelle – Toggle Gesamt/Heim/Auswärts pro Liga
- NEU: Home/Away-Stats werden pro Spieltag separat erfasst

## v0.3.19 (30.05.2026)
- FIX: Tiebreaker GF statt GA – entspricht DFL-Standard (Freiburg 3:1 vor Heidenheim 2:0 korrekt)
- NEU: Tabellenformat Pl./Mannschaft/Spiele/G./U./V. + geteilte Platzierungen
- FIX: Verlierer in Spieltagsleiste rot

## v0.3.17 (30.05.2026)
- NEU: Spieltagsanzeige – Paarungen mit Ergebnis oberhalb der Ligatabelle sichtbar
- NEU: Torzahl skaliert mit Leistungsvorsprung (eng=max 2, mittel=max 3, gross=max 4)

## v0.3.16 (30.05.2026)
- NEU: Spieltag-Simulation als echte 1v1-Duelle (kein Solo-Schwellenwert mehr)
- NEU: simulateMatch proportional — Staerkeunterschied bestimmt Wahrscheinlichkeit mit ±20 Rauschen
- FIX: tote entry()-Funktion aus showChangelog entfernt

## v0.3.15 (30.05.2026)
- FIX: SyntaxError – showChangelog Template-Literal war nie geschlossen (Spiel lief nie ohne Cache-Save)
- FIX: exportSeasonReport als eigenstaendige Funktion wiederhergestellt

## v0.3.14 (30.05.2026)
- FIX: Reset-Freeze v2 — direkter Spread-Copy ohne JSON-Overhead
- FIX: Init-Fehler jetzt sichtbar im UI statt stummer Lade...

## v0.3.13 (30.05.2026)
- FIX: Reset-Freeze — base64-Thumbs werden beim Fresh-Init nicht mehr kopiert (JSON-Replacer)

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




















































































































