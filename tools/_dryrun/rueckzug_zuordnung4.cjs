// Rückzug-Scan Runde 4 (31.10.2026): die 139 Paare „rest“ ohne RSSF-Beleg (tools/_dryrun/rueckzug_runde2_rest.txt).
// Zugeordnet nur, was eine der Regeln trägt – keine gemeinsame Saison (rz4_paare-Prüfung), je ein Kandidat:
//   SCHREIB – Schreibvariante: eine Saison mitten in der Reihe des anderen Namens, oder Namen wechseln hin und her
//   UMBEN   – Trägerwechsel in einer Kleinstadt, Wende 1990 bei erhaltenem Namenskern, Beleg
//   FIX     – ältere Schreibweise-Einträge zeigten direkt auf die alte ID und umgingen so die Aliase aus Runde 2/3
//             (Empor Greußen, Chemie Elsterwerda, Spanplattenwerk Beeskow, VfB Alkonia Hüttigweiler, Dynamik Pasewalk …)
// Bewusst NICHT: SC Eintracht/SpVgg Oberstein → SC Idar-Oberstein (Wikipedia: Fusion der beiden Vereine aus IDAR 1971),
// SC Einheit Dresden II → FSV Lok Dresden II (hist_fusion: Einheit-Linie → Dresdner SC 1990, frühere Entscheidung),
// Eintracht Köln + Italia Colonia → Eintracht Italia (sieht nach Fusion aus, kein Beleg), Tollensewerke → FC Tollense
// (FC Tollense entstand 1999 aus einer Fusion mit dem SV Tollense), Großstädte ohne Beleg (Leipzig, Rostock, Erfurt, Berlin,
// Frankfurt/O, Kassel), Weierbach (zwei IDs 1965), alle _nv-IDs und die in Runde 3 ausgeschlossenen Orte.
//   node tools/_dryrun/rueckzug_zuordnung4.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    // FIX: Ziel = richtig geschriebener Name, damit der Alias greift
    'Empor Geußen': 'Empor Greußen',
    'Chemie EIsterwerda': 'Chemie Elsterwerda',
    'Isolation Neuhaus-Schierschnitz': 'Isolator Neuhaus-Schierschnitz',
    'Plattenwerk Beeskow': 'Spanplattenwerk Beeskow',
    'Meidricher SV A': 'Meidericher SV A',
    'Alkonia Hüttigweiler': 'VfB Alkonia Hüttigweiler',
    'Eintracht Hildburhausen': 'Eintracht Hildburghausen',
    'Manfeldkombinat Helbra': 'Mansfeldkombinat Helbra',
    'Dynamic Pasewalk': 'hist_fa_dynamopasewalk',
    // eine Saison mitten in der Reihe des anderen Namens
    'ASV Oberstein': 'hist_fa_asvidaroberstein',
    'Türk SV Mainz': 'hist_fa_tuerkischersvmainz',
    'Einheit/Empor Zerbst': 'hist_fa_einheitzerbst',
    'FC Viktoria Bammental': 'fcbammental_945',
    'SG Kirchhheim/Heidelberg': 'sgheidelbergkirchheim_986',
    'SG Regensburg': 'hist_fa_sgpostsuedregensburg',
    'Rot-Weiß/Olympia Alzey': 'rwoalzey_338',
    'VfR Wormatia 08 Worms Ib': 'wormatiawormsii_333',
    'FSV Mainz 05 Ib': '1fsvmainz05ii_297',
    'SV Hohenecken': 'tus1904hohenecken_318',
    'SV Arnstadt-Rudisleben': 'hist_fa_motorrudisleben',         // Rudisleben seit 1994 Ortsteil von Arnstadt
    'SV Arnstadt Rudisleben': 'hist_fa_motorrudisleben',
    'SpVgg Wirges': 'spvggegcwirges_182',
    'SV Noswedel/TuS Wadern': 'hist_fb_fcnoswendelwadern',
    // SV Bockum-Hövel 1966 NICHT: zwei Vereine dieses Namens in der Saison (Verbandsliga = SG Bockum-Hövel-Linie, Landesliga)
    'LFC Berlin 1892 (2. Männer)': 'hist_fb_lfcberlinii',
    'Blau-Weiß Empor Wanzleben': 'hist_fb_blauweisswanzleben',
    // Namen wechseln hin und her, nie gemeinsam
    'BSG Ferdinandshof': 'hist_fa_traktorferdinandshof',
    'SV Rheinzabern': 'hist_fa_olympiarheinzabern',
    'SV Lauterecken': 'hist_fa_svveldenzlauterecken',
    'VfB Post Pirmasens': 'hist_fa_vfbpirmasens',
    'Motor Oberfrohna': 'hist_fa_motorlimbachoberfrohna2',       // Oberfrohna = Teil von Limbach-Oberfrohna
};
const UMBEN = {
    // DDR-Kleinstädte, Trägerwechsel nahtlos bzw. hin und zurück
    'Mansfeldkombinat Helbra': 'hist_fa_stahlhelbra',           // 1970–77, davor/danach Stahl; Sangerhausen wurde 1970 ebenso „Mansfeld-Kombinat“
    'Motor Semlow': 'hist_fa_traktorsemlow',
    'Einheit Wesenberg': 'hist_fa_unionwesenberg',
    'Pneumant Schmöckwitz': 'hist_fa_chemieschmoeckwitz',       // 1985–89 zwischen Chemie-Saisons
    // Wende 1990, Namenskern bleibt
    'ESV Dessau': 'hist_fa_lokdessau',
    'TSV Ifa Chemnitz': 'hist_fa_motorifachemnitz',
    'Empor Wanzleben': 'hist_fb_blauweisswanzleben',            // Empor → Blau-Weiß Empor → Blau-Weiß
    // Belege (Meidericher SV Amateure 1964: kommt über den FIX „Meidricher SV A“)
    'Wuppertaler SV Borussia II': 'hist_wk_wuppertalersvii',    // erste Mannschaft: wuppertalersv_1129 trägt WSV Borussia 2004–13 ebenso
    'SV Rhodia Freiburg': 'hist_fb_svsolvayfreiburg',           // Solvay übernahm Rhodia 2011 (Werk Freiburg), Betriebssportverein
};
// Wikipedia FC Viktoria 1889 Berlin: „Verschmelzung des … BFC Viktoria 1889 und des LFC Berlin“ zum 1. Juli 2013
const FUSION = {
    'hist_fb_fcviktoriaberlinii': { jahr: 2013, vorgaenger: ['hist_fb_lfcberlinii'] },
};
const X = JSON.parse(fs.readFileSync(path.join(T, '_dryrun/seed_erweiterung.json'), 'utf8'));
const FB = JSON.parse(fs.readFileSync(path.join(T, 'fbde_ebene58.json'), 'utf8')); X.seasons.push(...FB.seasons);
const treffer = {};
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
    const nm = (r.nm || '').trim(), y = parseInt(String(s.y));
    for (const k of [nm, nm + '|' + y]) if (SCHREIB[k] || UMBEN[k]) (treffer[k] = treffer[k] || []).push(s.y);
}
let fehlt = 0;
for (const k of [...Object.keys(SCHREIB), ...Object.keys(UMBEN)]) {
    const t = treffer[k] || []; if (!t.length) fehlt++;
    console.log(`${(t.length + '').padStart(3)}  ${k.padEnd(40)} ${[...new Set(t.map(x => String(x).slice(0, 4)))].join(' ')}`);
}
console.log('ohne Treffer:', fehlt);
const schreib = (p, o, t) => { let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n'; fs.writeFileSync(p, s); };
if (process.argv.includes('--schreiben')) {
    for (const [f, neu] of [['hist_schreibweise.json', SCHREIB], ['hist_alias.json', UMBEN]]) {
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
    schreib(p, o, t); console.log('hist_fusion.json', Object.keys(FUSION).length, 'Nachfolger');
}
