// data_reports.js – Schlagzeilen-Corpus für Spieltags-Berichte (v2, Fable-Ausbau)
// ============================================================================
// Slots:
//   {heim} {gast}          – Teamnamen (immer verfügbar)
//   {sieger} {verlierer}   – nur bei Sieg-Kategorien verfügbar
//   {score}                – bei Sieg-Kategorien AUS SIEGERSICHT ("5:0"),
//                            bei Remis aus Heimsicht ("2:2")
// Regeln für den Laufzeit-Klassifikator (app/reports.js):
//   - Kategorien mit Sieger: kantersieg, deutlich, knapp, ueberraschung
//   - Kategorien ohne Sieger-Garantie: spitzenspiel, kellerduell
//     → dort bei Remis nur Zeilen OHNE {sieger}/{verlierer} ziehen
//   - Priorität bei Mehrfach-Treffern: ueberraschung > spitzenspiel/kellerduell
//     > kantersieg > deutlich > knapp > remis_*
//   - Zeilenwahl matchId-geseedet → Reload zeigt dieselbe Schlagzeile
// Spec: fable-deliverables/paket1-schlagzeilen/SPEC.md (+ FABLE-GRUNDREGELN.md)
// ============================================================================
window.REPORTS = {

    // ---- Tordifferenz >= 4 --------------------------------------------------
    kantersieg: [
        "Schützenfest! {sieger} fegt {verlierer} mit {score} vom Platz",
        "{sieger} kennt kein Erbarmen – {verlierer} geht beim {score} unter",
        "Debakel für {verlierer}: {score}-Klatsche gegen {sieger}",
        "Torfestival: {sieger} spielt sich gegen {verlierer} in einen Rausch",
        "Machtdemonstration – {sieger} lässt {verlierer} beim {score} keine Chance",
        "Ein Nachmittag zum Vergessen: {verlierer} kassiert die {score}-Packung",
        "{sieger} in Gala-Laune, {verlierer} nur Sparringspartner",
        "Kein Spiel, ein Durchmarsch: {sieger} siegt {score}",
        "Bittere Lehrstunde: {verlierer} von {sieger} zerlegt",
        "Die Abwehr? Unauffindbar. {verlierer} verliert {score}",
        "{sieger} schießt {verlierer} ab – die Fans feiern jede Bude",
        "Historisch bitter: {verlierer} erlebt gegen {sieger} ein Fiasko",
        "Wehrlos, mutlos, chancenlos – {verlierer} unterliegt {score}",
        "{sieger} spielt Katz und Maus mit {verlierer}",
        "Kantersieg! {sieger} macht mit {verlierer} kurzen Prozess",
        "Nach dem {score} herrscht bei {verlierer} Katerstimmung",
        "{sieger} trifft nach Belieben – {verlierer} ohne Gegenwehr",
        "Standing Ovations: {sieger} begeistert beim {score} gegen {verlierer}",
        "Für {verlierer} kann es nur besser werden – {score}!",
        "{sieger} im Torrausch, {verlierer} im freien Fall",
        "Ohren angelegt und durchmarschiert: {sieger} siegt {score}",
        "{verlierer} bekommt die Grenzen aufgezeigt – deutlich, deutlicher, {score}",
        "Was für ein Auftritt! {sieger} spielt {verlierer} schwindlig",
        "Böse Klatsche: {verlierer} geht mit wehenden Fahnen unter – {score}",
        "{sieger} feiert ein Fest, {verlierer} erlebt ein Fiasko – {score}",
        "Gnadenlos effizient: {sieger} bestraft jeden Fehler von {verlierer}",
        "Ein Klassenunterschied, in Zahlen gegossen: {score} für {sieger}",
        "{sieger} lässt Taten sprechen – {verlierer} hat dem nichts entgegenzusetzen",
        "Demontage in aller Öffentlichkeit: {verlierer} kassiert ein {score}",
        "Da half kein Flehen: {sieger} kennt beim {score} keine Gnade",
        "Tore wie am Fließband: {sieger} überrennt {verlierer}",
        "{verlierer} wollte kämpfen – {sieger} wollte Tore. {score}.",
        "Einbahnstraßen-Fußball: {sieger} rollt an, {verlierer} schaut zu",
        "Der Torhunger von {sieger} kennt keine Sättigung – {score}",
        "Bittere Pille für {verlierer}: gegen {sieger} setzt es ein {score}",
        "{sieger} zelebriert Fußball, {verlierer} erleidet ihn – {score}",
        "Kein Halten mehr: {sieger} trifft und trifft und trifft – {verlierer} nicht",
        "Wer stoppt {sieger}? {verlierer} jedenfalls nicht – {score}",
        "Lehrbuch-Demontage: {sieger} nimmt {verlierer} auseinander",
        "{verlierer} verlässt den Platz mit hängenden Köpfen – {score}-Debakel",
        "Angriff auf Angriff: {sieger} gönnt {verlierer} keine Verschnaufpause – {score}",
        "Träume zerplatzen: {verlierer} beim {score} ohne jede Chance",
        "Ein Sturmlauf, ein Torregen, ein Statement: {sieger} deklassiert {verlierer}",
        "Für die Statistik: {score}. Für {verlierer}: ein schwarzer Tag.",
        "{sieger} lässt Zahlen sprechen: {score} gegen {verlierer}",
        "Torfestival mit nur einem Gastgeber: {sieger} lädt ein, {verlierer} zahlt",
        "Rückspiel? Darauf freut sich bei {verlierer} nach diesem {score} niemand",
        "Spott von den Rängen, Jubel auf der anderen Seite: {score} für {sieger}",
        "{verlierer} sucht Antworten, {sieger} feiert Tore",
        "Wenn alles läuft: {sieger} erwischt ein Traumspiel – {verlierer} den Albtraum",
        "Deckung? Ordnung? Gegenwehr? Bei {verlierer} an diesem Tag Fremdwörter – {score}",
        "Das nennt man ein Ausrufezeichen: {sieger} siegt {score} gegen {verlierer}"
    ],

    // ---- Tordifferenz 2–3 ---------------------------------------------------
    deutlich: [
        "{sieger} setzt sich souverän mit {score} gegen {verlierer} durch",
        "Verdienter Sieg: {sieger} lässt {verlierer} beim {score} wenig Luft",
        "{sieger} kontrolliert die Partie – {score} gegen {verlierer}",
        "Keine Zweifel: {sieger} schlägt {verlierer} klar mit {score}",
        "{verlierer} müht sich, doch {sieger} ist eine Nummer zu groß",
        "Abgezockt: {sieger} nutzt seine Chancen, {verlierer} nicht",
        "{sieger} liefert – {score} und drei verdiente Punkte",
        "Klare Verhältnisse zwischen {heim} und {gast}: {score}",
        "{sieger} bleibt cool und fährt einen ungefährdeten {score}-Sieg ein",
        "{verlierer} findet kein Mittel gegen {sieger}",
        "Souverän statt spektakulär: {sieger} gewinnt {score}",
        "{sieger} macht früh alles klar – {verlierer} läuft nur hinterher",
        "Standesgemäß: {sieger} besiegt {verlierer} mit {score}",
        "{sieger} dreht nach der Pause auf und siegt {score}",
        "Konzentrierte Vorstellung: {sieger} gibt sich gegen {verlierer} keine Blöße",
        "{verlierer} wehrt sich lange – am Ende steht trotzdem das {score}",
        "Effizienz schlägt Einsatz: {sieger} gewinnt mit {score}",
        "{sieger} untermauert seine Ambitionen mit einem {score} gegen {verlierer}",
        "Nie gefährdet: {sieger} spielt den Sieg über {verlierer} routiniert herunter",
        "{score} – {sieger} erledigt die Pflichtaufgabe gegen {verlierer}",
        "Am Ende steht ein verdientes {score} für {sieger}",
        "{sieger} lässt beim {score} gegen {verlierer} nichts anbrennen",
        "Reife Leistung: {sieger} bezwingt {verlierer} ohne große Aufregung",
        "Zwei Klassen? Nein. Aber ein klarer Unterschied: {score} für {sieger}",
        "{verlierer} bemüht, {sieger} besser – {score}",
        "Arbeitssieg mit Glanzmomenten: {sieger} schlägt {verlierer} {score}",
        "{sieger} spielt seine Möglichkeiten aus – {verlierer} bleibt nur der Frust",
        "Die Punkte gehen verdient an {sieger} – {score} gegen {verlierer}",
        "Souveräner Auftritt: {sieger} hält {verlierer} auf Distanz",
        "{verlierer} findet nie den Hebel – {sieger} gewinnt {score}",
        "Klare Angelegenheit: {sieger} lässt gegen {verlierer} keine Zweifel aufkommen",
        "Ohne Glanz, aber mit Substanz: {score} für {sieger}",
        "{sieger} bleibt seiner Linie treu und schlägt {verlierer} mit {score}",
        "Zu abgeklärt, zu robust, zu gut: {sieger} besiegt {verlierer}",
        "Der Favorit in diesem Duell? Nach dem {score} eindeutig {sieger}",
        "{verlierer} hält eine Weile mit – dann setzt sich Qualität durch: {score}",
        "Keine Kunst, aber Handwerk: {sieger} gewinnt {score}",
        "{sieger} nimmt die Aufgabe ernst und {verlierer} die Punkte ab",
        "Deutliche Verhältnisse: beim {score} gibt es wenig zu deuteln",
        "Sachlich, nüchtern, erfolgreich: {sieger} siegt gegen {verlierer}",
        "{sieger} drückt dem Spiel den Stempel auf – {score}",
        "Ein Sieg der Kategorie 'ungefährdet': {score} für {sieger}",
        "{verlierer} geht leer aus – {sieger} siegt verdient {score}",
        "Stabil, wenn es zählt: {sieger} liefert – {score}",
        "Gegen {sieger} ist an diesem Tag kein Kraut gewachsen – {verlierer} verliert {score}",
        "Chancenverwertung als Matchwinner: {sieger} schlägt {verlierer} {score}",
        "{sieger} trifft zur richtigen Zeit – {verlierer} nicht oft genug",
        "Die Grundtugenden stimmen: {sieger} bezwingt {verlierer} klar",
        "Ergebnis-Fußball in Reinform: {score} für {sieger}",
        "{verlierer} ärgert sich über vergebene Chancen – {sieger} über gar nichts",
        "Die Anzeigetafel spricht eine deutliche Sprache: {score} für {sieger}",
        "Klarer Kurs, klarer Sieg: {sieger} lässt {verlierer} hinter sich"
    ],

    // ---- Tordifferenz 1 -----------------------------------------------------
    knapp: [
        "Zittersieg! {sieger} rettet das {score} gegen {verlierer} über die Zeit",
        "{sieger} gewinnt den Krimi gegen {verlierer} mit {score}",
        "Ein Tor entscheidet: {sieger} schlägt {verlierer} hauchdünn",
        "{verlierer} rennt an, {sieger} hält stand – {score}",
        "Nichts für schwache Nerven: {sieger} siegt knapp mit {score}",
        "Glück oder Können? {sieger} nimmt die Punkte gegen {verlierer} mit",
        "{sieger} erkämpft sich ein hartes {score} gegen {verlierer}",
        "Enges Duell zwischen {heim} und {gast} – am Ende jubelt {sieger} ({score})",
        "{verlierer} verliert unglücklich – das {score} schmerzt",
        "Dreckiger Sieg? Egal! {sieger} nimmt das {score} dankend an",
        "{sieger} entscheidet ein Spiel auf Messers Schneide für sich – {score}",
        "Bis zur letzten Minute offen – dann jubelt {sieger} ({score})",
        "{verlierer} belohnt sich nicht – {sieger} gewinnt {score}",
        "Kampfspiel statt Leckerbissen: {sieger} siegt {score}",
        "{sieger} bleibt im Duell mit {verlierer} das entscheidende Quäntchen kühler",
        "Millimeter-Entscheidung: {score} für {sieger}",
        "{sieger} stiehlt {verlierer} die Show – knapper geht's kaum",
        "Am Ende zählt nur das Ergebnis: {score} für {sieger}",
        "{verlierer} hadert, {sieger} feiert – {score}",
        "Ein Wimpernschlag Unterschied: {sieger} schlägt {verlierer} mit {score}",
        "Nervenschlacht mit Happy End für {sieger} – {score}",
        "Der Fußballgott würfelt – und entscheidet für {sieger}: {score}",
        "{verlierer} war nah dran – {sieger} einen Schritt näher: {score}",
        "Hauchzarte Entscheidung: {sieger} gewinnt das Duell mit {verlierer}",
        "Wer solche Spiele gewinnt, hat Charakter: {sieger} siegt {score}",
        "Drama pur – am Ende jubelt {sieger} ({score})",
        "{score}: mehr Zufall oder mehr Verdienst? {sieger} ist es egal",
        "Die feinen Unterschiede: {sieger} nutzt sie, {verlierer} nicht",
        "Ein Tor trennt Jubel und Frust – {sieger} jubelt, {verlierer} nicht",
        "Beide geben alles, einer bekommt alles: {sieger} gewinnt {score}",
        "Hart erkämpft ist halb gewonnen? Nein, ganz: {score} für {sieger}",
        "{verlierer} fehlt am Ende ein Tor zum Punkt – {sieger} nimmt alles mit",
        "Spiele wie diese entscheiden Kleinigkeiten – heute zugunsten von {sieger} ({score})",
        "Zentimeter, Sekunden, ein Tor: {sieger} gewinnt hauchdünn gegen {verlierer}",
        "Nicht schön, aber selten: drei Punkte für {sieger} beim {score}",
        "Für Feinschmecker war es nichts, für {sieger} alles: {score}",
        "{verlierer} klopft an, {sieger} macht nicht auf – {score}",
        "Ein Duell wie Armdrücken – {sieger} drückt zuletzt: {score}",
        "Krimi ohne Kommissar: Am Tatort jubelt {sieger} – {score}",
        "Das eine Tor, das alles ändert: {sieger} schlägt {verlierer}",
        "Mit Zähnen und Klauen zum {score}: {sieger} will es mehr",
        "Enger geht es kaum – die Punkte sichert sich {sieger}: {score}",
        "Fußball-Roulette: Die Kugel fällt auf {sieger} – {score}",
        "Ein Hauch entscheidet – und er weht in Richtung {sieger} ({score})",
        "Bei {verlierer} regiert der Frust, bei {sieger} die Erleichterung",
        "Das Momentum küsst {sieger} – {score} gegen {verlierer}",
        "Knappe Kiste! {sieger} schnappt sich den Sieg gegen {verlierer}",
        "Wer zuletzt jubelt: {sieger} gewinnt mit {score}",
        "Kleiner Unterschied, große Wirkung: {score} für {sieger}",
        "Zum Zerreißen gespannt – am Ende reißt es für {verlierer}: {score} für {sieger}",
        "Effektivität schlägt Ästhetik: {sieger} gewinnt knapp – {score}",
        "So eng, dass es weh tut – zumindest {verlierer}: {score} für {sieger}"
    ],

    // ---- Remis mit Toren ----------------------------------------------------
    remis_torreich: [
        "Wilde Punkteteilung: {heim} und {gast} trennen sich {score}",
        "Offener Schlagabtausch endet {score} – keiner wollte verlieren",
        "{heim} und {gast} liefern sich ein packendes {score}",
        "Tore satt, aber kein Sieger: {score} zwischen {heim} und {gast}",
        "Spektakel ohne Happy End: {heim} und {gast} teilen die Punkte",
        "Zweimal Führung, zweimal Ausgleich? Am Ende steht das {score}",
        "{heim} und {gast} schenken sich nichts – gerechtes {score}",
        "Die Abwehrreihen hatten frei: {score} im Duell {heim} gegen {gast}",
        "Unterhaltung pur, Ertrag mau: {heim} und {gast} spielen {score}",
        "Beide treffen, keiner gewinnt – {score}",
        "Punkteteilung nach turbulenten 90 Minuten: {score}",
        "{heim} verpasst den Sieg, {gast} rettet einen Punkt – {score}",
        "Torreiches Remis: {heim} und {gast} neutralisieren sich beim {score}",
        "Wer offensiv spielt, wird nicht immer belohnt: {score}",
        "Ein Remis, das sich wie zwei verlorene Punkte anfühlt – für beide",
        "{heim} und {gast} verlassen den Platz mit gemischten Gefühlen ({score})",
        "Rasantes Spiel, salomonisches Ende: {score}",
        "Vier Augenpaare aufs Ergebnis, ein Achselzucken: {score}",
        "Der Fußball-Gott entschied auf Unentschieden: {score}",
        "{heim} gegen {gast} – ein {score}, das Lust auf das Rückspiel macht",
        "Treffer auf beiden Seiten, Sieger nirgends: {score}",
        "{heim} und {gast} tun sich nicht weh – jedenfalls nicht genug: {score}",
        "Am Ende steht die gerechteste aller Zahlen: {score}",
        "Führungen sind zum Ausgleichen da – {heim} und {gast} beweisen es",
        "Wer trifft, will mehr – bekommen haben beide gleich viel: {score}",
        "{heim} und {gast} schenken den Fans Tore, sich selbst nur einen Punkt",
        "Remis mit Charakter: {heim} und {gast} trennen sich {score}",
        "Das Streben nach drei Punkten endet für beide bei einem: {score}",
        "Die Null hält nicht – das Ergebnis schon: {score}",
        "Punkteteilung, Torteilung, Gefühlsteilung: {heim} gegen {gast} endet {score}",
        "Jubel hüben wie drüben – nur der Sieger fehlt: {score}",
        "Es ging hin und her – geblieben ist ein {score}",
        "Angriffslust auf beiden Seiten – Ertrag: je ein Punkt ({score})",
        "Verlieren verboten, gewinnen unmöglich: {score}",
        "Der Ausgleich als Lebensversicherung: {heim} und {gast} nehmen je einen Punkt mit",
        "Ein Unentschieden, zwei Sichtweisen: gewonnener Punkt oder verlorene zwei? {heim} und {gast} entscheiden selbst",
        "Torhüter geschlagen, Teams nicht: {score}",
        "Ergebnisgerechtigkeit oder doppelte Enttäuschung? {heim} gegen {gast}: {score}",
        "Wie man's nimmt: Für {heim} zu wenig, für {gast} zu wenig – für die Zuschauer genug",
        "Das Toreschießen klappt, das Siegen nicht: {heim} und {gast} spielen {score}",
        "Zwei Namen, ein Ergebnis, keine Antwort: {heim} gegen {gast} endet {score}",
        "Remis der Marke 'ehrlich': {score}",
        "{heim} und {gast} nehmen sich gegenseitig die Punkte weg – und schenken sich je einen",
        "Am Ende gleicht sich alles aus – buchstäblich: {score}",
        "Kein Sieger, aber auch kein Verlierer: {heim} und {gast} trennen sich versöhnlich",
        "Die Beute wird geteilt: {heim} und {gast} nehmen je einen Punkt",
        "Offensiv gedacht, remis gemacht: {score}",
        "Zwischen Freude und Frust liegt ein schmaler Grat – und ein {score}",
        "{heim} und {gast} duellieren sich auf Augenhöhe – das Ergebnis bestätigt es",
        "Ein Punkt für den einen, ein Punkt für den anderen: {heim} und {gast} vertagen die Entscheidung",
        "Getroffen, gekämpft, geteilt: {score} zwischen {heim} und {gast}",
        "So klingt Unentschieden in Zahlen: {score}"
    ],

    // ---- 0:0 ------------------------------------------------------------------
    remis_torlos: [
        "Zähes Nullnummern-Duell zwischen {heim} und {gast}",
        "Viel Kampf, keine Tore: {heim} und {gast} trennen sich 0:0",
        "Die Zuschauer hätten sich mehr gewünscht – 0:0 zwischen {heim} und {gast}",
        "Abwehrschlacht ohne Ertrag: {heim} und {gast} torlos",
        "Chancen ja, Tore nein: 0:0 im Duell {heim} gegen {gast}",
        "{heim} und {gast} belauern sich 90 Minuten – Endstand 0:0",
        "Ein Punkt, null Tore, wenig Erkenntnisse: {heim} gegen {gast}",
        "Torhüter arbeitslos? Von wegen – aber es bleibt beim 0:0",
        "Magere Kost: {heim} und {gast} verabschieden sich torlos",
        "Sicherheit zuerst: {heim} und {gast} riskieren nichts – 0:0",
        "Das Toreschießen fällt heute aus: 0:0 zwischen {heim} und {gast}",
        "{heim} beißt sich an {gast} die Zähne aus – 0:0",
        "Taktik-Schach ohne Matt: {heim} und {gast} spielen 0:0",
        "Niemand blinzelt zuerst: torloses Remis zwischen {heim} und {gast}",
        "Solide, leidenschaftlich, torlos – {heim} gegen {gast} endet 0:0",
        "Die Null steht – auf beiden Seiten: {heim} gegen {gast}",
        "90 Minuten Anlauf, kein Abschluss: 0:0",
        "{heim} und {gast} teilen die Punkte, die Torschützenliste bleibt leer",
        "Wer auf Tore hoffte, wurde enttäuscht: {heim} gegen {gast} 0:0",
        "Ein 0:0, das man schnell wieder vergisst",
        "Null Tore, viel Laufarbeit: {heim} und {gast} neutralisieren sich",
        "Die Anzeigetafel hätte frei nehmen können: {heim} gegen {gast} endet 0:0",
        "Beide Torhüter halten, was zu halten ist – mehr war da nicht: {heim} gegen {gast} 0:0",
        "Ein Abend für die Taktiktafel, nicht fürs Herz: 0:0",
        "{heim} und {gast} einigen sich stillschweigend aufs Minimalprogramm",
        "Wenig Risiko, weniger Torraumszenen, keine Tore: {heim} gegen {gast}",
        "Die Nullnummer hat viele Väter: {heim} und {gast} liefern beide Argumente",
        "0:0 – manchmal sagt ein Ergebnis alles",
        "Geduldsprobe ohne Belohnung: {heim} und {gast} torlos vereint",
        "Bloß nicht verlieren, lautete offenbar die Devise – beidseitig: 0:0",
        "Die Fans warten aufs Tor – vergeblich. {heim} gegen {gast}: 0:0",
        "Zwei Defensivreihen im Bestzustand, zwei Sturmreihen im Streik: 0:0",
        "{heim} und {gast} umkreisen sich wie Schachspieler – Remis, logisch",
        "Höhepunkte? Bitte im Rückspiel nachreichen. {heim} gegen {gast}: 0:0",
        "Vorsicht war Trumpf: {heim} und {gast} trennen sich torlos",
        "Ein Punkt fürs Bemühen, null Tore fürs Publikum: {heim} gegen {gast}",
        "Der Ball wollte einfach nicht rein – auf beiden Seiten: 0:0",
        "Zu wenig Mut, zu viel Respekt: {heim} und {gast} spielen 0:0",
        "Man kennt sich, man schätzt sich, man trifft nicht: 0:0 zwischen {heim} und {gast}",
        "Torlos glücklich? Wohl kaum. {heim} und {gast} teilen die Punkte",
        "Es fehlte an allem, was Tore bringt: {heim} gegen {gast} 0:0",
        "Die Stürmer blieben Zuschauer: torloses Remis zwischen {heim} und {gast}",
        "Ein 0:0, das niemandem weh tut – und niemanden weiterbringt",
        "Betonfußball in Reinkultur: {heim} und {gast} ohne Treffer",
        "Wer auf ein Spektakel hoffte, war im falschen Stadion: 0:0",
        "Chancenarm, torlos, punktgeteilt: {heim} gegen {gast}",
        "Auch das ist Fußball: {heim} und {gast} beharken sich zum 0:0",
        "90 Minuten Mühe, 0 Tore Lohn: {heim} und {gast}",
        "Ein Spiel für Statistiker: erste Halbzeit 0:0, zweite auch",
        "Torflaute mit Beteiligung von {heim} und {gast}",
        "Kein Durchkommen, nirgends: 0:0 zwischen {heim} und {gast}",
        "Am Ende ein Ergebnis wie ein Achselzucken: 0:0"
    ],

    // ---- Außenseiter schlägt klaren Favoriten --------------------------------
    ueberraschung: [
        "Sensation! {sieger} schockt Favorit {verlierer} mit {score}",
        "David schlägt Goliath: {sieger} stürzt {verlierer} – {score}",
        "Wer hatte DAS auf dem Zettel? {sieger} besiegt {verlierer}!",
        "Blamage für {verlierer}: Außenseiter {sieger} jubelt beim {score}",
        "{sieger} schreibt ein Fußball-Märchen – {verlierer} fassungslos",
        "Coup des Spieltags: {sieger} ringt {verlierer} mit {score} nieder",
        "Favoritensterben! {verlierer} strauchelt gegen {sieger}",
        "{sieger} über sich hinausgewachsen – {verlierer} entzaubert",
        "Das Wunder von {sieger}? {score} gegen {verlierer}!",
        "{verlierer} unterschätzt {sieger} – und zahlt die Rechnung: {score}",
        "Aufstand der Kleinen: {sieger} lässt {verlierer} alt aussehen",
        "Paukenschlag! {sieger} gewinnt tatsächlich mit {score} gegen {verlierer}",
        "{verlierer} in der Krise? {sieger} liefert den Beweis: {score}",
        "Die Sensation ist perfekt: {sieger} schlägt {verlierer}",
        "Ausgerechnet {sieger}! {verlierer} verliert {score}",
        "{sieger} kämpft, {verlierer} schläft – Überraschung beim {score}",
        "Gänsehaut bei {sieger}: der Favorit {verlierer} geht baden",
        "Keiner gab {sieger} eine Chance – {score} gegen {verlierer}!",
        "{verlierer} stolpert über mutiges {sieger}",
        "Fußball-Logik ausgehebelt: {sieger} besiegt {verlierer} mit {score}",
        "Das Papier sagt {verlierer}, der Platz sagt {sieger}: {score}",
        "Vergesst die Prognosen: {sieger} schlägt {verlierer}!",
        "Große Namen schießen keine Tore: {sieger} gewinnt {score}",
        "{verlierer} rechnet mit drei Punkten – {sieger} durchkreuzt die Rechnung",
        "Umsturz im Kleinen: {sieger} entthront {verlierer} für einen Nachmittag",
        "So schnell dreht sich der Fußball: {sieger} schockt {verlierer} mit {score}",
        "Mut schlägt Ruhm: {sieger} ringt {verlierer} nieder",
        "Riesenüberraschung! {sieger} lässt {verlierer} verzweifeln – {score}",
        "Wer ist hier der Favorit? {sieger} beantwortet die Frage neu – {score} gegen {verlierer}",
        "Achtung, Stolperfalle! {verlierer} tappt gegen {sieger} voll hinein",
        "{sieger} feiert den Coup, {verlierer} sucht Ausreden – {score}",
        "Die Hierarchie gerät ins Wanken: {sieger} besiegt {verlierer}",
        "Ein Sieg für alle, die an Wunder glauben: {sieger} schlägt {verlierer}",
        "Favoritenrolle? Zerknüllt und weggeworfen – {verlierer} verliert {score} gegen {sieger}",
        "Das passiert, wenn man {sieger} unterschätzt: {score}",
        "{verlierer} wollte nur die Pflicht erfüllen – {sieger} hatte andere Pläne",
        "Über Nacht zum Helden: {sieger} stürzt {verlierer} vom Sockel",
        "Zwergenaufstand geglückt: {sieger} triumphiert über {verlierer}",
        "Es sind Spiele wie diese, für die der Fußball erfunden wurde: {sieger} schlägt {verlierer}",
        "Der Größere fällt tiefer: {verlierer} verliert {score} gegen {sieger}",
        "Papierform? Schall und Rauch! {sieger} gewinnt {score}",
        "{sieger} schreibt die Geschichte des Spieltags – {verlierer} liefert die Pointe",
        "Ungläubige Blicke bei {verlierer}: {score} gegen {sieger}",
        "Herz schlägt Etat: {sieger} bezwingt {verlierer}",
        "Da staunt die Liga: {sieger} nimmt {verlierer} die Punkte ab",
        "Denkzettel für {verlierer}: Fußball wird auf dem Platz entschieden – {score} für {sieger}",
        "Vom Außenseiter zum Spielverderber: {sieger} düpiert {verlierer}",
        "Wenn der Underdog beißt: {score} für {sieger}",
        "{verlierer} lernt schmerzhaft: Es gibt keine kleinen Gegner – {sieger} gewinnt {score}",
        "Sensationell, verdient, unvergessen: {sieger} schlägt {verlierer}",
        "Der Favoritenschreck geht um: {sieger} erlegt {verlierer}",
        "Erst belächelt, dann gefeiert: {sieger} gewinnt gegen {verlierer}"
    ],

    // ---- Beide Teams oben in der Tabelle (Remis möglich!) --------------------
    spitzenspiel: [
        "Gipfeltreffen! {heim} und {gast} liefern sich ein Duell auf Augenhöhe – {score}",
        "Das Topspiel hält, was es verspricht: {heim} gegen {gast} endet {score}",
        "Showdown an der Spitze: {heim} empfängt {gast} – Endstand {score}",
        "Spitzenspiel unter Flutlicht-Atmosphäre: {score} zwischen {heim} und {gast}",
        "Wenn die Großen sich treffen: {heim} gegen {gast} – {score}",
        "{sieger} gewinnt das Gipfeltreffen gegen {verlierer} mit {score}",
        "Big Points! {sieger} entscheidet das Topspiel gegen {verlierer} für sich",
        "{sieger} setzt im Titelrennen ein Ausrufezeichen – {score} gegen {verlierer}",
        "Machtwechsel an der Spitze? {sieger} schlägt {verlierer} mit {score}",
        "Im Duell der Schwergewichte behält {sieger} die Oberhand",
        "{sieger} gewinnt den Kracher gegen {verlierer} – die Konkurrenz schaut genau hin",
        "Reifeprüfung bestanden: {sieger} bezwingt {verlierer} im Spitzenspiel",
        "Das Spitzenspiel zwischen {heim} und {gast} endet {score} – die Tabelle bleibt eng",
        "Kein Sieger im Gipfeltreffen: {heim} und {gast} trennen sich {score}",
        "{sieger} meldet Titelansprüche an – {score} im Topspiel gegen {verlierer}",
        "Charaktertest an der Spitze: {sieger} löst die Aufgabe gegen {verlierer}",
        "Die Liga blickt auf dieses Spiel – und {sieger} liefert ab ({score})",
        "Prestige, Punkte, Tabellenführung: {sieger} nimmt alles mit",
        "Duell der Titanen endet {score} – {heim} gegen {gast}",
        "Topspiel mit Ansage: {heim} und {gast} spielen {score}",
        "Wenn es zählt, ist {sieger} zur Stelle: Sieg im Topspiel gegen {verlierer}",
        "Ansage an die Liga: {sieger} gewinnt den Showdown gegen {verlierer}",
        "{sieger} gewinnt das Duell der Besten – {score}",
        "Wegweisender Sieg: {sieger} setzt sich im Gipfeltreffen durch",
        "Das Topspiel als Standortbestimmung: {sieger} besteht, {verlierer} wankt",
        "{sieger} gewinnt den Vergleich der Titelkandidaten – {score}",
        "Oben wird es einsamer: {sieger} distanziert {verlierer}",
        "Gipfelstürmer {sieger}: {verlierer} muss sich beim {score} geschlagen geben",
        "Wer Meister werden will, gewinnt solche Spiele: {sieger} tut es – {score}",
        "Charakter, Klasse, drei Punkte: {sieger} schlägt {verlierer} im Spitzenspiel",
        "Das Spitzenduell geht an {sieger} – {verlierer} bleibt der Frust",
        "Machtprobe bestanden: {sieger} lässt {verlierer} im Topspiel abblitzen",
        "{sieger} liefert die Antwort auf dem Rasen – {verlierer} bleibt stumm: {score}",
        "Ein Statement zur richtigen Zeit: {sieger} gewinnt das Gipfeltreffen {score}",
        "Die Liga schaut hin – und sieht {sieger} obenauf: {score} gegen {verlierer}",
        "Patt an der Spitze: {heim} und {gast} trennen sich {score}",
        "Das Gipfeltreffen bringt keine Klärung – {score} zwischen {heim} und {gast}",
        "Auf Augenhöhe, bis zum Schlusspfiff: {heim} gegen {gast} endet {score}",
        "Niemand blinzelt im Duell der Großen: {score}",
        "Das Titelrennen bleibt offen: {heim} und {gast} teilen die Punkte",
        "Viel Prestige, wenig Bewegung: {heim} gegen {gast} endet {score}",
        "Im Duell der Topteams gibt keiner nach: {score}",
        "Die Konkurrenz freut sich still: {heim} und {gast} nehmen sich gegenseitig Punkte ab",
        "Standesgemäßes Kräftemessen ohne Sieger: {score}",
        "Der große Schlagabtausch endet diplomatisch: {heim} gegen {gast} {score}",
        "Zwei Titelanwärter, ein Ergebnis, null Erkenntnis: {score}",
        "Oben bleibt alles beim Alten: {heim} und {gast} trennen sich {score}",
        "Das Topspiel hält die Spannung – vor allem für die kommenden Wochen: {score}",
        "Gipfeltreffen mit Sicherheitsabstand: {heim} und {gast} remis",
        "Wenn zwei sich nicht trauen: {score} im Spitzenspiel",
        "Ein Remis, das sich nach Warten anfühlt: {heim} gegen {gast} {score}"
    ],

    // ---- Beide Teams im Tabellenkeller (Remis möglich!) ----------------------
    kellerduell: [
        "Abstiegskrimi! {heim} und {gast} kämpfen um jeden Zentimeter – {score}",
        "Kellerduell mit Nervenflattern: {heim} gegen {gast} endet {score}",
        "Sechs-Punkte-Spiel im Tabellenkeller: {score} zwischen {heim} und {gast}",
        "Im Kampf ums Überleben trennen sich {heim} und {gast} {score}",
        "{sieger} verschafft sich Luft im Abstiegskampf – {score} gegen {verlierer}",
        "Befreiungsschlag! {sieger} gewinnt das Kellerduell gegen {verlierer}",
        "{sieger} lebt noch! Wichtiger {score}-Sieg gegen {verlierer}",
        "Für {verlierer} wird es dunkel: Niederlage im Kellerduell gegen {sieger}",
        "{sieger} klettert, {verlierer} zittert – {score} im Abstiegsduell",
        "Big Points im Keller: {sieger} schlägt {verlierer} mit {score}",
        "Dieses {score} könnte am Saisonende Gold wert sein – {sieger} jubelt",
        "Angstgegner Abstieg: {heim} und {gast} spielen {score}",
        "Wer verliert, verliert doppelt – am Ende trifft es {verlierer}",
        "Kellerduell ohne Sieger: {heim} und {gast} hilft das {score} nur bedingt",
        "Ein Punkt, der keinem so richtig hilft: {score} im Abstiegskampf",
        "{sieger} kämpft sich aus dem Tabellenkeller – {verlierer} bleibt unten drin",
        "Existenzkampf pur: {sieger} behält gegen {verlierer} die Nerven",
        "Der Druck war greifbar – {sieger} hält ihm stand ({score})",
        "Unten bleibt es eng: {heim} gegen {gast} endet {score}",
        "Abstiegsgipfel in {score}-Stimmung: {heim} und {gast} lassen Punkte liegen",
        "Drei Punkte wie ein Rettungsring: {sieger} schlägt {verlierer}",
        "Aufatmen bei {sieger}, Alarmstufe Rot bei {verlierer} – {score}",
        "Im Duell der Angeschlagenen steht {sieger} wieder auf – {score}",
        "{sieger} gewinnt das Spiel, das keiner verlieren durfte – {verlierer} tat es",
        "Der Abstiegskampf hat einen Gewinner: {sieger} siegt {score}",
        "Hoffnung tanken: {sieger} lässt {verlierer} im Tabellenkeller zurück",
        "Wer kämpft, kann gewinnen: {sieger} beweist es gegen {verlierer}",
        "{verlierer} verliert das Kellerduell gegen {sieger} – und vielleicht noch viel mehr",
        "Ein Sieg, der doppelt zählt: {sieger} bezwingt {verlierer} im Abstiegskampf",
        "Grund zum Jubeln im Tabellenkeller: {sieger} gewinnt {score}",
        "{sieger} zieht den Kopf aus der Schlinge – {verlierer} steckt fester denn je",
        "Überlebenswille schlägt Angst: {sieger} besiegt {verlierer}",
        "Im Keller gehen die Lichter an – bei {sieger}: {score}",
        "Das nackte Überleben als Antrieb: {sieger} ringt {verlierer} nieder",
        "Für {verlierer} wird die Luft dünner – {sieger} atmet durch: {score}",
        "Ein Remis wie ein Strohhalm: {heim} und {gast} klammern sich daran",
        "Angst frisst Mut: {heim} und {gast} trennen sich {score}",
        "Das Kellerduell endet, wie es geführt wurde: verkrampft – {score}",
        "Kein Befreiungsschlag, nirgends: {heim} gegen {gast} {score}",
        "Zwei Sorgenkinder, ein geteilter Punkt: {score}",
        "Der Blick auf die Tabelle bleibt für {heim} und {gast} ungemütlich: {score}",
        "Im Abstiegskampf gilt: bloß nicht verlieren. Mission erfüllt – mehr nicht: {score}",
        "{heim} und {gast} verharren im Krisenmodus – {score}",
        "Ein Pflaster auf die Wunde – mehr ist das {score} für {heim} und {gast} nicht",
        "Wer sollte hier gewinnen? Am Ende: niemand. {heim} gegen {gast} {score}",
        "Die Angst spielte mit – bei beiden: {score} im Kellerduell",
        "Rettung sieht anders aus: {heim} und {gast} teilen sich einen mageren Punkt",
        "Unten bleibt alles eng, alles bang: {heim} gegen {gast} endet {score}",
        "Das Tabellenende rückt keinen Millimeter: {score} zwischen {heim} und {gast}",
        "Remis im Keller – die Konkurrenz reibt sich die Hände: {score}",
        "Mut zum Risiko? Fehlanzeige. {heim} und {gast} begnügen sich mit {score}"
    ]
};

// ============================================================================
// PAKET 2 – Kontext-Schlagzeilen (Spiel des Tages). Anlassbezogen statt score-basiert.
// Struktur: reasonKey → { win: [...], draw: [...] }
//   win  = Sieg-Zeilen (Slots {sieger}/{verlierer}/{heim}/{gast}/{score})
//   draw = Remis-Zeilen (KEINE {sieger}/{verlierer}!; nur {heim}/{gast}/{score})
// Leeres Array → Assembler fällt automatisch auf die Score-Schlagzeile (window.REPORTS) zurück.
// reasonKeys (aus _matchInterest): derby, tradition, topduell, abstiegskrimi, europa,
//   rangduell, formstark, formkrise, ueberraschung.
// Spec: fable-deliverables/paket2-kontext/SPEC.md
// ============================================================================
window.REPORTS_CONTEXT = {
    // symmetrisch: beide Teams teilen den Anlass → {sieger}/{verlierer} dürfen ihn tragen
    derby: {
        win: [
            "Derbysieger! {sieger} entscheidet das Prestigeduell gegen {verlierer} mit {score}",
            "Im Derby zählt nur eins – und dieses eine holt sich {sieger}",
            "Stadtgespräch: {sieger} schnappt sich den Derbysieg gegen {verlierer}",
            "Das Derby gehört {sieger} – {verlierer} bleibt nur der Spott der Nachbarschaft",
            "Lokale Machtverhältnisse geklärt, zumindest bis zum nächsten Mal: {score} für {sieger}",
            "Derbyzeit ist Zuspitzung: {sieger} jubelt, {verlierer} schweigt – {score}",
            "Kurze Wege, große Gefühle: {sieger} gewinnt das Nachbarschaftsduell {score}",
            "Wochenlanges Sticheln gesichert: {sieger} gewinnt das Derby gegen {verlierer}",
            "Ein Derby vergisst man nicht – {verlierer} dieses hier leider auch nicht: {score}",
            "Die Rivalität lebt, der Jubel ist einseitig: {score} für {sieger}",
            "Derbys schreiben ihre eigenen Gesetze – heute zugunsten von {sieger} ({score})",
            "Nachbarschaftshilfe? Nicht im Derby: {sieger} schlägt {verlierer} {score}",
            "Im Duell der Rivalen behält {sieger} das letzte Wort – {score}",
            "Das ganze Umland schaut hin – und sieht {sieger} triumphieren: {score}"
        ],
        draw: [
            "Derby ohne Sieger: {heim} und {gast} trennen sich {score} – die Rivalität bleibt",
            "Ehrenrunde für niemanden: Das Nachbarschaftsduell endet {score}",
            "Geteilte Stadt, geteilte Punkte: {heim} gegen {gast} {score}",
            "Das Derby hält die Spannung – aufgeschoben aufs nächste Aufeinandertreffen: {score}",
            "Viel Feuer, kein Sieger: {heim} und {gast} liefern sich ein {score}",
            "Im Derby schenkt sich niemand etwas – auch keine Punkte: je einer für {heim} und {gast}",
            "Die Nachbarschaft bleibt unentschieden: {score} zwischen {heim} und {gast}",
            "Derbyfieber, nüchternes Ende: {heim} und {gast} teilen sich die Beute – {score}",
            "Keiner will dem anderen den Triumph gönnen: {score} im Lokalduell"
        ]
    },
    // ASYMMETRISCH: nicht festlegen, welche Seite die Tradition trägt
    tradition: {
        win: [
            "Große Namen, großes Spiel – und ein Sieger: {sieger} schlägt {verlierer} {score}",
            "Wo Tradition aufläuft, ist der Rahmen groß – gefüllt hat ihn {sieger}: {score}",
            "Ein Duell mit Geschichte, entschieden in der Gegenwart: {sieger} gewinnt {score}",
            "Vor dieser Kulisse zu bestehen, ist eine Ansage: {sieger} bezwingt {verlierer}",
            "Alte Größe schützt vor Toren nicht – auf dem Platz jubelt {sieger}: {score}",
            "Geschichte schreibt man auf dem Rasen: Dieses Kapitel gehört {sieger} ({score})",
            "Ein Spiel für die Chronik – mit {sieger} in der Hauptrolle: {score} gegen {verlierer}",
            "Namen gewinnen keine Spiele, Tore schon: {score} für {sieger}",
            "Im Duell mit Vergangenheit gewinnt die Gegenwart: {sieger} siegt {score}",
            "Das Flair eines besonderen Duells, das Ergebnis eine Sache für {sieger}: {score}",
            "Wo Aura im Spiel ist, braucht es Substanz – {sieger} hatte sie: {score}",
            "Ehrfurcht ist keine Taktik – {sieger} nimmt {verlierer} die Punkte ab: {score}",
            "Der Glanz vergangener Tage traf auf das Hier und Jetzt – {score} für {sieger}"
        ],
        draw: [
            "Ein Duell mit Geschichte, ein Ergebnis ohne Antwort: {score}",
            "Große Bühne, geteilte Punkte: {heim} und {gast} trennen sich {score}",
            "Der Chronist notiert ein {score} – und freut sich aufs Wiedersehen von {heim} und {gast}",
            "Aura trifft Alltag: {heim} gegen {gast} endet {score}",
            "Kein Sieger in einem Spiel, das mehr versprach als ein {score}",
            "Zwischen Nostalgie und Tabelle liegt ein {score}: {heim} gegen {gast}",
            "Auch besondere Duelle enden manchmal salomonisch: {score}",
            "Die Geschichte dieses Duells bekommt ein Unentschieden-Kapitel: {heim} gegen {gast} {score}"
        ]
    },
    // symmetrisch: beide oben (Spitzenspiel 1.BL / Aufstiegsduell darunter) → neutral zu beidem
    topduell: {
        win: [
            "Duell der Tabellen-Elite: {sieger} setzt sich gegen {verlierer} durch – {score}",
            "Oben angekommen, oben geblieben: {sieger} gewinnt den Vergleich der Besten",
            "Wer oben steht, will da bleiben – {sieger} tut mehr dafür: {score} gegen {verlierer}",
            "Direktes Duell, direkte Antwort: {sieger} schlägt {verlierer} im Topspiel",
            "Kein Fernduell, sondern Mann gegen Mann: {sieger} gewinnt {score}",
            "Das Duell an der Spitze geht an {sieger} – {verlierer} muss neu rechnen",
            "Big Points unter Konkurrenten: {sieger} nimmt sie {verlierer} ab – {score}",
            "In der Spitzengruppe gibt {sieger} den Ton an: {score} gegen {verlierer}",
            "Der direkte Vergleich spricht ab sofort für {sieger}: {score}",
            "Ein Sieg im direkten Duell zählt doppelt – {sieger} weiß das: {score}",
            "{sieger} besteht den Härtetest gegen {verlierer} – {score} im Duell der Topteams",
            "Ganz oben wird nichts verschenkt: {sieger} holt sich die Punkte gegen {verlierer}",
            "Rückenwind für die kommenden Wochen: {sieger} gewinnt das Topduell {score}"
        ],
        draw: [
            "Oben ändert sich nichts – genau das ist die Nachricht: {score} zwischen {heim} und {gast}",
            "Das Duell der Topteams vertagt die Entscheidung: {score}",
            "Auf Augenhöhe, wie es die Tabelle versprach: {heim} gegen {gast} {score}",
            "Beide bleiben dran – aneinander: {score} im Spitzenduell",
            "Wer gehofft hatte, dass sich oben jemand absetzt, wartet weiter: {score}",
            "Am Ende steht oben ein Gleichstand mehr: {heim} gegen {gast} {score}",
            "Die Spitzengruppe bleibt beisammen: {heim} und {gast} teilen die Punkte",
            "Zwei Ambitionierte, eine vertagte Entscheidung: {score} zwischen {heim} und {gast}"
        ]
    },
    // symmetrisch: beide im Tabellenkeller
    abstiegskrimi: {
        win: [
            "Drei Punkte gegen die Angst: {sieger} gewinnt das Kellerduell gegen {verlierer}",
            "Wer unten gewinnt, gewinnt doppelt: {sieger} nimmt {verlierer} die Hoffnung ab – {score}",
            "Existenzkampf mit klarem Ausgang: {score} für {sieger}",
            "Im Duell der Bedrängten hält {sieger} dem Druck stand – {verlierer} nicht",
            "Das Zittern hat sich gelohnt – für {sieger}: {score} im Abstiegsduell",
            "Ein Sieg, der sich wie Rettung anfühlt: {sieger} bezwingt {verlierer} – {score}",
            "Abstiegskampf ist Kopfsache – {sieger} beweist Nerven: {score}",
            "Die Nacht wird ruhiger bei {sieger}, länger bei {verlierer}: {score}",
            "Zwischen Hoffen und Bangen liegt ein Sieg: {sieger} holt ihn gegen {verlierer}",
            "Unten zählt jeder Punkt dreifach – {sieger} nimmt gleich alle mit: {score}",
            "Der Keller hat gesprochen: {sieger} bleibt dran, {verlierer} bleibt zurück – {score}",
            "Kampf, Krampf, Erlösung: {sieger} gewinnt das Duell der Sorgenkinder {score}",
            "Wer solche Spiele verliert, hat ein Problem – {verlierer} hat jetzt eins mehr ({score})"
        ],
        draw: [
            "Das Remis rettet keinen: {heim} und {gast} bleiben im Zitterbereich – {score}",
            "Im Kellerduell siegt niemand – und genau das ist das Problem: {score}",
            "Zwei Sorgen, je ein Punkt: {heim} gegen {gast} {score}",
            "Gewonnen hat nur die Ungewissheit: {score} zwischen {heim} und {gast}",
            "Unten hilft nur Siegen – gepunktet haben {heim} und {gast} trotzdem: {score}",
            "Der Abstiegskampf macht keine Pause, das Ergebnis schon: {score}",
            "Beide leben noch, beide zittern weiter: {heim} und {gast} trennen sich {score}",
            "Das Kellerduell löst nichts, verschiebt alles: {score}",
            "Wenig Trost, viel Restprogramm: {heim} und {gast} spielen {score}"
        ]
    },
    // symmetrisch – ABER doppeldeutig: 1.BL "Kampf um Europa", darunter Aufstiegsverfolger
    // → neutral formulieren ("begehrte Plätze", "Verfolger"), nie "Europapokal" behaupten
    europa: {
        win: [
            "Im Rennen um die begehrten Plätze legt {sieger} vor: {score} gegen {verlierer}",
            "Wer oben andocken will, braucht solche Siege: {sieger} liefert – {score}",
            "Das Verfolgerduell geht an {sieger} – {verlierer} verliert wertvollen Boden",
            "Ambitionen untermauert: {sieger} schlägt den direkten Rivalen {verlierer}",
            "Im Duell der Träumer wird {sieger} konkret: {score}",
            "Die schöne Aussicht gibt es nicht geschenkt – {sieger} erkämpft sie sich: {score}",
            "Wichtiger Dreier im Verfolgerfeld: {sieger} bezwingt {verlierer}",
            "Wer greift nach oben? {sieger} – zumindest an diesem Spieltag ({score})",
            "{sieger} hält Kurs auf die Spitzenplätze, {verlierer} muss abreißen lassen",
            "Das Rennen ist lang, aber solche Etappen entscheiden es: {score} für {sieger}",
            "Direktes Duell im Verfolgerpulk: {sieger} setzt sich durch – {score}",
            "Punkte mit Zusatzgewicht: {sieger} nimmt sie {verlierer} im Verfolgerduell ab"
        ],
        draw: [
            "Im Verfolgerduell tritt das Feld auf der Stelle: {score} zwischen {heim} und {gast}",
            "Keiner rückt vor, keiner fällt zurück: {heim} gegen {gast} endet {score}",
            "Das Rennen um die begehrten Plätze bleibt offen – {score}",
            "Ein Punkt hilft beiden ein bisschen und keinem richtig: {score}",
            "Verfolger unter sich, Stillstand als Ergebnis: {heim} gegen {gast} {score}",
            "Die Konkurrenz im Rückspiegel freut sich: {heim} und {gast} teilen die Punkte",
            "Wer nach oben will, darf solche Spiele nicht verlieren – immerhin: {score}",
            "Etappe ohne Ausreißer: {heim} und {gast} trennen sich {score}"
        ]
    },
    // symmetrisch: direkte Tabellennachbarn
    rangduell: {
        win: [
            "Das Duell auf Augenhöhe kippt zugunsten von {sieger}: {score}",
            "Tabellennachbarn im direkten Vergleich – {sieger} verschafft sich Luft: {score}",
            "Wenn Nachbarn streiten, gewinnt selten die Höflichkeit: {score} für {sieger}",
            "Der direkte Konkurrent, direkt geschlagen: {sieger} besiegt {verlierer}",
            "Im Nachbarschaftsstreit der Tabelle behält {sieger} die Oberhand: {score}",
            "Das Klassement sortiert sich neu – {sieger} gibt die Richtung vor ({score})",
            "Sechs-Punkte-Gefühl auch ohne Abstiegskampf: {sieger} schlägt {verlierer}",
            "Auf Tuchfühlung in der Tabelle – auf dem Platz mit klarem Ausgang: {score} für {sieger}",
            "Gleiche Tabellenregion, gleiche Ziele, ein Sieger: {sieger} ({score})",
            "{sieger} entscheidet das Duell der Punktnachbarn für sich – {verlierer} schaut nach hinten",
            "Wer im direkten Duell punktet, punktet doppelt: {score} für {sieger}",
            "Rangordnung geklärt – vorerst: {sieger} schlägt {verlierer} mit {score}"
        ],
        draw: [
            "Die Nachbarn bleiben Nachbarn: {heim} gegen {gast} endet {score}",
            "Nichts gewonnen, nichts verloren, nichts geklärt: {score}",
            "Das Duell der Punktnachbarn zementiert den Status quo: {score}",
            "Auf Augenhöhe rein, auf Augenhöhe raus: {heim} und {gast} spielen {score}",
            "Wer den direkten Konkurrenten nicht schlägt, bleibt, wo er ist: {score}",
            "Die Tabelle hält den Atem an – und atmet unverändert weiter: {score}",
            "Ein Remis wie ein Handschlag unter Nachbarn: {heim} gegen {gast} {score}",
            "Gleichstand unter Gleichgestellten: {score} zwischen {heim} und {gast}"
        ]
    },
    // ASYMMETRISCH: mind. ein Team in Topform – nie festlegen, welches
    formstark: {
        win: [
            "Ein Lauf traf auf Widerstand – gewonnen hat {sieger}: {score}",
            "Formkurven sind Momentaufnahmen, Ergebnisse sind Fakten: {score} für {sieger}",
            "Wo zuletzt viel gewonnen wurde, war die Messlatte hoch – drübergesprungen ist {sieger}",
            "Serien sind da, um geprüft zu werden – die Prüfung gewinnt {sieger}: {score}",
            "Schwung im Spiel: Am Ende nimmt ihn {sieger} mit – {score} gegen {verlierer}",
            "Viel Selbstvertrauen auf dem Platz – die Punkte sichert sich {sieger}: {score}",
            "Wer in Form ist, zeigt es; wer gewinnt, beweist es: {sieger} – {score}",
            "Momentum ist flüchtig, drei Punkte sind es nicht: {sieger} schlägt {verlierer}",
            "Der Formcheck hat einen Gewinner: {score} für {sieger}",
            "Lauf hin oder her – auf dem Rasen zählte nur dieser Nachmittag: {sieger} siegt {score}",
            "Heiße Phase, kühler Kopf: {sieger} entscheidet das Duell gegen {verlierer}",
            "Die Tagesform sprach ihr Urteil: {score} für {sieger}"
        ],
        draw: [
            "Wer auf die Fortsetzung einer Siegesserie wettete, bekommt ein {score}",
            "Schwung trifft Widerstand: {heim} und {gast} trennen sich {score}",
            "Formstärke garantiert nichts – das Remis beweist es: {score}",
            "Ein {score}, das Serien relativiert: {heim} gegen {gast}",
            "Das Momentum macht Pause: {heim} und {gast} teilen die Punkte",
            "Auch die beste Form beißt sich manchmal fest: {score}",
            "Der Lauf des einen, der Stolz des anderen – Ergebnis: {score}",
            "Angekündigt war Schwung, geliefert wurde Ausgeglichenheit: {score}"
        ]
    },
    // ASYMMETRISCH: mind. ein Team in der Krise – nie festlegen, welches
    formkrise: {
        win: [
            "Krisenstimmung lag in der Luft – gejubelt hat am Ende {sieger}: {score}",
            "Wo die Nerven blank liegen, hilft nur Nüchternheit: {sieger} gewinnt {score}",
            "Das Duell mit Krisen-Beigeschmack endet {score} – {sieger} nimmt die Punkte",
            "Zwischen Frust und Aufbruch: {sieger} entscheidet das Spiel gegen {verlierer}",
            "In schweren Wochen zählen einfache Wahrheiten: {score} für {sieger}",
            "Druck war genug im Spiel – standgehalten hat {sieger}: {score}",
            "Wo Zweifel mitspielen, entscheidet Charakter: {sieger} beweist ihn – {score}",
            "Ein Spiel, das mehr über Moral als über Taktik erzählte: {score} für {sieger}",
            "Die Sorgen spielten mit – die Punkte gehen trotzdem an {sieger}: {score}",
            "Von Verunsicherung war bei {sieger} wenig zu sehen: {score} gegen {verlierer}",
            "Schwere Zeiten, klares Ergebnis: {score} für {sieger}",
            "Wer durchhängt, braucht Haltepunkte; wer gewinnt, hat sie gefunden: {sieger} – {score}",
            "Gegen die Verunsicherung hilft nur Fußball: {sieger} spielt ihn – {score}"
        ],
        draw: [
            "Ein {score}, das keine Wende erzählt: {heim} gegen {gast}",
            "Die Zweifel bleiben im Spiel: {heim} und {gast} trennen sich {score}",
            "Wer Aufwind suchte, fand Flaute: {score}",
            "Ein Punkt als Trostpflaster – Heilung geht anders: {score}",
            "Zwischen Hoffnung und Hängepartie: {heim} gegen {gast} endet {score}",
            "Das Remis beruhigt niemanden so richtig: {score}",
            "Auch ein {score} kann schwer wiegen, wenn die Wochen lang sind",
            "Stimmungsaufhellung vertagt: {heim} und {gast} spielen {score}"
        ]
    },
    // ASYMMETRISCH: Über-/Unterperformer vs. Vorsaison – nie festlegen, welche Seite
    ueberraschung: {
        win: [
            "Wo die Saison Erwartungen sprengt, passt dieses Ergebnis ins Bild: {score} für {sieger}",
            "Prognosen altern schnell in dieser Saison – {sieger} gewinnt {score}",
            "Das Überraschungsmoment der Saison färbt auch auf dieses Duell ab: {sieger} siegt {score}",
            "Wer die Tabelle im Sommer getippt hat, tippt jetzt neu: {score} für {sieger}",
            "Diese Saison schreibt eigene Drehbücher – die heutige Szene gehört {sieger}: {score}",
            "Erwartungen sind Schall und Rauch, Punkte sind Punkte: {sieger} nimmt sie mit",
            "Von wegen vorhersehbar: {sieger} entscheidet das Duell gegen {verlierer} – {score}",
            "Die Story dieser Saison bekommt ein neues Kapitel – Autor: {sieger} ({score})",
            "Soll noch einer sagen, man wüsste vorher, wie es ausgeht: {score} für {sieger}",
            "Zwischen Höhenflug und Bauchlandung liegt manchmal nur ein Spieltag: {sieger} jubelt – {score}",
            "Das Duell mit Überraschungsfaktor hält sein Versprechen: {sieger} schlägt {verlierer}",
            "Wer hier auf die Vorsaison wettete, hat verloren – {sieger} gewinnt {score}"
        ],
        draw: [
            "Ausgerechnet das Duell mit Überraschungsfaktor endet gewöhnlich: {score}",
            "Diesmal keine Pointe – {heim} und {gast} trennen sich {score}",
            "Die Saison der Überraschungen gönnt sich eine Verschnaufpause: {score}",
            "Erwartung hin, Realität her – heute einigt man sich auf {score}",
            "Auch Überraschungsgeschichten haben Ruhekapitel: {heim} gegen {gast} {score}",
            "Keine neue Wendung, nur ein Punkt für jeden: {score}"
        ]
    }
};

// ============================================================================
// PAKET 3 – Vorschau-Anrisse (Spiel des Tages, VOR dem Spiel).
// Struktur: reasonKey → [ ...zeilen... ]. Slots NUR {heim}/{gast} (kein Ergebnis!).
// Leeres Array → Fallback aufs Label "Spiel des Tages · {reason}".
// Spec: fable-deliverables/paket3-vorschau/SPEC.md
// ============================================================================
window.REPORTS_PREVIEW = {
    derby: [
        "Derby-Zeit! {heim} empfängt den Rivalen {gast} – die Region hält den Atem an",
        "Kurze Anfahrt, große Rivalität: {gast} gastiert bei {heim}",
        "Wenn {heim} und {gast} aufeinandertreffen, ist Tabelle Nebensache",
        "Das Nachbarschaftsduell steigt: {heim} gegen {gast} – Zündstoff garantiert",
        "Prestige schlägt Punkte? Im Derby zwischen {heim} und {gast} gibt es beides zu holen",
        "Die Stadt spricht nur über ein Spiel: {heim} gegen {gast}",
        "Alte Rivalen, neue Rechnung: {gast} kommt zu {heim}",
        "Lokalkolorit pur: {heim} und {gast} unter sich",
        "Derbystimmung liegt in der Luft – {heim} bittet {gast} zum Tanz",
        "Nachbarn unter sich, Freunde erst nach Abpfiff: {heim} gegen {gast}",
        "Hier geht es um mehr als drei Punkte: {heim} empfängt {gast} zum Derby"
    ],
    tradition: [
        "Ein Duell mit Klang: {heim} empfängt {gast}",
        "Große Bühne im Spielplan: {heim} gegen {gast} verspricht Fußball mit Geschichte",
        "Wenn dieses Duell ruft, schauen auch Neutrale hin: {heim} – {gast}",
        "Tradition liegt in der Luft, Punkte auf dem Tisch: {heim} gegen {gast}",
        "Ein Spiel für Liebhaber: {gast} zu Gast bei {heim}",
        "Namen, die man kennt, Duelle, die man sehen will: {heim} gegen {gast}",
        "Der Spielplan schenkt uns ein besonderes Aufeinandertreffen: {heim} – {gast}",
        "Geschichte garantiert keine Punkte – Spannung garantiert dieses Duell: {heim} gegen {gast}",
        "Fußball-Romantiker, aufgepasst: {heim} empfängt {gast}",
        "Aura trifft Alltag, {heim} trifft {gast}"
    ],
    topduell: [
        "Gipfeltreffen! {heim} und {gast} kreuzen ganz oben die Klingen",
        "Das Beste, was der Spieltag zu bieten hat: {heim} gegen {gast}",
        "Oben trifft oben: {heim} empfängt {gast} zum Duell der Spitzenteams",
        "Wer bleibt vorn? {heim} und {gast} klären es unter sich",
        "Spitzenspiel mit Sprengkraft: {gast} reist zu {heim}",
        "Direkter geht es nicht: {heim} gegen {gast} im Duell der Verfolgten und Verfolger",
        "Die Konkurrenz schaut genau hin: {heim} fordert {gast} – oder umgekehrt?",
        "Wenn die Tabelle Regie führt, ist das hier der Hauptfilm: {heim} gegen {gast}",
        "Ganz oben wird abgerechnet: {heim} empfängt {gast}",
        "Zwei Ambitionen, ein Platz an der Sonne: {heim} gegen {gast}"
    ],
    abstiegskrimi: [
        "Kellerduell mit Sprengkraft: {heim} empfängt {gast} zum Spiel der Spiele im Abstiegskampf",
        "Unten zählt jedes Spiel doppelt – dieses dreifach: {heim} gegen {gast}",
        "Zwei Sorgenkinder, ein direktes Duell: {heim} gegen {gast}",
        "Wer verliert, steckt tiefer drin: {heim} empfängt {gast} im Kellerduell",
        "Sechs-Punkte-Spiel im Tabellenkeller: {gast} muss zu {heim}",
        "Im Abstiegskampf gibt es keine kleinen Spiele – aber große: {heim} gegen {gast}",
        "Zittern verboten, Punkten Pflicht: {heim} und {gast} unter Druck",
        "Das Duell, das keiner verlieren darf: {heim} gegen {gast}",
        "Existenzfragen werden auf dem Rasen beantwortet: {heim} empfängt {gast}",
        "Der Keller bebt: {heim} und {gast} spielen um mehr als drei Punkte"
    ],
    europa: [
        "Verfolgerduell mit Fernwirkung: {heim} empfängt {gast}",
        "Beide wollen nach oben – nur einer kann vorlegen: {heim} gegen {gast}",
        "Im Rennen um die begehrten Plätze kommt es zum direkten Vergleich: {heim} – {gast}",
        "Wer bleibt im Windschatten der Spitze? {heim} und {gast} klären es direkt",
        "Rückenwind zu vergeben: {heim} gegen {gast} im Duell der Verfolger",
        "Die Aussicht ist schön da oben – {heim} und {gast} wollen beide hin",
        "Ein Sieg hier zählt doppelt im Aufholrennen: {heim} empfängt {gast}",
        "Das Verfolgerfeld sortiert sich: {gast} gastiert bei {heim}",
        "Ambitionen im Direktvergleich: {heim} gegen {gast}",
        "Wer träumt weiter, wer wacht auf? {heim} gegen {gast} im Verfolgerduell"
    ],
    rangduell: [
        "Tabellennachbarn unter sich: {heim} empfängt {gast}",
        "Auf Tuchfühlung im Klassement – jetzt auf Tuchfühlung auf dem Rasen: {heim} gegen {gast}",
        "Direkter Vergleich, direkte Folgen: {heim} gegen {gast}",
        "Wer schaut nach dem Wochenende auf wen herab? {heim} und {gast} klären es",
        "Zwischen diesen beiden passt kein Blatt Papier – sagt die Tabelle: {heim} gegen {gast}",
        "Nachbarschaftsstreit der Tabelle: {gast} reist zu {heim}",
        "Gleiche Ziele, gleiche Tabellenregion: {heim} empfängt {gast}",
        "Hier geht es um die Blickrichtung: nach oben oder nach unten – {heim} gegen {gast}",
        "Das Duell der Punktnachbarn verspricht Brisanz: {heim} – {gast}",
        "Wer die Nase vorn haben will, muss hier liefern: {heim} gegen {gast}"
    ],
    formstark: [
        "Formcheck: In diesem Duell steckt zuletzt viel Schwung – {heim} empfängt {gast}",
        "Ein Lauf steht auf dem Prüfstand: {heim} gegen {gast}",
        "Wer bremst hier wen? {heim} gegen {gast} – zuletzt rollte es ordentlich",
        "Serien lieben Herausforderungen: {heim} gegen {gast} liefert eine",
        "Da kommt Schwung ins Spiel: {gast} gastiert bei {heim}",
        "Selbstvertrauen trifft Gelegenheit: {heim} empfängt {gast}",
        "Die Formkurve zeigt hier zuletzt steil nach oben – Fortsetzung offen: {heim} gegen {gast}",
        "Heiße Wochen, heißes Duell: {heim} gegen {gast}",
        "Momentum ist die härteste Währung – hier wird sie gehandelt: {heim} – {gast}",
        "Läuft es weiter? {heim} und {gast} geben die Antwort auf dem Platz"
    ],
    formkrise: [
        "Hier will jemand raus aus dem Tief – Gelegenheit dazu: {heim} gegen {gast}",
        "Krisenbewältigung auf Rasen: {heim} empfängt {gast}",
        "Die Sorgenfalten spielen mit: {heim} gegen {gast}",
        "Zuletzt lief wenig zusammen – jetzt zählt nur dieses Spiel: {heim} gegen {gast}",
        "Ein Spiel als Chance zur Wende: {heim} empfängt {gast}",
        "Der Druck sitzt mit auf der Bank: {heim} gegen {gast}",
        "Durchatmen oder weiter grübeln? Dieses Duell entscheidet mit: {heim} – {gast}",
        "Irgendwo zwischen Pflicht und Panik: {heim} gegen {gast}",
        "Ein Sieg heilt viele Wunden – das wissen hier alle: {heim} gegen {gast}",
        "Formtief trifft Fußballnachmittag: {heim} empfängt {gast} – Besserung nicht ausgeschlossen"
    ],
    ueberraschung: [
        "Die Saison hat hier schon einige Erwartungen über den Haufen geworfen: {heim} gegen {gast}",
        "Vorsaison? Vergessen Sie die Vorsaison: {heim} empfängt {gast}",
        "Hier spielt eine der Geschichten der Saison mit: {heim} gegen {gast}",
        "Tippzettel zerknüllen, hinsetzen, staunen: {heim} – {gast}",
        "Erwartung und Wirklichkeit treffen sich zum Direktvergleich: {heim} gegen {gast}",
        "Wer hätte das im Sommer gedacht? {heim} gegen {gast} hat Überraschungspotenzial",
        "Die Tabelle erzählt hier eine unerwartete Geschichte – nächstes Kapitel: {heim} gegen {gast}",
        "Höhenflüge, Bauchlandungen – diese Saison kann beides. Jetzt: {heim} gegen {gast}",
        "Formkurven, die niemand kommen sah: {heim} und {gast} im direkten Duell",
        "Das Drehbuch dieser Saison liebt Wendungen – hier könnte die nächste warten: {heim} gegen {gast}"
    ]
};

// ============================================================================
// Saison-Rückblick (Paket 5) – 1–2 Sätze über der Abschlusstabelle einer
// vergangenen Saison. Assembler: app/reports.js (_seasonReview).
// Ära-Register (Grundregel 3): e63 1963–70 formell/Pathos (deckt auch DDR vor
// 1963 ab) · e71 1971–82 sachlich · e83 1983–94 TV-griffig · e95 1995–2009
// technischer · e10 2010+ Broadcast/Social. NIE Zeilen zwischen Registern mischen.
// Slots: {meister} {vize} {liga} {saison} {punkte} (nur "… Punkte/Zähler"),
//   {vspPhrase} = Dativ-Phrase nur nach "mit/vor"; abstieg: NUR {absteiger}
//   (fertige Liste, 1..n Namen → numerus-invariante Konstruktionen!) + {liga}/{saison}.
// Liga-neutral halten: Pools bedienen 1. BL, DDR-Oberliga UND Kreisliga.
// Nur Abschluss-Wissen: keine Verlaufs-Behauptungen ("führte von Beginn an").
// Spec: fable-deliverables/paket5-rueckblick/SPEC.md (+ FABLE-GRUNDREGELN.md)
// ============================================================================
window.REPORTS_SEASON = {
    meister: {
        // ---- klarer Titelgewinn (Vorsprung ≥8 bzw. ≥5 in der 2-Punkte-Ära) ----
        dominanz: {
            e63: [
                "Eine Machtdemonstration sondergleichen: {meister} enteilt der Konkurrenz und wird überlegen Meister der {liga}.",
                "Mit {vspPhrase} Vorsprung thront {meister} über allen – ein Meister von beeindruckendem Format.",
                "Die Spielzeit {saison} kennt nur einen Herrn: {meister} lässt der Konkurrenz nicht den Hauch einer Chance.",
                "Souverän, überlegen, unerreicht – {meister} erringt die Meisterschaft mit großem Vorsprung.",
                "Auch der wackere Verfolger {vize} vermag {meister} nicht aufzuhalten: ein Titel der Extraklasse.",
                "Das Feld hat das Nachsehen: {meister} wird mit {vspPhrase} Vorsprung Meister – welch eine Demonstration."
            ],
            e71: [
                "{meister} dominiert die {liga} nach Belieben und holt den Titel mit {vspPhrase} Vorsprung.",
                "Ein Meister ohne ernsthafte Konkurrenz: {meister} distanziert {vize} deutlich.",
                "Die nackten Zahlen genügen: {punkte} Punkte, {vspPhrase} Vorsprung – {meister} ist verdienter Meister.",
                "Souveräner geht es kaum: {meister} gewinnt den Titel der {liga} mit großem Abstand.",
                "{vize} kämpft tapfer, doch gegen {meister} ist in dieser Saison kein Kraut gewachsen – deutlicher Titelgewinn.",
                "Der Abstand spricht Bände: {meister} wird mit {vspPhrase} Vorsprung Meister."
            ],
            e83: [
                "Kein Titelrennen, ein Durchmarsch: {meister} lässt der Konkurrenz keine Chance!",
                "{meister} in einer eigenen Liga – mit {vspPhrase} Vorsprung wird der Titel eingesackt.",
                "Überlegenheit in Zahlen: {vspPhrase} Vorsprung! {meister} ist das Team der Saison.",
                "Die Konkurrenz sieht nur die Rücklichter: {meister} holt sich den Titel im Alleingang.",
                "Meister mit Ausrufezeichen: {meister} deklassiert das Feld der {liga}.",
                "{vize} strampelt sich ab – doch {meister} ist in dieser Saison eine Nummer zu groß."
            ],
            e95: [
                "Die Daten lassen keinen Zweifel: {meister} dominiert die Saison {saison} und holt den Titel mit {vspPhrase} Vorsprung.",
                "Ein Titelgewinn der Kategorie souverän: {meister} distanziert {vize} um Längen.",
                "{meister} spielt die Konkurrenz über die Distanz in Grund und Boden – Meisterschaft mit {vspPhrase} Vorsprung.",
                "Effizienz und Konstanz: Am Ende trennen {meister} und die Verfolger Welten.",
                "Benchmark {meister}: {punkte} Punkte und {vspPhrase} Vorsprung – die Konkurrenz analysiert, der Meister feiert.",
                "Das Titelrennen der {liga}? Fand ohne echte Spannung statt – {meister} ist der überlegene Champion."
            ],
            e10: [
                "Absolute Dominanz: {meister} holt den Titel mit {vspPhrase} Vorsprung – eine Ansage an die ganze Liga!",
                "{meister} im Dominanz-Modus: Meisterschaft mit {vspPhrase} Polster.",
                "Einbahnstraße Richtung Titel: {meister} lässt {vize} und Co. keine Chance.",
                "Der Meister-Check ist schnell erledigt: {meister} war in der Saison {saison} nicht zu stoppen.",
                "{punkte} Punkte, Vorsprung: deutlich – {meister} dominiert die {liga} nach Belieben.",
                "Keine Diskussion nötig: {meister} ist der überragende Meister der Saison {saison}.",
                "{meister} macht kurzen Prozess mit dem Titelrennen – {vize} bleibt nur der Ehrenplatz.",
                "Saison-Dominator {meister}: Der Titel in der {liga} geht hochverdient an die Nummer eins.",
                "Meilenweit voraus: {meister} enteilt dem Feld und feiert eine Meisterschaft ohne Zitterpartie.",
                "Dominanz pur: {meister} holt sich die Meisterschaft der {liga} – und zwar mit Ausrufezeichen."
            ]
        },
        // ---- knappes Titelrennen (Vorsprung ≤2 bzw. ≤1; bei 0 keine {vspPhrase}-Zeilen nötig – Filter im Assembler) ----
        fotofinish: {
            e63: [
                "Ein Herzschlagfinale, wie es die {liga} selten sah: {meister} ringt {vize} im Kampf um die Meisterschaft nieder.",
                "Um Haaresbreite: {meister} sichert sich die Meisterehren hauchdünn vor {vize}.",
                "Welch ein Kopf-an-Kopf-Rennen! Am Ende jubelt {meister}, während {vize} bittere Tränen weint.",
                "Die Entscheidung fällt denkbar knapp: {meister} ist Meister, {vize} bleibt der undankbare zweite Rang.",
                "Mit {vspPhrase} Vorsprung – knapper geht es kaum – erringt {meister} den Titel der {liga}.",
                "Fortuna küsst {meister}: Im engsten Titelrennen behält die Elf die Oberhand, {vize} geht leer aus."
            ],
            e71: [
                "Ein enges Titelrennen in der {liga} – am Ende hat {meister} mit hauchdünnem Vorsprung die Nase vorn.",
                "Hauchdünne Entscheidung: {meister} verweist {vize} denkbar knapp auf Platz zwei.",
                "Ein Fotofinish um die Meisterschaft: {meister} setzt sich im Endspurt gegen {vize} durch.",
                "Knapper war ein Titel selten: {meister} und {vize} trennt am Ende fast nichts – die Meisterschaft holt {meister}.",
                "Nervenstärke auf der Zielgeraden: {meister} bringt den hauchdünnen Vorsprung vor {vize} ins Ziel.",
                "Die Saison {saison} findet ihren Meister erst im Endspurt: {meister} triumphiert knapp."
            ],
            e83: [
                "Herzschlagfinale in der {liga}! {meister} schnappt {vize} den Titel vor der Nase weg.",
                "Drama pur im Titelkampf – am Ende reißt {meister} die Arme hoch, {vize} ist am Boden.",
                "Wer hat die besseren Nerven? {meister}! Der Titel geht hauchdünn an den neuen Meister.",
                "Fotofinish um die Meisterschaft: {meister} vorn, {vize} geschlagen – knapper geht's nicht.",
                "Titel-Krimi in der {liga}: {meister} behält im Nervenspiel gegen {vize} die Oberhand.",
                "Bitter für {vize}, großartig für {meister}: Zwischen Platz eins und zwei passt kein Blatt Papier."
            ],
            e95: [
                "Die Entscheidung fällt im Fotofinish: {meister} sichert sich den Titel hauchdünn vor {vize}.",
                "Ein Titelrennen für die Statistiker: Am Ende trennt {meister} und {vize} nur ein Wimpernschlag.",
                "Nervenschlacht im Titelkampf – {meister} macht das Rennen, {vize} bleibt die Rolle des tragischen Zweiten.",
                "Minimaler Abstand, maximale Dramatik: {meister} holt die Meisterschaft der {liga} denkbar knapp.",
                "Das engste Titelrennen, das man sich vorstellen kann: {meister} setzt sich mit {vspPhrase} Vorsprung durch.",
                "Kopf an Kopf bis zum Schluss: {meister} entscheidet das Duell mit {vize} für sich – Meisterschaft auf der Ziellinie."
            ],
            e10: [
                "Herzschlagfinale deluxe: {meister} krallt sich den Titel hauchdünn – {vize} bleibt nur der Frust.",
                "Titel-Thriller in der {liga}! {meister} gewinnt das Fotofinish gegen {vize}.",
                "Enger geht's nicht: {meister} holt die Meisterschaft mit {vspPhrase} Vorsprung – Drama pur!",
                "Die Saison {saison} liefert ein Finale furioso – und {meister} hat am Ende die Nase vorn.",
                "Nerven aus Stahl: {meister} entscheidet das engste Titelrennen für sich.",
                "Gänsehaut bis zur letzten Tabellenzeile – dann jubelt {meister}, und {vize} steht als tragischer Zweiter da.",
                "Wimpernschlag-Finale: {meister} Meister, {vize} Zweiter – dazwischen passt kein Blatt Papier.",
                "Titelentscheidung auf des Messers Schneide: {meister} behält die Nerven und holt den Titel der {liga}.",
                "Was für ein Saisonausgang! {meister} schnappt sich die Meisterschaft im Fotofinish.",
                "Krimi-Alarm in der {liga}: Am Ende steht {meister} hauchdünn vor {vize} – Meisterschaft geholt!"
            ]
        },
        // ---- normaler Titelgewinn (alles dazwischen) ----
        standard: {
            e63: [
                "Die Meisterschaft der {liga} geht in diesem Jahre an {meister} – ein verdienter Triumph.",
                "{meister} darf sich Meister nennen: Am Ende der Spielzeit {saison} steht die Elf ganz oben.",
                "Ein Ruhmesblatt für {meister}: Der Titel der {liga} ist der verdiente Lohn einer starken Spielzeit.",
                "Am Ende aller Mühen steht {meister} auf dem Gipfel – die Meisterehren der Spielzeit {saison} sind vergeben.",
                "Mit {punkte} Zählern beschließt {meister} die Spielzeit als Meister – Respekt vor dieser Leistung.",
                "Die Fußballfreunde verneigen sich: {meister} ist Meister der {liga}.",
                "{meister} setzt sich die Krone der {liga} auf – {vize} muss sich mit dem zweiten Rang bescheiden."
            ],
            e71: [
                "{meister} sichert sich den Titel in der {liga} – am Ende ein verdienter Meister.",
                "Die Saison {saison} hat ihren Meister: {meister} verweist {vize} auf den zweiten Platz.",
                "Konstanz über die gesamte Spielzeit: {meister} steht verdient an der Spitze der {liga}.",
                "{meister} holt den Titel mit {punkte} Punkten – {vize} bleibt die Vizemeisterschaft.",
                "Die Bilanz spricht für sich: {meister} beendet die Saison {saison} als Meister der {liga}.",
                "Ein Erfolg der Beständigkeit: {meister} gewinnt die Meisterschaft der {liga}."
            ],
            e83: [
                "Titel-Jubel bei {meister}! Die Saison {saison} endet mit der Meisterschaft in der {liga}.",
                "{meister} schnappt sich den Titel – {vize} guckt als Zweiter in die Röhre.",
                "Da können die Fans feiern: {meister} holt die Meisterschaft!",
                "{punkte} Punkte, Platz eins, Titel: {meister} macht den Sack zu.",
                "Der große Coup: {meister} krönt sich zum Meister der {liga}.",
                "Meister {meister}! {vize} hat das Nachsehen."
            ],
            e95: [
                "Die Abrechnung der Saison {saison} ist eindeutig: {meister} holt mit {punkte} Punkten den Titel.",
                "Konstanz zahlt sich aus: {meister} sichert sich die Meisterschaft vor {vize}.",
                "{meister} entscheidet das Titelrennen der {liga} für sich – {vize} wird Zweiter.",
                "Am Ende stehen {punkte} Punkte und der Titel: {meister} ist das Maß der Dinge in der {liga}.",
                "Der Blick auf die Abschlusstabelle: {meister} oben, {vize} dahinter – der Titel ist vergeben.",
                "{meister} liefert die stabilste Saison und wird dafür mit der Meisterschaft belohnt."
            ],
            e10: [
                "Titel-Party bei {meister}! Die Saison {saison} gehört ganz dem neuen Meister der {liga}.",
                "Saison-Fazit: {meister} holt den Titel, {vize} wird bester Verfolger.",
                "{meister} macht die Meisterschaft klar – {punkte} Punkte sprechen eine deutliche Sprache.",
                "Die Story der Saison: {meister} krönt sich zum Meister der {liga}.",
                "Abgerechnet wird zum Schluss – und da steht {meister} ganz oben.",
                "{meister} feiert den Titel, {vize} nimmt die Vizemeisterschaft mit.",
                "Meister-Check {saison}: {meister} liefert ab und steht verdient auf Platz eins.",
                "Der Titel geht an {meister} – die Saison {saison} ist Geschichte.",
                "Was für eine Spielzeit! Am Ende jubelt {meister} über die Meisterschaft in der {liga}.",
                "{meister} stemmt den Titel – {vize} bleibt Rang zwei.",
                "Platz eins, {punkte} Punkte, Meister: {meister} setzt das Ausrufezeichen der Saison {saison}."
            ]
        }
    },
    // ---- Absteiger-Satz (nur wenn Absteiger bekannt). {absteiger} = fertige Liste (1..n Namen!)
    //      → NIE als Subjekt eines flektierten Verbs, nur invariante Konstruktionen. ----
    abstieg: {
        e63: [
            "Bittere Stunden für {absteiger}: Der Gang nach unten ist besiegelt.",
            "Abschied nehmen heißt es für {absteiger} – das Klassement kennt kein Erbarmen.",
            "Das harte Los des Abstiegs trifft {absteiger} – ein schwerer Gang.",
            "Für {absteiger} endet die Spielzeit {saison} mit dem bitteren Gang nach unten.",
            "Die Sorgen wurden zur Gewissheit: Für {absteiger} ist der Abstieg besiegelt.",
            "Kein Pardon am Ende der Spielzeit: {absteiger} – der Weg führt hinab."
        ],
        e71: [
            "Für {absteiger} ist der Abstieg aus der {liga} besiegelt.",
            "Am Tabellenende herrscht Tristesse: {absteiger} – der Gang nach unten steht fest.",
            "Die Saison {saison} endet für {absteiger} mit dem Abstieg.",
            "Hartes Verdikt der Tabelle: Für {absteiger} geht es eine Etage tiefer.",
            "Der Abstieg trifft {absteiger} – die Punkte reichten am Ende nicht.",
            "Abschied aus der {liga}: {absteiger} – die Zukunft liegt eine Klasse tiefer."
        ],
        e83: [
            "Abstiegs-K.o. für {absteiger} – da helfen auch keine Durchhalteparolen mehr.",
            "Bittere Gewissheit am Saisonende: Für {absteiger} geht die Fahrt nach unten.",
            "Die Fans leiden mit: {absteiger} – Abstieg aus der {liga}!",
            "Endstation Tabellenkeller: Für {absteiger} ist der Traum vom Klassenerhalt geplatzt.",
            "Der Hammer am Saisonende: {absteiger} – runter geht's!",
            "Kein Happy End im Tabellenkeller: Für {absteiger} heißt es künftig eine Liga tiefer antreten."
        ],
        e95: [
            "Der Abstieg ist perfekt: Für {absteiger} endet die Saison {saison} im Tabellenkeller.",
            "Die nüchterne Bilanz am Ende: Abstieg für {absteiger} – die Punktausbeute reichte nicht.",
            "Klassenerhalt verpasst: {absteiger} – der Neuaufbau beginnt eine Etage tiefer.",
            "Das Abstiegsgespenst hat zugeschlagen: {absteiger} – Abschied aus der {liga}.",
            "Am Ende fehlen die entscheidenden Punkte: Für {absteiger} geht es runter.",
            "Saisonziel verfehlt: Für {absteiger} steht der bittere Gang eine Liga tiefer an."
        ],
        e10: [
            "Abstiegs-Drama am Saisonende: Für {absteiger} ist die Zeit in der {liga} vorbei.",
            "Bitterer Abschied: {absteiger} – der Abstieg ist besiegelt.",
            "Der Absturz ist perfekt: Für {absteiger} geht die Reise nach unten.",
            "Keine Rettung mehr: {absteiger} – Abstieg aus der {liga}.",
            "Saison zum Vergessen: Für {absteiger} endet {saison} mit dem Abstieg.",
            "Die Tabelle lügt nicht – für {absteiger} heißt es: eine Etage tiefer neu angreifen.",
            "Tränen im Tabellenkeller: Der Abstieg trifft {absteiger} mit voller Wucht.",
            "Klassenerhalt? Verpasst. Für {absteiger} geht es runter.",
            "Harte Landung: {absteiger} – nächste Saison eine Liga tiefer.",
            "Am Ende steht die bittere Gewissheit: Für {absteiger} ist der Abstieg Realität."
        ]
    }
};

// ============================================================================
// Pressestimmen (Paket 4) – zwei Trainer-Zitate unter dem Spiel des Tages.
// Assembler: app/reports.js (_pressVoices). Kein Ära-Register (nur Live-Spieltage).
// Jede Zeile = Zitat in Ich-/Wir-Form OHNE Anführungszeichen (setzt der Renderer).
// Einziger Slot: {gegner} (Name des anderen Teams, artikellos einsetzbar).
// KEINE Spielverlaufs-Details (kein Elfmeter/Karte/Halbzeitstand), keine Personen/
// Namen, liga-neutral (läuft in 1. BL UND Kreisliga). Perspektive strikt:
// sieger nur aus Siegersicht, verlierer nur aus Verlierersicht, beide = Remis-tauglich
// für BEIDE Seiten (remis_torreich: muss für 1:1 UND 4:4 funktionieren).
// Pool-Länge nie exakt 13 (Offset-Kollision im Assembler).
// Spec: fable-deliverables/paket4-pressestimmen/SPEC.md (+ FABLE-GRUNDREGELN.md)
// ============================================================================
window.REPORTS_PRESS = {
    kantersieg: {
        sieger: [
            "Das war ein richtig guter Tag – heute hat einfach alles funktioniert.",
            "Ein großes Kompliment an die Mannschaft – so stellen wir uns das vor.",
            "So ein Ergebnis klingt einfach, aber die Jungs mussten es sich trotzdem erarbeiten.",
            "Wir bleiben demütig – aber heute dürfen wir das auch mal genießen.",
            "Wenn alles zusammenläuft, sieht es so aus wie heute. Ich freue mich riesig für die Mannschaft.",
            "Das nehmen wir gerne mit, aber nächste Woche zählt es wieder von vorn.",
            "Ich habe eine Mannschaft gesehen, die genau wusste, was sie will.",
            "An so einem Tag macht Fußball einfach Spaß – das war ein Auftritt nach meinem Geschmack.",
            "Die Höhe geht für mich in Ordnung. Trotzdem: Respekt vor {gegner}, so ein Tag kann jeden treffen.",
            "Wichtig ist, dass wir das richtig einordnen – so ein Ergebnis gibt es nicht jede Woche.",
            "Ich freue mich vor allem über die Art und Weise – das war über weite Strecken sehr reif.",
            "Heute hat man gesehen, was in dieser Mannschaft steckt."
        ],
        verlierer: [
            "Dazu gibt es nicht viel zu sagen – das war heute viel zu wenig, in allen Bereichen.",
            "Wir müssen uns bei unseren Fans entschuldigen. So dürfen wir uns nicht präsentieren.",
            "Das tut weh. Wir werden das intern klar ansprechen.",
            "Glückwunsch an {gegner}, das war verdient. Wir müssen diese Klatsche schnell aus den Köpfen kriegen.",
            "So ein Tag wirft Fragen auf – und wir müssen die Antworten auf dem Platz geben.",
            "Ich nehme die Mannschaft in die Pflicht, aber auch mich selbst. Das war ein gebrauchter Tag.",
            "Da hat heute überhaupt nichts funktioniert. Das muss uns eine Lehre sein.",
            "Wir haben in allen Belangen den Vergleich verloren. Mehr gibt es dazu nicht zu sagen.",
            "Jetzt bloß nicht alles infrage stellen – aber dieses Spiel muss uns wachrütteln.",
            "Es hilft nichts, sich zu verstecken. Wir stellen uns der Kritik.",
            "Das Ergebnis spricht eine deutliche Sprache. Da gibt es nichts schönzureden.",
            "Ein rabenschwarzer Tag. Ab morgen arbeiten wir das auf."
        ]
    },
    deutlich: {
        sieger: [
            "Ein verdienter Sieg, denke ich. Die Mannschaft hat einen konzentrierten Auftritt hingelegt.",
            "Wir haben das über die gesamte Distanz seriös gemacht. Damit bin ich sehr zufrieden.",
            "Genau so wollten wir auftreten: klar, konsequent, ohne Nachlässigkeiten.",
            "Drei Punkte und ein ordentlicher Auftritt – mehr kann man von so einem Tag nicht verlangen.",
            "Kompliment an die Jungs, sie haben umgesetzt, was wir uns vorgenommen haben.",
            "Das war ein reifer Auftritt. Aber wir wissen auch, woran wir weiter arbeiten müssen.",
            "Mit dem Ergebnis und der Leistung bin ich einverstanden – so darf es weitergehen.",
            "Wir sind froh über die drei Punkte. {gegner} hat es uns phasenweise schwer gemacht.",
            "Heute stimmte die Balance aus Kontrolle und Zug zum Tor.",
            "Ich habe viele gute Ansätze gesehen. Den Schwung nehmen wir mit.",
            "Ein souveräner Auftritt – die Mannschaft hat sich das redlich verdient.",
            "So stellen wir uns Fußball vor: geduldig bleiben und konsequent zuschlagen."
        ],
        verlierer: [
            "Das war heute zu wenig – gerade in den entscheidenden Momenten.",
            "Wir haben es {gegner} zu einfach gemacht. Diese Fehler müssen wir abstellen.",
            "Die Niederlage geht in Ordnung. Jetzt heißt es: aufstehen und weitermachen.",
            "Ich bin enttäuscht, keine Frage. Aber ich habe auch Dinge gesehen, auf denen wir aufbauen können.",
            "Am Ende war das eine klare Angelegenheit – so ehrlich müssen wir sein.",
            "Wir haben uns viel vorgenommen und wenig davon umgesetzt. Das ärgert mich.",
            "Uns hat heute in vielen Situationen die letzte Überzeugung gefehlt.",
            "Das Ergebnis tut weh, aber es kommt nicht von ungefähr. Wir schauen uns das genau an.",
            "Es gibt Tage, an denen man den Gegner stark macht. Heute war so einer.",
            "Wir dürfen jetzt nicht in Schockstarre verfallen – die nächste Aufgabe kommt bestimmt.",
            "Glückwunsch an {gegner} – wir waren heute in zu vielen Bereichen unterlegen.",
            "Diese Leistung müssen wir schonungslos analysieren. Und dann eine Reaktion zeigen."
        ]
    },
    knapp: {
        sieger: [
            "Das war ein hartes Stück Arbeit – umso schöner, dass wir uns belohnt haben.",
            "Solche engen Spiele entscheidet manchmal die Tagesform. Heute war das Glück auf unserer Seite.",
            "Ein Arbeitssieg, ganz klar. Aber genau solche Spiele bringen dich weiter.",
            "Kompliment an {gegner}, das war ein Duell auf Augenhöhe. Am Ende sind wir drangeblieben.",
            "Wir mussten alles reinwerfen – die Mannschaft hat sich diesen Sieg erkämpft.",
            "Diese drei Punkte fühlen sich besonders an, weil sie teuer erkauft waren.",
            "Es war eng, es war intensiv – und am Ende zählt nur, dass wir gewonnen haben.",
            "Nicht unser glanzvollster Auftritt, aber ein Sieg des Willens.",
            "In so engen Spielen brauchst du Geduld und Nerven. Beides hat die Mannschaft heute gezeigt.",
            "Ich bin erleichtert. {gegner} hat uns alles abverlangt.",
            "Am Ende haben Kleinigkeiten den Ausschlag gegeben – zum Glück für uns.",
            "Solche Siege sind Charaktersache. Darauf können die Jungs stolz sein."
        ],
        verlierer: [
            "Das ist bitter. Da war heute definitiv mehr drin für uns.",
            "Kleinigkeiten haben den Unterschied gemacht – leider zu unseren Ungunsten.",
            "Ich kann der Mannschaft kaum einen Vorwurf machen. Belohnt haben wir uns trotzdem nicht.",
            "Eine unnötige Niederlage. Das Spiel war absolut offen.",
            "So knapp zu verlieren tut immer weh. Aber die Richtung stimmt.",
            "Wir waren nah dran, das muss man sagen. Zählbares nehmen wir leider nicht mit.",
            "Das war ein Spiel auf Augenhöhe – umso ärgerlicher, dass wir mit leeren Händen dastehen.",
            "Heute fehlte nicht viel. Aber im Fußball zählt am Ende nur das Ergebnis.",
            "Ärgerlich – wenn du so eng dran bist, willst du mindestens einen Punkt mitnehmen.",
            "Wir haben alles versucht, es hat nicht sollen sein. Kopf hoch und weiter.",
            "Glückwunsch an {gegner} – auch wenn ich finde, dass ein Remis gerecht gewesen wäre.",
            "Diese Niederlage wurmt mich, weil sie vermeidbar war."
        ]
    },
    ueberraschung: {
        sieger: [
            "Was die Jungs heute geleistet haben, ist überragend. Niemand hat uns das zugetraut.",
            "Das ist ein besonderer Tag für den ganzen Verein. Diesen Sieg werden wir lange nicht vergessen.",
            "Wir wussten, dass wir eine Chance haben, wenn jeder ans Limit geht. Genau das ist passiert.",
            "David gegen Goliath – heute war es unser Tag.",
            "Vor dem Spiel hätten viele keinen Pfifferling auf uns gesetzt. Umso süßer schmeckt dieser Sieg.",
            "Respekt vor {gegner} – aber heute wollten wir es einfach mehr.",
            "Solche Spiele sind der Grund, warum wir diesen Sport lieben.",
            "Die Papierform spielt in so einem Spiel keine Rolle – das haben die Jungs eindrucksvoll bewiesen.",
            "Ich bin unglaublich stolz. Jeder Einzelne ist heute über sich hinausgewachsen.",
            "Wir feiern das heute – und ab morgen gilt wieder harte Arbeit.",
            "Auch ein Großer ist verwundbar, wenn du mutig bleibst. Das war unser Plan – und er ist aufgegangen.",
            "Dieser Sieg gehört den Jungs und unseren Fans."
        ],
        verlierer: [
            "Das ist ein herber Rückschlag. Wir sind unserer Favoritenrolle in keiner Weise gerecht geworden.",
            "Wenn du nicht ans Maximum gehst, verlierst du solche Spiele. Diese Lektion haben wir heute erteilt bekommen.",
            "Kompliment an {gegner} – sie wollten es heute mehr als wir. Das darf uns nicht passieren.",
            "Wir haben den Gegner nicht unterschätzt, aber wir haben es nicht auf den Platz gebracht.",
            "Diese Niederlage ist unnötig und ärgerlich. Da muss von uns deutlich mehr kommen.",
            "So ein Auftritt ist zu wenig für unsere Ansprüche. Punkt.",
            "Es gibt keine Ausreden. Wir haben heute schlicht nicht das gezeigt, was uns auszeichnet.",
            "Das Ergebnis ist ein Warnschuss zur richtigen Zeit – auch wenn er wehtut.",
            "Wer nicht bereit ist, hundert Prozent zu geben, wird bestraft. So einfach ist Fußball manchmal.",
            "Ich erwarte eine klare Reaktion – von der Mannschaft und von jedem Einzelnen.",
            "{gegner} hat leidenschaftlich gekämpft, und wir haben zu wenig dagegengesetzt.",
            "Solche Tage gehören zum Fußball – aber sie dürfen sich nicht wiederholen."
        ]
    },
    remis_torlos: {
        beide: [
            "Ein Punkt, zu null gespielt – damit kann ich leben, auch wenn vorne mehr möglich sein muss.",
            "Beide Abwehrreihen standen sehr gut. Für die Zuschauer war es sicher kein Leckerbissen.",
            "Uns hat heute im letzten Drittel die Durchschlagskraft gefehlt.",
            "So ein torloses Spiel ist selten ein Zufall – da haben sich zwei Mannschaften neutralisiert.",
            "Defensiv war das top, offensiv ausbaufähig. Den Punkt nehmen wir mit.",
            "Wir wollten mehr, aber {gegner} hat uns kaum Räume gegeben.",
            "Die Null steht – das ist die gute Nachricht des Tages.",
            "Es war ein zähes Spiel, das muss man ehrlich sagen. Am Ende geht das 0:0 in Ordnung.",
            "Manchmal fehlt einfach das eine Tor. Heute war so ein Tag.",
            "Kompakt gestanden, wenig zugelassen – jetzt müssen wir vorne wieder zielstrebiger werden.",
            "Ein Remis ohne Tore klingt langweilig, aber die Arbeit gegen den Ball war ordentlich.",
            "Wir nehmen die defensive Stabilität mit – am Rest arbeiten wir unter der Woche."
        ]
    },
    remis_torreich: {
        beide: [
            "Am Ende steht eine Punkteteilung, mit der beide Seiten leben können.",
            "Wir nehmen den Punkt mit – auch wenn sich das Spiel nach mehr angefühlt hat.",
            "Ein Unentschieden, das leistungsgerecht ist, denke ich.",
            "Beide Mannschaften haben alles reingeworfen – die Punkteteilung geht für mich in Ordnung.",
            "Natürlich willst du immer gewinnen. Aber mit diesem Auftritt kann ich grundsätzlich leben.",
            "Es war ein intensives Spiel gegen einen unbequemen Gegner. Der Punkt ist verdient.",
            "Ein Punkt ist nicht das Maximum, aber auch nicht nichts. Wir nehmen ihn mit.",
            "Gegen {gegner} musst du so ein Remis auch erst mal holen.",
            "Die Mannschaft hat sich in dieses Spiel richtig reingebissen – das nehme ich mit.",
            "Unterm Strich eine faire Punkteteilung zwischen zwei Mannschaften, die gewinnen wollten.",
            "Da war für beide Seiten etwas drin – am Ende hat sich keiner so richtig belohnt.",
            "Solche Spiele geben dir Erkenntnisse. Den Punkt nehmen wir als Grundlage für die nächsten Wochen."
        ]
    }
};

// ============================================================================
// Serien-Texte (Paket 6) – Lauf-/Krisen-Zeilen unter den Spieltags-Ergebnissen.
// Assembler: app/reports.js (_streakData/_streakLines). Nur Live-Ansicht, Serien
// zählen nur innerhalb der laufenden Saison. Kein Ära-Register.
// Slots: {team} (nicht deklinieren) · {n} = Kardinalzahl-WORT ("vier"…"zwölf",
// darüber Ziffer) – NUR kasus-invariant einsetzen ("{n} Siege in Folge",
// "seit {n} Spielen", "bei {n} Siegen"). KEINE Ordinalzahlen ("der fünfte Sieg").
// Zeilen müssen für jede Serienlänge passen (sieg/niederlage ab 4, ungeschlagen/
// sieglos ab 6, nach oben offen); ungeschlagen/sieglos enthalten Remis!
// Kein "Rekord"/"historisch", keine Tabellen-Behauptungen, liga-neutral.
// Spec: fable-deliverables/paket6-serien/SPEC.md (+ FABLE-GRUNDREGELN.md)
// ============================================================================
window.REPORTS_STREAK = {
    sieg: [
        "{team} ist im Flow: {n} Siege in Folge.",
        "Die Serie hält: {team} steht bei {n} Siegen am Stück.",
        "{team} marschiert: {n} Siege in Serie.",
        "Wer stoppt {team}? {n} Siege in Folge sprechen eine klare Sprache.",
        "Dauergast auf der Siegerstraße: {team} – jetzt {n} Erfolge hintereinander.",
        "{team} hat das Gewinnen zur Gewohnheit gemacht: {n} Siege nacheinander.",
        "Volle Ausbeute, Woche für Woche: {team} steht bei {n} Siegen in Serie.",
        "Der Lauf geht weiter: {team} bleibt auch diese Woche makellos – {n} Siege am Stück.",
        "{n} Spiele, {n} Siege: {team} präsentiert sich in bestechender Form.",
        "Gegen {team} ist derzeit kaum ein Kraut gewachsen: {n} Siege in Folge.",
        "Serientäter {team}: {n} Erfolge hintereinander.",
        "Formkurve steil nach oben: {team} gewinnt und gewinnt – inzwischen {n} Mal in Folge."
    ],
    ungeschlagen: [
        "Seit {n} Spielen ungeschlagen: {team} ist derzeit nur schwer zu knacken.",
        "{team} bleibt weiter ohne Niederlage – {n} Spiele hält die Serie schon.",
        "Stabil durch die Wochen: {team} ist seit {n} Partien unbesiegt.",
        "Die Serie ohne Niederlage wächst: {team} steht bei {n} Spielen.",
        "{team} lässt sich einfach nicht bezwingen: {n} Spiele ohne Pleite.",
        "Wer {team} schlagen will, braucht derzeit einen Sahnetag – seit {n} Spielen wartet die Konkurrenz darauf.",
        "Beständigkeit als Markenzeichen: {team} ist seit {n} Spielen ungeschlagen.",
        "An {team} beißt sich die Liga gerade die Zähne aus: {n} Partien ohne Niederlage.",
        "Die Serie lebt: {team} übersteht auch diesen Spieltag ohne Niederlage – Nummer {n}.",
        "{team} sammelt fleißig weiter: {n} Spiele in Folge ungeschlagen.",
        "Schwer zu schlagen: {team} hält die Serie ohne Niederlage bei {n} Spielen.",
        "Ungeschlagen seit {n} Spielen: Bei {team} stimmt derzeit die Balance."
    ],
    niederlage: [
        "Die Talfahrt hält an: {team} verliert auch diese Woche – {n} Pleiten in Serie.",
        "{n} Niederlagen am Stück: Bei {team} liegen die Nerven zunehmend blank.",
        "Der Negativlauf von {team} geht weiter: {n} Pleiten hintereinander.",
        "{team} findet einfach kein Rezept: {n} Niederlagen in Folge.",
        "Krise pur bei {team}: schon {n} Niederlagen nacheinander.",
        "Es will einfach nicht gelingen: {team} steht bei {n} Niederlagen in Serie.",
        "Freier Fall: {n} Pleiten in Folge für {team}.",
        "Bei {team} hat sich die Krise festgebissen: {n} Niederlagen am Stück.",
        "Woche für Woche der gleiche Frust: {team} verliert erneut – Nummer {n} in Serie.",
        "{team} sucht verzweifelt den Ausweg aus dem Tief: {n} Pleiten hintereinander.",
        "Die Sorgen werden größer: {team} kassiert die nächste Niederlage – {n} in Folge inzwischen.",
        "Alarmstufe Rot bei {team}: {n} Niederlagen nacheinander."
    ],
    sieglos: [
        "{team} wartet seit {n} Spielen auf einen Sieg.",
        "Die Durststrecke von {team} hält an: {n} Partien ohne Dreier.",
        "Seit {n} Spielen sieglos: {team} tritt auf der Stelle.",
        "Bei {team} will der Knoten einfach nicht platzen – {n} Spiele ohne Sieg.",
        "Ein Sieg? Nicht in den letzten {n} Spielen von {team}.",
        "{team} kommt nicht vom Fleck: {n} Partien in Folge ohne Erfolgserlebnis.",
        "Zähe Wochen für {team}: seit {n} Spielen ohne Dreier.",
        "Die Sieglos-Serie von {team} wächst auf {n} Spiele an.",
        "{team} und das Gewinnen – das passt gerade nicht zusammen: {n} Anläufe ohne Sieg.",
        "Geduldsprobe für die Fans: {team} wartet nun schon {n} Partien auf einen Dreier.",
        "Es zieht sich: {n} Spiele ohne Sieg für {team}.",
        "Irgendwann muss er ja kommen, der Befreiungsschlag – {team} ist seit {n} Spielen sieglos."
    ]
};

// ============================================================================
// Vereins-Chronik (Paket 7) – erzählter Spielstand im Steckbrief.
// NICHTS erfunden: „Die Erfindung kommt durch die Sim" – jeder Satz folgt aus
// einem übergebenen Archiv-/History-Fakt. Assembler: app/reports.js (_teamChronik).
// Subjekt ist „der Verein/der Klub/die Mannschaft" (kein Teamname – steht darüber).
// Slots je Pool siehe SPEC §2; {n} = Kardinalwort → nur invariante Substantive
// („Titel", „Mal", „Saisons"; „Aufstiege" nur im aufstiege-Pool, feuert erst ab 2).
// VERBOTEN: „erste Saison in der {liga}" (Verein kann früher dort gewesen sein –
// richtig: „nach dem Aufstieg/Abstieg"), erfundene Vergangenheit/Fankultur,
// Rivalen-Vorgeschichte („seit Generationen"), Head-to-Head-Wertungen.
// Spec: fable-deliverables/paket7-lore/SPEC.md (+ FABLE-GRUNDREGELN.md)
// ============================================================================
window.REPORTS_CHRONIK = {
    // ---- Status: 1. Saison nach Aufstieg ----
    status_neu_auf: [
        "Frisch oben angekommen: Es läuft die erste Saison nach dem Aufstieg in der {liga}.",
        "Der Aufstieg ist noch warm – aktuell wird die erste Runde in der {liga} gedreht.",
        "Eine Etage höher: Nach dem Aufstieg misst sich der Verein jetzt in der {liga}.",
        "Belohnung für die Vorsaison: Der Klub ist hochgestiegen und tritt nun in der {liga} an.",
        "Neues Kapitel: Mit dem Aufstieg im Rücken geht es jetzt in der {liga} zur Sache.",
        "Der Sprung nach oben ist geschafft – die {liga} ist die neue Bühne.",
        "Aufsteiger-Saison: Der Verein sortiert sich gerade in der {liga} ein.",
        "Hochgearbeitet: Die erste Spielzeit nach dem Aufstieg läuft – Schauplatz {liga}."
    ],
    // ---- Status: 1. Saison nach Abstieg ----
    status_neu_ab: [
        "Neustart eine Etage tiefer: Es läuft die erste Saison nach dem Abstieg in der {liga}.",
        "Der Abstieg steckt noch in den Kleidern – jetzt heißt die Aufgabe {liga}.",
        "Nach dem bitteren Gang nach unten sammelt sich der Verein aktuell in der {liga}.",
        "Wiederaufbau: Die erste Spielzeit nach dem Abstieg wird in der {liga} bestritten.",
        "Eine Klasse tiefer, der Auftrag klar: In der {liga} soll die Wende gelingen.",
        "Frisch abgestiegen – die {liga} ist vorerst das neue Zuhause.",
        "Der Blick geht nach vorn: Nach dem Abstieg zählt jetzt nur die {liga}.",
        "Rückschlag verdauen: Die erste Saison nach dem Abstieg in der {liga} gibt die Antwort."
    ],
    // ---- Status: ≥2 Saisons in Folge in der aktuellen Liga ----
    status_etabliert: [
        "Seit {n} Saisons ununterbrochen in der {liga} – der Verein ist hier angekommen.",
        "Die {liga} ist vertrautes Terrain: {n} Spielzeiten in Folge hält sich der Klub hier.",
        "Beständigkeit: Seit {n} Saisons gehört die Mannschaft ohne Unterbrechung zur {liga}.",
        "{n} Saisons am Stück in der {liga} – man kennt hier jeden Platz und jeden Gegner.",
        "Der Klub und die {liga}, das läuft: seit {n} Spielzeiten ununterbrochen.",
        "Fester Bestandteil der {liga}: Die Serie steht bei {n} Saisons in Folge.",
        "Seit {n} Spielzeiten dieselbe Liga-Adresse: {liga}.",
        "Kein Kommen und Gehen: Der Verein hält der {liga} seit {n} Saisons die Treue.",
        "{n} Saisons in Serie in der {liga} – Kontinuität als Markenzeichen.",
        "Die Koffer bleiben ausgepackt: seit {n} Spielzeiten durchgehend in der {liga}."
    ],
    // ---- Status: gesamtes Aufzeichnungs-Fenster nur diese Liga (KEINE Zahl!) ----
    status_urgestein: [
        "Ein Urgestein der {liga}: Solange die Aufzeichnungen reichen, war der Verein nie woanders.",
        "Inventar der {liga} – die Chronik kennt den Klub gar nicht anders.",
        "Die {liga} ohne diesen Verein? Die Aufzeichnungen kennen diesen Fall nicht.",
        "Fest verwurzelt: Die gesamte dokumentierte Historie spielt sich in der {liga} ab.",
        "So weit das Archiv zurückreicht, ist die {liga} das Wohnzimmer des Klubs.",
        "Manche Dinge ändern sich nie: Verein und {liga} gehören in jeder dokumentierten Saison zusammen.",
        "Kein einziger Liga-Wechsel in den Aufzeichnungen – die {liga} ist Heimat.",
        "Die Vereinschronik ist schnell erzählt, zumindest was die Liga angeht: immer {liga}."
    ],
    // ---- Erfolge: ≥1 Titel ({letzte}-Zeilen nur wenn Titel-Saison belegt) ----
    titel: [
        "Die Vitrine ist nicht leer: {n} Titel.",
        "{n} Mal ganz oben – zuletzt in der Saison {letzte}.",
        "Es gibt sie, die ganz großen Momente: {n} Mal wurde ein Titel gefeiert.",
        "{n} Mal wurde eine Spielzeit als Nummer eins beendet – zuletzt {letzte}.",
        "Titelsammler: {n} Mal stand der Klub am Ende einer Saison ganz oben.",
        "Die Chronik glänzt: {n} Titel, zuletzt geholt {letzte}.",
        "{n} Mal Meisterjubel – solche Tage vergisst hier niemand.",
        "Erfolg ist hier dokumentiert: Das Archiv verzeichnet {n} Mal Platz eins.",
        "Ganz oben stand man hier schon: {n} Mal, zuletzt {letzte}.",
        "{n} Titel in den Büchern – die Messlatte liegt entsprechend."
    ],
    // ---- Erfolge: ≥1 Pokalsieg ----
    pokal: [
        "Dazu kommt Pokal-Ruhm: {n} Mal wurde der Pokal in die Höhe gestemmt.",
        "{n} Mal Pokalsieger – solche Abende bleiben.",
        "Auch im Pokal gelang der große Wurf: {n} Mal ging die Trophäe an den Verein.",
        "Der Pokal und dieser Klub verstehen sich: {n} Mal triumphiert.",
        "{n} Mal wurde der Pokal geholt – ein Kapitel für sich.",
        "Flutlicht, Finale, Jubel: {n} Mal wurde der Pokal gewonnen.",
        "In der Trophäensammlung glänzt auch der Pokal: {n} Mal gewonnen.",
        "Der K.-o.-Modus liegt dem Verein: {n} Mal wurde der Pokal geholt."
    ],
    // ---- Erfolge: ≥2 Aufstiege ----
    aufstiege: [
        "Der Weg führte mehrfach nach oben: {n} Aufstiege verzeichnet die Chronik.",
        "{n} Aufstiege stehen in den Büchern – Stillstand sieht anders aus.",
        "Kletterer: {n} Mal wurde eine Liga-Stufe nach oben genommen.",
        "{n} Aufstiege hat der Verein schon gefeiert – man weiß hier, wie das geht.",
        "Aufwärts kennt man: {n} Aufstiege weist das Archiv aus.",
        "Gleich {n} Mal gelang der Sprung in die nächsthöhere Liga.",
        "{n} Aufstiege in der Vereinsgeschichte – Momente, von denen lange gezehrt wird.",
        "Die Richtung stimmte öfter: {n} Mal ging es per Aufstieg nach oben."
    ],
    // ---- Erfolge: ≥1 Relegationsteilnahme ({relB} = "gewonnen:verloren") ----
    relegation: [
        "Zittern gehört zur Geschichte: {p} Mal Relegation, Bilanz {relB}.",
        "{p} Mal stand der Verein in der Relegation – Bilanz: {relB}.",
        "Nervenspiele inklusive: {p} Mal Relegation, ausgegangen {relB}.",
        "Die Relegation ist ein eigenes Kapitel: {p} Mal erlebt, Bilanz {relB}.",
        "Wenn es eng wurde, ging es {p} Mal in die Relegation – Bilanz {relB}.",
        "{p} Mal Endspiel-Modus in der Relegation, die Bilanz liest sich {relB}.",
        "Extraschichten am Saisonende: {p} Mal Relegation ({relB}).",
        "Das Archiv zählt {p} Mal Relegation – Bilanz {relB}."
    ],
    // ---- Rivale: emergent (≥5 gemeinsame Saisons, <50 km) – KEINE erfundene Vorgeschichte ----
    rivale: [
        "Und dann ist da noch {rivale}: {n} gemeinsame Saisons – man kennt sich bestens.",
        "Ein ständiger Begleiter der Vereinsgeschichte: {rivale}, mit dem man schon {n} Spielzeiten die Liga teilte.",
        "Dauerduell in der Nachbarschaft: {n} gemeinsame Saisons mit {rivale}.",
        "Immer wieder derselbe Nachbar: {rivale} – {n} gemeinsame Spielzeiten.",
        "Die Wege kreuzen sich ständig: {rivale} und der Klub standen sich in {n} gemeinsamen Saisons gegenüber.",
        "Nachbarschaftsduell mit Geschichte: {n} Saisons in derselben Liga wie {rivale}.",
        "Der Blick in die Chronik zeigt einen Dauergegner: {rivale}, {n} gemeinsame Spielzeiten.",
        "Aus der Nähe grüßt {rivale} – {n} Mal spielte man schon in derselben Liga.",
        "Derby-Garantie: {rivale} war in {n} Saisons Ligakonkurrent.",
        "Zwei Klubs, eine Region, {n} gemeinsame Spielzeiten: {rivale} ist der vertrauteste Gegner."
    ]
};
