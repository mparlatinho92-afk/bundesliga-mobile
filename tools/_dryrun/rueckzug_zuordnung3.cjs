// Rückzug-Scan Runde 3 (31.10.2026): die Paare „rest“ aus tools/_dryrun/rueckzug_runde2_rest.txt mit nahtlosem Übergang
// (alt endet Y, neu beginnt Y+1 in derselben Liga, je ein Kandidat, keine Großstadt). Je Fall nach Belegstärke:
//   FUSION  – Wikipedia belegt einen Zusammenschluss → tools/hist_fusion.json (Archiv zeigt „⇢ Fusion: …“, Zahlen bleiben getrennt)
//   UMBEN   – Umbenennung / Trägerwechsel einer BSG in einer DDR-Kleinstadt (ein Verein am Ort) / Spielgemeinschaft unter eigenem Namen
//   SCHREIB – nur anders geschrieben
// Bewusst NICHT: Bernau (Vorwärts = Armee, Schichtstoffplattenwerk = Betrieb), Stralsund II, Wittenberge, Freiberg, Falkensee,
// Wabern, Wattenbach, Conweiler, Sobernheim, Speyer, Erbes-Büdesheim, Heltersberg, Noswendel, Wernigerode, Amsdorf, Wanzleben,
// Hennigsdorf, Bergedorf 85, Harburg, Sulingen, Pommern Greifswald, Kandel, Schweina, Lintfort, Ettmannsdorf, Trier, Umutspor, _nv-IDs.
//   node tools/_dryrun/rueckzug_zuordnung3.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    'Zispendorfer FC Meuselwitz': 'zfcmeuselwitz_830',
    'Tgd. Hilgen': 'hist_fb_tghilgen',
    'BW Neuhof': 'hist_fb_svbwneuhof',
    'FC FK Rene Schneider': 'fcfoerderkaderrenschneider_736',
    'FC Wiesbach': 'fcherthawiesbach_244',
    'FC TuBa Pohlheim': 'fcturabdinbabylonpohlheim_1035',
    'Aktivist "Martin Hoop" Mühlsen': 'hist_fa_martinhoopmuelsen',
    'Tiefbau Schwedt': 'hist_fa_tiefbauschwerin',                     // 1974/75 Bezirksliga SCHWERIN – Schwedt liegt im Bezirk Frankfurt/O
    'HSG Uni Rostock': 'hist_fa_universitaetrostock',
    'Aktivist/EIektronik Staßfurt': 'Aktivist/Elektronik Staßfurt',   // Texterkennung (I statt l) → richtig geschriebener damaliger Name
};
const UMBEN = {
    'Meidericher SV A': 'hist_fa_msvduisburga',                 // 1967 Meidericher SV → MSV Duisburg
    // Spielgemeinschaft / Zusatzname unter eigenem Namen (wie SG Wittlich/L/N)
    // SG Lörrach-Stetten NICHT: Fusions-Vorgänger des FV Lörrach-Brombach 2011 (hist_fusion.json)
    'SG Freiendiez/Diez': 'hist_fa_vflfreiendiez',
    'SV Vesalia 08 Oberwesel': 'svvesaliaoberwesel_215',
    'VfB Alkonia Hüttigweiler': 'hist_fb_vfbhuettigweiler',
    // DDR-Kleinstädte: Trägerwechsel der BSG, nahtlos in derselben Bezirksliga
    'Motor Waltershausen': 'hist_fa_zsgwaltershausen', 'TSG Waltershausen': 'hist_fa_zsgwaltershausen',
    'Einheit Breitenbach': 'hist_fa_traktorbreitenbach',
    'Empor Greußen': 'hist_fa_blauweissgreussen',
    'Soetrom Sömmerda II': 'hist_fa_robotronsoemmerdaii',            // 1990 Robotron → Soemtron
    'Einheit Beeskow': 'hist_fa_emporbeeskow', 'Spanplattenwerk Beeskow': 'hist_fa_emporbeeskow', 'Plattenwerk Beeskow': 'hist_fa_emporbeeskow',
    'Forst Müllrose': 'hist_fa_traktormuellrose',
    'ESV Eberswalde': 'hist_fa_lokomotiveeberswalde',                // Wende 1990 Lok → ESV
    'TSG Seelow': 'svvictoriaseelow_749',                            // Wende 1990 TSG → SV Victoria
    'Motor Beeskow/Groß Rietz': 'hist_fa_motorgrossrietz',
    'Möbelkombinat Eisenberg': 'hist_fa_moebelwerkeeisenberg',
    'Wismut/Rotation Crossen': 'hist_fa_wismutcrossen',
    'TSG Wilkau-Haßlau': 'hist_fa_fortschrittwilkauhasslau',
    'Einheit Bismark': 'hist_fa_traktorbismark',
    'Aktivist/Elektronik Staßfurt': 'hist_fa_aktiviststassfurt',
    'Stahl Wittstock': 'hist_fa_fortschrittwittstock',
    'Vorwärts/Einheit Zinnowitz': 'hist_fa_vorwaertszinnowitz',
    'Isolator Neuhaus-Schierschnitz': 'hist_fa_motorneuhausschierschnitz',
    'FSV Gräfinau': 'hist_fa_traktorgraefinauangstedt',              // Wende 1990
    // Großstädte nur mit RSSF-Beleg (https://rsssf.org/tablesd/ddr-names.html)
    'SC Cottbus II': 'hist_fa_energiecottbusii',                     // 1963–66 SC Cottbus, 1966 BSG Energie
    'Motor Ascota Chemnitz': 'hist_fa_motorascotakarlmarxstadt',     // 1972–89 Motor ASCOTA West-K.-M.-St., 1989–90 … Chemnitz
    // Aktivist Zwickau NICHT: hist_fusion.json kennt die Fusion 1969 in den FSV Zwickau (frühere Entscheidung)
};
// Wikipedia-belegte Fusionen. Jahr = Saisonbeginn, in der der Nachfolger in den Daten zuerst spielt (Archiv: Fusionsjahr = sy+1)
const FUSION = {
    // „Der heutige Verein entstand am 1. Juli 1971 durch Fusion der Sportfreunde Lüdenscheid und des RSV Höh.“ (de.wikipedia Rot-Weiß Lüdenscheid)
    'hist_rwluedenscheid': { jahr: 1971, vorgaenger: ['hist_fa_rsvluedenscheidhoeh', 'hist_fa_sportfreundeluedenscheid'] },
    // Wikipedia TSG Bergedorf: 1965 Bergedorfer Turnerschaft + Spiel und Sport Bergedorf – die Liga führt die TSG schon 1964/65
    'hist_fa_tsgbergedorf': { jahr: 1964, vorgaenger: ['hist_fa_susbergedorf'] },
    // Wikipedia 1. FC Gladbeck: „Im Jahre 1968 fusionierte der Verein [Sportfreunde] mit … SuS Rosenhügel“ – Liga ab 1967/68
    'hist_fa_1fcgladbeck': { jahr: 1967, vorgaenger: ['hist_fa_sportfreundegladbeck'] },
    // Wikipedia FC Eilenburg: 2001 Fusion; der MFC Eilenburg war aus dem Mörtitzer SV hervorgegangen
    'fceilenburg_831': { jahr: 2001, vorgaenger: ['hist_fa_moertitzeilenburg'] },
    // RSSF: ASG Vorwärts Dessau 1974–89 → SG Dessau 89, 1990 + SV Waggonbau 05 = FC Anhalt Dessau – DDR-Liga führt Anhalt ab 1989/90
    'hist_fa_anhaltdessau': { jahr: 1989, vorgaenger: ['hist_fa_vorwaertsdessau'] },
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
    const t = treffer[k] || []; if (!t.length && k !== 'Aktivist/Elektronik Staßfurt') fehlt++;
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
