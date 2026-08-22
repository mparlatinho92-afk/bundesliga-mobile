Object.assign(App, {
showChangelog: function() {
    const html = `
        <div style="font-family:monospace; font-size:13px; line-height:1.8;">
        <!-- CHANGELOG -->
                    <div class="font-bold text-green-400">v0.8.101 (aktuell) - 22.08.2026</div>
                    <div>&#8226; FIX: Archivierte Saisons unterhalb der 3. Liga zeigen wieder Auf-/Abstiegsmarkierungen mit echtem Zielstaffel-Namen</div>
                    <div>&#8226; FIX: Liga-Navleiste im Archiv nennt die echten Nachbarstaffeln (UP/DOWN) statt dreimal 'tiefere Liga'</div>
                    <div>&#8226; NEU: Bodenligen zeigen im Archiv den Amateurpokal als Weg nach unten</div>
                    <div class="font-bold text-slate-400">v0.8.100 - 15.08.2026</div>
                    <div>&#8226; NEU: 14 weitere Vereinswappen in hoher Aufloesung - insgesamt 944 von 1254 Vereinen</div>
                    <div>&#8226; Technik: Das FM-Logopaket ist damit vollstaendig ausgewertet - fuer die verbliebenen 150 Vereine liefert es entweder nichts oder das Wappen eines fremden Vereins</div>
                    <div class="font-bold text-slate-400">v0.8.99 - 15.08.2026</div>
                    <div>&#8226; NEU: 118 weitere Vereinswappen in hoher Aufloesung - insgesamt haben jetzt 931 von 1254 Vereinen ein scharfes Wappen</div>
                    <div>&#8226; NEU: Ein zweiter Abgleich fand 155 Vereine, die im FM-Paket nur unter ihrem Ortsnamen gefuehrt werden und deshalb zuvor unentdeckt blieben</div>
                    <div class="font-bold text-slate-400">v0.8.98 - 15.08.2026</div>
                    <div>&#8226; Technik: Alle Vereinswappen wurden auf eine 256-Farben-Palette gebracht - die Datei ist dadurch etwa 40 Prozent kleiner, ohne sichtbaren Unterschied</div>
                    <div class="font-bold text-slate-400">v0.8.97 - 14.08.2026</div>
                    <div>&#8226; NEU: 233 weitere Vereinswappen in hoher Aufloesung - insgesamt haben jetzt 824 statt 479 Vereine ein scharfes Wappen</div>
                    <div>&#8226; FIX: Reserve-Mannschaften tragen jetzt immer dasselbe Wappen wie ihre erste Mannschaft - das wich zuvor bei 35 von 80 Vereinen ab</div>
                    <div class="font-bold text-slate-400">v0.8.96 - 14.08.2026</div>
                    <div>&#8226; Technik: Alte Programmversionen werden nicht mehr im Projektordner aufbewahrt - die Versionsgeschichte auf GitHub haelt jede Fassung ohnehin vor</div>
                    <div class="font-bold text-slate-400">v0.8.95 - 14.08.2026</div>
                    <div>&#8226; NEU: Die Wappen von 28 Profivereinen liegen jetzt in hoher Aufloesung vor - darunter Borussia Dortmund, Bayer Leverkusen, Borussia Moenchengladbach und der VfB Stuttgart</div>
                    <div>&#8226; NEU: Von 52 Vereinen aus Liga 1 bis 3 haben jetzt 35 statt 7 ein scharfes Wappen</div>
                    <div class="font-bold text-slate-400">v0.8.94 - 13.08.2026</div>
                    <div>&#8226; NEU: 83 Vereinswappen wurden durch hochaufloesende Versionen ersetzt - darunter etliche, bei denen bisher das Wappen eines fremden Vereins hinterlegt war</div>
                    <div>&#8226; NEU: Die ersetzten Wappen haben jetzt im Schnitt 237 statt unter 90 Bildpunkten effektiver Aufloesung</div>
                    <div class="font-bold text-slate-400">v0.8.93 - 11.08.2026</div>
                    <div>&#8226; FIX: FC Ehekirchen, SV Schwandorf-Ettmannsdorf, SG Marpingen-Urexweiler und Klub Kosova spielen jetzt in der Staffel, in der sie auch liegen - Ehekirchen war 109 km von seiner Staffel entfernt</div>
                    <div>&#8226; FIX: VfB Linz und SV Ellingen gehoeren zum Bezirk Rheinland Mitte statt Ost - ihre Heimatangabe widersprach ihrer Liga und ihrer Lage</div>
                    <div class="font-bold text-slate-400">v0.8.92 - 10.08.2026</div>
                    <div>&#8226; FIX: Die Vereinspunkte auf der Karte zeigen jetzt wirklich den gewaehlten Stand - Farbe und Groesse blieben bisher in beiden Ansichten gleich</div>
                    <div>&#8226; FIX: Das Berliner Gebiet um Hohen Neuendorf umfasst nur noch die gleichnamige Ortschaft und nicht mehr Bergfelde, Borgsdorf und Stolpe</div>
                    <div class="font-bold text-slate-400">v0.8.91 - 10.08.2026</div>
                    <div>&#8226; FIX: Ein Verein ohne Heimatstaffel bekommt sie jetzt aus seiner eigenen Regionen-Kette statt aus der Liga, in der er zufaellig gelandet ist - dadurch entstehen deutlich weniger Insel-Staffeln</div>
                    <div>&#8226; FIX: Das bayerische Gebiet um Illertissen umfasst nur noch die Gemarkung des Ortes und nicht mehr die eingemeindeten Ortsteile</div>
                    <div class="font-bold text-slate-400">v0.8.90 - 10.08.2026</div>
                    <div>&#8226; FIX: SpVgg Lam, TuS Geretsried und FC Rastpfuhl spielen jetzt in der Staffel, in der sie auch geografisch liegen - Lam stand im Bayerischen Wald und spielte 250 km entfernt</div>
                    <div>&#8226; Technik: die veraltete Zentroid-Tabelle wurde entfernt, die Staffel-Balancierung misst seit v0.8.86 die echten Schwerpunkte</div>
                    <div class="font-bold text-slate-400">v0.8.89 - 10.08.2026</div>
                    <div>&#8226; FIX: Landesliga Bayern Mitte und Suedost haben jetzt dasselbe Band wie ihre Schwesterstaffel Suedwest - die drei Staffeln sind bauartbedingt immer gleich gross</div>
                    <div class="font-bold text-slate-400">v0.8.88 - 09.08.2026</div>
                    <div>&#8226; FIX: Sachsenliga hat jetzt das Band 10-15 statt 10-13 - sie lag in fast jeder Saison darueber</div>
                    <div>&#8226; FIX: Landesliga Bayern Suedwest hat jetzt das Band 8-13 und liegt damit gleichauf mit ihren Schwesterstaffeln Mitte und Suedost</div>
                    <div class="font-bold text-slate-400">v0.8.87 - 09.08.2026</div>
                    <div>&#8226; FIX: Ein gesperrter Reserve-Meister laesst seinen Aufstiegsplatz nicht mehr verfallen - der Naechstplatzierte rueckt nach</div>
                    <div>&#8226; FIX: 2. Bundesliga und 3. Liga behalten zuverlaessig ihre Groesse von 18 und 20 Vereinen</div>
                    <div class="font-bold text-slate-400">v0.8.86 - 09.08.2026</div>
                    <div>&#8226; NEU: Vereine behalten ihre Staffel ueber Jahre - bisher wurde jede Geschwistergruppe zu jedem Saisonwechsel komplett neu zusammengewuerfelt</div>
                    <div>&#8226; NEU: Ausgeglichen wird nur so viel wie noetig, alle Staffeln einer Gruppe sind exakt gleich gross - geht es nicht auf, wandert der Rest reihum</div>
                    <div>&#8226; NEU: Wer drei Saisons in Folge fremd spielt, bekommt dort seine neue Heimat und kehrt nach Jahren in anderen Ligen genau dorthin zurueck</div>
                    <div>&#8226; FIX: Loecher in den Staffelflaechen von 28 auf 5 gesunken, weil Vereine nicht mehr quer durch die Region geschoben werden</div>
                    <div class="font-bold text-slate-400">v0.8.85 - 09.08.2026</div>
                    <div>&#8226; FIX: Die beiden NOFV-Oberligen hatten je 18 Vereine statt der seit der Fuenftklassigkeit ueblichen 16 - vier Vereine standen dort, obwohl die Quelldatei sie ausserhalb der Pyramide fuehrt</div>
                    <div>&#8226; NEU: CFC Hertha 06, Doberaner FC, FSV Saxonia Tangermuende und SSV 80 Gardelegen spielen jetzt im Amateurpokal, dessen Feld damit auf 265 waechst</div>
                    <div class="font-bold text-slate-400">v0.8.84 - 09.08.2026</div>
                    <div>&#8226; FIX: Der Tausch von Lindenthal-Hohenlind war nur beim Heimatgebiet ausgeglichen, nicht bei der Liga - dadurch stand Mittelrhein 13 zu 11. Partner ist jetzt FC Pesch aus derselben Ligastufe, damit bleibt es bei 12 zu 12</div>
                    <div class="font-bold text-slate-400">v0.8.83 - 09.08.2026</div>
                    <div>&#8226; FIX: Die Heimatstaffel der Berliner Vereine ging bei jedem Neuladen verloren - danach wurden sie beim naechsten Auf- oder Abstieg neu auf die duennere Staffel verteilt, statt in ihre Staffel zurueckzukehren</div>
                    <div class="font-bold text-slate-400">v0.8.82 - 09.08.2026</div>
                    <div>&#8226; FIX: Vier Vereine lagen als Insel mitten im Gebiet einer fremden Staffel - Suederelbe tauscht mit Barmbek-Uhlenhorst, Wattenscheid mit Schalke, Lindenthal-Hohenlind mit Frechen</div>
                    <div>&#8226; FIX: Lindenthal-Hohenlind spielt als einziger davon IN einer Staffel und wechselt deshalb auch die Liga - die uebrigen spielen ueberregional, dort aendert sich nur das Heimatgebiet</div>
                    <div class="font-bold text-slate-400">v0.8.81 - 08.08.2026</div>
                    <div>&#8226; FIX: Die letzten Haarstriche in den Staffelflaechen sind weg - die Schwelle wird jetzt ueberall metrisch gemessen statt in Grad, sonst blieben je nach Ausrichtung Reste stehen</div>
                    <div class="font-bold text-slate-400">v0.8.80 - 08.08.2026</div>
                    <div>&#8226; FIX: Die Karte zeichnete Haarstriche mitten in die Staffelflaechen - 2409 Polygone waren es, 2165 davon schmaler als 166 Meter und damit reine Rechenspuren der Vereinfachung</div>
                    <div>&#8226; FIX: Filter greift jetzt an allen drei Stellen (Waben, statische Regionsflaechen, Laufzeit-Vereinigung) mit derselben Schwelle, sonst erzeugt eine wieder, was die andere verwirft</div>
                    <div>&#8226; NEU: Kartendaten dadurch 7 Prozent kleiner</div>
                    <div class="font-bold text-slate-400">v0.8.79 - 08.08.2026</div>
                    <div>&#8226; FIX: Ludwigsfelder FC und FSV 63 Luckenwalde waren vertauscht - Ludwigsfelde liegt noerdlicher, stand aber in der Sued-Staffel</div>
                    <div>&#8226; FIX: Rund um Pinneberg zeichnete die Karte Narben - 16 Ringe im Bestand umschlossen null Flaeche und hinterliessen Haarstriche</div>
                    <div>&#8226; FIX: Die Grenzen-Ebene fuehrte Schleswig-Holstein und Hamburg zu grob (17 Stuetzpunkte rund um Hamburg), dadurch schnitten Zacken quer durch das Stadtgebiet</div>
                    <div class="font-bold text-slate-400">v0.8.78 - 08.08.2026</div>
                    <div>&#8226; NEU: Karten-Haekchen 'Waben' legt die Voronoi-Zelle jedes Vereins offen - der Tooltip nennt Verein und Staffel, damit zeigt eine Insel sofort ihren Verursacher</div>
                    <div>&#8226; FIX: Die Karte fuehrte 15 Vereine in der falschen Region - u.a. Preussen Muenster, Paderborn, Verl und Roedinghausen als Suedwestfalen statt Muensterland/OWL, dazu die drei Kieler und Wegberg-Beeck</div>
                    <div>&#8226; FIX: Steinbach lag gleichzeitig in Hessen Nord, Mitte und Sued, die Hamburger Turnerschaft in beiden Hamburger Staffeln - solche Doppelzuordnungen kann es jetzt nicht mehr geben, weil die Karte ihre Regionen aus game_data statt aus einer alten Excel-Ableitung nimmt</div>
                    <div class="font-bold text-slate-400">v0.8.77 - 07.08.2026</div>
                    <div>&#8226; NEU: Ligen, deren Staffeleinteilung real ab 2026/27 abweicht, tragen einen Hinweis - Niederrhein teilt dann West/Ost statt Nord/Sued, im Suedwesten wechseln einzelne Vereine den Fussballkreis</div>
                    <div>&#8226; NEU: Der Steckbrief betroffener Vereine zeigt denselben Hinweis kurz hinter den Regionen. Grund ist beide Male die bessere Logistik - die Simulation bleibt bewusst beim Stand 2025/26</div>
                    <div class="font-bold text-slate-400">v0.8.76 - 07.08.2026</div>
                    <div>&#8226; NEU: Steckbrief zeigt Amateurpokal- und Ligasaisons in EINER chronologischen Historie - die Pokaljahre fuellen genau die Luecken, die der Ligabetrieb liess</div>
                    <div>&#8226; NEU: Der Weg aus der Pyramide in den Amateurpokal zaehlt als Abstieg, die Rueckkehr als Aufstieg</div>
                    <div>&#8226; FIX: Die laufende Saison rutschte in langen Karrieren ans Ende der Historie - dadurch waren auch die Auf- und Abstiegs-Badges an beiden Enden falsch berechnet</div>
                    <div class="font-bold text-slate-400">v0.8.75 - 06.08.2026</div>
                    <div>&#8226; FIX: Verbandsliga Wuerttemberg lag dauerhaft ueber ihrer Ligagroesse - Band auf 9-15 korrigiert (Ziel 14 statt 11, naeher an den realen 16 Vereinen)</div>
                    <div class="font-bold text-slate-400">v0.8.74 - 05.08.2026</div>
                    <div>&#8226; FIX: Landesliga Berlin Staffel 1+2 sprengten dauerhaft ihre Ligagröße - Band auf 11-16 korrigiert</div>
                    <div>&#8226; NEU: Gemeinsame ewige Tabelle beider Berlin-Staffeln</div>
                    <div class="font-bold text-slate-400">v0.8.73 - 05.08.2026</div>
                    <div>&#8226; FIX: Vereine stiegen aus der vorletzten statt aus der untersten Liga in den Amateurpokal ab - ein gerade durchgereichter Absteiger brachte seinen Rang aus der hoeheren Liga mit und flog im selben Sommer wieder raus (58 Prozent aller Abgaenge)</div>
                    <div>&#8226; FIX: Bodenligen zeigen jetzt ihre Abstiegszone - ab dem Sechzehntelfinale steht fest, wer den Amateurpokal-Aufsteiger ersetzt</div>
                    <div class="font-bold text-slate-400">v0.8.72 - 04.08.2026</div>
                    <div>&#8226; FIX: Steckbrief zeigte die Liga vom Sim-Start statt der laufenden - ligalose Vereine standen dort mit ihrer alten Liga statt im Amateurpokal</div>
                    <div>&#8226; FIX: Kartenpunkte ligaloser Vereine hatten die Farbe ihrer frueheren Liga statt einer neutralen</div>
                    <div class="font-bold text-slate-400">v0.8.71 - 03.08.2026</div>
                    <div>&#8226; NEU: Amateurpokal - bundesweiter K.o. aller 261 ligalosen Vereine (Qualifikation + 9 Runden, Bracket ab 64)</div>
                    <div>&#8226; NEU: Die 16 Sieger des Sechzehntelfinals steigen in die Bodenliga ihrer Region auf - je Aufsteiger verlaesst der Tabellenletzte derselben Liga die Pyramide (1:1, Ligagroessen bleiben gleich)</div>
                    <div>&#8226; NEU: Bodenligen haben damit erstmals Absteiger - Vereine koennen die Pyramide verlassen und sich zurueckkaempfen</div>
                    <div>&#8226; NEU: Ewige Amateurpokal-Tabelle, Siegerliste und Aufsteiger-Uebersicht - das Teilnehmerfeld ersetzt die Liste 'Ligalose Vereine'</div>
                    <div>&#8226; NEU: Ligalose Vereine haben eine eigene Staerke (Basis 30) und stehen im Spielstand - frisch Abgestiegene bleiben 2-4 Saisons Pokalfavorit</div>
                    <div>&#8226; NEU: Chronik-Saetze fuer Amateurpokal-Titel und Rueckkehr in den Ligabetrieb</div>
                    <div>&#8226; NEU: Karte mit zwei Saisonstaenden - Umschalter Sim-Start / Aktuell in der Kartenleiste</div>
                    <div>&#8226; NEU: Staffelflaechen folgen der laufenden Saison - die Geo-Balancierung verschiebt Grenzvereine, die Karte zeigt es jetzt (Vereinswaben werden zur Laufzeit neu gruppiert)</div>
                    <div>&#8226; FIX: Staffelinsel in der Kieler Foerde entfernt - TSV Klausdorf spielt jetzt Landesliga Holstein</div>
                    <div>&#8226; NEU: Stadien fuer 5 weitere Vereine - 1239 von 1264 haben eine Spielstaette</div>
                    <div class="font-bold text-slate-400">v0.8.70 - 02.08.2026</div>
                    <div>&#8226; NEU: 11 weitere Vereine mit Spielstaette - darunter 6 Spielgemeinschaften mit allen ihren Plaetzen</div>
                    <div>&#8226; FIX: nur noch 30 Vereine ohne Stadion, davon 11 ohne jeden europlan-Eintrag - zu Sessionbeginn waren es 517</div>
                    <div class="font-bold text-slate-400">v0.8.69 - 02.08.2026</div>
                    <div>&#8226; NEU: Die vier Bezirke des Suedwestdeutschen Fussballverbands folgen jetzt den Kreisgrenzen statt einer frei gezogenen Linie - jede Staffel ist eine zusammenhaengende Flaeche, die Ausfransungen sind weg</div>
                    <div>&#8226; NEU: Ortsausnahmen fuer Gemeinden, die im Nachbarbezirk spielen - Eisenberg zur Vorderpfalz, Stetten nach Rheinhessen</div>
                    <div>&#8226; FIX: TuS Ruessingen stand in Suedwest Ost, spielt aber in der Westpfalz - damit haengt Westpfalz nicht mehr unter beiden Staffeln</div>
                    <div class="font-bold text-slate-400">v0.8.68 - 02.08.2026</div>
                    <div>&#8226; NEU: Stadionsuche jetzt ueber alle 2036 europlan-Ligen statt 401 - 1222 von 1264 Vereinen haben eine Spielstaette, 179 davon mehrere</div>
                    <div>&#8226; FIX: fuenf falsch verortete Vereine korrigiert, u.a. TSG 1846 Bretzenheim, das auf Bretzenheim an der Nahe stand statt auf Mainz-Bretzenheim</div>
                    <div class="font-bold text-slate-400">v0.8.67 - 02.08.2026</div>
                    <div>&#8226; NEU: 38 weitere Vereine mit Stadion, Ort und Kapazitaet - jetzt 1184 von 1264</div>
                    <div>&#8226; FIX: nur noch 80 Vereine ohne Spielstaette, zu Saisonbeginn waren es 517</div>
                    <div class="font-bold text-slate-400">v0.8.66 - 02.08.2026</div>
                    <div>&#8226; NEU: Spielgemeinschaften zeigen alle ihre Sportstaetten - 29 Vereine mit 72 Plaetzen, weil sich bei einer SG nicht sauber trennen laesst, wer wo spielt</div>
                    <div>&#8226; FIX: 1146 statt 1117 Vereine mit Stadionangaben</div>
                    <div class="font-bold text-slate-400">v0.8.65 - 02.08.2026</div>
                    <div>&#8226; NEU: Steckbrief zeigt Stadionname, Ort und Kapazitaet - 1117 von 1264 Vereinen, 36 davon mit mehreren Plaetzen</div>
                    <div>&#8226; NEU: Stadiondaten aus europlan, Liga-Index vervollstaendigt (401 statt 247 Ligen - Bayern und Regionalliga West fehlten ganz)</div>
                    <div class="font-bold text-slate-400">v0.8.64 - 02.08.2026</div>
                    <div>&#8226; FIX: Karten-Schalter +Eltern/+Kinder/+Geschwister greifen wieder - die Tabellen zeigten noch auf die alten Huellen-IDs</div>
                    <div>&#8226; FIX: doppelte Region Suedwestdeutscher Fussballverband entfernt, Regionsfilter trifft dort jetzt seine Vereine</div>
                    <div class="font-bold text-slate-400">v0.8.63 - 02.08.2026</div>
                    <div>&#8226; NEU: Die Vereinskarte zeigt die Verbandsgebiete jetzt aus amtlichen Kreisgrenzen statt berechneter Huellen</div>
                    <div>&#8226; NEU: Staffelgebiete (Bayern Mitte, Hessen Sued, Hammonia) folgen der Vereinsverteilung - Niedersachsens Bezirke folgen den Kreisen der alten Regierungsbezirke</div>
                    <div>&#8226; NEU: Kreis- und Gemeindegrenzen als eigene Karten-Ebenen mit eigenem Filter</div>
                    <div>&#8226; NEU: Vereinsnamen erscheinen ab Zoomstufe 9, die Punkte wachsen beim Hineinzoomen</div>
                    <div>&#8226; NEU: Stadion-Angaben im Vereins-Steckbrief (Name, Ort, Kapazitaet) fuer 747 Vereine</div>
                    <div>&#8226; FIX: Zahlreiche Vereins-Zuordnungen und Koordinaten korrigiert - von 55 Fehlzuordnungen ist noch eine uebrig</div>
                    <div class="font-bold text-slate-400">v0.8.62 - 01.08.2026</div>
                    <div>&#8226; FIX: Die Kreisgrenzen auf der Karte bleiben im Dark-Theme sichtbar - sie folgen nicht mehr der App-Farbe, weil die Karte immer helle Kacheln hat</div>
                    <div class="font-bold text-slate-400">v0.8.61 - 01.08.2026</div>
                    <div>&#8226; NEU: Amtliche Kreisgrenzen als eigene Karten-Ebene mit eigenem Filter</div>
                    <div>&#8226; NEU: Gemeindegrenzen als eigene Ebene - in den Kreisen, die sich zwei Verbaende teilen, ab Zoomstufe 8</div>
                    <div>&#8226; FIX: Ueberfluessige Hilfspolygone entfernt (historische Laender in Baden-Wuerttemberg, Bocholt-Zipfel, die zwei Hamburg-Enklaven)</div>
                    <div>&#8226; FIX: Regionsebenen 4 und 5 nutzen dieselbe Farbe wie Ebene 3 - Rheinland-Pfalz war die einzige Gegend mit Violett und Dunkelrot</div>
                    <div class="font-bold text-slate-400">v0.8.60 - 01.08.2026</div>
                    <div>&#8226; NEU: Die Vereinskarte zeigt echte Verbandsgrenzen (amtliche Kreisgrenzen) statt berechneter Huellen um die Vereinspunkte</div>
                    <div>&#8226; NEU: Unterregionen ohne reale Grenze (Bayern Suedost, Hammonia, Westpfalz) werden aus der Vereinsverteilung gezeichnet</div>
                    <div>&#8226; FIX: Der Umschalter Saison/Gesamt/Voronoi entfaellt - es gibt nur noch eine Geometrie je Region</div>
                    <div class="font-bold text-slate-400">v0.8.59 - 30.07.2026</div>
                    <div>&#8226; NEU: Zeile des Torschuetzen leuchtet in der Konferenz-Live-Tabelle auf</div>
                    <div>&#8226; NEU: Mini-Wappen in der Live-Tabelle</div>
                    <div>&#8226; FIX: Score-Chip verschwindet mit dem Abpfiff - das Ergebnis zaehlt weiter zur Live-Tabelle, gilt aber nicht mehr als laufend</div>
                    <div class="font-bold text-slate-400">v0.8.58 - 30.07.2026</div>
                    <div>&#8226; NEU: Live-Tabelle im Halbzeit-Modus - Zwischenstaende werden provisorisch eingerechnet, mit Rang-Pfeilen</div>
                    <div>&#8226; NEU: Live-Tabelle als dritte Spalte in der Konferenz, aktualisiert sich mit jedem Tor</div>
                    <div>&#8226; NEU: Farbiges Score-Chip der laufenden Partie am Ende der Namensspalte (gruen fuehrt / gelb unentschieden / rot zurueck), Sp-Diff-Pkt rot solange gespielt wird</div>
                    <div class="font-bold text-slate-400">v0.8.57 - 30.07.2026</div>
                    <div>&#8226; NEU: 100 eigene Pokal-Schlagzeilen in 7 Kategorien (Sensation, Ueberraschung, Elfmeterkrimi, Verlaengerung, Kantersieg, deutlich, knapp)</div>
                    <div>&#8226; NEU: Elfmeter-Texte nennen jetzt auch den regulaeren Spielstand</div>
                    <div class="font-bold text-slate-400">v0.8.56 - 30.07.2026</div>
                    <div>&#8226; NEU: Schlagzeile zur auffaelligsten Partie jeder Pokalrunde - Klassensprung (Amateur wirft Profi raus), Elfmeterkrimi, Verlaengerung</div>
                    <div>&#8226; NEU: Spoiler-Sperre - keine Schlagzeile solange der Endstand noch gestaffelt enthuellt wird</div>
                    <div class="font-bold text-slate-400">v0.8.55 - 11.07.2026</div>
                    <div>&#8226; NEU: CHRONIK-Block im Vereins-Steckbrief - der Spielstand erzählt die Vereinsgeschichte (Status, Titel/Pokal/Aufstiege/Relegation, emergenter Rivale)</div>
                    <div>&#8226; NEU: 78 Sätze REPORTS_CHRONIK in 9 Fakten-Pools</div>
                    <div class="font-bold text-slate-400">v0.8.54 - 11.07.2026</div>
                    <div>&#8226; NEU: Serien-Zeilen unter den Spieltags-Ergebnissen (Siegesserie/ungeschlagen/Niederlagenserie/sieglos, max. 2 pro Liga)</div>
                    <div>&#8226; NEU: 48 Zeilen REPORTS_STREAK</div>
                    <div class="font-bold text-slate-400">v0.8.53 - 11.07.2026</div>
                    <div>&#8226; NEU: Stimmen zum Spiel - zwei Trainer-Zitate unter dem Spiel des Tages (Sieger/Verlierer bzw. beide Remis-Seiten)</div>
                    <div>&#8226; NEU: 120 Zitate REPORTS_PRESS in 10 Kategorien-Pools</div>
                    <div class="font-bold text-slate-400">v0.8.52 - 11.07.2026</div>
                    <div>&#8226; NEU: Saison-Rückblick über der Abschlusstabelle vergangener Saisons (Meister- + Absteiger-Satz)</div>
                    <div>&#8226; NEU: 138 Zeilen REPORTS_SEASON in 5 Ära-Registern (1963 bis heute, inkl. DDR-Archiv)</div>
                    <div class="font-bold text-slate-400">v0.8.51 - 10.07.2026</div>
                    <div>&#8226; NEU: Spiel des Tages mit anlassbezogener Schlagzeile (Derby/Topduell/Abstiegskrimi/Form/Ueberraschung)</div>
                    <div>&#8226; NEU: Vorschau-Anriss statt Begruendungs-Label beim Spiel des Tages</div>
                    <div class="font-bold text-slate-400">v0.8.50 - 10.07.2026</div>
                    <div>&#8226; NEU: Schlagzeilen-Corpus stark erweitert (52 je Kategorie, weniger Wiederholung ueber lange Saisons)</div>
                    <div class="font-bold text-slate-400">v0.8.49 - 10.07.2026</div>
                    <div>&#8226; NEU: Schlagzeile fuer das Spiel des Tages (gewichtete Auswahl: Derby/Tradition/Abstieg/Form/Vorsaison)</div>
                    <div>&#8226; NEU: Vorschau markiert das Spiel des Tages mit Begruendung</div>
                    <div>&#8226; NEU: am Ende des Live-Action-Modus Schlagzeilen zu allen Spielen</div>
                    <div class="font-bold text-slate-400">v0.8.48 - 02.07.2026</div>
                    <div>&#8226; NEU: Echte historische Relegationen 1.BL/2.BL (1981/82-1990/91 & 2008/09-2024/25) in Relegations-Chronik, Bilanz und Steckbrief</div>
                    <div>&#8226; FIX: R-Badge/Relegations-Zone im Archiv beginnt korrekt 1981/82</div>
                    <div class="font-bold text-slate-400">v0.8.47 - 02.07.2026</div>
                    <div>&#8226; NEU: Mobile Tabellen - Vereinsname wird bei enger Spalte automatisch gekuerzt (Stadt bzw. klassisches Kuerzel wie DSC/KSC), voll wenn Platz</div>
                    <div>&#8226;  auch beim manuellen Spalten-Ziehen</div>
                    <div>&#8226; NEU: Kuerzel-Schema - M'Gladbach/K'lautern/Wuppertal, Initialen fuer <Stadt>er SC/SV/FC, Reserve-Teams erben (Bayern II), generische Kuerzel (SV/SC/FC) nie allein</div>
                    <div class="font-bold text-slate-400">v0.8.46 - 02.07.2026</div>
                    <div>&#8226; FIX: Union Berlin zeigt 1951/52-1952/53 korrekt als BSG Motor Oberschoeneweide (statt SG Union)</div>
                    <div>&#8226; NEU: Historische Tschammerpokal-Sieger (Dresdner SC, SK Rapid Wien, First Vienna FC) als klickbare und suchbare Vereine in der DFB-Pokal-Siegerliste</div>
                    <div class="font-bold text-slate-400">v0.8.45 - 02.07.2026</div>
                    <div>&#8226; FIX: 1. FC Magdeburg zeigt in Saisons 1963/64-1964/65 den epochenechten Namen SC Aufbau Magdeburg</div>
                    <div>&#8226; FIX: FC Energie Cottbus als BSG Energie Cottbus (1973/74-1989/90)</div>
                    <div>&#8226; FIX: 1. FC Lok Stendal als BSG Lokomotive Stendal (1950/51-1967/68)</div>
                    <div class="font-bold text-slate-400">v0.8.44 - 02.07.2026</div>
                    <div>&#8226; FIX: In der Suche erscheint jetzt jede historische Namensform eines Vereins (z.B. sowohl BSG Empor Lauter als auch SC Empor Rostock), nicht nur die erste</div>
                    <div class="font-bold text-slate-400">v0.8.43 - 02.07.2026</div>
                    <div>&#8226; FIX: Verein aus der Suche oeffnet jetzt den Steckbrief (vorher passierte bei ligalosen/historischen Vereinen nichts)</div>
                    <div>&#8226; NEU: Historische Vereinsnamen suchbar (z.B. Empor Rostock, Meidericher SV) und Steckbrief fuer ehemalige Vereine</div>
                    <div>&#8226; NEU: FDGB-Pokal-Siegerliste im DDR-Archiv mit Rekordsiegern</div>
                    <div class="font-bold text-slate-400">v0.8.42 - 02.07.2026</div>
                    <div>&#8226; FIX: Fruehe FDGB-Pokalsieger (Waggonbau Dessau, EHW Thale) korrekt ihren Vereinen zugeordnet - P-Abzeichen erscheint jetzt auch fuer diese Saisons</div>
                    <div class="font-bold text-slate-400">v0.8.41 - 02.07.2026</div>
                    <div>&#8226; NEU: FDGB-Pokalsieger als P-Abzeichen im DDR-Archiv (amtierender Pokalsieger je Saison 1949-1991)</div>
                    <div>&#8226; FIX: Chemnitzer FC zeigt epochenechte Namen (SC Motor / FC Karl-Marx-Stadt) in alten DDR-Saisons</div>
                    <div class="font-bold text-slate-400">v0.8.40 - 02.07.2026</div>
                    <div>&#8226; FIX: DDR-Oberliga zeigt epochenechte Vereinsnamen in alten Saisons</div>
                    <div>&#8226;  Nachfolger (Hansa, Carl Zeiss Jena, Rot-Weiss Erfurt, Hallescher FC, FSV Zwickau, Union Berlin, Erzgebirge Aue) erben ihre Fruehhistorie</div>
                    <div>&#8226; FIX: Leipzig-Vereinsgeschichte nach offiziellem 1.-FC-Lok-Stammbaum (Einheit Ost/Rotation/SC Leipzig = Lok-Stamm, SC Lokomotive eingegliedert)</div>
                    <div class="font-bold text-slate-400">v0.8.39 - 01.07.2026</div>
                    <div>&#8226; NEU: DDR-Oberliga jetzt vollstaendig 1949/50-1990/91 (42 Saisons) - fruehe Aera mit historischen Vereinen und epochenechten Namen (SC Dynamo Berlin, FC Berlin, 1. FC Dynamo Dresden)</div>
                    <div>&#8226; NEU: Verbandspokal-Plan-Import (VP-Plan) - strukturierter Verbandspokal statt Zufalls-KO, ladbar als JSON</div>
                    <div>&#8226; FIX: Leipzig-Doppelung im DDR-Archiv (SC Rotation Leipzig war mit SC Lokomotive Leipzig verschmolzen)</div>
                    <div class="font-bold text-slate-400">v0.8.38 - 28.06.2026</div>
                    <div>&#8226; NEU: DDR-Oberliga im Archiv - eigener historischer Track, 30 Saisons (1961/62-1990/91), ewige Tabelle + Meisterliste</div>
                    <div>&#8226; FIX: FC Vorwaerts der Historie dem Nachfolger 1. FC Frankfurt (Oder) zugeordnet (epochenechte Namen Berlin/Frankfurt)</div>
                    <div class="font-bold text-slate-400">v0.8.37 - 27.06.2026</div>
                    <div>&#8226; NEU: Liga-Pyramiden-Navleiste im Saison-Archiv (hoehere/aktuelle/tiefere Liga) wie in der laufenden Ansicht, navigierbar zwischen 1. und 2. Bundesliga</div>
                    <div>&#8226; NEU: Epochenechte Liga-Namen in der Historie - vor 1974 Regionalliga statt 2. Bundesliga, tiefer Amateurliga/Oberliga/Regionalliga/3. Liga je nach Epoche, in Navleiste und Auf-/Abstiegsspalte</div>
                    <div class="font-bold text-slate-400">v0.8.36 - 27.06.2026</div>
                    <div>&#8226; NEU: Saison-Archiv zeigt die Ligapyramiden-Struktur wie die laufende Tabelle - Auf-/Abstieg mit Ziel-Liga (Aufstieg 1. Bundesliga / Abstieg 2. Bundesliga / Relegation), datengetrieben aus dem echten Auf-/Abstieg, auch fuer Nord/Sued-Staffeln</div>
                    <div class="font-bold text-slate-400">v0.8.35 - 27.06.2026</div>
                    <div>&#8226; NEU: DFB-Pokalsieger 1935-2024/25 rueckwirkend in Pokal-Siegerliste & Rekordsieger-Rangliste (Bayern 20x)</div>
                    <div>&#8226; NEU: Tabellen-Badges in der Historie zeigen jetzt den Vorsaison-Status (amtierender Meister/Vize/Auf-/Absteiger/Pokalsieger) wie die laufende Tabelle, statt des Ergebnisses der angezeigten Saison</div>
                    <div class="font-bold text-slate-400">v0.8.34 - 27.06.2026</div>
                    <div>&#8226; NEU: Saison-Archiv zeigt Tabellen-Badges M/V/N/A (Meister/Vize/Auf-/Absteiger) aus echtem Saisonvergleich + Auf-/Abstiegs-/Relegationsfarben statt nur Meisterstern</div>
                    <div>&#8226; NEU: Tote Vereine ihren Nachfolgern zugeordnet (TuS Schloss Neuhaus->SC Paderborn 07, BV 08 Luettringhausen->FC Remscheid, DJK Guetersloh->FC Guetersloh) - ewige Tabelle/Steckbrief erben die Historie, Originalname bleibt in der alten Saison</div>
                    <div class="font-bold text-slate-400">v0.8.33 - 27.06.2026</div>
                    <div>&#8226; FIX: Gegentore/Tordifferenz in allen historischen Saisons korrigiert (unsichtbare Wikipedia-Fuellzeichen hatten Werte verfaelscht)</div>
                    <div>&#8226; NEU: 2. Bundesliga Nord/Sued-Doppelstaffeln 1974/75-1980/81 + 1991/92 (zwei Tabellen, beide Gruppensieger)</div>
                    <div>&#8226; NEU: 2. Bundesliga jetzt komplett 1974/75-2024/25 (51 Saisons), zurueckgezogene Vereine korrekt dargestellt</div>
                    <div class="font-bold text-slate-400">v0.8.32 - 27.06.2026</div>
                    <div>&#8226; NEU: Historische Abschlusstabellen 1963/64-2024/25 fuer 1. & 2. Bundesliga (104 Saisons) in ewiger Tabelle, Titelzaehlung, Meister-Chronik & Saison-Archiv</div>
                    <div>&#8226; NEU: Originale Era-Vereinsnamen (Meidericher SV etc.) und aufgeloeste Altvereine (SG Union Solingen u.a.) je Saison</div>
                    <div class="font-bold text-slate-400">v0.8.31 - 27.06.2026</div>
                    <div>&#8226; NEU: Echte Bundesliga-Historie 1963/64 bis 1986/87 fliesst in ewige Tabelle, Titelzaehlung, Meister-Chronik und Archiv-Saisonansicht ein</div>
                    <div>&#8226; NEU: Historische Vereinsnamen je Saison in der Archiv-Ansicht (z.B. Meidericher SV statt MSV Duisburg, Bayer 05 Uerdingen, SC Tasmania 1900 Berlin)</div>
                    <div>&#8226; FIX: Historische Meistertitel werden in der ewigen Tabelle jetzt korrekt gezaehlt</div>
                    <div class="font-bold text-slate-400">v0.8.30 - 25.06.2026</div>
                    <div>&#8226; PERF: Auch der Saisonwechsel ruckelt nicht mehr - die (groesste) Komprimierung von Historie und Archiv laeuft jetzt im Hintergrund-Thread (Web Worker), der Hauptthread blockiert nur noch ~145ms statt ~2300ms</div>
                    <div>&#8226; TECH: Worker-Komprimierung bit-identisch zu LZString (round-trip-verifiziert), synchroner Fallback fuer Browser ohne Worker-Unterstuetzung</div>
                    <div class="font-bold text-slate-400">v0.8.29 - 25.06.2026</div>
                    <div>&#8226; PERF: Wochen-/Spieltag-Simulation laggt nach langen Multi-Sims nicht mehr - der Spielstand wird pro Spieltag nicht mehr komplett neu komprimiert (Historie + Archiv nur noch beim Saisonwechsel gespeichert). ~14x schneller und konstant, egal wie viele Saisons simuliert wurden</div>
                    <div>&#8226; TECH: getrennte Speicher-Keys fuer laufende Saison vs. Historie/Archiv</div>
                    <div>&#8226;  bestehende Spielstaende werden beim Laden automatisch und verlustfrei migriert</div>
                    <div>&#8226;  Export/Import bleibt eine Datei</div>
                    <div class="font-bold text-slate-400">v0.8.28 - 24.06.2026</div>
                    <div>&#8226; NEU: Multi-Simulation zeigt den Fortschritt Saison fuer Saison (mit aktueller Saison) statt in 5er-Bloecken</div>
                    <div>&#8226; PERF: Multi-Sim konstant schnell - Spielstand wird waehrend des Laufs nicht mehr jede Saison neu komprimiert (Slowdown bei Langzeit-Sims behoben, ~24x</div>
                    <div>&#8226;  582 Saisons in ~45s getestet)</div>
                    <div>&#8226; NEU: Ergebnis-Zusammenfassung am Ende - Saisons, Tempo und Meister der 1. und 2. Bundesliga im Zeitraum (anklickbar)</div>
                    <div class="font-bold text-slate-400">v0.8.27 - 24.06.2026</div>
                    <div>&#8226; NEU: Saison-Auswahl und Zurueckblaettern umfassen ALLE Saisons - historische (ab 1963/64) und alle simulierten, auch ueber 50 zurueck</div>
                    <div>&#8226; NEU: Archivierte Saison zeigt die Abschlusstabelle (Punkte epochenecht: 2-Punkte vor 1995/96), Klick auf Verein -> Steckbrief</div>
                    <div>&#8226; NEU: Saison-Historie im Vereins-Steckbrief vollstaendig statt auf 50 begrenzt - waechst dauerhaft mit</div>
                    <div>&#8226; TECH: volle Abschlusstabellen je Saison/Liga in IndexedDB (Fallback auf lokalen Speicher bei blockiertem IDB)</div>
                    <div class="font-bold text-slate-400">v0.8.26 - 23.06.2026</div>
                    <div>&#8226; NEU: Historische Abschlusstabellen fliessen in die ewige Tabelle und Titelzaehlung ein (Start: 1. Bundesliga 1963/64) - 3-Punkte-normalisiert, historischer Meister bleibt erhalten</div>
                    <div>&#8226;  volle Meister-Chronik in IndexedDB. Weitere Saisons folgen als Daten-Nachtraege</div>
                    <div class="font-bold text-slate-400">v0.8.25 - 23.06.2026</div>
                    <div>&#8226; FIX: Bei blockiertem IndexedDB (z.B. Firefox-Privatmodus) faellt die Chronik-Anzeige sauber auf den lokalen Speicher zurueck - kein Haenger, keine Fehler</div>
                    <div>&#8226; FIX: Langzeit-Simulationen markieren IndexedDB nicht mehr faelschlich als blockiert (Timeout-Race entfernt)</div>
                    <div class="font-bold text-slate-400">v0.8.24 - 23.06.2026</div>
                    <div>&#8226; NEU: Komplette Meister-/Relegations-Chronik in IndexedDB (praktisch unbegrenzt) - Sieger-/Relegations-Ansicht laden die volle Saison-fuer-Saison-Historie, Spielstand bleibt klein und schnell</div>
                    <div>&#8226; NEU: Saison-Historie im Vereins-Steckbrief ist jetzt kompakt seitenweise (12 pro Seite) - Pokal-Verlauf und Testspiele ruecken wieder direkt darunter</div>
                    <div class="font-bold text-slate-400">v0.8.23 - 22.06.2026</div>
                    <div>&#8226; FIX: Sehr lange Sims luden/speicherten langsam, weil die Meister-/Relegations-Chronik unbegrenzt wuchs - jetzt auf die letzten 100 Saisons begrenzt</div>
                    <div>&#8226; WICHTIG: Ewige Tabelle, Titelzahlen und Relegationsbilanz bleiben weiterhin vollstaendig und dauerhaft (nur die Saison-fuer-Saison-Detailliste ist auf 100 begrenzt)</div>
                    <div class="font-bold text-slate-400">v0.8.22 - 22.06.2026</div>
                    <div>&#8226; NEU: Spielstand wird komprimiert gespeichert (ca. 9x kleiner) - die komplette Meister-/Relegations-Chronik bleibt auch ueber viele Jahrhunderte erhalten, ohne den Speicher zu sprengen</div>
                    <div>&#8226; NEU: Alte Spielstaende und Backups laden weiterhin und migrieren automatisch</div>
                    <div>&#8226;  Export bleibt lesbares JSON</div>
                    <div class="font-bold text-slate-400">v0.8.21 - 22.06.2026</div>
                    <div>&#8226; FIX: Spielstand wird bei vollem Speicher nicht mehr geloescht - stattdessen wird die aelteste Archiv-Chronik gekuerzt, Summen (ewige Tabelle/Titel/Relegationsbilanz) bleiben dauerhaft (behebt 'Cache bei jedem Neuladen geleert' auf Mobil/PWA)</div>
                    <div>&#8226; NEU: Relegations-Ansicht zeigt auf dem Handy kurze Vereinsnamen (Stadt/Kurzform, z.B. Bayern, 1860, Union, Hertha)</div>
                    <div class="font-bold text-slate-400">v0.8.20 - 22.06.2026</div>
                    <div>&#8226; FIX: Relegations-Ansicht zeigt Herkunftsligen als kompakte Kuerzel (1. BL, 2. BL, RL ...) - mobil kein Quetschen mehr</div>
                    <div>&#8226; NEU: Vereinsnamen im Ergebnis-Feed (Live/Ergebnisse/Vorschau) anklickbar -> Vereins-Steckbrief</div>
                    <div class="font-bold text-slate-400">v0.8.19 - 22.06.2026</div>
                    <div>&#8226; FIX: Sieger- und Relegations-Ansicht auf dem Handy - Rangliste/Bilanz stapelt jetzt unter die Liste statt die Spalte zu zerquetschen (kein Ueberlappen von Name und Ergebnis mehr)</div>
                    <div class="font-bold text-slate-400">v0.8.18 - 22.06.2026</div>
                    <div>&#8226; NEU: Dauerhaftes Geschichts-Archiv - ewige Tabelle, Titel, Vereins-Karriere und Meister-Chronik bleiben ueber 50 Saisons hinaus vollstaendig erhalten (kein Vergessen bei Jahrhundert-Sims)</div>
                    <div>&#8226; NEU: Relegations-Uebersicht je Liga (Tab) mit Teilnehmern, Herkunftsliga, Siegern pro Saison und All-Time-Bilanz (Teilnahmen/gewonnen/verloren)</div>
                    <div>&#8226; NEU: Relegationsbilanz auch im Vereins-Steckbrief</div>
                    <div>&#8226; FIX: Altspielstaende erhalten ihr Archiv per Backfill aus den letzten 50 Saisons</div>
                    <div class="font-bold text-slate-400">v0.8.17 - 22.06.2026</div>
                    <div>&#8226; NEU: Vereinsliste pro Region - in der Karte ueber Button 'Liste', ausserhalb ueber Region-Chips im Vereins-Steckbrief, sortierbar nach Liga oder Staerke</div>
                    <div>&#8226; NEU: Region-Chips im Steckbrief sind verlinkt</div>
                    <div>&#8226; FIX: Sortierung 'Nach Liga' gruppiert gleichrangige Ligen jetzt korrekt statt sie zu vermischen</div>
                    <div class="font-bold text-slate-400">v0.8.16 - 21.06.2026</div>
                    <div>&#8226; NEU: Uebersicht 'Ligalose Vereine' (261 Vereine ohne Liga, nach Region gruppiert, Sortierung Region/Name) - Eintrag unten in der Liga-Seitenleiste</div>
                    <div class="font-bold text-slate-400">v0.8.15 - 21.06.2026</div>
                    <div>&#8226; NEU: FSG Bous in hochaufgeloester Version</div>
                    <div>&#8226;  SC Oberweikertshofen + SV Ruchheim in HD</div>
                    <div class="font-bold text-slate-400">v0.8.14 - 21.06.2026</div>
                    <div>&#8226; FIX: FSG Bous Wappen entrauscht und hochskaliert (kein HD-Original verfuegbar)</div>
                    <div class="font-bold text-slate-400">v0.8.13 - 21.06.2026</div>
                    <div>&#8226; NEU: 17 Vereinswappen in HD ersetzt (u.a. Inter Tuerkspor Kiel, FC Auggen, Ahrweiler BC, Kaltenkirchen, FV Schwalbach)</div>
                    <div class="font-bold text-slate-400">v0.8.12 - 21.06.2026</div>
                    <div>&#8226; FIX: 65 Vereine auf der Karte entstapelt - praezise Stadion-/Bezirkskoordinaten statt geteiltem Stadtzentrum (Berlin, Hannover, Kaiserslautern u.v.m.)</div>
                    <div class="font-bold text-slate-400">v0.8.11 - 21.06.2026</div>
                    <div>&#8226; FIX: Wappen-Dateien nach Landesverband sortiert (interne Struktur, eine Datei pro Verein)</div>
                    <div class="font-bold text-slate-400">v0.8.10 - 21.06.2026</div>
                    <div>&#8226; FIX: Transparenz/Passform vieler Wappen (Saar 05, Empor, Henstedt, Hoehr, Wissen, Biemenhorst u.a.)</div>
                    <div>&#8226; NEU: TSV Gruenwald offizielles Logo</div>
                    <div>&#8226; FIX: 1. FC 08 Hassloch echtes Wappen statt VfB</div>
                    <div class="font-bold text-slate-400">v0.8.9 - 21.06.2026</div>
                    <div>&#8226; NEU: 182 hochaufloesende Vereinswappen statt verpixelter ~50px-Logos</div>
                    <div>&#8226; FIX: Transparenz/Freistellung vieler Wappen (Box-Hintergrund, Loecher, Fetzen)</div>
                    <div class="font-bold text-slate-400">v0.8.8 - 20.06.2026</div>
                    <div>&#8226; FIX: VfB Merseburg Wappen ohne IMO</div>
                    <div>&#8226; FIX: TSV Berg korrektes Wappen (Wuerttemberg)</div>
                    <div>&#8226; FIX: HSC Hannover korrektes Wappen</div>
                    <div>&#8226; NEU: Wappen Idar-Oberstein/Neubrandenburg/Germania Metternich/Arminia Hannover (hochaufgeloest)</div>
                    <div>&#8226; FIX: Regionalliga Suedwest Logo transparent</div>
                    <div class="font-bold text-slate-400">v0.8.7 - 20.06.2026</div>
                    <div>&#8226; NEU: 5 weitere Vereine auf praezise europlan-Stadionkoordinaten (Trier-Tarforst, Biberach, Alemannia Aachen, Fortuna Duesseldorf I+II)</div>
                    <div class="font-bold text-slate-400">v0.8.6 - 20.06.2026</div>
                    <div>&#8226; FIX: Eintracht Wald-Michelbach auf eigene Koordinate zurueckgesetzt - SG Wald-Michelbach ist ein anderer Verein</div>
                    <div class="font-bold text-slate-400">v0.8.5 - 20.06.2026</div>
                    <div>&#8226; NEU: 39 weitere Vereine auf praezise europlan-Stadionkoordinaten (handkuratiert, Regions-Guard)</div>
                    <div>&#8226;  FIX: FC Bayern II auf FC Bayern Campus statt Allianz-Arena</div>
                    <div>&#8226;  FIX: Hamburger Turnerschaft Gruendungsjahr 1916->1816 + Legienstrasse</div>
                    <div>&#8226;  FIX: Dublette HT 16 Hamburg entfernt (1265->1264 Teams)</div>
                    <div>&#8226;  NEU: Tool apply_manual_coords.cjs</div>
                    <div class="font-bold text-slate-400">v0.8.4 - 19.06.2026</div>
                    <div>&#8226; NEU: 43 Vereine auf praezise europlan-Stadionkoordinaten gehoben (Distanz- + Regions-Guard)</div>
                    <div>&#8226; FIX: Vorderpfalz-Geisterzuordnung in Hilfsdaten (Bad Kreuznach II, Ruessingen, Langenlonsheim, Schopp, TSG Kaiserslautern)</div>
                    <div class="font-bold text-slate-400">v0.8.3 - 19.06.2026</div>
                    <div>&#8226; FIX: Suedwest-Bezirksligen strikt nach offiziellem Bezirk statt Geo-Mischung - jeder Verein in seiner richtigen Staffel</div>
                    <div>&#8226;  Soll-Groessen an Vereinszahl angepasst (Nahe naturgemaess klein, Vorderpfalz voll)</div>
                    <div>&#8226; FIX: Berlin-Landesligen mischen Vereine nicht mehr jede Saison zwischen den Staffeln (feste Heimatstaffel) - saubere ewige Tabelle, Staffeln bleiben dennoch ausgeglichen</div>
                    <div>&#8226; NEU: Tag-Report-Button - findet Vereine, deren Bezirks-Tag nicht zur Liga passt (faengt Nachbar-Region-Fehler die der km-Geo-Check uebersieht)</div>
                    <div>&#8226; FIX: 4 falsche Vereins-Regionen korrigiert (Kaiserslautern/Schopp -> Westpfalz, Langenlonsheim/Bad Kreuznach II -> Nahe)</div>
                    <div class="font-bold text-slate-400">v0.8.2 - 19.06.2026</div>
                    <div>&#8226; FIX: Geo-Routing - Nord/Ost-Reserveteams landen nicht mehr faelschlich in Suedwest-Bezirksligen (Reserve-Cascade Heimat-Boden-Sperre + Reparatur bereits fehlplatzierter)</div>
                    <div>&#8226; FIX: Liga-Logo+Name auf dem Handy nicht mehr verdeckt - Spieltag-Navigation in eigener Zeile (zweizeiliger Header)</div>
                    <div class="font-bold text-slate-400">v0.8.1 - 19.06.2026</div>
                    <div>&#8226; FIX: Liga-Logo im Header wird auf schmalen Screens nicht mehr verdeckt (Name kuerzt per Ellipsis)</div>
                    <div>&#8226; NEU: Geo-Check-Button in Save-Bar - findet fehlgeroutete Vereine (>250km vom Liga-Schwerpunkt) mit Heimat-Liga + JSON-Export</div>
                    <div class="font-bold text-slate-400">v0.8.0 - 19.06.2026</div>
                    <div>&#8226; NEU: Echter Saison-Kalender - Spieltage mit echten Daten (Fr-So-Spanne), Winterpause, gestaffelt ueber Aug-Mai</div>
                    <div>&#8226;  Anzeige in Header und Spieltag-Picker</div>
                    <div>&#8226; NEU: Liga-Groessen-Fenster mit JSON-Export (Clipboard + Textarea, handytauglich)</div>
                    <div>&#8226; FIX: Langzeit-Performance - History im Speicher auf 50 Saisons gekappt, ms/Saison bleibt konstant</div>
                    <div class="font-bold text-slate-400">v0.7.10 - 19.06.2026</div>
                    <div>&#8226; NEU: Jede Liga hat eigene Min/Max-Groesse (game_data, real verankert per Mehr-Saison-Recherche aller Ober-/Regionalligen)</div>
                    <div>&#8226; NEU: NOFV-Oberligen fix 16, Niedersachsen/Bez-Vorderpfalz Soll 16</div>
                    <div>&#8226; NEU: Liga-Groessen-Tabelle zeigt Band (Min-Max) und faerbt Ligen ausserhalb ihres Bands</div>
                    <div>&#8226; FIX: Stabiles Liga-Groessen-Band ueber 1750 Saisons verifiziert - Obergrenze via varDn, Untergrenze via Schrumpfschutz, keine Drift mehr</div>
                    <div>&#8226; FIX: Boden-Klammer - geo-duenne Staffeln fallen nie unter 8 Teams</div>
                    <div class="font-bold text-slate-400">v0.7.9 - 18.06.2026</div>
                    <div>&#8226; NEU: Rumpf-Ligen bekommen dynamisch mehr Runden (3-5 statt nur Hin/Rueck) -> ~30-38 Spieltage, kein fruehes Idlen mehr</div>
                    <div>&#8226;  jeder gegen jeden gleich oft, je Saison nach Teamzahl</div>
                    <div>&#8226; FIX: Ligen schrumpfen nie unter 8 Teams (vorher konnten 6er-Ligen entstehen) - ueberschuessige Auf-/Abstiege werden ausgesetzt</div>
                    <div class="font-bold text-slate-400">v0.7.8 - 18.06.2026</div>
                    <div>&#8226; NEU: DFB-Pokal laeuft jetzt auch als Live-Konferenz (Di/Mi, mit Verlaengerung + Elfmeterschiessen im Ticker)</div>
                    <div>&#8226; NEU: Auto-Skip ueberspringt Leerzeit (nur wenn kein Spiel laeuft) + Sofort-durchrechnen-Knopf</div>
                    <div>&#8226; NEU: Lieblingsverein (Stern) wird in jeder Konferenz oben angepinnt</div>
                    <div>&#8226;  jedes Spiel antippbar fuer Tor-Verlauf</div>
                    <div class="font-bold text-slate-400">v0.7.7 - 18.06.2026</div>
                    <div>&#8226; NEU: Action-Modus Tiefe 'Live' - Echtzeit-Konferenz im Vollbild: Spielminuten laufen in Sekunden (Speed 1x-10x + Sofort), echte Uhrzeit, Spiele versetzt parallel nach Anstosszeit (2.BL bei 80' waehrend 1.BL erst anpfeift), Tor-Ticker + Live-Staende</div>
                    <div>&#8226;  reload-fest</div>
                    <div class="font-bold text-slate-400">v0.7.6 - 18.06.2026</div>
                    <div>&#8226; NEU: Beim Spielen blitzen neue Ergebnisse dezent auf (im Action-Modus nur das gerade gespielte Slot) + Teams mit Platzwechsel kurz gruen/rot markiert</div>
                    <div>&#8226; FIX: Archiv-Saison zeigte falsche Abstiegs-Ziele (falsche Oberligen) - jetzt korrektes Routing</div>
                    <div>&#8226; FIX: Karten-Region-Dropdown im Light-Theme war schwarz auf schwarz - jetzt lesbar</div>
                    <div>&#8226; FIX: schmale Sidebar - Theme-/Karten-Button laufen nicht mehr ueber (Titel kuerzt sich)</div>
                    <div class="font-bold text-slate-400">v0.7.5 - 17.06.2026</div>
                    <div>&#8226; FIX: Wappen laden 'lazy' (nur was sichtbar ist) - verhindert Request-Ansturm beim lokalen Testen und beschleunigt die Mobil-Ansicht</div>
                    <div class="font-bold text-slate-400">v0.7.4 - 17.06.2026</div>
                    <div>&#8226; NEU: Action-Modus Tiefe 'Halbzeit' (Liga 2-teilig, DFB-Pokal 2-5 Teile mit Verlaengerung + Elfmeterschiessen, echter Schuetzen-Stand z.B. '4:2 i.E.')</div>
                    <div>&#8226; NEU: Undo-Pfeil (orange) im Kopf - letzten Spieltag rueckgaengig mit Bestaetigung, statt Reset-Center</div>
                    <div>&#8226; FIX: Button-Klicks springen nicht mehr nach oben (Scroll bleibt), Aenderung sofort in Liga und Pokal sichtbar</div>
                    <div class="font-bold text-slate-400">v0.7.3 - 17.06.2026</div>
                    <div>&#8226; NEU: Standings-Spaltenbreiten frei ziehbar (Mannschaft, Sp/G/U/V, Tore, Diff, Pkt, Form, Auf-/Abstiegs-Info) - global fuer alle Ligen, Doppeltipp auf den Griff setzt auf Standard</div>
                    <div>&#8226; FIX: Mannschaft mobil ueber das bisherige Breitenlimit hinaus skalierbar</div>
                    <div class="font-bold text-slate-400">v0.7.2 - 17.06.2026</div>
                    <div>&#8226; NEU: Action-Modus Tiefe umschaltbar (Tag ODER Uhrzeit) mit realen Anstosszeiten, gemeinsame Zeitachse ueber alle Ligen, Pokal Di/Mi 18:30+20:45</div>
                    <div>&#8226; NEU: Spiel-Feed oben (Ergebnisse+Vorschau) hoehenverstellbar per Drag - Mittelding zwischen eingeklappt und alles sichtbar (Doppelklick=alles)</div>
                    <div>&#8226; NEU: Liga-Liste im Action-Menue per Drag hoehenverstellbar</div>
                    <div class="font-bold text-slate-400">v0.7.1 - 17.06.2026</div>
                    <div>&#8226; FIX: Spielplan bleibt nach Browser-Reload fest (Saison-Seed) - kein Neuwuerfeln der Restpaarungen mehr</div>
                    <div>&#8226; FIX: jedes Vereinspaar spielt garantiert genau 2x pro Saison (vorher konnten nach Reload 3 Begegnungen entstehen)</div>
                    <div class="font-bold text-slate-400">v0.7.0 - 16.06.2026</div>
                    <div>&#8226; NEU: Action-Modus (...-Menue): Spieltage in Wochentage Fr/Sa/So, Scope frei pro Liga + DFB-Pokal (Dienstag/Mittwoch)</div>
                    <div>&#8226; NEU: Vorschau noch nicht gespielter Spiele je Liga, im Action-Modus nach Wochentag gruppiert</div>
                    <div>&#8226; FIX: DFB-Pokal zeigt Teilergebnisse pro Tag (nicht alles auf einmal) und aktualisiert sich sofort</div>
                    <div>&#8226; FIX: Action-Modus laeuft laufenden Spieltag sauber zu Ende, Scope-Wechsel wirkt ab naechstem Spieltag</div>
                    <div class="font-bold text-slate-400">v0.6.0 - 16.06.2026</div>
                    <div>&#8226; NEU: Form-Spalte (Ampel letzte 5 Spiele vor dem Spieltag) hinter den Punkten</div>
                    <div>&#8226; NEU: Spieltag-Ergebnisse oben als Liste untereinander mit Mini-Wappen</div>
                    <div>&#8226; NEU: Mobil alle Stat-Spalten + Form, Auf-/Abstiegs-Info kompakt (Pfeil+Liga-ID, tippen zeigt Liganame)</div>
                    <div>&#8226; NEU: Sidebar-Badge vereint Ligastufe + Liga-ID, eng geschnitten = mehr Platz fuer Namen</div>
                    <div>&#8226; FIX: Tabellenkopf enger, Statspalten zentriert</div>
                    <div class="font-bold text-slate-400">v0.5.19 - 16.06.2026</div>
                    <div>&#8226; NEU: Sidebar-Breite per Drag-Griff frei einstellbar (Maus+Touch, gemerkt)</div>
                    <div>&#8226; NEU: Sidebar kuerzt lange Liganamen 3-stufig & responsiv (voll -> Typ-Tag RL/LL/OL -> Region-Kuerzel), einheitlich pro Level, Region pro Verein so voll wie moeglich</div>
                    <div>&#8226; FIX: Liga-Namen brechen nicht mehr um (Ellipsis + Kuerzel statt Abschneiden)</div>
                    <div class="font-bold text-slate-400">v0.5.18 - 16.06.2026</div>
                    <div>&#8226; Mobil: auf breiten Touch-Viewports (z.B. Opera-PWA ~900px) wird der Inhalt zur zentrierten 600px-Spalte - kein auseinandergezogenes Desktop-Layout mehr</div>
                    <div>&#8226; Mobil: Tabelle voll responsiv - alle Spalten (G/U/V/Tore/Diff/Pkt) ab 360px Breite ohne Scrollen, unter 360px kompakt (Pl/Wappen/Team/Sp/Diff/Pkt)</div>
                    <div class="font-bold text-slate-400">v0.5.17 - 15.06.2026</div>
                    <div>&#8226; FIX Mobil: Pull-to-Refresh weniger empfindlich - hoehere Schwelle + kurz halten</div>
                    <div>&#8226; FIX Mobil: Touch-Geraete bekommen immer Mobil-Layout (kein versehentliches Desktop im PWA, auch Hochformat)</div>
                    <div>&#8226; FIX Mobil: Tabelle zeigt Pkt-Spalte wieder - kompakte Spalten (Pl/Wappen/Team/Sp/Diff/Pkt), Name gekuerzt</div>
                    <div>&#8226; FIX Mobil: Pokal-Teilnehmerfeld Topf-Label verrutscht nicht mehr</div>
                    <div>&#8226; NEU: Saisonstart-Tabelle und Teilnehmerfeld nach Vorsaison-Platzierung sortiert - Aufsteiger stehen unten (wie 16.)</div>
                    <div class="font-bold text-slate-400">v0.5.16 - 15.06.2026</div>
                    <div>&#8226; FIX: Sanitize beim Laden/Import vollstaendig - tsView und transiente Engine-Felder (migrations/relegationResults/matchdayResults/leagueStats) werden zurueckgesetzt, Import ohne Reload startet sauber</div>
                    <div>&#8226; FIX: alter Spielstand ohne neue Felder laedt mit sicheren Defaults</div>
                    <div class="font-bold text-slate-400">v0.5.15 - 15.06.2026</div>
                    <div>&#8226; NEU: Multi-Sim ohne 500er-Cap - leer/0 laeuft bis zum Abbruch (Exception, nicht heilbare Ligastruktur oder Abbruch-Button)</div>
                    <div>&#8226; NEU: Wappen-Harmonie ueberall - feste Box + object-fit:contain (Seitenleiste-Ligalogos, Pokal/Teilnehmerfeld, Testspiele, Steckbrief)</div>
                    <div>&#8226; FIX: Mittelrhein- und SHFV-Logo weisse Scheibe hinterlegt - aeusserer Textring jetzt auch im Dark-Theme sichtbar</div>
                    <div>&#8226; FIX: Wappen TuS Bersenbrueck (war faelschlich Erndtebrueck), HSV weisser Randstreifen entfernt, Arminia Hannover Loch im A transparent</div>
                    <div class="font-bold text-slate-400">v0.5.14 - 15.06.2026</div>
                    <div>&#8226; FIX: Meister/Vize/Relegation-Badge erst bei ausgespielter Saison (kein falsches M an Tag 0)</div>
                    <div>&#8226; NEU: Testspiele laufen automatisch (Saisonstart + nach Spieltag 17), Button entfernt</div>
                    <div>&#8226;  Nachbar-Cache haelt Multi-Sim schnell</div>
                    <div>&#8226; NEU: Letzte 5 Saisons komplett gespeichert - alle Spieltage UND Testspiele (normal wie Multi-Sim)</div>
                    <div>&#8226;  archivierte Saisons voll navigierbar inkl. Testspiel-Pseudo-Spieltage</div>
                    <div class="font-bold text-slate-400">v0.5.13 - 15.06.2026</div>
                    <div>&#8226; NEU: Testspiele gegen Koordinaten-Nachbarn (50km Umkreis) - nur 1.-3. Liga, 3 pro Verein, keine 2. Mannschaften</div>
                    <div>&#8226; NEU: Testspiel-Button (vor 1. Spieltag = Sommer, Tag 17 = Winter)</div>
                    <div>&#8226;  Pseudo-Spieltag im Spieltag-Picker mit Liga-Paarungen (Heim/Auswaerts)</div>
                    <div>&#8226; NEU: Steckbrief-Abschnitt TESTSPIELE mit Historie - Gegner aus jeder Liga inkl. ligalose Vereine (Staerke-Fallback)</div>
                    <div class="font-bold text-slate-400">v0.5.12 - 14.06.2026</div>
                    <div>&#8226; NEU: Steckbrief zeigt Erfolge-Chips (Meister/Vize/Aufstiege/DFB-Pokalsiege/Pokalfinals/Verbandspokalsiege)</div>
                    <div>&#8226; NEU: DFB-Pokal echte Lostoepfe - Topf 1/2 nach Staerke (kein Nord/Sued), eigener Lostoepfe-Tab + Topf-Badge</div>
                    <div>&#8226; NEU: Pokal-Teilnehmerfeld nach Qualifikationsgrund gruppiert (BL/2.BL/3.Liga/Landesverbaende je Verband), Liga seitlich am Verein</div>
                    <div class="font-bold text-slate-400">v0.5.11 - 14.06.2026</div>
                    <div>&#8226; NEU: Steckbrief kompakter - schmaleres Modal (440px), engerer Kopf und Zeilen</div>
                    <div>&#8226; NEU: Saison-Historie feste Spalten (Jahr|Liga|Platzierung) + Badges Meister/Aufstieg/Abstieg/Relegation/Pokal</div>
                    <div>&#8226; NEU: P-Badge fuer DFB-Pokalsieger pro Saison</div>
                    <div>&#8226; FIX: Pokal-Verlauf ohne Riesenluecke</div>
                    <div>&#8226; FIX: Wappen Sportfreunde Eisbachtal korrigiert</div>
                    <div class="font-bold text-slate-400">v0.5.10 - 14.06.2026</div>
                    <div>&#8226; FIX: Wappen in Tabellen einheitliche feste Box (40x32) - breite Wappen sprengen die Spalte nicht mehr, Namen bleiben buendig, keine dominanten Einzelwappen</div>
                    <div class="font-bold text-slate-400">v0.5.9 - 14.06.2026</div>
                    <div>&#8226; FIX: HT 16 Hamburg richtiges Wappen</div>
                    <div>&#8226;  FC Auggen Backing entfernt</div>
                    <div>&#8226;  Konstanz-Wollmatingen sauberer Kreis</div>
                    <div>&#8226; FIX: VfR Katschenreuth, SF Neitersen (Fussball-Weiss), SG Laufeld/Buchholz/Wallscheid hochaufloesend</div>
                    <div>&#8226;  FC Rastpfuhl Emblem+Text-Layout</div>
                    <div>&#8226; NEU: wappen_doctor circle-Strategie + aufloesungsskaliertes Kanten-Anti-Aliasing</div>
                    <div>&#8226; FIX: Tabelle - Wappen eigene Spalte direkt am Vereinsnamen, Mannschaft-Header ueber Namen, Abstaende gestrafft</div>
                    <div class="font-bold text-slate-400">v0.5.8 - 14.06.2026</div>
                    <div>&#8226; FIX: HT 16 Hamburg richtiges Wappen (Wikimedia)</div>
                    <div>&#8226; FIX: SG Laufeld/Buchholz/Wallscheid + SC Konstanz-Wollmatingen hochaufloesend, Hintergrund/Kasten entfernt</div>
                    <div>&#8226; FIX: 11 niedrig aufgeloeste Wappen hochaufloesend neu (fupa): Hoehr-Grenzhausen, Konz, Emmelshausen, Baumberg, Neubrandenburg, Biemenhorst, Melle, Charlottenburg, Hiltrup, Mondorf, Lupo Martini</div>
                    <div>&#8226; NEU: Backing-Kanten weichgezeichnet, 76 uebergrosse Wappen auf 240px geglaettet (~12 MB kleiner)</div>
                    <div>&#8226; FIX: Saar Saarbruecken Luftloch transparent, Gruenwald ohne Halo-Ring</div>
                    <div class="font-bold text-slate-400">v0.5.7 - 14.06.2026</div>
                    <div>&#8226; FIX: Weisse Kasten-Hintergruende entfernt (Mondorf, Hiltrup, Essingen) - geformtes Backing statt Quadrat</div>
                    <div>&#8226; NEU: wappen_doctor unbox-Strategie (Kasten -> konvexe Huelle)</div>
                    <div>&#8226; FIX: Wappen in Tabellen mittig im Slot statt rechtsbuendig</div>
                    <div class="font-bold text-slate-400">v0.5.6 - 14.06.2026</div>
                    <div>&#8226; NEU: Wappen-Doktor (tools/wappen_doctor.py) - Sticker-Backing behebt durchscheinende Transparenz im Dark-Theme</div>
                    <div>&#8226; FIX: ~97 Wappen korrigiert (Landsberg, Gruenwald, Henstedt, Wormatia u.a.)</div>
                    <div>&#8226; FIX: TuS Moerschied - neues sauberes Wappen statt gruenem Kasten</div>
                    <div>&#8226; NEU: Wappen seitenverhaeltnis-treu + rechtsbuendige Slot-Spalte - Vereinsnamen buendig, breite Wappen (Union) schrumpfen nicht mehr</div>
                    <div>&#8226; FIX: LL Bayern Suedost -> LL Bayern SO</div>
                    <div class="font-bold text-slate-400">v0.5.5 - 14.06.2026</div>
                    <div>&#8226; FIX: realistische Pokal-Ergebnisse - Poisson-Tor-Modell</div>
                    <div>&#8226;  Kantersiege (6:0, 7:1) bleiben bei klarem Favoriten moeglich, aber keine beidseitig-hohen Basketball-Ergebnisse mehr</div>
                    <div>&#8226;  bei Augenhoehe enge Spiele</div>
                    <div>&#8226; NEU: Verlaengerung - Remis nach 90 Min wird in Verlaengerung (n.V.) oder Elfmeterschiessen (n.E.) entschieden, sichtbar in Ergebnisliste, Bracket und Steckbrief</div>
                    <div class="font-bold text-slate-400">v0.5.5 - 14.06.2026</div>
                    <div>&#8226; FIX: realistische Pokal-Ergebnisse - Poisson-Tor-Modell (Ø ~3 Tore, meist 0-3 pro Team) statt bizarrer Kantersiege wie 1:8</div>
                    <div>&#8226; NEU: Verlaengerung - Remis nach 90 Min wird in der Verlaengerung (n.V.) oder im Elfmeterschiessen (n.E.) entschieden, sichtbar in Ergebnisliste, Bracket und Steckbrief</div>
                    <div class="font-bold text-slate-400">v0.5.4 - 14.06.2026</div>
                    <div>&#8226; NEU: Teilnehmerfeld zeigt Qualifikation als Badge (BL / 2.BL / Top-4 3.Liga / Verbandspokal je Verband)</div>
                    <div>&#8226; NEU: Heimrecht fuer den unterklassigen Verein in 1. und 2. Runde (echte Pokal-Regel)</div>
                    <div>&#8226; NEU: realistische Pokalsensationen - rundenabhaengige Upset-Wahrscheinlichkeit (frueh mehr, spaet Favoriten verlaesslich)</div>
                    <div>&#8226; NEU: Elfmeterschiessen sichtbar als n.E. in Ergebnisliste, Bracket und Steckbrief</div>
                    <div>&#8226; FIX: 1. Saison ohne History - Top-4 der 3. Liga via Staerke statt undefinierter Platzierung</div>
                    <div class="font-bold text-slate-400">v0.5.3 - 13.06.2026</div>
                    <div>&#8226; FIX: Light-Theme komplett farbenrein - restliche hartkodierte Neutralfarben (Liga-Ergebnisse, Such-/Karten-Filter, Tabellen, Debug-Log) auf CSS-Variablen umgestellt</div>
                    <div>&#8226; NEU: Theme-Color-Checker (tools/check_theme_colors.cjs) als manage-v-Gate verhindert kuenftig hartkodierte Neutralfarben in Inline-Styles</div>
                    <div class="font-bold text-slate-400">v0.5.2 - 13.06.2026</div>
                    <div>&#8226; FIX: Light-Theme - Liga-Ansicht (Pyramiden-Nav, Ergebnis-Header, Ewige Tabelle, Siegerliste) nicht mehr schwarz</div>
                    <div>&#8226; FIX: Light-Theme - Liga-Groessen-Modal Header lesbar</div>
                    <div>&#8226; FIX: Light-Theme - Karten-Sidebar (Regionen-Chips, Liga-Tabelle) entdunkelt</div>
                    <div class="font-bold text-slate-400">v0.5.1 - 13.06.2026</div>
                    <div>&#8226; FIX: Light-Theme - DFB-Pokal-Sieger-Liste und Rekordsieger-Box nicht mehr schwarz</div>
                    <div>&#8226; FIX: Light-Theme - ausgeschiedene Vereine in Pokal-Runden wieder lesbar</div>
                    <div>&#8226; FIX: Light-Theme - Steckbrief Regionen-Chips und gedaempfte Texte lesbar (semantische CSS-Variablen)</div>
                    <div class="font-bold text-slate-400">v0.5.0 - 13.06.2026</div>
                    <div>&#8226; NEU: DFB-Pokal mit realgetreuem 64er-Teilnehmerfeld - 21 simulierte Verbandspokalsieger, keine undefined-Freilose mehr</div>
                    <div>&#8226; NEU: DFB-Pokal-Verlauf im Verein-Steckbrief</div>
                    <div>&#8226; FIX: Pokal-Bracket und Ergebnisse im hellen Design lesbar (themefaehige Farben)</div>
                    <div>&#8226; FIX: DFB-Pokal wird bei Spieltag- und Saison-Ruecksetzung sauber mit zurueckgerollt</div>
                    <div class="font-bold text-slate-400">v0.4.4 - 13.06.2026</div>
                    <div>&#8226; FIX: Steckbrief-Link, Wappen und Badges in archivierten Saisons funktionieren wieder</div>
                    <div>&#8226; NEU: App heißt jetzt Bundesliga Mobile</div>
                    <div class="font-bold text-slate-400">v0.4.3 - 13.06.2026</div>
                    <div>&#8226; FIX: Pull-to-Refresh nutzt jetzt Kreis-Pfeil-Symbol (Neu-Laden) statt sich drehendem Richtungspfeil</div>
                    <div class="font-bold text-slate-400">v0.4.2 - 13.06.2026</div>
                    <div>&#8226; NEU: Pull-to-Refresh (am Seitenanfang nach unten ziehen laedt neu)</div>
                    <div>&#8226; NEU: Homescreen-Icon / PWA-Manifest (Bundesliga-Logo statt generischem Buchstabe)</div>
                    <div>&#8226; FIX: Offenburger FV aktuelles Vereinslogo</div>
                    <div class="font-bold text-slate-400">v0.4.1 - 13.06.2026</div>
                    <div>&#8226; FIX: Liga-Baum-Beschriftung - ohne manuelles Kuerzel wird der volle Liganame gezeigt statt Algorithmus-Abkuerzung (kein Hessliga/Sachliga mehr)</div>
                    <div class="font-bold text-slate-400">v0.4.0 - 12.06.2026</div>
                    <div>&#8226; NEU: Liga-Baum zeigt vollen Liga-Namen wenn Platz, sonst Kuerzel (responsiv)</div>
                    <div>&#8226; NEU: Gruppen-Tag fuer gleichnamige Bloecke - RL/LL links statt Wortwiederholung in jedem Button</div>
                    <div>&#8226; NEU: Liga-Kuerzel-Editor (tools/liga-kuerzel-editor.html) zum pixelgenauen Verfassen der Abkuerzungen</div>
                    <div>&#8226; FIX: Abgeschnittene Kuerzel (...) auf schmalen Handys behoben - Nav-Schrift 10px, Gruppen-Block-Raender erweitert</div>
                    <div class="font-bold text-slate-400">v0.3.99 - 12.06.2026</div>
                    <div>&#8226; NEU: Responsives Header-Redesign - Navigation mittig, Overflow-Menue als fester Anker, stufenlose clamp-Skalierung</div>
                    <div>&#8226; NEU: Globale Suche in der Action-Bar - am Desktop ausklappbar, mobil als Lupe</div>
                    <div>&#8226; NEU: Saison und Spieltag per Klick waehlbar (Dropdown-Picker)</div>
                    <div>&#8226; NEU: Spielergebnisse-Block einklappbar</div>
                    <div>&#8226; NEU: Saison-Komplettsimulation mit Warnhinweis</div>
                    <div>&#8226; FIX: Liganame und Buttons fuellen freien Platz statt abzuschneiden</div>
                    <div class="font-bold text-slate-400">v0.3.98 - 11.06.2026</div>
                    <div>&#8226; FIX: Mobil – alle Header-Buttons sichtbar (Suche kollabierbar)</div>
                    <div>&#8226; NEU: Save-Bar einklappbar (Aktionen ▴/▾, persistiert)</div>
                    <div>&#8226; NEU: Liga-Nav geometrisch symmetrisch (flex:1, kein Pfeil auf aktiver Liga)</div>
                    <div>&#8226; FIX: Weltkarte in Sidebar-Header verschoben</div>
                    <div>&#8226; FIX: Blaue Header-Buttons bei breitem Fenster nicht mehr abgeschnitten</div>
                    <div class="font-bold text-slate-400">v0.3.97 - 10.06.2026</div>
                    <div>&#8226; NEU: Action-Bar unter dem Header (Woche/Saison/Multi-Saison)</div>
                    <div>&#8226; NEU: Overflow-Menü (···) für Regeln/Log/Reset</div>
                    <div>&#8226; NEU: Saison-Button wird zu Abschluss am Saisonende</div>
                    <div>&#8226; NEU: Vereinskarte im Header neben Suche</div>
                    <div>&#8226; NEU: Theme-Toggle in Sidebar</div>
                    <div class="font-bold text-slate-400">v0.3.96 - 10.06.2026</div>
                    <div>&#8226; NEU: Globale Suche (Lupe) im Header – Liga und Verein mit Wappen</div>
                    <div>&#8226; NEU: App-Titel umbenannt zu Bundesliga Mobile</div>
                    <div class="font-bold text-slate-400">v0.3.95 - 09.06.2026</div>
                    <div>&#8226; FIX: Karte – BW geo-Regionen (Baden/Südbaden/Württemberg) entfernt, FV-Hüllen behalten</div>
                    <div>&#8226; FIX: Karte – Rheinland: nur blaues FVR-Polygon (rlp_fvr) behalten, orange+lila Hüllen entfernt</div>
                    <div class="font-bold text-slate-400">v0.3.94 - 09.06.2026</div>
                    <div>&#8226; NEU: Karte – Typ-Chips selektieren/deselektieren alle Polygone eines Typs</div>
                    <div>&#8226; NEU: Karte – Dropdown bleibt offen, schließt nur per Klick außerhalb</div>
                    <div>&#8226; NEU: Wappen FT Schweinfurt</div>
                    <div class="font-bold text-slate-400">v0.3.93 - 09.06.2026</div>
                    <div>&#8226; NEU: Karte – 4 Niedersachsen-Regierungsbezirke als hochauflösende OSM-Polygone (VW-Badge)</div>
                    <div>&#8226; NEU: Karte – Dropdown zeigt alle Polygone frei filterbar + Alle-abwählen</div>
                    <div>&#8226; FIX: Karte – Dropdown bleibt nach Polygonauswahl offen</div>
                    <div>&#8226; FIX: Karte – Niedersachsen-Kreismerger-Polygone entfernt</div>
                    <div class="font-bold text-slate-400">v0.3.92 - 07.06.2026</div>
                    <div>&#8226; NEU: Karte – Südwestdeutscher FV + FV Rheinland als Geo-Regionen (stufe=2) wie Mittelrhein/Niederrhein/Westfalen</div>
                    <div class="font-bold text-slate-400">v0.3.91 - 07.06.2026</div>
                    <div>&#8226; FIX: Karte – Koordinaten TuS Steinbach/Donnersberg + VfB Reichenbach 1921</div>
                    <div>&#8226; FIX: Karte – Logo SV 1965 Erlenbach + Tag TuS Rüssingen → Südwest West</div>
                    <div class="font-bold text-slate-400">v0.3.90 - 07.06.2026</div>
                    <div>&#8226; FIX: Karte – Koordinaten Geinsheim/Erlenbach/Birkenfeld (Nahe)</div>
                    <div>&#8226; FIX: Karte – Tags Langenlonsheim/TSG KL/Schopp/Bad Kreuznach II → Südwest West</div>
                    <div class="font-bold text-slate-400">v0.3.89 - 07.06.2026</div>
                    <div>&#8226; FIX: Voronoi-Seeds kontextsensitiv (Einzugsgebiete folgen echter Vereinsverteilung)</div>
                    <div>&#8226; FIX: 9 falsch-getaggte Teams via MANUAL_ALIASES behoben</div>
                    <div>&#8226; FIX: Bremerhaven realistisches Polygon</div>
                    <div>&#8226; PERF: Hüllen-Buffer 1.08</div>
                    <div class="font-bold text-slate-400">v0.4.10 - 07.06.2026</div>
                    <div>&#8226; NEU: Karte – Regionen/Hüllen/Grenzen durch Anklicken ein-/abwählbar (Multi-Select)</div>
                    <div>&#8226;  ausgewählte Polygone hervorgehoben, nicht ausgewählte abgedunkelt</div>
                    <div>&#8226; NEU: Karte – Level-Bereichsfilter statt Einzellevel (L 1–8 frei einstellbar in beide Richtungen)</div>
                    <div class="font-bold text-slate-400">v0.4.9 - 07.06.2026</div>
                    <div>&#8226; FIX: Karte – 55 Vereinsnamen in Excel hatten falsches Format (1.FC statt 1. FC), wodurch Regionen fehlerhaft zugewiesen wurden (z.B. 1. FC Bocholt in Westfalen statt Niederrhein)</div>
                    <div class="font-bold text-slate-400">v0.4.8 - 07.06.2026</div>
                    <div>&#8226; FIX: Karte – Reserven standardmäßig sichtbar (alle 1265 Teams)</div>
                    <div>&#8226; FIX: Karte – Velbert echte Stadion-Koordinaten (3 getrennte Standorte)</div>
                    <div>&#8226; NEU: Karte – Jitter für standortgleiche Teams</div>
                    <div>&#8226; FIX: Karte – Namenssuche zeigt Reserven auch bei ausgeblendetem Filter</div>
                    <div class="font-bold text-slate-400">v0.4.7 - 07.06.2026</div>
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

    const tThumb = id => { const s = id && (Engine.teams[id]?.thumb || GAME_DATA.teams[id]?.thumb); return s ? `<img src="${s}" width="20" height="20" style="object-fit:contain;vertical-align:middle;margin-right:5px;flex-shrink:0;">` : ''; };
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
        logHtml += `<div style="padding:5px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;">
            <div><span style="color:${color};margin-right:8px;">${icon}</span>${tThumb(m.id)}<b>${m.team}</b></div>
            <div style="color:var(--muted);font-size:11px;">${m.from} &#10142; ${m.to}</div>
        </div>`;
    });

    this._lastReport = res;
    let statsHtml = "<div style='text-align:right;margin-bottom:8px;'><button class='btn btn-info' onclick='App.exportSeasonReport()'>⬇ JSON Export</button></div><table class='stat-table' style='width:100%'><tr><th>Liga</th><th>Soll</th><th>Neu</th><th>Diff</th></tr>";
    Object.entries(res.stats).forEach(([lid, s]) => {
        const diff = s.new - s.target;
        const col = diff === 0 ? 'green' : 'orange';
        const lSrc = leagueLogo(lid);
        const lImg = lSrc ? `<img src="${lSrc}" width="18" height="18" style="object-fit:contain;vertical-align:middle;margin-right:6px;flex-shrink:0;">` : '';
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
    const mc = document.querySelector('.modal-content');
    if (mc) mc.style.maxWidth = '';
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
        const mn = l.min != null ? l.min : tgt;
        const mx = l.max != null ? l.max : tgt;
        const diff = n - tgt;
        const inBand = n >= mn && n <= mx;
        let col = n < 6 ? '#dc2626' : !inBand ? '#f59e0b' : '#10b981';
        return `<tr style="border-bottom:1px solid #1e293b">
            <td style="padding:2px 6px;color:#64748b;font-size:11px">${l.level}</td>
            <td style="padding:2px 6px;white-space:nowrap">${l.name}</td>
            <td style="padding:2px 6px;text-align:center;font-weight:bold;color:${col}">${n}</td>
            <td style="padding:2px 6px;text-align:center;color:#475569">${tgt}</td>
            <td style="padding:2px 6px;text-align:center;color:#475569;white-space:nowrap">${mn}-${mx}</td>
            <td style="padding:2px 6px;text-align:center;color:${diff > 5 ? '#f97316' : diff < -2 ? '#f59e0b' : '#475569'}">${diff > 0 ? '+' : ''}${diff}</td>
        </tr>`;
    }).join('');
    const anomalien = sorted.filter(l => { const n = counts[l.id]||0; const mn = l.min != null ? l.min : (l.target||18); const mx = l.max != null ? l.max : (l.target||18); return n < mn || n > mx; }).length;
    App.openModal(`⚖️ Liga-Größen${anomalien ? ' ⚠ '+anomalien+' Anomalien' : ''}`,
        `<div style="font-size:12px">
        <div style="text-align:right;margin-bottom:6px"><button class="btn btn-info" onclick="App.exportLeagueSizes()">📋 JSON-Export</button></div>
        <div style="max-height:64vh;overflow-y:auto;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--panel-2);color:var(--muted);font-size:11px">
                <th style="padding:3px 6px;text-align:left">Lvl</th>
                <th style="padding:3px 6px;text-align:left">Liga</th>
                <th style="padding:3px 6px">Teams</th>
                <th style="padding:3px 6px">Soll</th>
                <th style="padding:3px 6px">Band</th>
                <th style="padding:3px 6px">Diff</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div></div>`, false);
},

// JSON-Export der Liga-Größen (Clipboard + Textarea-Fallback fürs Handy)
exportLeagueSizes: function() {
    const counts = {};
    Object.values(Engine.teams).forEach(t => { if (t.leagueId) counts[t.leagueId] = (counts[t.leagueId] || 0) + 1; });
    const sorted = Object.values(Engine.leagues).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const data = {
        season: (Engine.getFormattedSeason ? Engine.getFormattedSeason() : null),
        offset: Engine.currentSeasonOffset,
        anomalies: sorted.filter(l => { const n = counts[l.id] || 0; const mn = l.min != null ? l.min : (l.target || 18); const mx = l.max != null ? l.max : (l.target || 18); return n < mn || n > mx; }).length,
        leagues: sorted.map(l => {
            const n = counts[l.id] || 0;
            return { id: l.id, name: l.name, lvl: l.level, teams: n, soll: l.target, min: l.min, max: l.max, diff: n - (l.target || 18) };
        })
    };
    const json = JSON.stringify(data);
    let copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(json); copied = true; } } catch (e) {}
    App.openModal(`📋 Liga-Größen JSON${copied ? ' ✓ kopiert' : ''}`,
        `<div style="font-size:12px">
            <div style="color:var(--muted);margin-bottom:6px">${copied ? 'In die Zwischenablage kopiert – direkt einfügen.' : 'Tippen zum Auswählen, dann kopieren.'}</div>
            <textarea readonly onclick="this.select()" style="width:100%;height:52vh;font-family:monospace;font-size:11px;background:var(--panel-2);color:var(--text);border:1px solid var(--panel-3);border-radius:6px;padding:8px;box-sizing:border-box">${json}</textarea>
        </div>`, false);
},

// Geo-Routing-Diagnose: Vereine, die in einer Unterliga (Level>=6) weit von ihrem Liga-Schwerpunkt
// weg spielen = wahrscheinlich fehlgeroutet. Direkter Distanz-Check auf den aktuellen Stand.
_geoCheckData: function(thresholdKm) {
    const th = thresholdKm || 250;
    const teams = Object.values(Engine.teams);
    const cent = {};
    for (const id in Engine.leagues) {
        const ms = teams.filter(t => t.leagueId === id && t.lat && t.lon);
        if (ms.length) cent[id] = { lat: ms.reduce((a, t) => a + t.lat, 0) / ms.length, lon: ms.reduce((a, t) => a + t.lon, 0) / ms.length };
    }
    const hav = (a, b) => {
        const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
        const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(x));
    };
    const viol = [];
    teams.forEach(t => {
        const L = Engine.leagues[t.leagueId];
        if (!L || L.level < 6 || !t.lat || !t.lon || !cent[t.leagueId]) return;
        const d = Math.round(hav(t, cent[t.leagueId]));
        if (d > th) {
            const home = Engine.resolveHomeLeagueId ? Engine.resolveHomeLeagueId(t) : null;
            viol.push({ team: t.name, km: d, leagueId: t.leagueId, leagueName: L.name, isReserve: !!t.isReserve, regions: t.regions || [], homeLeague: home ? (Engine.leagues[home] && Engine.leagues[home].name || home) : null });
        }
    });
    viol.sort((a, b) => b.km - a.km);
    return { threshold: th, viol: viol };
},

showGeoCheck: function() {
    const d = App._geoCheckData();
    const rows = d.viol.map(v => `<tr style="border-bottom:1px solid #1e293b">
        <td style="padding:2px 6px;white-space:nowrap">${v.team}${v.isReserve ? ' <span style="color:#f59e0b">II</span>' : ''}</td>
        <td style="padding:2px 6px;text-align:right;font-weight:bold;color:#f97316">${v.km}</td>
        <td style="padding:2px 6px;white-space:nowrap">${v.leagueName}</td>
        <td style="padding:2px 6px;white-space:nowrap;color:var(--muted)">${v.homeLeague || (v.regions[0] || '?')}</td>
    </tr>`).join('');
    App.openModal(`🧭 Geo-Check${d.viol.length ? ' ⚠ ' + d.viol.length + ' Fehlrouting' + (d.viol.length > 1 ? 's' : '') : ' ✓ sauber'}`,
        `<div style="font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="color:var(--muted)">Vereine >${d.threshold} km vom Liga-Schwerpunkt (Level ≥6)</span>
            ${d.viol.length ? `<button class="btn btn-info" onclick="App.exportGeoCheck()">📋 JSON</button>` : ''}
        </div>
        ${d.viol.length ? `<div style="max-height:64vh;overflow:auto"><table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--panel-2);color:var(--muted);font-size:11px">
                <th style="padding:3px 6px;text-align:left">Verein</th><th style="padding:3px 6px;text-align:right">km</th>
                <th style="padding:3px 6px;text-align:left">spielt in</th><th style="padding:3px 6px;text-align:left">Heimat</th>
            </tr></thead><tbody>${rows}</tbody></table></div>`
            : `<div style="padding:12px 0;color:var(--c-var-up,#10b981)">Keine offensichtlichen Fehlroutings gefunden.</div>`}
        </div>`, false);
},

exportGeoCheck: function() {
    const d = App._geoCheckData();
    const data = { season: (Engine.getFormattedSeason ? Engine.getFormattedSeason() : null), offset: Engine.currentSeasonOffset, threshold: d.threshold, count: d.viol.length, violations: d.viol };
    const json = JSON.stringify(data);
    let copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(json); copied = true; } } catch (e) {}
    App.openModal(`📋 Geo-Check JSON${copied ? ' ✓ kopiert' : ''}`,
        `<div style="font-size:12px">
            <div style="color:var(--muted);margin-bottom:6px">${copied ? 'In die Zwischenablage kopiert – direkt einfügen.' : 'Tippen zum Auswählen, dann kopieren.'}</div>
            <textarea readonly onclick="this.select()" style="width:100%;height:52vh;font-family:monospace;font-size:11px;background:var(--panel-2);color:var(--text);border:1px solid var(--panel-3);border-radius:6px;padding:8px;box-sizing:border-box">${json}</textarea>
        </div>`, false);
},

// Tag-Report: exakter Wächter für tag-basierte (NICHT-Geschwister) Ligen. Findet Vereine, deren
// Regions-Tag auf ihrem aktuellen Level eine ANDERE Liga vorgibt als die, in der sie spielen. Fängt
// genau die km-Lücke des Geo-Checks (Nachbarregionen sind km-nah). Geschwisterligen (geo-balanciert)
// sind ausgenommen – dort ist eine Abweichung gewollt.
_tagCheckData: function() {
    const sib = new Set();
    (Engine.SIBLING_GROUPS || []).forEach(g => (g.ids || g).forEach(id => sib.add(id)));
    const up = Engine.UP_MAP || {};
    const list = [];
    Object.values(Engine.teams).forEach(t => {
        const cur = t.leagueId;
        if (!cur || !Engine.leagues[cur]) return;
        const lvl = Engine.leagues[cur].level;
        const home = Engine.resolveHomeLeagueId ? Engine.resolveHomeLeagueId(t) : null;
        if (!home || !Engine.leagues[home]) return;
        // vom Heimat-Boden hoch bis zum aktuellen Level klettern → tag-korrekte Liga auf diesem Level
        let id = home, guard = 0;
        while (Engine.leagues[id] && Engine.leagues[id].level > lvl && guard++ < 12) id = up[id];
        if (!id || !Engine.leagues[id] || Engine.leagues[id].level !== lvl) return;
        if (id === cur) return;                  // korrekt eingeordnet
        if (sib.has(cur) || sib.has(id)) return; // Geschwister = geo-balanciert, kein Tag-Fehler
        list.push({ team: t.name, leagueName: Engine.leagues[cur].name, correctName: Engine.leagues[id].name, isReserve: !!t.isReserve });
    });
    list.sort((a, b) => a.correctName.localeCompare(b.correctName));
    return { count: list.length, list: list };
},

showTagCheck: function() {
    const d = App._tagCheckData();
    const shorten = n => (n || '').replace(/^(Bezirksliga|Landesliga|Verbandsliga|Oberliga|Regionalliga) /, '');
    const rows = d.list.map(v => `<tr style="border-bottom:1px solid #1e293b">
        <td style="padding:2px 6px">${v.team}${v.isReserve ? ' <span style="color:#f59e0b">II</span>' : ''}</td>
        <td style="padding:2px 6px;white-space:nowrap">${shorten(v.leagueName)}</td>
        <td style="padding:2px 6px;white-space:nowrap;color:var(--muted)">${shorten(v.correctName)}</td>
    </tr>`).join('');
    App.openModal(`🏷️ Tag-Report${d.count ? ' ⚠ ' + d.count + ' Tag-Konflikt' + (d.count > 1 ? 'e' : '') : ' ✓ sauber'}`,
        `<div style="font-size:12px">
        <div style="color:var(--muted);margin-bottom:6px">Vereine, deren Regions-Tag eine andere Liga vorgibt (Geschwisterligen ausgenommen)</div>
        ${d.count ? `<div style="max-height:64vh;overflow:auto"><table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--panel-2);color:var(--muted);font-size:11px">
                <th style="padding:3px 6px;text-align:left">Verein</th><th style="padding:3px 6px;text-align:left">spielt in</th>
                <th style="padding:3px 6px;text-align:left">Tag sagt</th>
            </tr></thead><tbody>${rows}</tbody></table></div>`
            : `<div style="padding:12px 0;color:var(--c-var-up,#10b981)">Alle tag-basierten Ligen sauber – jeder Verein in seinem offiziellen Bezirk.</div>`}
        </div>`, false);
},

megaSim: function() {
    const inp = prompt("Wie viele Saisons simulieren?\n(leer oder 0 = bis zum Abbruch / so weit die Engine kommt)", "0");
    if (inp === null) return;
    const n = Math.max(0, parseInt(inp) || 0); // 0 = unbegrenzt, läuft bis Exception/Struktur-Abbruch oder Abbruch-Button

    const overlay = document.getElementById('megasim-overlay');
    const bar = document.getElementById('megasim-bar');
    const counter = document.getElementById('megasim-counter');
    const seasonEl = document.getElementById('megasim-season');
    overlay.style.display = 'flex';
    document.getElementById('megasim-summary').style.display = 'none';
    document.getElementById('megasim-progress').style.display = '';
    bar.style.width = '0%';
    counter.textContent = n ? `0 / ${n} Saisons` : `0 Saisons · läuft…`;
    seasonEl.textContent = '–';

    let done = 0, totalMs = 0;
    App._megaSimCancelled = false;
    Engine.fastMode = true;
    App._megaSimCancel = function() { App._megaSimCancelled = true; };

    // Start-Snapshot für die Ergebnis-Zusammenfassung: kumulative Titel je Verein VOR dem Lauf
    // (aus archive.ewige.titles – cap-unabhängig). Diff am Ende = im Lauf gewonnene Titel.
    const startLabel = Engine.getFormattedSeason ? Engine.getFormattedSeason() : '';
    const titleSnap = lid => { const o = {}; const e = (Engine.archive && Engine.archive.ewige && Engine.archive.ewige[lid]) || {}; for (const id in e) o[id] = e[id].titles || 0; return o; };
    const startTitles = { '1': titleSnap('1'), '2': titleSnap('2') };

    const self = this;
    const finish = (msg) => {
        Engine.fastMode = false;
        Engine.ensureSeasonFriendlies(); Engine.saveGame(); // Testspiele + finaler Save (flusht _idbPending komplett)
        bar.style.width = '100%';
        self._megaSimSummary(msg, startLabel, startTitles, done, totalMs);
    };

    // EINE Saison pro Schritt → Fortschritt saison-genau sichtbar (kein 5er-Block). Das setTimeout(0)
    // gibt dem Browser zwischen den Saisons Zeit zum Neuzeichnen; Overhead (~ms) ist ggü. der
    // Rechenzeit pro Saison vernachlässigbar.
    const step = () => {
        if (App._megaSimCancelled) {
            finish(`⏹ Abgebrochen nach ${done} Saison${done===1?'':'en'}`);
            return;
        }
        if (n && done >= n) {
            Engine.saveGame();
            const avg = done ? Math.round(totalMs / done) : 0;
            finish(`✓ ${done} Saisons · Ø ${avg} ms/Saison`);
            return;
        }
        const seasonLabel = Engine.getFormattedSeason ? Engine.getFormattedSeason() : ''; // Saison, die JETZT berechnet wird
        const t0 = performance.now();
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
                        if (!t.leagueId) return;   // ligalos = gültig (Amateurpokal), kein Orphan
                        if (!Engine.leagues[t.leagueId]) {
                            const ref = GAME_DATA.teams[t.id];
                            if (ref && ref.leagueId && Engine.leagues[ref.leagueId]) t.leagueId = ref.leagueId;
                            else Engine.log('error', `Orphan ohne Fallback: ${t.name}`);
                        }
                    });
                    Engine.log('warn', `Auto-Heal Orphans S${done+1}: ${orphanIssue}`);
                    // Bleiben Orphans unplatzierbar → Struktur kaputt, vorzeitig abbrechen
                    const stillOrphan = Engine.sanityCheck().find(s => s.includes('Teams ohne Liga'));
                    if (stillOrphan) { done++; finish(`⛔ Abbruch nach ${done} Saisons – Ligastruktur nicht heilbar`); return; }
                } else {
                    Engine.log('warn', `SanityCheck S${done+1}: ${post.join(' | ')}`);
                }
            }
            done++;
            // Alle 25 Saisons gepufferte Chronik leicht nach IndexedDB spülen (RAM deckeln, kein localStorage)
            if (done % 25 === 0 && typeof Engine._flushIdbPending === 'function') Engine._flushIdbPending();
        } catch(e) {
            Engine.log('error', `Exception S${done+1}: ${e.message}`);
            finish(`⚠ Exception nach ${done} Saisons`);
            return;
        }
        totalMs += performance.now() - t0;
        const avg = done ? Math.round(totalMs / done) : 0;
        bar.style.width = n ? Math.round((done / n) * 100) + '%' : (Math.round(((done % 50) / 50) * 100)) + '%';
        counter.textContent = n ? `${done} / ${n} Saisons` : `${done} Saisons · läuft…`;
        seasonEl.textContent = `${seasonLabel ? seasonLabel + ' · ' : ''}Ø ${avg} ms/Saison`;
        setTimeout(step, 0);
    };

    setTimeout(step, 0);
},

// Ergebnis-Zusammenfassung nach Multi-Sim: Saison-Spanne, Tempo, im Lauf gewonnene Meistertitel (1./2. BL).
// Titel-Diff aus archive.ewige (cap-unabhängig). Bleibt offen bis der Nutzer schließt.
_megaSimSummary: function(headline, startLabel, startTitles, done, totalMs) {
    const counter = document.getElementById('megasim-counter');
    const seasonEl = document.getElementById('megasim-season');
    const sumEl = document.getElementById('megasim-summary');
    const btn = document.getElementById('megasim-btn');
    const prog = document.getElementById('megasim-progress');
    const avg = done ? Math.round(totalMs / done) : 0;
    const endLabel = (Engine.history && Engine.history.length) ? Engine.history[Engine.history.length - 1].year : (Engine.getFormattedSeason ? Engine.getFormattedSeason() : '');

    if (counter) counter.textContent = headline;
    if (seasonEl) seasonEl.textContent = (startLabel && endLabel ? `${startLabel} → ${endLabel} · ` : '') + `Ø ${avg} ms/Saison`;
    if (prog) prog.style.display = 'none';

    // Im Lauf gewonnene Titel = aktuelle ewige.titles − Start-Snapshot
    const block = (lid, label) => {
        const e = (Engine.archive && Engine.archive.ewige && Engine.archive.ewige[lid]) || {};
        const snap = startTitles[lid] || {};
        const gained = [];
        for (const id in e) { const d = (e[id].titles || 0) - (snap[id] || 0); if (d > 0) gained.push({ id, n: d }); }
        if (!gained.length) return '';
        gained.sort((a, b) => b.n - a.n || ((GAME_DATA.teams[a.id]||{}).name||'').localeCompare((GAME_DATA.teams[b.id]||{}).name||''));
        const rows = gained.slice(0, 6).map(g => {
            const nm = (Engine.teams[g.id] || GAME_DATA.teams[g.id] || {}).name || g.id;
            const th = (Engine.teams[g.id] || GAME_DATA.teams[g.id] || {}).thumb;
            return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0">${th?`<img src="${th}" width="15" height="15" style="object-fit:contain;flex-shrink:0">`:''}<span onclick="App._megaSimClose();App.showSteckbrief('${g.id}')" style="flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</span><span style="color:#f0c040;font-weight:bold;flex-shrink:0">${g.n}×</span></div>`;
        }).join('');
        return `<div style="margin-top:8px"><div style="font-size:10px;letter-spacing:1px;opacity:0.45;margin-bottom:2px">MEISTER ${label}</div>${rows}</div>`;
    };
    const b1 = block('1', '1. BUNDESLIGA');
    const b2 = block('2', '2. BUNDESLIGA');
    if (sumEl) {
        sumEl.innerHTML = (b1 || b2) ? (b1 + b2) : '<div style="opacity:0.5;text-align:center;padding:6px">Keine abgeschlossenen Meisterschaften im Lauf.</div>';
        sumEl.style.display = 'block';
    }
    if (btn) { btn.textContent = 'Schließen'; btn.onclick = () => App._megaSimClose(); }
},

_megaSimClose: function() {
    document.getElementById('megasim-overlay').style.display = 'none';
    this.renderSidebar();
    this.loadLeague(this.activeLeague);
    this.updateStatus();
},

_rclSort: 'liga',
showRegionClubs: function(regionStr, sort) {
    if (sort) this._rclSort = sort;
    if (!this._rclSort) this._rclSort = 'liga';
    const byLiga = this._rclSort === 'liga';
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const eng = typeof Engine !== 'undefined' ? Engine.teams : null;

    const teams = [];
    for (const t of Object.values(GAME_DATA.teams)) {
        const regs = (typeof MAP_TEAM_REGIONS !== 'undefined' ? MAP_TEAM_REGIONS[t.name] : null) || [];
        if (!regs.includes(regionStr)) continue;
        const lid = eng?.[t.id]?.leagueId || t.leagueId;
        const lg  = lid ? GAME_DATA.leagues[lid] : null;
        teams.push({ id: t.id, name: t.name, thumb: eng?.[t.id]?.thumb || t.thumb,
            leagueId: lid, ligaName: lg?.name || '– ohne Liga –',
            level: lg?.level || 99, strength: Math.round(eng?.[t.id]?.strength || 0) });
    }
    teams.sort((a, b) => byLiga
        ? (a.level - b.level || a.ligaName.localeCompare(b.ligaName, 'de') || b.strength - a.strength || a.name.localeCompare(b.name, 'de'))
        : (b.strength - a.strength || a.level - b.level || a.name.localeCompare(b.name, 'de')));

    const safe = regionStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const sBtn = (mode, label) => {
        const on = this._rclSort === mode;
        return `<button onclick="App.showRegionClubs('${safe}','${mode}')" style="padding:4px 12px;font-size:12px;border:1px solid ${on?'#1a4fa8':'var(--border)'};border-radius:5px;cursor:pointer;background:${on?'#1a4fa8':'var(--panel-2)'};color:${on?'#fff':'var(--muted)'}">${label}</button>`;
    };
    let html = `<div style="display:flex;gap:6px;margin-bottom:8px">${sBtn('liga','Nach Liga')}${sBtn('strength','Nach Stärke')}</div>`;

    if (!teams.length) {
        html += '<div style="padding:24px;text-align:center;color:var(--muted)">Keine Vereine in dieser Region</div>';
    } else {
        let curLiga = null;
        for (const t of teams) {
            if (byLiga && t.leagueId !== curLiga) {
                curLiga = t.leagueId;
                html += `<div style="display:flex;align-items:center;gap:6px;padding:7px 4px 3px;font-size:11px;font-weight:bold;color:var(--muted)">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LC[t.level]||'var(--panel-2)'};flex-shrink:0"></span>${t.ligaName}</div>`;
            }
            const wImg = t.thumb ? `<img src="${t.thumb}" loading="lazy" style="width:22px;height:22px;object-fit:contain;flex-shrink:0">` : '<span style="width:22px;flex-shrink:0"></span>';
            const dot  = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LC[t.level]||'var(--panel-2)'};flex-shrink:0"></span>`;
            html += `<div onclick="App.showSteckbrief('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;border-bottom:1px solid var(--border)">
                ${wImg}
                <div style="flex:1;min-width:0">
                    <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
                    ${byLiga ? '' : `<div style="font-size:10px;color:var(--muted);display:flex;align-items:center;gap:4px">${dot}${t.ligaName}</div>`}
                </div>
                <div style="flex-shrink:0;text-align:right">
                    <div style="font-size:13px;font-weight:bold;color:var(--text)">${t.strength || '–'}</div>
                    <div style="font-size:9px;color:var(--muted)">Stärke</div>
                </div>
            </div>`;
        }
    }
    this.openModal(`Region: ${regionStr} (${teams.length})`, html, false);
},

showSteckbrief: function(teamId) {
    // Historische/aufgelöste Vereine (nur in HISTORIC_CLUBS, kein game_data-Eintrag) bekommen einen
    // Minimal-Steckbrief (Name + Archiv-Historie via _fillFullHistory/careerLeagues aus archive.ewige).
    const t = GAME_DATA.teams[teamId]
        || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[teamId] ? { id: teamId, name: HISTORIC_CLUBS[teamId] } : null);
    if (!t) return;
    const live = typeof Engine !== 'undefined' ? Engine.teams[teamId] : null;
    // Kennt die Engine den Verein, gilt IHR Stand – auch wenn er null ist. Sonst faellt ein
    // ligalos gewordener Verein auf seine Liga aus GAME_DATA (Sim-Start 2025/26) zurueck,
    // und der '🏅 Amateurpokal'-Fallback unten greift nie: SG Aumund-Vegesack stand nach
    // 44 Saisons als "Bremen-Liga" da, obwohl sie laengst aus der Pyramide sind.
    const leagueId = live ? (live.leagueId || null) : (t.leagueId || null);
    const liga = GAME_DATA.leagues[leagueId];
    const level = liga?.level || 99;
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const thumb = live?.thumb || t.thumb;

    const regs = (typeof MAP_TEAM_REGIONS !== 'undefined' ? MAP_TEAM_REGIONS[t.name] : null) || [];
    const regsHtml = regs.length
        ? regs.map(r => {
            const rs = r.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `<span onclick="App.showRegionClubs('${rs}')" title="Vereine dieser Region anzeigen" style="display:inline-block;background:var(--chip-bg);color:var(--text);padding:1px 6px;border-radius:3px;margin:1px 2px 1px 0;font-size:11px;cursor:pointer" onmouseover="this.style.outline='1px solid var(--c-link,#4fc3f7)'" onmouseout="this.style.outline='none'">${r}</span>`;
          }).join('') + ((typeof this._staffelHinweisKurz === 'function') ? this._staffelHinweisKurz(leagueId) : '')
        : '<span style="color:var(--muted);font-size:11px">–</span>';

    const rows = [];
    const hist = (typeof Engine !== 'undefined' && Engine.history) ? Engine.history : [];
    // Ligalose Saisons sind keine Lücke: dort ersetzt der Amateurpokal den Ligabetrieb. Beides
    // gehört deshalb in EINE chronologische Historie – die Reihenfolge ergibt sich von selbst,
    // weil hier ohnehin über Engine.history von alt nach neu gelaufen wird.
    const amaRow = (A, year, isCurrent, h) => {
        const ap = (typeof this._amateurSeasonResult === 'function') ? this._amateurSeasonResult(A, teamId) : null;
        if (!ap) return null;
        return { year, leagueId: null, isAmateur: true, ligaName: '🏅 Amateurpokal', rank: ap.reached,
                 apWon: ap.won, isCurrent, pokalWin: h?.pokal?.winner || null, pokalObj: h?.pokal || null };
    };
    hist.forEach((h, idx) => {
        const ht = h.teams?.[teamId];
        const yr = h.year || `Saison ${idx+1}`;
        if (!ht?.leagueId) { const a = amaRow(h.amateurpokal, yr, false, h); if (a) rows.push(a); return; }
        rows.push({ year: yr, leagueId: ht.leagueId, ligaName: this._leagueName(ht.leagueId), rank: ht.rank || '–', isCurrent: false, pokalWin: h.pokal?.winner || null, pokalObj: h.pokal || null });
    });
    if (leagueId) rows.push({ year: (typeof Engine !== 'undefined' ? Engine.currentSeason : '–') || 'Aktuell', leagueId, ligaName: this._leagueName(leagueId), rank: live?.rank || '–', isCurrent: true, pokalWin: (typeof Engine !== 'undefined' && Engine.pokal) ? Engine.pokal.winner : null, pokalObj: (typeof Engine !== 'undefined') ? Engine.pokal : null });
    else if (typeof Engine !== 'undefined') {
        const a = amaRow(Engine.amateurpokal, Engine.currentSeason || 'Aktuell', true, { pokal: Engine.pokal });
        if (a) rows.push(a);
    }

    // Meister/Vize/Relegation erst werten, wenn die laufende Saison ausgespielt ist
    // (vor dem 1. Spieltag stehen alle nach Setzliste auf Platz 1 ff. → sonst falsches M-Badge)
    const seasonDone = (typeof Engine !== 'undefined') && Engine.totalMatchdays && Engine.currentMatchday >= Engine.totalMatchdays;

    // Saison-Badges (gleiche Semantik wie League-Tabelle): M=Meister, N↑=Aufstieg, A↓=Abstieg, R=Relegation (gehalten)
    this._sbBadges(rows, teamId, seasonDone);
    const sorted = rows.slice().reverse();

    // ERFOLGE aggregieren (Trophäen-Chips unter dem Namen) – nur Werte > 0
    const reachedFinal = po => {
        const fin = po?.rounds?.find(r => r.name === 'Finale');
        return !!(fin?.matches?.length && fin.matches.some(m => m.hId === teamId || m.aId === teamId));
    };
    // Karriere-Gesamtwerte DAUERHAFT aus dem Archiv (über das 50-Saison-Fenster hinaus)
    const careerLeagues = {};
    let careerTitles = 0, careerPromotions = 0;
    const arch = (typeof Engine !== 'undefined' && Engine.archive && Engine.archive.ewige) || {};
    for (const lid2 of Object.keys(arch)) {
        const a = arch[lid2][teamId];
        if (!a) continue;
        careerTitles += a.titles || 0; careerPromotions += a.promotions || 0;
        careerLeagues[lid2] = { name: this._leagueName(lid2), years: a.years || 0, level: GAME_DATA.leagues[lid2]?.level || this._histLeague(lid2)?.level || 99 };
    }
    // laufende, noch nicht ins Archiv übernommene Saison mitzählen
    if (leagueId) {
        if (!careerLeagues[leagueId]) careerLeagues[leagueId] = { name: this._leagueName(leagueId), years: 0, level: level };
        careerLeagues[leagueId].years += 1;
    }
    const relS = (typeof Engine !== 'undefined' && Engine.archive && Engine.archive.relStats && Engine.archive.relStats[teamId]) || null;
    const pendingTitle = (seasonDone && live && live.rank === 1) ? 1 : 0;
    const meister   = careerTitles + pendingTitle;
    const vize      = rows.filter(r => r.rank === 2 && (!r.isCurrent || seasonDone)).length;
    const aufstiege = careerPromotions;
    const dfbSiege  = rows.filter(r => r.pokalWin === teamId).length;
    const finals    = rows.filter(r => reachedFinal(r.pokalObj)).length;
    const vpSiege   = rows.filter(r => r.pokalObj?.entrants?.[teamId]?.type === 'VP').length;
    const dfbImg = (typeof DFB_POKAL_BASE64 !== 'undefined') ? `<img src="${DFB_POKAL_BASE64}" width="11" height="11" style="vertical-align:-1px">` : '🏆';
    const erfChips = [
        meister   && { ic: '🏆', n: meister,   t: 'Meistertitel' },
        vize      && { ic: '🥈', n: vize,      t: 'Vizemeisterschaften' },
        aufstiege && { ic: '<span style="color:#4caf50">↑</span>', n: aufstiege, t: 'Aufstiege' },
        dfbSiege  && { ic: dfbImg, n: dfbSiege, t: 'DFB-Pokalsiege' },
        finals    && { ic: '🏁', n: finals,    t: 'DFB-Pokalfinals erreicht' },
        vpSiege   && { ic: '🛡', n: vpSiege,   t: 'Verbandspokalsiege' },
        (relS && relS.played) && { ic: '⚔', n: relS.played, t: `Relegationsteilnahmen (${relS.won}× gewonnen / ${relS.lost}× verloren)` }
    ].filter(Boolean);
    const erfHtml = erfChips.length
        ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:6px">${erfChips.map(c => `<span title="${c.t}" style="display:inline-flex;align-items:center;gap:3px;background:var(--chip-bg);padding:1px 7px;border-radius:10px;font-size:11px;font-weight:bold">${c.ic} ${c.n}</span>`).join('')}</div>`
        : '';

    // KARRIERE: dauerhafte Saisons-je-Liga aus dem Archiv (komplette Historie, nicht nur letzte 50)
    const careerSorted = Object.values(careerLeagues).sort((a, b) => a.level - b.level || b.years - a.years);
    const careerTotal = careerSorted.reduce((s, l) => s + l.years, 0);
    let freqHtml = '';
    if (careerTotal > 0) {
        freqHtml = `<div style="border-top:1px solid var(--border);padding-top:6px;margin:6px 0 2px"><div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:4px">KARRIERE · ${careerTotal} Saison${careerTotal===1?'':'s'}</div>`;
        careerSorted.forEach(l => {
            const col = LC[l.level] || '#777';
            const bar = Math.round((l.years / (careerTotal || 1)) * 140);
            freqHtml += `<div style="margin-bottom:2px"><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:1px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${l.name}</span><span style="flex-shrink:0;margin-left:4px;color:var(--muted)">${l.years}×</span></div><div style="height:4px;border-radius:2px;background:var(--border)"><div style="height:100%;width:${bar}px;max-width:100%;border-radius:2px;background:${col}"></div></div></div>`;
        });
        freqHtml += '</div>';
    }

    const anyBadge = rows.some(r => r.badges.length);
    const legend = anyBadge ? `<span style="font-size:9px;font-weight:normal"><span style="color:#ffd700">M</span> <span style="color:#4caf50">N↑</span> <span style="color:#f44336">A↓</span> <span style="color:#ff9800">R</span> <span style="color:#9c6af7">P</span></span>` : '';
    // SAISON-HISTORIE kompakt paginiert (Seiten 1,2,3 …) statt alle Zeilen am Stück
    this._sbHist = { rows: sorted, page: 0, per: 12, team: teamId };
    const histPages = Math.max(1, Math.ceil(sorted.length / this._sbHist.per));
    let navBtns = '';
    if (histPages > 1) for (let p = 0; p < histPages; p++)
        navBtns += `<button onclick="App._sbHistGoto(${p})" style="background:none;border:1px solid var(--border);border-radius:3px;font-size:10px;padding:1px 7px;cursor:pointer;color:${p===0?'var(--c-link)':'var(--muted)'};font-weight:${p===0?'bold':'normal'}">${p+1}</button>`;
    const page0 = sorted.length ? sorted.slice(0, this._sbHist.per).map(r => this._sbHistRowHtml(r)).join('') : '<div style="font-size:11px;color:var(--muted)">Keine Daten</div>';
    const histHtml = `<div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:4px"><span>SAISON-HISTORIE <span id="sb-hist-count" style="font-weight:normal;opacity:0.6">${sorted.length>1?`(${sorted.length})`:''}</span></span>${legend}</div>
        ${histPages > 1 ? `<div id="sb-hist-nav" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px">${navBtns}</div>` : ''}
        <div id="sb-hist-list">${page0}</div>
    </div>`;

    const pokalHtml = (typeof this._teamPokalVerlauf === 'function') ? this._teamPokalVerlauf(teamId) : '';
    const tsHtml = (typeof this._teamFriendlies === 'function') ? this._teamFriendlies(teamId) : '';

    // CHRONIK (Paket 7): erzählter Spielstand – nichts erfunden, reine Archiv-/History-Fakten
    const chronikTxt = (typeof this._teamChronik === 'function')
        ? this._teamChronik({ teamId, rows, leagueId, meister, aufstiege, dfbSiege, relS }) : '';
    const chronikHtml = chronikTxt
        ? `<div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px"><div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:4px">CHRONIK</div><div style="font-size:12px;line-height:1.5">${chronikTxt}</div></div>`
        : '';

    const body = `<div style="text-align:center;padding:0 0 4px">${thumb ? `<img src="${thumb}" width="52" height="52" style="object-fit:contain;display:block;margin:0 auto 4px">` : ''}<div style="font-size:16px;font-weight:bold;margin-bottom:3px">${t.name}</div>${liga ? `<span style="font-size:11px;padding:2px 7px;border-radius:3px;background:${LC[level]};color:#fff">Level ${level}</span>` : ''}${erfHtml}</div><div style="margin-top:6px;font-size:11px;color:var(--muted)">LIGA</div><div style="font-size:13px;cursor:pointer;color:var(--c-link)" onclick="App.loadLeague('${leagueId || '__amateur__'}')">${liga?.name || '🏅 Amateurpokal'}</div><div style="margin-top:6px;font-size:11px;color:var(--muted)">REGIONEN</div><div style="margin-top:2px">${regsHtml}</div>${this._stadionHtml(GAME_DATA.teams[teamId])}<div style="margin-top:6px;font-size:11px;color:var(--muted)">KOORDINATEN <span style="color:var(--text)">${t.lat?.toFixed(5)}, ${t.lon?.toFixed(5)}</span></div>${freqHtml}${chronikHtml}${histHtml}${pokalHtml}${tsHtml}`;
    this.openModal(t.name, body, false);
    const mc = document.querySelector('.modal-content');
    if (mc) mc.style.maxWidth = '440px';
    // Volle Saison-Historie async aus IndexedDB nachladen (über das 50er-Fenster hinaus)
    this._fillFullHistory(teamId, seasonDone);
},

// Stadion-Infos (europlan: Name, Ort, Kapazität). Vereine mit mehreren Spielstätten
// (Spielgemeinschaften, getrennte Plätze für 1./2. Mannschaft) bekommen alle gelistet.
// dark=true → feste Farben für das dunkle Karten-Panel, sonst Theme-Variablen.
_stadionHtml: function(t, dark) {
    const vs = (t && t.venues) || [];
    if (!vs.length) return '';
    const cM = dark ? '#666' : 'var(--muted)', cT = dark ? '#ccc' : 'var(--text)';
    const rows = vs.map(v => {
        const sub = [v.ort, v.kapazitaet ? v.kapazitaet.toLocaleString('de-DE') + ' Plätze' : ''].filter(Boolean).join(' · ');
        return `<div style="margin-bottom:3px"><div style="font-size:12px;color:${cT}">${v.stadName}</div>${sub ? `<div style="font-size:10px;color:${cM}">${sub}</div>` : ''}</div>`;
    }).join('');
    return `<div style="margin-top:6px"><div style="font-size:11px;color:${cM}">STADION${vs.length > 1 ? ` (${vs.length})` : ''}</div>${rows}</div>`;
},

// Saison-Badges (M/N↑/A↓/R/P) auf rowsAsc (aufsteigend nach Jahr) setzen
_sbBadges: function(rowsAsc, teamId, seasonDone) {
    rowsAsc.forEach((r, i) => {
        const curLvl = GAME_DATA.leagues[r.leagueId]?.level;
        const next = rowsAsc[i + 1];
        const decided = !r.isCurrent || seasonDone;
        const b = [];
        if (r.pokalWin && r.pokalWin === teamId) b.push('P');
        if (decided && r.rank === 1) b.push('M');
        else if (decided && curLvl <= 2 && r.rank === 16 && (!next || next.leagueId === r.leagueId)) b.push('R');
        if (next && next.leagueId !== r.leagueId) {
            const nxtLvl = GAME_DATA.leagues[next.leagueId]?.level;
            // Pyramide verlassen (Liga → Amateurpokal) zählt als Abstieg, die Rückkehr als Aufstieg.
            // Ohne diese beiden Fälle bliebe genau der auffälligste Wechsel der Historie unmarkiert,
            // seit Liga- und Pokalsaisons in derselben Liste stehen.
            if (r.isAmateur && nxtLvl != null)      b.push('N');
            else if (next.isAmateur && curLvl != null) b.push('A');
            else if (nxtLvl != null && curLvl != null) b.push(nxtLvl < curLvl ? 'N' : nxtLvl > curLvl ? 'A' : null);
        }
        r.badges = b.filter(Boolean);
    });
},

// Steckbrief-Historie aus IndexedDB (season_tables) zur Voll-Historie erweitern (Union mit 50er-Fenster).
// Greift nur, wenn IDB mehr Saisons hat als das Fenster (sonst bleibt die sofort gerenderte Ansicht).
_fillFullHistory: function(teamId, seasonDone) {
    if (typeof IDBStore === 'undefined' || !(typeof Engine !== 'undefined' && Engine.archive && Engine.archive.ewige)) return;
    const yr = s => parseInt((s || '').split('/')[0]) || 0;
    const leagueIds = Object.keys(Engine.archive.ewige).filter(lid => Engine.archive.ewige[lid][teamId]);
    if (!leagueIds.length) return;
    IDBStore.getTeamSeasons(teamId, leagueIds).then(idb => {
        if (!idb || !idb.length) return;
        if (!this._sbHist || this._sbHist.team !== teamId) return; // anderer Steckbrief inzwischen offen
        // window-Rows (mit Pokaldaten) nach Jahr indizieren – haben Vorrang
        const win = this._sbHist.rows.slice();
        const byYear = {}; win.forEach(r => { byYear[r.year] = r; });
        idb.forEach(s => {
            if (byYear[s.y]) return; // Fenster-Saison hat Vorrang (Pokal/Badges genauer)
            byYear[s.y] = { year: s.y, leagueId: s.lid, ligaName: this._leagueName(s.lid), rank: s.rank || '–', isCurrent: false, pokalWin: null, pokalObj: null };
        });
        // Die laufende Saison heißt "Aktuell", nicht "2055/56" – yr() liefert dafür 0 und sie
        // rutschte ans ALTE Ende (nach reverse also ganz unten). Das verschob nicht nur die Zeile:
        // _sbBadges läuft gleich darunter über diese Liste und hielt die älteste Saison für ihren
        // Nachfolger. Laufende Saison deshalb hart als jüngste einsortieren.
        const ord = r => r.isCurrent ? Infinity : yr(r.year);
        const asc = Object.values(byYear).sort((a, b) => ord(a) - ord(b));
        if (asc.length <= win.length) return; // nichts dazugewonnen
        this._sbBadges(asc, teamId, seasonDone);
        const sorted = asc.reverse();
        this._sbHist = { rows: sorted, page: 0, per: 12, team: teamId };
        // Liste, Pager-Buttons und Count neu aufbauen
        const list = document.getElementById('sb-hist-list');
        if (list) list.innerHTML = sorted.slice(0, 12).map(r => this._sbHistRowHtml(r)).join('');
        const cnt = document.getElementById('sb-hist-count'); if (cnt) cnt.textContent = `(${sorted.length})`;
        const pages = Math.ceil(sorted.length / 12);
        let nav = document.getElementById('sb-hist-nav');
        if (pages > 1) {
            const btns = Array.from({length: pages}, (_, p) => `<button onclick="App._sbHistGoto(${p})" style="background:none;border:1px solid var(--border);border-radius:3px;font-size:10px;padding:1px 7px;cursor:pointer;color:${p===0?'var(--c-link)':'var(--muted)'};font-weight:${p===0?'bold':'normal'}">${p+1}</button>`).join('');
            if (nav) nav.innerHTML = btns;
            else if (list) { nav = document.createElement('div'); nav.id = 'sb-hist-nav'; nav.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px'; nav.innerHTML = btns; list.parentNode.insertBefore(nav, list); }
        }
    }).catch(() => {});
},

// Eine Zeile der Steckbrief-Saison-Historie (wiederverwendbar: Erst-Render + Pager)
_sbHistRowHtml: function(r) {
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const BC = { M:'#ffd700', N:'#4caf50', A:'#f44336', R:'#ff9800', P:'#9c6af7' };
    const BA = { N:'↑', A:'↓' };
    const lv = GAME_DATA.leagues[r.leagueId]?.level || 99;
    const bg = r.isCurrent ? 'var(--row-cur-bg)' : '';
    const badges = r.badges && r.badges.length ? `<span style="font-size:10px;font-weight:bold">${r.badges.map(b=>`<span style="color:${BC[b]}">${b}${BA[b]||''}</span>`).join(' ')}</span>` : '';
    // Amateurpokal-Saison: kein Ligalevel, kein Tabellenplatz. Der Punkt bleibt deshalb bewusst
    // FARBLOS (hohler Ring in --muted) statt eine Levelfarbe zu leihen: LC ist ein Kontinuum
    // 1=rot … 8=grau, und in der Navigation ist Level 1 sogar Gold (#FFD700) – ein gelber Punkt
    // hier würde "1. Bundesliga" behaupten. Der Amateurpokal steht neben der Leiter, nicht darauf;
    // die Sidebar färbt ihn aus demselben Grund neutral (var(--panel-2)).
    const ziel = r.isAmateur ? '__amateur__' : r.leagueId;
    const dotCss = r.isAmateur
        ? 'background:transparent;box-shadow:inset 0 0 0 1.5px var(--muted)'
        : `background:${LC[lv] || 'var(--muted)'}`;
    const erg  = r.isAmateur
        ? `<span style="${r.apWon ? 'color:var(--c-gold);font-weight:bold;' : ''}">${r.rank}</span>`
        : `<span>${r.rank !== '–' ? 'Pl. ' + r.rank : '–'}</span>`;
    return `<div onclick="App.loadLeague('${ziel}')" style="display:grid;grid-template-columns:48px 1fr 82px;align-items:baseline;gap:6px;padding:1px 6px;border-radius:4px;cursor:pointer;background:${bg}" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='${bg}'"><span style="font-size:10px;color:var(--muted)">${r.year}</span><span style="min-width:0;display:flex;align-items:baseline;gap:5px;overflow:hidden"><span style="align-self:center;width:6px;height:6px;border-radius:50%;${dotCss};flex:0 0 auto"></span><span style="font-size:11px;${r.isCurrent?'font-weight:bold;':''}color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.ligaName}</span></span><span style="display:flex;align-items:baseline;gap:5px;font-size:11px;color:var(--muted)">${badges}${erg}</span></div>`;
},
// Seitenwechsel der Steckbrief-Saison-Historie (kompakt, nur die Liste neu füllen)
_sbHistGoto: function(p) {
    const st = this._sbHist; if (!st) return;
    st.page = p;
    const list = document.getElementById('sb-hist-list');
    if (list) list.innerHTML = st.rows.slice(p * st.per, p * st.per + st.per).map(r => this._sbHistRowHtml(r)).join('');
    const nav = document.getElementById('sb-hist-nav');
    if (nav) [...nav.querySelectorAll('button')].forEach((b, i) => {
        b.style.fontWeight = i === p ? 'bold' : 'normal';
        b.style.color = i === p ? 'var(--c-link)' : 'var(--muted)';
    });
},

// Testspiel-Verlauf eines Teams (alle Saisons/Fenster) für den Steckbrief
_teamFriendlies: function(teamId) {
    const fs = (typeof Engine !== 'undefined' ? (Engine.friendlies || []) : []).filter(f => f.hId === teamId || f.aId === teamId);
    if (!fs.length) return '';
    const groups = {};
    fs.forEach(f => { const k = f.season + '|' + f.window; (groups[k] = groups[k] || []).push(f); });
    let html = `<div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px"><div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:4px">TESTSPIELE</div>`;
    Object.keys(groups).sort().reverse().forEach(k => {
        const [season, window] = k.split('|');
        html += `<div style="margin-bottom:4px"><div style="font-size:10px;color:var(--muted);font-weight:bold">${season} · ${window === 'pre' ? 'Sommer' : 'Winter'}</div>`;
        groups[k].forEach(f => {
            const home = f.hId === teamId, oppId = home ? f.aId : f.hId;
            const opp = (typeof Engine !== 'undefined' ? Engine.teams[oppId] : null) || GAME_DATA.teams[oppId];
            const gf = home ? f.s1 : f.s2, ga = home ? f.s2 : f.s1;
            const col = gf > ga ? '#4caf50' : gf < ga ? '#f44336' : 'var(--muted)';
            html += `<div style="display:flex;align-items:baseline;gap:6px;font-size:11px;padding:1px 0"><span style="width:13px;opacity:0.4;flex:0 0 auto">${home ? 'H' : 'A'}</span><span style="color:${col};font-weight:bold;width:30px;flex:0 0 auto">${gf}:${ga}</span><span onclick="App.showSteckbrief('${oppId}')" style="cursor:pointer;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${opp?.name || oppId}</span></div>`;
        });
        html += '</div>';
    });
    return html + '</div>';
},

showDebugLog: function() {
    const colors = { info:'#888', warn:'#ff9800', error:'#f44336' };
    const entries = Engine.debugLog.slice().reverse();
    const html = entries.length === 0
        ? '<p style="opacity:0.5;padding:20px;">Noch keine Einträge.</p>'
        : '<div style="font-family:monospace;font-size:12px;">' +
          entries.map(e =>
            `<div style="padding:4px 0;border-bottom:1px solid var(--border);">` +
            `<span style="color:var(--muted);margin-right:8px;">${e.t}</span>` +
            `<span style="color:var(--muted);margin-right:8px;">${e.season}</span>` +
            `<span style="color:${colors[e.type]||'var(--muted)'};font-weight:bold;margin-right:8px;">[${e.type.toUpperCase()}]</span>` +
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
        localStorage.removeItem('ba_arch_v66'); // Archiv-Key mit zurücksetzen
        sessionStorage.removeItem('ba_autosave_v66');
        if (typeof IDBStore !== 'undefined') { try { IDBStore.clear(); } catch(e) {} } // volle Chronik leeren
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





