// data_reports.js – Schlagzeilen-Corpus für Spieltags-Berichte (Seed v1)
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
        "{sieger} im Torrausch, {verlierer} im freien Fall"
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
        "{score} – {sieger} erledigt die Pflichtaufgabe gegen {verlierer}"
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
        "Enges Duell zwischen {heim} und {gast} – am Ende jubelt {sieger}",
        "{verlierer} verliert unglücklich – das {score} schmerzt",
        "Dreckiger Sieg? Egal! {sieger} nimmt das {score} dankend an",
        "{sieger} entscheidet ein Spiel auf Messers Schneide für sich",
        "Bis zur letzten Minute offen – dann jubelt {sieger} ({score})",
        "{verlierer} belohnt sich nicht – {sieger} gewinnt {score}",
        "Kampfspiel statt Leckerbissen: {sieger} siegt {score}",
        "{sieger} bleibt im Duell mit {verlierer} das entscheidende Quäntchen kühler",
        "Millimeter-Entscheidung: {score} für {sieger}",
        "{sieger} stiehlt {verlierer} die Show – knapper geht's kaum",
        "Am Ende zählt nur das Ergebnis: {score} für {sieger}",
        "{verlierer} hadert, {sieger} feiert – {score}",
        "Ein Wimpernschlag Unterschied: {sieger} schlägt {verlierer} mit {score}"
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
        "{heim} gegen {gast} – ein {score}, das Lust auf das Rückspiel macht"
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
        "Ein 0:0, das man schnell wieder vergisst"
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
        "Fußball-Logik ausgehebelt: {sieger} besiegt {verlierer} mit {score}"
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
        "Topspiel mit Ansage: {heim} und {gast} spielen {score}"
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
        "Abstiegsgipfel in {score}-Stimmung: {heim} und {gast} lassen Punkte liegen"
    ]
};
