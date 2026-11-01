// Rückzug-Scan Runde 6 (01.11.2026): Ebenenwechsel unter fremder ID. Meister/Zweite stiegen auf, die höhere Liga stammt aus einer
// anderen Quelle und schreibt den Namen anders → eigene ID, unten stand „↘ Rückzug“ (tools/_dryrun/rueckzug_ebenenwechsel.txt).
// Zugeordnet nur ohne gemeinsame Saison (rz4_paare-Prüfung) und bei gleicher Schreibung/Kürzel oder Beleg.
// Bewusst NICHT: VfR/FC Konstanz (de.wikipedia: zwei Vereine, VfR 1934 neu gegründet), 1. FC/SC Recklinghausen, Eintracht/SSV Überherrn,
// SV/SpVgg Merzig, SV/SpVgg Langenberg, SV Neukirchen-Vlyn/SC Neukirchen, Concordia/Wandsbeker TSV Concordia (Fusion?), SW/FV
// Alstaden, Landsweiler-Reden/FC Landsweiler, Ringsdorff Mehlem/Godesberg (keine Quelle), SV Erlenbach/Main → sv1965erlenbach_430
// (der liegt bei Kandel/Pfalz), alle Treffer über Allerweltswörter oder fremde Regionen (Remscheid → Wirges, Viernheim → Aachen …).
//   node tools/_dryrun/rueckzug_zuordnung6.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    'SC Vatan Bremen': 'ksvvatansport_451',                       // Oberliga Nord 1995/96 nach Bremen-Meister 1994/95
    'Sportbund Rosenheim': 'hist_wk_sbdjkrosenheim',              // SB = Sportbund; Bayernliga 1978/79 als „SB Rosenheim“
    'Hessen Hersfeld': 'hist_fa_hessenbadhersfeld',
    'ESV Nürnberg West': 'hist_fa_esvnuernbergwestfuerth',
    'BM Neubrandenburg': 'hist_fa_baumechanikneubrandenburg',     // DDR-Liga 1983/84 nach Bezirksmeister 1982/83
    'FV Zell a. Harmersbach': 'hist_fa_fvzellamharmersbach',
    'FV St.Georgen': 'hist_fa_fvstgeorgen',
    'Hellweg Lüttgendortmund': 'hist_fa_hellwegluetgendortmund',
    'Hilal Maroc Bergheim': 'hist_wk_hilalbergheim', 'Hilal-Maroc Bergheim': 'hist_wk_hilalbergheim',
    'SV SW Nierfeld': 'hist_wk_svnierfeld',
    'BCV Glesch-Paffendorf': 'bcviktoriagleschpaffendorf_1087',
    'KSV Hessen Ks. II': 'ksvhessenkasselii_1066', 'KSV Hessen KS II': 'ksvhessenkasselii_1066',
    'Freie Turnerschaft Braunschweig': 'ftbraunschweig_620',
    'Harksheide': 'turaharksheide_491',
    // SC Vorwärts-Wacker 04 Billstedt: drei IDs ohne gemeinsame Saison (Oberliga Nord, Verbandsliga Hamburg, Landesliga 6-13)
    'Vorwärts Wacker': 'scvwbillstedt_531', 'Vorwärts-Wacker': 'scvwbillstedt_531', 'Vorwärts/Wacker 04 Billstedt': 'scvwbillstedt_531',
    'Vorwärts Wacker 04 Billstedt': 'scvwbillstedt_531', 'Vorwärts/Wacker 04 Hamburg': 'scvwbillstedt_531',
    'SC Vorwärts-Wacker 04 Billstedt': 'scvwbillstedt_531', 'SC Vorwärts-Wacker 04': 'scvwbillstedt_531',   // wiki_ebene45.json
    'SC Vorwärts-Wacker Billstedt': 'scvwbillstedt_531',
    'FC Oster Oberkirchen': 'hist_fa_fcoberkirchen',              // Oster = Fluss am Ort
    'VfB Ruhrort': 'hist_fa_vfvbruhrortlaar',
    'FC Ötigheim': 'hist_fa_fvoetigheim2',                        // im Ort nur der FV 1919 Ötigheim
    'SV Brakel': 'hist_fa_spvggbrakel',                           // Vereinschronik SpVgg 20 Brakel: 1983–86 Kreisliga → Verbandsliga
};
const UMBEN = {
    'WM Schmalkalden': 'hist_fa_motorschmalkalden',               // RSSF: Motor ⇄ WM Schmalkalden 1979–84 (DDR-Liga 1979/80)
};
const FUSION = {};
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
