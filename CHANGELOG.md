## v0.8.130 (30.08.2026)
- NEU: Gemeinsames Tor-Modell fuer Liga und alle Pokale - je tiefer die Spielklasse desto mehr Tore, weil die Defensive schlechter ist (1. Bundesliga 3,2 und Landesliga 4,5 Tore pro Spiel wie in der Realitaet)
- FIX: In der Liga war 4:0 das hoechstmoegliche Ergebnis ueberhaupt, die Torzahl wurde gleichverteilt aus 1 bis 4 gezogen. Jetzt entscheiden Klassenunterschied und Wahrscheinlichkeit gemeinsam
- NEU: Remis-Korrektur in der Liga, damit die Unentschieden-Quote trotz deutlich mehr Toren realistisch bleibt. Meisterpunkte und Heimsiegquote bleiben unveraendert
- NEU: Die letzten drei Versions-Snapshots bleiben jetzt im Projekt liegen statt nur einer

## v0.8.129 (30.08.2026)
- NEU: Deutlich mehr Text-Abwechslung – Kontext-Schlagzeilen, Vorschau, Pressestimmen, Serien-Texte und Pokal-Schlagzeilen kraeftig ausgebaut (883 statt 564 Zeilen)

## v0.8.128 (30.08.2026)
- NEU: Vereinsrekorde aus Pokalspielen - hoechster Sieg, hoechste Niederlage und torreichstes Spiel mit Saison und Wettbewerb. Fuer die ligalosen Vereine sind das ueberhaupt die einzigen Ergebnisse
- FIX: Pokalergebnisse waren bei 9 Toren hart gedeckelt, deshalb stand nach 500 Saisons ueberall 9:0 als Rekord. Der Deckel ist raus, die Wahrscheinlichkeit begrenzt von selbst - 13:0 in 120 Testsaisons

## v0.8.127 (30.08.2026)
- NEU: Ewige Pokaltabelle und Siegerliste sind jetzt wirklich ewig - Summen und Sieger werden dauerhaft archiviert statt aus dem 50-Saisons-Fenster gerechnet
- NEU: Pokalsieger-Chronik ungekappt in IndexedDB, wie schon bei den Liga-Meistern
- NEU: Bestehende Spielstaende uebernehmen einmalig, was das History-Fenster noch hergibt - aeltere Pokalsaisons wurden nie gespeichert und fehlen dauerhaft

## v0.8.126 (30.08.2026)
- NEU: Rekorde-Reiter im DFB-Pokal - hoechster Sieg, torreichstes Spiel, groesste Ueberraschung nach Ligaebenen, tiefstklassiger Finalist, Titel in Folge, torreichste Saison, meiste Elfmeterschiessen
- NEU: Rekorde-Reiter im Amateurpokal mit Rekordaufsteiger und laengster Durststrecke (Ebenen-Rekorde entfallen, dort sind alle Teilnehmer ligalos)
- NEU: Im Vereinsfenster weiteste Pokalrunde je Wettbewerb, Aufstiege aus dem Amateurpokal und laengste Durststrecke
- NEU: Pokalrekorde rueckwirkend - Spiele aus dem History-Fenster bis zu 50 Saisons, DFB-Titelserien aus der historischen Siegerliste ab 1935

## v0.8.125 (30.08.2026)
- NEU: Vereinsrekorde als eigenes Fenster im Steckbrief - Saison, Einzelspiele, Serien, Pokal
- NEU: Liga-Reiter Rekorde - Meisterpunkte, groesster Vorsprung, laengste Meisterserie, torreichste Saison, hoechster Sieg
- NEU: Saisonrekorde werden einmalig rueckwirkend aus dem Saisonarchiv gefuellt, inklusive der historischen Abschlusstabellen

## v0.8.124 (29.08.2026)
- FIX: Ligatabellen blieben leer - ein aus game_data geloeschter Verein (Rot-Weiss-Darmstadt-Dublette) riss ueber findTarget den kompletten calcZones-Lauf mit
- FIX: Altstaende heilen sich beim Laden selbst - Vereine ohne game_data-Eintrag werden entfernt und im Debug-Log vermerkt

## v0.8.123 (29.08.2026)
- NEU: HD-Wappen fuer VfR Frankenthal, SG Lebach-Landsweiler und TSC Zweibruecken
- FIX: kein Wappen mehr unter 135px effektiver Aufloesung

## v0.8.122 (29.08.2026)
- NEU: HD-Wappen fuer Trippstadt, Scherpenberg, Perl-Besch, SSV Sand, FC Coburg und Goeppinger SV
- FIX: kein Wappen mehr unter 90px effektiver Aufloesung

## v0.8.121 (28.08.2026)
- FIX: VB Zweibruecken trug das Wappen des TSC Zweibruecken - jetzt das eigene
- NEU: DJK Sportfreunde Bad Homburg spielt in der Verbandsliga Hessen Sued
- FIX: Eintracht Wald-Michelbach ist ligalos - der Verein hat den Spielbetrieb eingestellt

## v0.8.120 (28.08.2026)
- FIX: Rot-Weiss Darmstadt war doppelt angelegt (Hessenliga und Verbandsliga) - der falsche Hessenliga-Eintrag ist raus
- NEU: FSV Rot-Weiss Wolfhagen rueckt aus den Ligalosen in die Hessenliga nach
- FIX: Karte kennt die umbenannten Spielgemeinschaften wieder

## v0.8.119 (28.08.2026)
- NEU: Rund 70 Wappen in HD aus eigener Sammlung, Wikipedia und Vereinsseiten - grobe Wappen von 57 auf 5
- NEU: Weisses Backing mit duenner Linie macht dunkle Wappen im Dunkelmodus lesbar (Alfbachtal, Ruebenach, BFC Preussen)
- FIX: Fuenf Spielgemeinschaften richtig benannt, mit Kurznamen fuer schmale Spalten
- FIX: Nieder-Olm aus einem Foto freigestellt, Boppard gerade gedreht

## v0.8.118 (26.08.2026)
- NEU: SV Furpach in HD - 61 auf 482 px
- NEU: Wappen-Uebersicht sortiert die verbliebenen nach Qualitaet und findet Dubletten
- NEU: Suchmaske baut fertige Google-Bilder-Abfragen, Ernte-Werkzeug liest gesammelte Bilder und Links ein
- FIX: Pruefseite zeigt helle Wappen auf dunklem Grund und nimmt beliebige Quellen an

## v0.8.117 (25.08.2026)
- NEU: Neun Wappen ueber Vereinsseiten und Wikidata gefunden - Knittelsheim, Zeilsheim, Bretzenheim, Queichhambach, Wiedbachtal, Kladow, Frankenthal
- FIX: FSG Schiffweiler heisst seit der Fusion 2020 FSG 08 Schiffweiler-Landsweiler
- FIX: Pruefseite stellt helle Wappen auf dunklen Grund - weisse Logos waren unsichtbar

## v0.8.116 (24.08.2026)
- NEU: Wolfratshausen, Liria Berlin, Phoenix Bellheim, Mutterstadt und Geinsheim in HD
- FIX: Download-Cache der Wappensuche wird nicht mehr mitversioniert

## v0.8.115 (24.08.2026)
- NEU: Wappen-Suche ueber die Wikipedia-API - Artikeltitel sind die vollen Vereinsnamen, 13 Treffer allein ueber den exakten Titel
- FIX: Ortsartikel liefern Gemeindewappen und Lagekarten statt Vereinswappen - werden am Dateinamen erkannt

## v0.8.114 (24.08.2026)
- NEU: TSV 1860 Muenchen traegt das Wappen der Fussballabteilung von 2026
- NEU: VfL Wolfsburg, Wuppertaler SV, Wormatia Worms, Wuerzburger Kickers, Curslack-Neuengamme und Wiedenbrueck in HD - alle 146 Profivereine versorgt
- NEU: Pruefseite kann beliebige Quellen vorlegen, nicht nur das FM-Paket

## v0.8.113 (24.08.2026)
- NEU: SC Wiedenbrueck in HD - FM fuehrt ihn nur als Reserve, Paar handgesetzt
- FIX: Nur noch 6 von 146 Profivereinen ohne HD-Wappen

## v0.8.112 (24.08.2026)
- NEU: Lueneburger SK Hansa in HD - LSK Hansa nach vier Ablehnungen gefunden
- FIX: 17 weitere Fehlzuordnungen dokumentiert, Einkaufsliste auf 91 Vereine

## v0.8.111 (24.08.2026)
- NEU: Wortanfang-Vergleich findet Wappen ohne gemeinsames Namenstoken - Buntentor, BFC Preussen, Verlautenheide, Inter Berlin
- FIX: Quantisierung uebersah weiche Kanten - 68 Wappen nachgezogen, Ordner knapp 1 MB kleiner

## v0.8.110 (24.08.2026)
- FIX: TBS Pinneberg und Tuerk-Birlikspor Pinneberg waren derselbe Verein - Doppeleintrag entfernt
- FIX: Ligalose Geistervereine aus Altspielstaenden werden beim Laden entfernt

## v0.8.109 (23.08.2026)
- NEU: Handgesetzte FM-Paare fuer Faelle, die keine Regel loesen kann
- FIX: Exakter Vereinsname schlaegt den nackten Ortsnamen - TBS Pinneberg statt Pinneberg

## v0.8.108 (23.08.2026)
- NEU: Abgleich legt nach einer Ablehnung den naechsten FM-Kandidaten vor statt aufzugeben
- FIX: 15 weitere Fehlzuordnungen dokumentiert und gesperrt

## v0.8.107 (23.08.2026)
- NEU: Karlsruher SC, Bonner SC, Hanauer FC, FSV Frankfurt und International Leipzig in HD
- FIX: Wortformen wie Karlsruher gegen Karlsruhe trafen sich im Abgleich nicht
- FIX: Qualitaetsmessung hielt flaechige Schriftzug-Logos faelschlich fuer hochskaliert

## v0.8.106 (23.08.2026)
- NEU: Hamburger Turnerschaft, Gebenbach, Schwaebisch Hall und weitere Wappen in HD
- FIX: Nicht-Auswahl in der Wappenpruefung wird protokolliert und gesperrt

## v0.8.105 (23.08.2026)
- NEU: Bayern, HSV, 1. FCK, Union, Darmstadt, Holstein Kiel und 38 weitere Wappen in HD
- FIX: FM-Zuordnung - Spitzenvereine stehen dort unter dem nackten Ortsnamen

## v0.8.104 (23.08.2026)
- FIX: 98 abgetrennte Waben-Reste an den Nachbarn mit der laengsten gemeinsamen Grenze angeschlossen - Festland-Exklaven von 53 auf 21
- NEU: Inseln werden daran erkannt dass sie keinen Landnachbarn haben (Fehmarn, Sylt, Helgoland bleiben unangetastet)
- NEU: Exklaven ueber 25 km2 werden nur gemeldet - sie sind durch Wasser oder fremdes Gebiet getrennt und damit echt

## v0.8.103 (23.08.2026)
- NEU: Brandenburg mit Gemeindegrenzen in fuenf Kreisen - Luebbener Suedkeil und die gerade Kante bei Cottbus sind weg
- NEU: Osthessen (Hersfeld-Rotenburg, Fulda) auf Gemeindegrenzen - Diagonalstrich zwischen Steinbach und Eiterfeld beseitigt
- NEU: Hamm wird nach seinen sieben Stadtbezirken geteilt statt nach dem Raster
- FIX: Soest gibt Lippetal an Ahlen und Moehnesee an Neheim ab, Bitterfeld-Wolfen den Osten an Dessau

## v0.8.102 (22.08.2026)
- NEU: Wabengrenzen folgen in ausgewaehlten Kreisen echten Gemeindegrenzen statt der 1-km-Rasterkante (Westfalen, Sachsen-Anhalt, Hessen)
- FIX: Abgeschnuerte Insel der Dessauer Wabe bei Genthin beseitigt
- FIX: Oestlicher Hochsauerland-Riegel auf Neheim und Paderborn verteilt statt als langer Arm an Soest

## v0.8.101 (22.08.2026)
- FIX: Archivierte Saisons unterhalb der 3. Liga zeigen wieder Auf-/Abstiegsmarkierungen mit echtem Zielstaffel-Namen
- FIX: Liga-Navleiste im Archiv nennt die echten Nachbarstaffeln (UP/DOWN) statt dreimal 'tiefere Liga'
- NEU: Bodenligen zeigen im Archiv den Amateurpokal als Weg nach unten

## v0.8.100 (15.08.2026)
- NEU: 14 weitere Vereinswappen in hoher Aufloesung - insgesamt 944 von 1254 Vereinen
- Technik: Das FM-Logopaket ist damit vollstaendig ausgewertet - fuer die verbliebenen 150 Vereine liefert es entweder nichts oder das Wappen eines fremden Vereins

## v0.8.99 (15.08.2026)
- NEU: 118 weitere Vereinswappen in hoher Aufloesung - insgesamt haben jetzt 931 von 1254 Vereinen ein scharfes Wappen
- NEU: Ein zweiter Abgleich fand 155 Vereine, die im FM-Paket nur unter ihrem Ortsnamen gefuehrt werden und deshalb zuvor unentdeckt blieben

## v0.8.98 (15.08.2026)
- Technik: Alle Vereinswappen wurden auf eine 256-Farben-Palette gebracht - die Datei ist dadurch etwa 40 Prozent kleiner, ohne sichtbaren Unterschied

## v0.8.97 (14.08.2026)
- NEU: 233 weitere Vereinswappen in hoher Aufloesung - insgesamt haben jetzt 824 statt 479 Vereine ein scharfes Wappen
- FIX: Reserve-Mannschaften tragen jetzt immer dasselbe Wappen wie ihre erste Mannschaft - das wich zuvor bei 35 von 80 Vereinen ab

## v0.8.96 (14.08.2026)
- Technik: Alte Programmversionen werden nicht mehr im Projektordner aufbewahrt - die Versionsgeschichte auf GitHub haelt jede Fassung ohnehin vor

## v0.8.95 (14.08.2026)
- NEU: Die Wappen von 28 Profivereinen liegen jetzt in hoher Aufloesung vor - darunter Borussia Dortmund, Bayer Leverkusen, Borussia Moenchengladbach und der VfB Stuttgart
- NEU: Von 52 Vereinen aus Liga 1 bis 3 haben jetzt 35 statt 7 ein scharfes Wappen

## v0.8.94 (13.08.2026)
- NEU: 83 Vereinswappen wurden durch hochaufloesende Versionen ersetzt - darunter etliche, bei denen bisher das Wappen eines fremden Vereins hinterlegt war
- NEU: Die ersetzten Wappen haben jetzt im Schnitt 237 statt unter 90 Bildpunkten effektiver Aufloesung

## v0.8.93 (11.08.2026)
- FIX: FC Ehekirchen, SV Schwandorf-Ettmannsdorf, SG Marpingen-Urexweiler und Klub Kosova spielen jetzt in der Staffel, in der sie auch liegen - Ehekirchen war 109 km von seiner Staffel entfernt
- FIX: VfB Linz und SV Ellingen gehoeren zum Bezirk Rheinland Mitte statt Ost - ihre Heimatangabe widersprach ihrer Liga und ihrer Lage

## v0.8.92 (10.08.2026)
- FIX: Die Vereinspunkte auf der Karte zeigen jetzt wirklich den gewaehlten Stand - Farbe und Groesse blieben bisher in beiden Ansichten gleich
- FIX: Das Berliner Gebiet um Hohen Neuendorf umfasst nur noch die gleichnamige Ortschaft und nicht mehr Bergfelde, Borgsdorf und Stolpe

## v0.8.91 (10.08.2026)
- FIX: Ein Verein ohne Heimatstaffel bekommt sie jetzt aus seiner eigenen Regionen-Kette statt aus der Liga, in der er zufaellig gelandet ist - dadurch entstehen deutlich weniger Insel-Staffeln
- FIX: Das bayerische Gebiet um Illertissen umfasst nur noch die Gemarkung des Ortes und nicht mehr die eingemeindeten Ortsteile

## v0.8.90 (10.08.2026)
- FIX: SpVgg Lam, TuS Geretsried und FC Rastpfuhl spielen jetzt in der Staffel, in der sie auch geografisch liegen - Lam stand im Bayerischen Wald und spielte 250 km entfernt
- Technik: die veraltete Zentroid-Tabelle wurde entfernt, die Staffel-Balancierung misst seit v0.8.86 die echten Schwerpunkte

## v0.8.89 (10.08.2026)
- FIX: Landesliga Bayern Mitte und Suedost haben jetzt dasselbe Band wie ihre Schwesterstaffel Suedwest - die drei Staffeln sind bauartbedingt immer gleich gross

## v0.8.88 (09.08.2026)
- FIX: Sachsenliga hat jetzt das Band 10-15 statt 10-13 - sie lag in fast jeder Saison darueber
- FIX: Landesliga Bayern Suedwest hat jetzt das Band 8-13 und liegt damit gleichauf mit ihren Schwesterstaffeln Mitte und Suedost

## v0.8.87 (09.08.2026)
- FIX: Ein gesperrter Reserve-Meister laesst seinen Aufstiegsplatz nicht mehr verfallen - der Naechstplatzierte rueckt nach
- FIX: 2. Bundesliga und 3. Liga behalten zuverlaessig ihre Groesse von 18 und 20 Vereinen

## v0.8.86 (09.08.2026)
- NEU: Vereine behalten ihre Staffel ueber Jahre - bisher wurde jede Geschwistergruppe zu jedem Saisonwechsel komplett neu zusammengewuerfelt
- NEU: Ausgeglichen wird nur so viel wie noetig, alle Staffeln einer Gruppe sind exakt gleich gross - geht es nicht auf, wandert der Rest reihum
- NEU: Wer drei Saisons in Folge fremd spielt, bekommt dort seine neue Heimat und kehrt nach Jahren in anderen Ligen genau dorthin zurueck
- FIX: Loecher in den Staffelflaechen von 28 auf 5 gesunken, weil Vereine nicht mehr quer durch die Region geschoben werden

## v0.8.85 (09.08.2026)
- FIX: Die beiden NOFV-Oberligen hatten je 18 Vereine statt der seit der Fuenftklassigkeit ueblichen 16 - vier Vereine standen dort, obwohl die Quelldatei sie ausserhalb der Pyramide fuehrt
- NEU: CFC Hertha 06, Doberaner FC, FSV Saxonia Tangermuende und SSV 80 Gardelegen spielen jetzt im Amateurpokal, dessen Feld damit auf 265 waechst

## v0.8.84 (09.08.2026)
- FIX: Der Tausch von Lindenthal-Hohenlind war nur beim Heimatgebiet ausgeglichen, nicht bei der Liga - dadurch stand Mittelrhein 13 zu 11. Partner ist jetzt FC Pesch aus derselben Ligastufe, damit bleibt es bei 12 zu 12

## v0.8.83 (09.08.2026)
- FIX: Die Heimatstaffel der Berliner Vereine ging bei jedem Neuladen verloren - danach wurden sie beim naechsten Auf- oder Abstieg neu auf die duennere Staffel verteilt, statt in ihre Staffel zurueckzukehren

## v0.8.82 (09.08.2026)
- FIX: Vier Vereine lagen als Insel mitten im Gebiet einer fremden Staffel - Suederelbe tauscht mit Barmbek-Uhlenhorst, Wattenscheid mit Schalke, Lindenthal-Hohenlind mit Frechen
- FIX: Lindenthal-Hohenlind spielt als einziger davon IN einer Staffel und wechselt deshalb auch die Liga - die uebrigen spielen ueberregional, dort aendert sich nur das Heimatgebiet

## v0.8.81 (08.08.2026)
- FIX: Die letzten Haarstriche in den Staffelflaechen sind weg - die Schwelle wird jetzt ueberall metrisch gemessen statt in Grad, sonst blieben je nach Ausrichtung Reste stehen

## v0.8.80 (08.08.2026)
- FIX: Die Karte zeichnete Haarstriche mitten in die Staffelflaechen - 2409 Polygone waren es, 2165 davon schmaler als 166 Meter und damit reine Rechenspuren der Vereinfachung
- FIX: Filter greift jetzt an allen drei Stellen (Waben, statische Regionsflaechen, Laufzeit-Vereinigung) mit derselben Schwelle, sonst erzeugt eine wieder, was die andere verwirft
- NEU: Kartendaten dadurch 7 Prozent kleiner

## v0.8.79 (08.08.2026)
- FIX: Ludwigsfelder FC und FSV 63 Luckenwalde waren vertauscht - Ludwigsfelde liegt noerdlicher, stand aber in der Sued-Staffel
- FIX: Rund um Pinneberg zeichnete die Karte Narben - 16 Ringe im Bestand umschlossen null Flaeche und hinterliessen Haarstriche
- FIX: Die Grenzen-Ebene fuehrte Schleswig-Holstein und Hamburg zu grob (17 Stuetzpunkte rund um Hamburg), dadurch schnitten Zacken quer durch das Stadtgebiet

## v0.8.78 (08.08.2026)
- NEU: Karten-Haekchen 'Waben' legt die Voronoi-Zelle jedes Vereins offen - der Tooltip nennt Verein und Staffel, damit zeigt eine Insel sofort ihren Verursacher
- FIX: Die Karte fuehrte 15 Vereine in der falschen Region - u.a. Preussen Muenster, Paderborn, Verl und Roedinghausen als Suedwestfalen statt Muensterland/OWL, dazu die drei Kieler und Wegberg-Beeck
- FIX: Steinbach lag gleichzeitig in Hessen Nord, Mitte und Sued, die Hamburger Turnerschaft in beiden Hamburger Staffeln - solche Doppelzuordnungen kann es jetzt nicht mehr geben, weil die Karte ihre Regionen aus game_data statt aus einer alten Excel-Ableitung nimmt

## v0.8.77 (07.08.2026)
- NEU: Ligen, deren Staffeleinteilung real ab 2026/27 abweicht, tragen einen Hinweis - Niederrhein teilt dann West/Ost statt Nord/Sued, im Suedwesten wechseln einzelne Vereine den Fussballkreis
- NEU: Der Steckbrief betroffener Vereine zeigt denselben Hinweis kurz hinter den Regionen. Grund ist beide Male die bessere Logistik - die Simulation bleibt bewusst beim Stand 2025/26

## v0.8.76 (07.08.2026)
- NEU: Steckbrief zeigt Amateurpokal- und Ligasaisons in EINER chronologischen Historie - die Pokaljahre fuellen genau die Luecken, die der Ligabetrieb liess
- NEU: Der Weg aus der Pyramide in den Amateurpokal zaehlt als Abstieg, die Rueckkehr als Aufstieg
- FIX: Die laufende Saison rutschte in langen Karrieren ans Ende der Historie - dadurch waren auch die Auf- und Abstiegs-Badges an beiden Enden falsch berechnet

## v0.8.75 (06.08.2026)
- FIX: Verbandsliga Wuerttemberg lag dauerhaft ueber ihrer Ligagroesse - Band auf 9-15 korrigiert (Ziel 14 statt 11, naeher an den realen 16 Vereinen)

## v0.8.74 (05.08.2026)
- FIX: Landesliga Berlin Staffel 1+2 sprengten dauerhaft ihre Ligagröße - Band auf 11-16 korrigiert
- NEU: Gemeinsame ewige Tabelle beider Berlin-Staffeln

## v0.8.73 (05.08.2026)
- FIX: Vereine stiegen aus der vorletzten statt aus der untersten Liga in den Amateurpokal ab - ein gerade durchgereichter Absteiger brachte seinen Rang aus der hoeheren Liga mit und flog im selben Sommer wieder raus (58 Prozent aller Abgaenge)
- FIX: Bodenligen zeigen jetzt ihre Abstiegszone - ab dem Sechzehntelfinale steht fest, wer den Amateurpokal-Aufsteiger ersetzt

## v0.8.72 (04.08.2026)
- FIX: Steckbrief zeigte die Liga vom Sim-Start statt der laufenden - ligalose Vereine standen dort mit ihrer alten Liga statt im Amateurpokal
- FIX: Kartenpunkte ligaloser Vereine hatten die Farbe ihrer frueheren Liga statt einer neutralen

## v0.8.71 (03.08.2026)
- NEU: Amateurpokal - bundesweiter K.o. aller 261 ligalosen Vereine (Qualifikation + 9 Runden, Bracket ab 64)
- NEU: Die 16 Sieger des Sechzehntelfinals steigen in die Bodenliga ihrer Region auf - je Aufsteiger verlaesst der Tabellenletzte derselben Liga die Pyramide (1:1, Ligagroessen bleiben gleich)
- NEU: Bodenligen haben damit erstmals Absteiger - Vereine koennen die Pyramide verlassen und sich zurueckkaempfen
- NEU: Ewige Amateurpokal-Tabelle, Siegerliste und Aufsteiger-Uebersicht - das Teilnehmerfeld ersetzt die Liste 'Ligalose Vereine'
- NEU: Ligalose Vereine haben eine eigene Staerke (Basis 30) und stehen im Spielstand - frisch Abgestiegene bleiben 2-4 Saisons Pokalfavorit
- NEU: Chronik-Saetze fuer Amateurpokal-Titel und Rueckkehr in den Ligabetrieb
- NEU: Karte mit zwei Saisonstaenden - Umschalter Sim-Start / Aktuell in der Kartenleiste
- NEU: Staffelflaechen folgen der laufenden Saison - die Geo-Balancierung verschiebt Grenzvereine, die Karte zeigt es jetzt (Vereinswaben werden zur Laufzeit neu gruppiert)
- FIX: Staffelinsel in der Kieler Foerde entfernt - TSV Klausdorf spielt jetzt Landesliga Holstein
- NEU: Stadien fuer 5 weitere Vereine - 1239 von 1264 haben eine Spielstaette

## v0.8.70 (02.08.2026)
- NEU: 11 weitere Vereine mit Spielstaette - darunter 6 Spielgemeinschaften mit allen ihren Plaetzen
- FIX: nur noch 30 Vereine ohne Stadion, davon 11 ohne jeden europlan-Eintrag - zu Sessionbeginn waren es 517

## v0.8.69 (02.08.2026)
- NEU: Die vier Bezirke des Suedwestdeutschen Fussballverbands folgen jetzt den Kreisgrenzen statt einer frei gezogenen Linie - jede Staffel ist eine zusammenhaengende Flaeche, die Ausfransungen sind weg
- NEU: Ortsausnahmen fuer Gemeinden, die im Nachbarbezirk spielen - Eisenberg zur Vorderpfalz, Stetten nach Rheinhessen
- FIX: TuS Ruessingen stand in Suedwest Ost, spielt aber in der Westpfalz - damit haengt Westpfalz nicht mehr unter beiden Staffeln

## v0.8.68 (02.08.2026)
- NEU: Stadionsuche jetzt ueber alle 2036 europlan-Ligen statt 401 - 1222 von 1264 Vereinen haben eine Spielstaette, 179 davon mehrere
- FIX: fuenf falsch verortete Vereine korrigiert, u.a. TSG 1846 Bretzenheim, das auf Bretzenheim an der Nahe stand statt auf Mainz-Bretzenheim

## v0.8.67 (02.08.2026)
- NEU: 38 weitere Vereine mit Stadion, Ort und Kapazitaet - jetzt 1184 von 1264
- FIX: nur noch 80 Vereine ohne Spielstaette, zu Saisonbeginn waren es 517

## v0.8.66 (02.08.2026)
- NEU: Spielgemeinschaften zeigen alle ihre Sportstaetten - 29 Vereine mit 72 Plaetzen, weil sich bei einer SG nicht sauber trennen laesst, wer wo spielt
- FIX: 1146 statt 1117 Vereine mit Stadionangaben

## v0.8.65 (02.08.2026)
- NEU: Steckbrief zeigt Stadionname, Ort und Kapazitaet - 1117 von 1264 Vereinen, 36 davon mit mehreren Plaetzen
- NEU: Stadiondaten aus europlan, Liga-Index vervollstaendigt (401 statt 247 Ligen - Bayern und Regionalliga West fehlten ganz)

## v0.8.64 (02.08.2026)
- FIX: Karten-Schalter +Eltern/+Kinder/+Geschwister greifen wieder - die Tabellen zeigten noch auf die alten Huellen-IDs
- FIX: doppelte Region Suedwestdeutscher Fussballverband entfernt, Regionsfilter trifft dort jetzt seine Vereine

## v0.8.63 (02.08.2026)
- NEU: Die Vereinskarte zeigt die Verbandsgebiete jetzt aus amtlichen Kreisgrenzen statt berechneter Huellen
- NEU: Staffelgebiete (Bayern Mitte, Hessen Sued, Hammonia) folgen der Vereinsverteilung - Niedersachsens Bezirke folgen den Kreisen der alten Regierungsbezirke
- NEU: Kreis- und Gemeindegrenzen als eigene Karten-Ebenen mit eigenem Filter
- NEU: Vereinsnamen erscheinen ab Zoomstufe 9, die Punkte wachsen beim Hineinzoomen
- NEU: Stadion-Angaben im Vereins-Steckbrief (Name, Ort, Kapazitaet) fuer 747 Vereine
- FIX: Zahlreiche Vereins-Zuordnungen und Koordinaten korrigiert - von 55 Fehlzuordnungen ist noch eine uebrig

## v0.8.62 (01.08.2026)
- FIX: Die Kreisgrenzen auf der Karte bleiben im Dark-Theme sichtbar - sie folgen nicht mehr der App-Farbe, weil die Karte immer helle Kacheln hat

## v0.8.61 (01.08.2026)
- NEU: Amtliche Kreisgrenzen als eigene Karten-Ebene mit eigenem Filter
- NEU: Gemeindegrenzen als eigene Ebene - in den Kreisen, die sich zwei Verbaende teilen, ab Zoomstufe 8
- FIX: Ueberfluessige Hilfspolygone entfernt (historische Laender in Baden-Wuerttemberg, Bocholt-Zipfel, die zwei Hamburg-Enklaven)
- FIX: Regionsebenen 4 und 5 nutzen dieselbe Farbe wie Ebene 3 - Rheinland-Pfalz war die einzige Gegend mit Violett und Dunkelrot

## v0.8.60 (01.08.2026)
- NEU: Die Vereinskarte zeigt echte Verbandsgrenzen (amtliche Kreisgrenzen) statt berechneter Huellen um die Vereinspunkte
- NEU: Unterregionen ohne reale Grenze (Bayern Suedost, Hammonia, Westpfalz) werden aus der Vereinsverteilung gezeichnet
- FIX: Der Umschalter Saison/Gesamt/Voronoi entfaellt - es gibt nur noch eine Geometrie je Region

## v0.8.59 (30.07.2026)
- NEU: Zeile des Torschuetzen leuchtet in der Konferenz-Live-Tabelle auf
- NEU: Mini-Wappen in der Live-Tabelle
- FIX: Score-Chip verschwindet mit dem Abpfiff - das Ergebnis zaehlt weiter zur Live-Tabelle, gilt aber nicht mehr als laufend

## v0.8.58 (30.07.2026)
- NEU: Live-Tabelle im Halbzeit-Modus - Zwischenstaende werden provisorisch eingerechnet, mit Rang-Pfeilen
- NEU: Live-Tabelle als dritte Spalte in der Konferenz, aktualisiert sich mit jedem Tor
- NEU: Farbiges Score-Chip der laufenden Partie am Ende der Namensspalte (gruen fuehrt / gelb unentschieden / rot zurueck), Sp-Diff-Pkt rot solange gespielt wird

## v0.8.57 (30.07.2026)
- NEU: 100 eigene Pokal-Schlagzeilen in 7 Kategorien (Sensation, Ueberraschung, Elfmeterkrimi, Verlaengerung, Kantersieg, deutlich, knapp)
- NEU: Elfmeter-Texte nennen jetzt auch den regulaeren Spielstand

## v0.8.56 (30.07.2026)
- NEU: Schlagzeile zur auffaelligsten Partie jeder Pokalrunde - Klassensprung (Amateur wirft Profi raus), Elfmeterkrimi, Verlaengerung
- NEU: Spoiler-Sperre - keine Schlagzeile solange der Endstand noch gestaffelt enthuellt wird

## v0.8.55 (11.07.2026)
- NEU: CHRONIK-Block im Vereins-Steckbrief - der Spielstand erzählt die Vereinsgeschichte (Status, Titel/Pokal/Aufstiege/Relegation, emergenter Rivale)
- NEU: 78 Sätze REPORTS_CHRONIK in 9 Fakten-Pools

## v0.8.54 (11.07.2026)
- NEU: Serien-Zeilen unter den Spieltags-Ergebnissen (Siegesserie/ungeschlagen/Niederlagenserie/sieglos, max. 2 pro Liga)
- NEU: 48 Zeilen REPORTS_STREAK

## v0.8.53 (11.07.2026)
- NEU: Stimmen zum Spiel - zwei Trainer-Zitate unter dem Spiel des Tages (Sieger/Verlierer bzw. beide Remis-Seiten)
- NEU: 120 Zitate REPORTS_PRESS in 10 Kategorien-Pools

## v0.8.52 (11.07.2026)
- NEU: Saison-Rückblick über der Abschlusstabelle vergangener Saisons (Meister- + Absteiger-Satz)
- NEU: 138 Zeilen REPORTS_SEASON in 5 Ära-Registern (1963 bis heute, inkl. DDR-Archiv)

## v0.8.51 (10.07.2026)
- NEU: Spiel des Tages mit anlassbezogener Schlagzeile (Derby/Topduell/Abstiegskrimi/Form/Ueberraschung)
- NEU: Vorschau-Anriss statt Begruendungs-Label beim Spiel des Tages

## v0.8.50 (10.07.2026)
- NEU: Schlagzeilen-Corpus stark erweitert (52 je Kategorie, weniger Wiederholung ueber lange Saisons)

## v0.8.49 (10.07.2026)
- NEU: Schlagzeile fuer das Spiel des Tages (gewichtete Auswahl: Derby/Tradition/Abstieg/Form/Vorsaison)
- NEU: Vorschau markiert das Spiel des Tages mit Begruendung
- NEU: am Ende des Live-Action-Modus Schlagzeilen zu allen Spielen

## v0.8.48 (02.07.2026)
- NEU: Echte historische Relegationen 1.BL/2.BL (1981/82-1990/91 & 2008/09-2024/25) in Relegations-Chronik, Bilanz und Steckbrief
- FIX: R-Badge/Relegations-Zone im Archiv beginnt korrekt 1981/82

## v0.8.47 (02.07.2026)
- NEU: Mobile Tabellen - Vereinsname wird bei enger Spalte automatisch gekuerzt (Stadt bzw. klassisches Kuerzel wie DSC/KSC), voll wenn Platz
-  auch beim manuellen Spalten-Ziehen
- NEU: Kuerzel-Schema - M'Gladbach/K'lautern/Wuppertal, Initialen fuer <Stadt>er SC/SV/FC, Reserve-Teams erben (Bayern II), generische Kuerzel (SV/SC/FC) nie allein

## v0.8.46 (02.07.2026)
- FIX: Union Berlin zeigt 1951/52-1952/53 korrekt als BSG Motor Oberschoeneweide (statt SG Union)
- NEU: Historische Tschammerpokal-Sieger (Dresdner SC, SK Rapid Wien, First Vienna FC) als klickbare und suchbare Vereine in der DFB-Pokal-Siegerliste

## v0.8.45 (02.07.2026)
- FIX: 1. FC Magdeburg zeigt in Saisons 1963/64-1964/65 den epochenechten Namen SC Aufbau Magdeburg
- FIX: FC Energie Cottbus als BSG Energie Cottbus (1973/74-1989/90)
- FIX: 1. FC Lok Stendal als BSG Lokomotive Stendal (1950/51-1967/68)

## v0.8.44 (02.07.2026)
- FIX: In der Suche erscheint jetzt jede historische Namensform eines Vereins (z.B. sowohl BSG Empor Lauter als auch SC Empor Rostock), nicht nur die erste

## v0.8.43 (02.07.2026)
- FIX: Verein aus der Suche oeffnet jetzt den Steckbrief (vorher passierte bei ligalosen/historischen Vereinen nichts)
- NEU: Historische Vereinsnamen suchbar (z.B. Empor Rostock, Meidericher SV) und Steckbrief fuer ehemalige Vereine
- NEU: FDGB-Pokal-Siegerliste im DDR-Archiv mit Rekordsiegern

## v0.8.42 (02.07.2026)
- FIX: Fruehe FDGB-Pokalsieger (Waggonbau Dessau, EHW Thale) korrekt ihren Vereinen zugeordnet - P-Abzeichen erscheint jetzt auch fuer diese Saisons

## v0.8.41 (02.07.2026)
- NEU: FDGB-Pokalsieger als P-Abzeichen im DDR-Archiv (amtierender Pokalsieger je Saison 1949-1991)
- FIX: Chemnitzer FC zeigt epochenechte Namen (SC Motor / FC Karl-Marx-Stadt) in alten DDR-Saisons

## v0.8.40 (02.07.2026)
- FIX: DDR-Oberliga zeigt epochenechte Vereinsnamen in alten Saisons
-  Nachfolger (Hansa, Carl Zeiss Jena, Rot-Weiss Erfurt, Hallescher FC, FSV Zwickau, Union Berlin, Erzgebirge Aue) erben ihre Fruehhistorie
- FIX: Leipzig-Vereinsgeschichte nach offiziellem 1.-FC-Lok-Stammbaum (Einheit Ost/Rotation/SC Leipzig = Lok-Stamm, SC Lokomotive eingegliedert)

## v0.8.39 (01.07.2026)
- NEU: DDR-Oberliga jetzt vollstaendig 1949/50-1990/91 (42 Saisons) - fruehe Aera mit historischen Vereinen und epochenechten Namen (SC Dynamo Berlin, FC Berlin, 1. FC Dynamo Dresden)
- NEU: Verbandspokal-Plan-Import (VP-Plan) - strukturierter Verbandspokal statt Zufalls-KO, ladbar als JSON
- FIX: Leipzig-Doppelung im DDR-Archiv (SC Rotation Leipzig war mit SC Lokomotive Leipzig verschmolzen)

## v0.8.38 (28.06.2026)
- NEU: DDR-Oberliga im Archiv - eigener historischer Track, 30 Saisons (1961/62-1990/91), ewige Tabelle + Meisterliste
- FIX: FC Vorwaerts der Historie dem Nachfolger 1. FC Frankfurt (Oder) zugeordnet (epochenechte Namen Berlin/Frankfurt)

## v0.8.37 (27.06.2026)
- NEU: Liga-Pyramiden-Navleiste im Saison-Archiv (hoehere/aktuelle/tiefere Liga) wie in der laufenden Ansicht, navigierbar zwischen 1. und 2. Bundesliga
- NEU: Epochenechte Liga-Namen in der Historie - vor 1974 Regionalliga statt 2. Bundesliga, tiefer Amateurliga/Oberliga/Regionalliga/3. Liga je nach Epoche, in Navleiste und Auf-/Abstiegsspalte

## v0.8.36 (27.06.2026)
- NEU: Saison-Archiv zeigt die Ligapyramiden-Struktur wie die laufende Tabelle - Auf-/Abstieg mit Ziel-Liga (Aufstieg 1. Bundesliga / Abstieg 2. Bundesliga / Relegation), datengetrieben aus dem echten Auf-/Abstieg, auch fuer Nord/Sued-Staffeln

## v0.8.35 (27.06.2026)
- NEU: DFB-Pokalsieger 1935-2024/25 rueckwirkend in Pokal-Siegerliste & Rekordsieger-Rangliste (Bayern 20x)
- NEU: Tabellen-Badges in der Historie zeigen jetzt den Vorsaison-Status (amtierender Meister/Vize/Auf-/Absteiger/Pokalsieger) wie die laufende Tabelle, statt des Ergebnisses der angezeigten Saison

## v0.8.34 (27.06.2026)
- NEU: Saison-Archiv zeigt Tabellen-Badges M/V/N/A (Meister/Vize/Auf-/Absteiger) aus echtem Saisonvergleich + Auf-/Abstiegs-/Relegationsfarben statt nur Meisterstern
- NEU: Tote Vereine ihren Nachfolgern zugeordnet (TuS Schloss Neuhaus->SC Paderborn 07, BV 08 Luettringhausen->FC Remscheid, DJK Guetersloh->FC Guetersloh) - ewige Tabelle/Steckbrief erben die Historie, Originalname bleibt in der alten Saison

## v0.8.33 (27.06.2026)
- FIX: Gegentore/Tordifferenz in allen historischen Saisons korrigiert (unsichtbare Wikipedia-Fuellzeichen hatten Werte verfaelscht)
- NEU: 2. Bundesliga Nord/Sued-Doppelstaffeln 1974/75-1980/81 + 1991/92 (zwei Tabellen, beide Gruppensieger)
- NEU: 2. Bundesliga jetzt komplett 1974/75-2024/25 (51 Saisons), zurueckgezogene Vereine korrekt dargestellt

## v0.8.32 (27.06.2026)
- NEU: Historische Abschlusstabellen 1963/64-2024/25 fuer 1. & 2. Bundesliga (104 Saisons) in ewiger Tabelle, Titelzaehlung, Meister-Chronik & Saison-Archiv
- NEU: Originale Era-Vereinsnamen (Meidericher SV etc.) und aufgeloeste Altvereine (SG Union Solingen u.a.) je Saison

## v0.8.31 (27.06.2026)
- NEU: Echte Bundesliga-Historie 1963/64 bis 1986/87 fliesst in ewige Tabelle, Titelzaehlung, Meister-Chronik und Archiv-Saisonansicht ein
- NEU: Historische Vereinsnamen je Saison in der Archiv-Ansicht (z.B. Meidericher SV statt MSV Duisburg, Bayer 05 Uerdingen, SC Tasmania 1900 Berlin)
- FIX: Historische Meistertitel werden in der ewigen Tabelle jetzt korrekt gezaehlt

## v0.8.30 (25.06.2026)
- PERF: Auch der Saisonwechsel ruckelt nicht mehr - die (groesste) Komprimierung von Historie und Archiv laeuft jetzt im Hintergrund-Thread (Web Worker), der Hauptthread blockiert nur noch ~145ms statt ~2300ms
- TECH: Worker-Komprimierung bit-identisch zu LZString (round-trip-verifiziert), synchroner Fallback fuer Browser ohne Worker-Unterstuetzung

## v0.8.29 (25.06.2026)
- PERF: Wochen-/Spieltag-Simulation laggt nach langen Multi-Sims nicht mehr - der Spielstand wird pro Spieltag nicht mehr komplett neu komprimiert (Historie + Archiv nur noch beim Saisonwechsel gespeichert). ~14x schneller und konstant, egal wie viele Saisons simuliert wurden
- TECH: getrennte Speicher-Keys fuer laufende Saison vs. Historie/Archiv
-  bestehende Spielstaende werden beim Laden automatisch und verlustfrei migriert
-  Export/Import bleibt eine Datei

## v0.8.28 (24.06.2026)
- NEU: Multi-Simulation zeigt den Fortschritt Saison fuer Saison (mit aktueller Saison) statt in 5er-Bloecken
- PERF: Multi-Sim konstant schnell - Spielstand wird waehrend des Laufs nicht mehr jede Saison neu komprimiert (Slowdown bei Langzeit-Sims behoben, ~24x
-  582 Saisons in ~45s getestet)
- NEU: Ergebnis-Zusammenfassung am Ende - Saisons, Tempo und Meister der 1. und 2. Bundesliga im Zeitraum (anklickbar)

## v0.8.27 (24.06.2026)
- NEU: Saison-Auswahl und Zurueckblaettern umfassen ALLE Saisons - historische (ab 1963/64) und alle simulierten, auch ueber 50 zurueck
- NEU: Archivierte Saison zeigt die Abschlusstabelle (Punkte epochenecht: 2-Punkte vor 1995/96), Klick auf Verein -> Steckbrief
- NEU: Saison-Historie im Vereins-Steckbrief vollstaendig statt auf 50 begrenzt - waechst dauerhaft mit
- TECH: volle Abschlusstabellen je Saison/Liga in IndexedDB (Fallback auf lokalen Speicher bei blockiertem IDB)

## v0.8.26 (23.06.2026)
- NEU: Historische Abschlusstabellen fliessen in die ewige Tabelle und Titelzaehlung ein (Start: 1. Bundesliga 1963/64) - 3-Punkte-normalisiert, historischer Meister bleibt erhalten
-  volle Meister-Chronik in IndexedDB. Weitere Saisons folgen als Daten-Nachtraege

## v0.8.25 (23.06.2026)
- FIX: Bei blockiertem IndexedDB (z.B. Firefox-Privatmodus) faellt die Chronik-Anzeige sauber auf den lokalen Speicher zurueck - kein Haenger, keine Fehler
- FIX: Langzeit-Simulationen markieren IndexedDB nicht mehr faelschlich als blockiert (Timeout-Race entfernt)

## v0.8.24 (23.06.2026)
- NEU: Komplette Meister-/Relegations-Chronik in IndexedDB (praktisch unbegrenzt) - Sieger-/Relegations-Ansicht laden die volle Saison-fuer-Saison-Historie, Spielstand bleibt klein und schnell
- NEU: Saison-Historie im Vereins-Steckbrief ist jetzt kompakt seitenweise (12 pro Seite) - Pokal-Verlauf und Testspiele ruecken wieder direkt darunter

## v0.8.23 (22.06.2026)
- FIX: Sehr lange Sims luden/speicherten langsam, weil die Meister-/Relegations-Chronik unbegrenzt wuchs - jetzt auf die letzten 100 Saisons begrenzt
- WICHTIG: Ewige Tabelle, Titelzahlen und Relegationsbilanz bleiben weiterhin vollstaendig und dauerhaft (nur die Saison-fuer-Saison-Detailliste ist auf 100 begrenzt)

## v0.8.22 (22.06.2026)
- NEU: Spielstand wird komprimiert gespeichert (ca. 9x kleiner) - die komplette Meister-/Relegations-Chronik bleibt auch ueber viele Jahrhunderte erhalten, ohne den Speicher zu sprengen
- NEU: Alte Spielstaende und Backups laden weiterhin und migrieren automatisch
-  Export bleibt lesbares JSON

## v0.8.21 (22.06.2026)
- FIX: Spielstand wird bei vollem Speicher nicht mehr geloescht - stattdessen wird die aelteste Archiv-Chronik gekuerzt, Summen (ewige Tabelle/Titel/Relegationsbilanz) bleiben dauerhaft (behebt 'Cache bei jedem Neuladen geleert' auf Mobil/PWA)
- NEU: Relegations-Ansicht zeigt auf dem Handy kurze Vereinsnamen (Stadt/Kurzform, z.B. Bayern, 1860, Union, Hertha)

## v0.8.20 (22.06.2026)
- FIX: Relegations-Ansicht zeigt Herkunftsligen als kompakte Kuerzel (1. BL, 2. BL, RL ...) - mobil kein Quetschen mehr
- NEU: Vereinsnamen im Ergebnis-Feed (Live/Ergebnisse/Vorschau) anklickbar -> Vereins-Steckbrief

## v0.8.19 (22.06.2026)
- FIX: Sieger- und Relegations-Ansicht auf dem Handy - Rangliste/Bilanz stapelt jetzt unter die Liste statt die Spalte zu zerquetschen (kein Ueberlappen von Name und Ergebnis mehr)

## v0.8.18 (22.06.2026)
- NEU: Dauerhaftes Geschichts-Archiv - ewige Tabelle, Titel, Vereins-Karriere und Meister-Chronik bleiben ueber 50 Saisons hinaus vollstaendig erhalten (kein Vergessen bei Jahrhundert-Sims)
- NEU: Relegations-Uebersicht je Liga (Tab) mit Teilnehmern, Herkunftsliga, Siegern pro Saison und All-Time-Bilanz (Teilnahmen/gewonnen/verloren)
- NEU: Relegationsbilanz auch im Vereins-Steckbrief
- FIX: Altspielstaende erhalten ihr Archiv per Backfill aus den letzten 50 Saisons

## v0.8.17 (22.06.2026)
- NEU: Vereinsliste pro Region - in der Karte ueber Button 'Liste', ausserhalb ueber Region-Chips im Vereins-Steckbrief, sortierbar nach Liga oder Staerke
- NEU: Region-Chips im Steckbrief sind verlinkt
- FIX: Sortierung 'Nach Liga' gruppiert gleichrangige Ligen jetzt korrekt statt sie zu vermischen

## v0.8.16 (21.06.2026)
- NEU: Uebersicht 'Ligalose Vereine' (261 Vereine ohne Liga, nach Region gruppiert, Sortierung Region/Name) - Eintrag unten in der Liga-Seitenleiste

## v0.8.15 (21.06.2026)
- NEU: FSG Bous in hochaufgeloester Version
-  SC Oberweikertshofen + SV Ruchheim in HD

## v0.8.14 (21.06.2026)
- FIX: FSG Bous Wappen entrauscht und hochskaliert (kein HD-Original verfuegbar)

## v0.8.13 (21.06.2026)
- NEU: 17 Vereinswappen in HD ersetzt (u.a. Inter Tuerkspor Kiel, FC Auggen, Ahrweiler BC, Kaltenkirchen, FV Schwalbach)

## v0.8.12 (21.06.2026)
- FIX: 65 Vereine auf der Karte entstapelt - praezise Stadion-/Bezirkskoordinaten statt geteiltem Stadtzentrum (Berlin, Hannover, Kaiserslautern u.v.m.)

## v0.8.11 (21.06.2026)
- FIX: Wappen-Dateien nach Landesverband sortiert (interne Struktur, eine Datei pro Verein)

## v0.8.10 (21.06.2026)
- FIX: Transparenz/Passform vieler Wappen (Saar 05, Empor, Henstedt, Hoehr, Wissen, Biemenhorst u.a.)
- NEU: TSV Gruenwald offizielles Logo
- FIX: 1. FC 08 Hassloch echtes Wappen statt VfB

## v0.8.9 (21.06.2026)
- NEU: 182 hochaufloesende Vereinswappen statt verpixelter ~50px-Logos
- FIX: Transparenz/Freistellung vieler Wappen (Box-Hintergrund, Loecher, Fetzen)

## v0.8.8 (20.06.2026)
- FIX: VfB Merseburg Wappen ohne IMO
- FIX: TSV Berg korrektes Wappen (Wuerttemberg)
- FIX: HSC Hannover korrektes Wappen
- NEU: Wappen Idar-Oberstein/Neubrandenburg/Germania Metternich/Arminia Hannover (hochaufgeloest)
- FIX: Regionalliga Suedwest Logo transparent

## v0.8.7 (20.06.2026)
- NEU: 5 weitere Vereine auf praezise europlan-Stadionkoordinaten (Trier-Tarforst, Biberach, Alemannia Aachen, Fortuna Duesseldorf I+II)

## v0.8.6 (20.06.2026)
- FIX: Eintracht Wald-Michelbach auf eigene Koordinate zurueckgesetzt - SG Wald-Michelbach ist ein anderer Verein

## v0.8.5 (20.06.2026)
- NEU: 39 weitere Vereine auf praezise europlan-Stadionkoordinaten (handkuratiert, Regions-Guard)
-  FIX: FC Bayern II auf FC Bayern Campus statt Allianz-Arena
-  FIX: Hamburger Turnerschaft Gruendungsjahr 1916->1816 + Legienstrasse
-  FIX: Dublette HT 16 Hamburg entfernt (1265->1264 Teams)
-  NEU: Tool apply_manual_coords.cjs

## v0.8.4 (19.06.2026)
- NEU: 43 Vereine auf praezise europlan-Stadionkoordinaten gehoben (Distanz- + Regions-Guard)
- FIX: Vorderpfalz-Geisterzuordnung in Hilfsdaten (Bad Kreuznach II, Ruessingen, Langenlonsheim, Schopp, TSG Kaiserslautern)

## v0.8.3 (19.06.2026)
- FIX: Suedwest-Bezirksligen strikt nach offiziellem Bezirk statt Geo-Mischung - jeder Verein in seiner richtigen Staffel
-  Soll-Groessen an Vereinszahl angepasst (Nahe naturgemaess klein, Vorderpfalz voll)
- FIX: Berlin-Landesligen mischen Vereine nicht mehr jede Saison zwischen den Staffeln (feste Heimatstaffel) - saubere ewige Tabelle, Staffeln bleiben dennoch ausgeglichen
- NEU: Tag-Report-Button - findet Vereine, deren Bezirks-Tag nicht zur Liga passt (faengt Nachbar-Region-Fehler die der km-Geo-Check uebersieht)
- FIX: 4 falsche Vereins-Regionen korrigiert (Kaiserslautern/Schopp -> Westpfalz, Langenlonsheim/Bad Kreuznach II -> Nahe)

## v0.8.2 (19.06.2026)
- FIX: Geo-Routing - Nord/Ost-Reserveteams landen nicht mehr faelschlich in Suedwest-Bezirksligen (Reserve-Cascade Heimat-Boden-Sperre + Reparatur bereits fehlplatzierter)
- FIX: Liga-Logo+Name auf dem Handy nicht mehr verdeckt - Spieltag-Navigation in eigener Zeile (zweizeiliger Header)

## v0.8.1 (19.06.2026)
- FIX: Liga-Logo im Header wird auf schmalen Screens nicht mehr verdeckt (Name kuerzt per Ellipsis)
- NEU: Geo-Check-Button in Save-Bar - findet fehlgeroutete Vereine (>250km vom Liga-Schwerpunkt) mit Heimat-Liga + JSON-Export

## v0.8.0 (19.06.2026)
- NEU: Echter Saison-Kalender - Spieltage mit echten Daten (Fr-So-Spanne), Winterpause, gestaffelt ueber Aug-Mai
-  Anzeige in Header und Spieltag-Picker
- NEU: Liga-Groessen-Fenster mit JSON-Export (Clipboard + Textarea, handytauglich)
- FIX: Langzeit-Performance - History im Speicher auf 50 Saisons gekappt, ms/Saison bleibt konstant

## v0.7.10 (19.06.2026)
- NEU: Jede Liga hat eigene Min/Max-Groesse (game_data, real verankert per Mehr-Saison-Recherche aller Ober-/Regionalligen)
- NEU: NOFV-Oberligen fix 16, Niedersachsen/Bez-Vorderpfalz Soll 16
- NEU: Liga-Groessen-Tabelle zeigt Band (Min-Max) und faerbt Ligen ausserhalb ihres Bands
- FIX: Stabiles Liga-Groessen-Band ueber 1750 Saisons verifiziert - Obergrenze via varDn, Untergrenze via Schrumpfschutz, keine Drift mehr
- FIX: Boden-Klammer - geo-duenne Staffeln fallen nie unter 8 Teams

## v0.7.9 (18.06.2026)
- NEU: Rumpf-Ligen bekommen dynamisch mehr Runden (3-5 statt nur Hin/Rueck) -> ~30-38 Spieltage, kein fruehes Idlen mehr
-  jeder gegen jeden gleich oft, je Saison nach Teamzahl
- FIX: Ligen schrumpfen nie unter 8 Teams (vorher konnten 6er-Ligen entstehen) - ueberschuessige Auf-/Abstiege werden ausgesetzt

## v0.7.8 (18.06.2026)
- NEU: DFB-Pokal laeuft jetzt auch als Live-Konferenz (Di/Mi, mit Verlaengerung + Elfmeterschiessen im Ticker)
- NEU: Auto-Skip ueberspringt Leerzeit (nur wenn kein Spiel laeuft) + Sofort-durchrechnen-Knopf
- NEU: Lieblingsverein (Stern) wird in jeder Konferenz oben angepinnt
-  jedes Spiel antippbar fuer Tor-Verlauf

## v0.7.7 (18.06.2026)
- NEU: Action-Modus Tiefe 'Live' - Echtzeit-Konferenz im Vollbild: Spielminuten laufen in Sekunden (Speed 1x-10x + Sofort), echte Uhrzeit, Spiele versetzt parallel nach Anstosszeit (2.BL bei 80' waehrend 1.BL erst anpfeift), Tor-Ticker + Live-Staende
-  reload-fest

## v0.7.6 (18.06.2026)
- NEU: Beim Spielen blitzen neue Ergebnisse dezent auf (im Action-Modus nur das gerade gespielte Slot) + Teams mit Platzwechsel kurz gruen/rot markiert
- FIX: Archiv-Saison zeigte falsche Abstiegs-Ziele (falsche Oberligen) - jetzt korrektes Routing
- FIX: Karten-Region-Dropdown im Light-Theme war schwarz auf schwarz - jetzt lesbar
- FIX: schmale Sidebar - Theme-/Karten-Button laufen nicht mehr ueber (Titel kuerzt sich)

## v0.7.5 (17.06.2026)
- FIX: Wappen laden 'lazy' (nur was sichtbar ist) - verhindert Request-Ansturm beim lokalen Testen und beschleunigt die Mobil-Ansicht

## v0.7.4 (17.06.2026)
- NEU: Action-Modus Tiefe 'Halbzeit' (Liga 2-teilig, DFB-Pokal 2-5 Teile mit Verlaengerung + Elfmeterschiessen, echter Schuetzen-Stand z.B. '4:2 i.E.')
- NEU: Undo-Pfeil (orange) im Kopf - letzten Spieltag rueckgaengig mit Bestaetigung, statt Reset-Center
- FIX: Button-Klicks springen nicht mehr nach oben (Scroll bleibt), Aenderung sofort in Liga und Pokal sichtbar

## v0.7.3 (17.06.2026)
- NEU: Standings-Spaltenbreiten frei ziehbar (Mannschaft, Sp/G/U/V, Tore, Diff, Pkt, Form, Auf-/Abstiegs-Info) - global fuer alle Ligen, Doppeltipp auf den Griff setzt auf Standard
- FIX: Mannschaft mobil ueber das bisherige Breitenlimit hinaus skalierbar

## v0.7.2 (17.06.2026)
- NEU: Action-Modus Tiefe umschaltbar (Tag ODER Uhrzeit) mit realen Anstosszeiten, gemeinsame Zeitachse ueber alle Ligen, Pokal Di/Mi 18:30+20:45
- NEU: Spiel-Feed oben (Ergebnisse+Vorschau) hoehenverstellbar per Drag - Mittelding zwischen eingeklappt und alles sichtbar (Doppelklick=alles)
- NEU: Liga-Liste im Action-Menue per Drag hoehenverstellbar

## v0.7.1 (17.06.2026)
- FIX: Spielplan bleibt nach Browser-Reload fest (Saison-Seed) - kein Neuwuerfeln der Restpaarungen mehr
- FIX: jedes Vereinspaar spielt garantiert genau 2x pro Saison (vorher konnten nach Reload 3 Begegnungen entstehen)

## v0.7.0 (16.06.2026)
- NEU: Action-Modus (...-Menue): Spieltage in Wochentage Fr/Sa/So, Scope frei pro Liga + DFB-Pokal (Dienstag/Mittwoch)
- NEU: Vorschau noch nicht gespielter Spiele je Liga, im Action-Modus nach Wochentag gruppiert
- FIX: DFB-Pokal zeigt Teilergebnisse pro Tag (nicht alles auf einmal) und aktualisiert sich sofort
- FIX: Action-Modus laeuft laufenden Spieltag sauber zu Ende, Scope-Wechsel wirkt ab naechstem Spieltag

## v0.6.0 (16.06.2026)
- NEU: Form-Spalte (Ampel letzte 5 Spiele vor dem Spieltag) hinter den Punkten
- NEU: Spieltag-Ergebnisse oben als Liste untereinander mit Mini-Wappen
- NEU: Mobil alle Stat-Spalten + Form, Auf-/Abstiegs-Info kompakt (Pfeil+Liga-ID, tippen zeigt Liganame)
- NEU: Sidebar-Badge vereint Ligastufe + Liga-ID, eng geschnitten = mehr Platz fuer Namen
- FIX: Tabellenkopf enger, Statspalten zentriert

## v0.5.19 (16.06.2026)
- NEU: Sidebar-Breite per Drag-Griff frei einstellbar (Maus+Touch, gemerkt)
- NEU: Sidebar kuerzt lange Liganamen 3-stufig & responsiv (voll -> Typ-Tag RL/LL/OL -> Region-Kuerzel), einheitlich pro Level, Region pro Verein so voll wie moeglich
- FIX: Liga-Namen brechen nicht mehr um (Ellipsis + Kuerzel statt Abschneiden)

## v0.5.18 (16.06.2026)
- Mobil: auf breiten Touch-Viewports (z.B. Opera-PWA ~900px) wird der Inhalt zur zentrierten 600px-Spalte - kein auseinandergezogenes Desktop-Layout mehr
- Mobil: Tabelle voll responsiv - alle Spalten (G/U/V/Tore/Diff/Pkt) ab 360px Breite ohne Scrollen, unter 360px kompakt (Pl/Wappen/Team/Sp/Diff/Pkt)

## v0.5.17 (15.06.2026)
- FIX Mobil: Pull-to-Refresh weniger empfindlich - hoehere Schwelle + kurz halten
- FIX Mobil: Touch-Geraete bekommen immer Mobil-Layout (kein versehentliches Desktop im PWA, auch Hochformat)
- FIX Mobil: Tabelle zeigt Pkt-Spalte wieder - kompakte Spalten (Pl/Wappen/Team/Sp/Diff/Pkt), Name gekuerzt
- FIX Mobil: Pokal-Teilnehmerfeld Topf-Label verrutscht nicht mehr
- NEU: Saisonstart-Tabelle und Teilnehmerfeld nach Vorsaison-Platzierung sortiert - Aufsteiger stehen unten (wie 16.)

## v0.5.16 (15.06.2026)
- FIX: Sanitize beim Laden/Import vollstaendig - tsView und transiente Engine-Felder (migrations/relegationResults/matchdayResults/leagueStats) werden zurueckgesetzt, Import ohne Reload startet sauber
- FIX: alter Spielstand ohne neue Felder laedt mit sicheren Defaults

## v0.5.15 (15.06.2026)
- NEU: Multi-Sim ohne 500er-Cap - leer/0 laeuft bis zum Abbruch (Exception, nicht heilbare Ligastruktur oder Abbruch-Button)
- NEU: Wappen-Harmonie ueberall - feste Box + object-fit:contain (Seitenleiste-Ligalogos, Pokal/Teilnehmerfeld, Testspiele, Steckbrief)
- FIX: Mittelrhein- und SHFV-Logo weisse Scheibe hinterlegt - aeusserer Textring jetzt auch im Dark-Theme sichtbar
- FIX: Wappen TuS Bersenbrueck (war faelschlich Erndtebrueck), HSV weisser Randstreifen entfernt, Arminia Hannover Loch im A transparent

## v0.5.14 (15.06.2026)
- FIX: Meister/Vize/Relegation-Badge erst bei ausgespielter Saison (kein falsches M an Tag 0)
- NEU: Testspiele laufen automatisch (Saisonstart + nach Spieltag 17), Button entfernt
-  Nachbar-Cache haelt Multi-Sim schnell
- NEU: Letzte 5 Saisons komplett gespeichert - alle Spieltage UND Testspiele (normal wie Multi-Sim)
-  archivierte Saisons voll navigierbar inkl. Testspiel-Pseudo-Spieltage

## v0.5.13 (15.06.2026)
- NEU: Testspiele gegen Koordinaten-Nachbarn (50km Umkreis) - nur 1.-3. Liga, 3 pro Verein, keine 2. Mannschaften
- NEU: Testspiel-Button (vor 1. Spieltag = Sommer, Tag 17 = Winter)
-  Pseudo-Spieltag im Spieltag-Picker mit Liga-Paarungen (Heim/Auswaerts)
- NEU: Steckbrief-Abschnitt TESTSPIELE mit Historie - Gegner aus jeder Liga inkl. ligalose Vereine (Staerke-Fallback)

## v0.5.12 (14.06.2026)
- NEU: Steckbrief zeigt Erfolge-Chips (Meister/Vize/Aufstiege/DFB-Pokalsiege/Pokalfinals/Verbandspokalsiege)
- NEU: DFB-Pokal echte Lostoepfe - Topf 1/2 nach Staerke (kein Nord/Sued), eigener Lostoepfe-Tab + Topf-Badge
- NEU: Pokal-Teilnehmerfeld nach Qualifikationsgrund gruppiert (BL/2.BL/3.Liga/Landesverbaende je Verband), Liga seitlich am Verein

## v0.5.11 (14.06.2026)
- NEU: Steckbrief kompakter - schmaleres Modal (440px), engerer Kopf und Zeilen
- NEU: Saison-Historie feste Spalten (Jahr|Liga|Platzierung) + Badges Meister/Aufstieg/Abstieg/Relegation/Pokal
- NEU: P-Badge fuer DFB-Pokalsieger pro Saison
- FIX: Pokal-Verlauf ohne Riesenluecke
- FIX: Wappen Sportfreunde Eisbachtal korrigiert

## v0.5.10 (14.06.2026)
- FIX: Wappen in Tabellen einheitliche feste Box (40x32) - breite Wappen sprengen die Spalte nicht mehr, Namen bleiben buendig, keine dominanten Einzelwappen

## v0.5.9 (14.06.2026)
- FIX: HT 16 Hamburg richtiges Wappen
-  FC Auggen Backing entfernt
-  Konstanz-Wollmatingen sauberer Kreis
- FIX: VfR Katschenreuth, SF Neitersen (Fussball-Weiss), SG Laufeld/Buchholz/Wallscheid hochaufloesend
-  FC Rastpfuhl Emblem+Text-Layout
- NEU: wappen_doctor circle-Strategie + aufloesungsskaliertes Kanten-Anti-Aliasing
- FIX: Tabelle - Wappen eigene Spalte direkt am Vereinsnamen, Mannschaft-Header ueber Namen, Abstaende gestrafft

## v0.5.8 (14.06.2026)
- FIX: HT 16 Hamburg richtiges Wappen (Wikimedia)
- FIX: SG Laufeld/Buchholz/Wallscheid + SC Konstanz-Wollmatingen hochaufloesend, Hintergrund/Kasten entfernt
- FIX: 11 niedrig aufgeloeste Wappen hochaufloesend neu (fupa): Hoehr-Grenzhausen, Konz, Emmelshausen, Baumberg, Neubrandenburg, Biemenhorst, Melle, Charlottenburg, Hiltrup, Mondorf, Lupo Martini
- NEU: Backing-Kanten weichgezeichnet, 76 uebergrosse Wappen auf 240px geglaettet (~12 MB kleiner)
- FIX: Saar Saarbruecken Luftloch transparent, Gruenwald ohne Halo-Ring

## v0.5.7 (14.06.2026)
- FIX: Weisse Kasten-Hintergruende entfernt (Mondorf, Hiltrup, Essingen) - geformtes Backing statt Quadrat
- NEU: wappen_doctor unbox-Strategie (Kasten -> konvexe Huelle)
- FIX: Wappen in Tabellen mittig im Slot statt rechtsbuendig

## v0.5.6 (14.06.2026)
- NEU: Wappen-Doktor (tools/wappen_doctor.py) - Sticker-Backing behebt durchscheinende Transparenz im Dark-Theme
- FIX: ~97 Wappen korrigiert (Landsberg, Gruenwald, Henstedt, Wormatia u.a.)
- FIX: TuS Moerschied - neues sauberes Wappen statt gruenem Kasten
- NEU: Wappen seitenverhaeltnis-treu + rechtsbuendige Slot-Spalte - Vereinsnamen buendig, breite Wappen (Union) schrumpfen nicht mehr
- FIX: LL Bayern Suedost -> LL Bayern SO

## v0.5.5 (14.06.2026)
- FIX: realistische Pokal-Ergebnisse - Poisson-Tor-Modell
-  Kantersiege (6:0, 7:1) bleiben bei klarem Favoriten moeglich, aber keine beidseitig-hohen Basketball-Ergebnisse mehr
-  bei Augenhoehe enge Spiele
- NEU: Verlaengerung - Remis nach 90 Min wird in Verlaengerung (n.V.) oder Elfmeterschiessen (n.E.) entschieden, sichtbar in Ergebnisliste, Bracket und Steckbrief

## v0.5.5 (14.06.2026)
- FIX: realistische Pokal-Ergebnisse - Poisson-Tor-Modell (Ø ~3 Tore, meist 0-3 pro Team) statt bizarrer Kantersiege wie 1:8
- NEU: Verlaengerung - Remis nach 90 Min wird in der Verlaengerung (n.V.) oder im Elfmeterschiessen (n.E.) entschieden, sichtbar in Ergebnisliste, Bracket und Steckbrief

## v0.5.4 (14.06.2026)
- NEU: Teilnehmerfeld zeigt Qualifikation als Badge (BL / 2.BL / Top-4 3.Liga / Verbandspokal je Verband)
- NEU: Heimrecht fuer den unterklassigen Verein in 1. und 2. Runde (echte Pokal-Regel)
- NEU: realistische Pokalsensationen - rundenabhaengige Upset-Wahrscheinlichkeit (frueh mehr, spaet Favoriten verlaesslich)
- NEU: Elfmeterschiessen sichtbar als n.E. in Ergebnisliste, Bracket und Steckbrief
- FIX: 1. Saison ohne History - Top-4 der 3. Liga via Staerke statt undefinierter Platzierung

## v0.5.3 (13.06.2026)
- FIX: Light-Theme komplett farbenrein - restliche hartkodierte Neutralfarben (Liga-Ergebnisse, Such-/Karten-Filter, Tabellen, Debug-Log) auf CSS-Variablen umgestellt
- NEU: Theme-Color-Checker (tools/check_theme_colors.cjs) als manage-v-Gate verhindert kuenftig hartkodierte Neutralfarben in Inline-Styles

## v0.5.2 (13.06.2026)
- FIX: Light-Theme - Liga-Ansicht (Pyramiden-Nav, Ergebnis-Header, Ewige Tabelle, Siegerliste) nicht mehr schwarz
- FIX: Light-Theme - Liga-Groessen-Modal Header lesbar
- FIX: Light-Theme - Karten-Sidebar (Regionen-Chips, Liga-Tabelle) entdunkelt

## v0.5.1 (13.06.2026)
- FIX: Light-Theme - DFB-Pokal-Sieger-Liste und Rekordsieger-Box nicht mehr schwarz
- FIX: Light-Theme - ausgeschiedene Vereine in Pokal-Runden wieder lesbar
- FIX: Light-Theme - Steckbrief Regionen-Chips und gedaempfte Texte lesbar (semantische CSS-Variablen)

## v0.5.0 (13.06.2026)
- NEU: DFB-Pokal mit realgetreuem 64er-Teilnehmerfeld - 21 simulierte Verbandspokalsieger, keine undefined-Freilose mehr
- NEU: DFB-Pokal-Verlauf im Verein-Steckbrief
- FIX: Pokal-Bracket und Ergebnisse im hellen Design lesbar (themefaehige Farben)
- FIX: DFB-Pokal wird bei Spieltag- und Saison-Ruecksetzung sauber mit zurueckgerollt

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

























































































































































































































































































