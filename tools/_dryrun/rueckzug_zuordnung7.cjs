// Rückzug-Scan Runde 7 (03.11.2026): Wende 1989/90 -> 1990/91. Neue Prüfung: fussball-ddr.de nennt hinter jedem Verein der
// Tabelle 1990/91 den Vorjahresplatz „( k )“; beide Saisons über S/U/N/Tore an unsere Zeilen gehängt, IDs verglichen
// (87 Verweise, 13 Abweichungen, Gegenprobe mit vertauschten IDs 22). Belege je Eintrag unten.
// Bewusst NICHT: Motor Mitte Magdeburg -> Magdeburger SV 1990 (Großstadt, nur der Vorjahresplatz, kein Vermerk),
// Motor Döbeln -> Döbelner SC (kein Beleg), Chemie Böhlen I/II (FSV Böhlen ging 1990 in den FC Sachsen, die Zweite wurde
// SV Chemie Böhlen – Linienfrage, offen), TSV Stralsund 1860 fehlt in der DDR-Liga 1990/91 ganz (Datenlücke, kein ID-Fall).
//   node tools/_dryrun/rueckzug_zuordnung7.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const UMBEN = {
    // fussball-ddr.de Bezirksliga Erfurt 1990/91: „06.08.1990: Aus der BSG Motor gründet sich der SV Wartburgstadt Eisenach“
    // (Ausgründung = Umbenennung). Nur diese Tabelle: „SV Eisenach“ zeigt sonst auf FC Eisenach (Fusion 2011 bleibt).
    'SV Eisenach|1990|h3d-erfurt-bezirksliga': 'hist_fa_motoreisenach',
    // fussball-ddr.de Bezirksliga Neubrandenburg 1990/91: „BSG Einheit Strasburg ↔ Strasburger SV“
    'Strasburger SV': 'hist_fa_einheitstrasburg',
    // fussball-ddr.de Bezirksliga Neubrandenburg 1990/91: „BSG Nord Torgelow ↔ Torgelower SV Greif“ (Nutzer 03.11.2026: verbinden)
    'Nord Torgelow': 'hist_wk_torgelowerfcgreif',
    // fussball-ddr.de Bezirksliga Karl-Marx-Stadt 1990/91: „TSV Penig ( 14 )“ = Motor Penig, 1989/90 Vierzehnter (Kleinstadt)
    'TSV Penig': 'hist_fa_motorpenig',
    // de.wikipedia FC Einheit Wernigerode: BSG Einheit nannte sich nach 1989 Harzer Sportverein, 1990 FC Einheit 1990 Wernigerode;
    // fussball-ddr.de Bezirksliga Magdeburg 1989/90: „Harzer SV Wernigerode 1990“ Aufsteiger in die Landesliga
    'HSV Wernigerode': 'einheitwernigerode_842',
    // Wikipedia Cöthener FC Germania 03 (frühere Namen): BSG Motor Köthen -> KSV Germania Köthen 90
    'Köthener SV': 'hist_fa_motorkoethen',
    // de.wikipedia Brandenburger SC Süd 05: am 08.06.1990 wurde die BSG Motor Süd in BSC Süd 05 umbenannt (direkter Vorläufer)
    'Motor Süd Brandenburg': 'brandenburgerscsued_753',
    // fussball-ddr.de Bezirksliga Potsdam 1990/91: „Brandenburger SV Havel 1950 ( 11 )“ = Aufbau Brandenburg, 1989/90 Elfter;
    // 1989/90: „Aufbau Brandenburg übernahm das Spielrecht von Stahl Brandenburg II“. Hing bisher falsch am BSC Süd 05.
    'Aufbau Brandenburg': 'hist_fa_bsvhavel90',
};
const SCHREIB = {
    // Quellen widersprechen sich bei gleichen Zahlen (Nutzer 03.11.2026: fussball-ddr.de folgen):
    // f-archiv „Stahl Eisenhüttenstadt II“ 18-5-3 73:25 – fussball-ddr.de „SG Aufbau Eisenhüttenstadt ( 6 )“; Stahl II stieg 1989/90 ab
    'Stahl Eisenhüttenstadt II|1990|h3d-frankfurtoder-bezirksliga': 'Aufbau Eisenhüttenstadt',
    // f-archiv „Chemnitzer FCA“ 13-7-4 47:23 – fussball-ddr.de „Chemnitzer SV 51 Heckert II ( 7 )“ (Wikipedia: Motor Fritz Heckert 1990
    // -> Chemnitzer SV 51 Heckert; 1989/90 übernahm Heckert II den Bezirksliga-Platz von FC Karl-Marx-Stadt II)
    'Chemnitzer FCA|1990|h3d-karlmarxstadt-bezirksliga': 'Motor "Fritz Heckert" Chemnitz II',
};
const FUSION = {
    // fussball-ddr.de Landesliga Berlin 1990/91: „01.07.1990: Fusion von BSG Kombinat Autotrans Berlin und BSG Berliner VB 49 zu SV Berliner VB 1949“
    'hist_fa_svberlinervb49': { jahr: 1990, vorgaenger: ['hist_fa_kombinatautotransberlin'] },
    // fussball-ddr.de Landesliga Berlin 1990/91: „01.05.1990: Auflösung der BSG KWO Berlin u. Anschluß an den 1.FC Union Berlin“
    '1fcunionberlin_694': { jahr: 1990, vorgaenger: ['hist_fa_kabelwerkoberspreeberlin'] },
};
// Nord Torgelow ist jetzt dieselbe ID wie Greif: aus der Fusion 2022 (SpVgg Torgelow-Ueckermünde) als eigener Vorgänger streichen
const FUSION_RAUS = { 'spvggtorgelowueckermuende_726': ['hist_fa_nordtorgelow'] };

const X = JSON.parse(fs.readFileSync(path.join(T, '_dryrun/seed_erweiterung.json'), 'utf8'));
const treffer = {};
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
    const nm = (r.nm || '').trim(), y = parseInt(String(s.y));
    for (const k of [nm, nm + '|' + y, nm + '|' + y + '|' + s.lid]) if (SCHREIB[k] || UMBEN[k]) (treffer[k] = treffer[k] || []).push(s.y);
}
let fehlt = 0;
for (const k of [...Object.keys(UMBEN), ...Object.keys(SCHREIB)]) {
    const t = treffer[k] || []; if (!t.length) fehlt++;
    console.log(`${(t.length + '').padStart(3)}  ${k.padEnd(62)} ${[...new Set(t.map(x => String(x).slice(0, 4)))].join(' ')}`);
}
console.log('ohne Treffer:', fehlt);
const schreib = (p, o, t) => { let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n'; fs.writeFileSync(p, s); };
if (process.argv.includes('--schreiben')) {
    for (const [f, neu] of [['hist_alias.json', UMBEN], ['hist_schreibweise.json', SCHREIB]]) {
        const p = path.join(T, f), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
        let n = 0; for (const [k, v] of Object.entries(neu)) if (o[k] !== v) { o[k] = v; n++; }
        schreib(p, o, t); console.log(f, n, 'Einträge gesetzt');
    }
    const p = path.join(T, 'hist_fusion.json'), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
    for (const [k, v] of Object.entries(FUSION)) {
        if (!o[k]) { o[k] = { jahr: v.jahr, vorgaenger: v.vorgaenger.slice() }; continue; }
        for (const id of v.vorgaenger) if (!o[k].vorgaenger.includes(id)) {
            o[k].vorgaenger.push(id);
            if (o[k].jahr !== v.jahr) (o[k].jahrJe = o[k].jahrJe || {})[id] = v.jahr;
        }
    }
    for (const [k, ids] of Object.entries(FUSION_RAUS)) if (o[k]) {
        o[k].vorgaenger = o[k].vorgaenger.filter(id => !ids.includes(id));
        if (o[k].jahrJe) for (const id of ids) delete o[k].jahrJe[id];
    }
    schreib(p, o, t); console.log('hist_fusion.json', Object.keys(FUSION).length, 'Nachfolger,', Object.keys(FUSION_RAUS).length, 'Vorgänger gestrichen');
}
