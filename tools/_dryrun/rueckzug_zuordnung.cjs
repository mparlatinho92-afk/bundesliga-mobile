// Rückzug-Scan 31.10.2026: Vereine, die in der Folgesaison unter zweiter ID weiterspielten (tools/_dryrun/rueckzug_stufen.txt).
// SCHREIB = nur anders geschrieben (kein damaliger Name, Nutzer: „außer bei ständigen Rechtschreibänderungen wie Elmshorn oder
// Hettstedt“); Ziel ein NAME = richtig geschriebener damaliger Name (historie_einbau.mjs). UMBEN = echte Umbenennung (hist_alias,
// Beleg RSSF „East Germany – Name Changes“ https://rsssf.org/tablesd/ddr-names.html).
//   node tools/_dryrun/rueckzug_zuordnung.cjs          Probelauf: Treffer je Quellname (Ligen, Saisons)
//   node tools/_dryrun/rueckzug_zuordnung.cjs --schreiben
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    'Raspo Elmshorn': 'hist_fa_rasensportelmshorn',
    'FC RW Salem': 'hist_fa_fcrotweisssalem',
    'Akt Schwarze Pumpe II': 'hist_fa_aktivistschwarzepumpeii',
    'Lok Pirna': 'hist_fa_lokomotivepirna', 'LokPirna': 'hist_fa_lokomotivepirna',
    'Lokomotive Frankfurt/O': 'hist_fa_lokfrankfurto',   // umgekehrt: hist_fa_lokfrankfurto ist Fusions-Vorgänger (IHB Frankfurt/O 1977)
    'Lok Eberswalde': 'hist_fa_lokomotiveeberswalde',
    'Lok Güsten': 'hist_fa_lokomotiveguesten',
    'Wormatia 08 Worms II': 'wormatiawormsii_333',
    'SC D´dorf-West': 'scduesseldorfwest_1162',
    'Motor Warnowwerft Warnemünde II (N).': 'hist_fa_motorwarnowwerftwarnemuendeii',
    'Germania Forst (A) *3056:3933:27': 'hist_fa_germaniaforst',
    'Walzwerk Hettstedt': 'hist_fa_stahlwalzwerkhettstedt',
    'TuR Dresden-Übigau': 'hist_fa_motorturdresdenuebigau',
    'Fortschritt Limbach': 'hist_fa_fortschrittlimbachoberfrohna', 'Fortschrit Limbach': 'hist_fa_fortschrittlimbachoberfrohna',
    'RAW Cottbus': 'hist_fa_lokrawcottbus',
    'SpVgg Au/Iller': 'hist_fa_spvggau',
    'SpVgg Hochstetten-Dhaun': 'hist_fa_spvgghochstetten', 'SpVgg Hochstetten-Dh.': 'hist_fa_spvgghochstetten',
    'SV Steinwenden-Weltersbach': 'svsteinwenden_317',
    'SV Oberhausen|1966': 'SV Oberhausen-Barbelroth',
    'TSV Wäldenbronn-Esslingen': 'hist_fa_tsvwaeldenbronn', 'TSV Wäldenbronn Esslingen': 'hist_fa_tsvwaeldenbronn',
    'SV Schmalkalden': 'hist_fb_fsvschmalkalden',
    'VfL Nord': 'hist_fa_vflnordberlin',
    'SV Kleinottweiler': 'hist_fa_asvkleinottweiler',
    'SSV Eintracht Überherrn': 'hist_fa_eintrachtueberherrn',
    'Altenwerder': 'ftsvaltenwerder_502',
    'Halvestorf/Her.': 'ssghalvestorfherkendorf_617',
    'Laubsdorf': 'hist_wk_sgblaugelblaubsdorf',
    'FSV Vohwinkel Wuppertal': 'hist_wk_fsvvohwinkel',
    // 1983/84: in der Bezirksliga die Reserve – die Erste spielte zugleich DDR-Liga (Platz 5)
    'Kali Werra Tiefenort|1983|h3d-suhl-bezirksliga': 'Kali Werra Tiefenort II',   // Name: dessen Schreibweise führt zur Reserve-ID, kein damaliger Name
    // Texterkennungsfehler: bisher auf eine alte ID, jetzt auf den richtigen Namen (dessen Alias führt zum Spielverein)
    'Motor Neustadt/OrIa': 'Motor Neustadt/Orla', 'Motor Neustad/Orla': 'Motor Neustadt/Orla',
    'Stahl Sangertiausen': 'Stahl Sangerhausen', 'Mannsfeldkombinat Sangerhausen': 'Mansfeldkombinat Sangerhausen',
    'Turbine Magdeuburg': 'Turbine Magdeburg', 'TSV Luckenwatde': 'TSV Luckenwalde',
    'Elektronic Neuruppin': 'Electronic Neuruppin', 'Elektronik Neuruppin': 'Electronic Neuruppin',
    // Plauen NICHT: hist_fa_wemaaufbauplauen ist Fusions-Nachfolger 1976 (hist_fusion.json) – eigene Entscheidung, offen
    // Zittau: seit 1976 Robur (RSSF), die Quelle schreibt 1977/78 und 1979/80 noch „Motor Robur“
    'ROBUR Zittau': 'Robur Zittau', 'Motor Robur Zittau|1977': 'Robur Zittau', 'Motor Robur Zittau|1979': 'Robur Zittau',
    'Motor/Vorwärts Teltow': 'Vorwärts/Motor Teltow',
};
const UMBEN = {
    'Robur Zittau': 'hist_fa_motorroburzittau',     // RSSF: 1971–76 Motor Robur, 1976–90 Robur
    'Vorwärts/Motor Teltow': 'hist_fa_motorteltow',                                             // RSSF: 1968–77 SG Vorwärts, 1977–91 Motor
    'Interflug Berlin': 'hist_fa_luftfahrtberlin',                                              // RSSF: SG Grünau – Interflug/Luftfahrt im Wechsel
    '1919 Irxleben': 'hist_fa_traktorirxleben',                                                 // RSSF: 1952–90 Traktor, 1990 SV 1919
    'Lok Zwickau': 'hist_fa_esvlokzwickau',                                                     // 1990 BSG Lok → ESV Lok (wie Lok Cottbus, RSSF)
    'SG Wittlich/L/N': 'hist_fa_svwittlich',                                                    // Spielgemeinschaft 2020/21, vorher SG Wittlich
};
const X = JSON.parse(fs.readFileSync(path.join(T, '_dryrun/seed_erweiterung.json'), 'utf8'));
const FB = JSON.parse(fs.readFileSync(path.join(T, 'fbde_ebene58.json'), 'utf8')); X.seasons.push(...FB.seasons);   // wie historie_einbau.mjs
const treffer = {};
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
    const nm = (r.nm || '').trim(), y = parseInt(String(s.y));
    for (const k of [nm, nm + '|' + y, nm + '|' + y + '|' + s.lid]) if (SCHREIB[k] || UMBEN[k]) (treffer[k] = treffer[k] || []).push(s.y + ' ' + s.lid.replace(/^h\d+d?-/, ''));
}
let fehlt = 0;
for (const k of [...Object.keys(SCHREIB), ...Object.keys(UMBEN)]) {
    const t = treffer[k] || []; if (!t.length) fehlt++;
    const ligen = [...new Set(t.map(x => x.split(' ')[1]))];
    console.log(`${(t.length + '').padStart(3)}  ${k.padEnd(48)} ${ligen.join(', ')}`);
}
console.log('ohne Treffer:', fehlt);
// Erster Lauf hatte diese Einträge gesetzt bzw. überschrieben – zurück auf den alten Stand
const ZURUECK = { 'hist_schreibweise.json': { 'WEMA/Aufbau Plauen': 'hist_fa_wemaaufbauplauen', 'Wema/Aufbau Plauen': null, 'WEMA/Auf bau Plauen': 'hist_fa_wemaaufbauplauen', 'Lok Frankfurt/O': null }, 'hist_alias.json': { 'ROBUR Zittau': null } };
if (process.argv.includes('--schreiben')) {
    // VfL Nord = VfL Nord Berlin: der Nachfolger-Eintrag (aufgegangen 1973 in SV Nord-Nordstern) zieht auf die verbleibende ID
    { const p = path.join(T, 'hist_nachfolger.json'), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
      if (o.hist_fa_vflnord && !o.hist_fa_vflnordberlin) { o.hist_fa_vflnordberlin = o.hist_fa_vflnord; delete o.hist_fa_vflnord;
        let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
        fs.writeFileSync(p, s); console.log('hist_nachfolger.json: hist_fa_vflnord -> hist_fa_vflnordberlin'); } }
    for (const [f, z] of Object.entries(ZURUECK)) {
        const p = path.join(T, f), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
        for (const [k, v] of Object.entries(z)) { if (v == null) delete o[k]; else o[k] = v; }
        let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
        fs.writeFileSync(p, s);
    }
    for (const [f, neu] of [['hist_schreibweise.json', SCHREIB], ['hist_alias.json', UMBEN]]) {
        const p = path.join(T, f), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
        let n = 0; for (const [k, v] of Object.entries(neu)) if (o[k] !== v) { o[k] = v; n++; }
        let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
        fs.writeFileSync(p, s); console.log(f, n, 'Einträge gesetzt');
    }
}
