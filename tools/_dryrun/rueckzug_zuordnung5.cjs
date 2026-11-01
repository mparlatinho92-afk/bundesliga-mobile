// Rückzug-Scan Runde 5 (31.10.2026): die 100 „rest“-Paare nach Runde 4, vor allem Großstädte (tools/_dryrun/rueckzug_runde2_rest.txt).
// Großstädte nur mit Beleg. Die RSSF-Liste (rsssf.org/tablesd/ddr-names.html) kannte mehr als der Parser fand – „NORDWEST-LEIPZIG“
// mit Bindestrich, II-Mannschaften unter dem Block der ersten. Alle Paare ohne gemeinsame Saison (rz4_paare-Prüfung).
// Bewusst NICHT: Umformtechnik/Halbleiterwerk/WGK/Modedruck/Kabelwerk Oberspree, Mikroelektronik → Grün-Weiß Erfurt, Dynamo Ost
// Frankfurt/O (keine Quelle), Wissenschaft Halle (RSSF: Reserve wurde SC Chemie Halle 2, keine passende ID), HSV Wernigerode (RSSF
// nennt „Wernigeröder SV“), Stralsund II (RSSF: Fusion Vorwärts + Motor 1989), Langenlonsheim und Wolmirstedt (zwei Vereinsnamen
// im Wechsel, kleiner Ort mit möglicherweise zwei Vereinen), alle in Runde 3/4 ausgelassenen Orte.
//   node tools/_dryrun/rueckzug_zuordnung5.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    // eine Saison mitten in der Reihe des anderen Namens
    'SGE Mendig': 'sgmendigbell_205',
    'FC 07 Meisenheim': 'sgmeisenheimdeslochlauschied_347',      // Stammverein der SG
};
const UMBEN = {
    // Belege
    'Neptunwerft Rostock': 'hist_fa_motorrostock',                // de.wikipedia Motor Neptun Rostock: 1988 als „BSG Motor Neptunwerft“ zurück
    'Neptun Rostock': 'hist_fa_motorrostock',                     // 1990, heute SG Motor Neptun Rostock
    'SV Nordwest Leipzig': 'hist_fa_stahlnordwestleipzig',        // RSSF: 1949–89 BSG Stahl Nordwest, 1989–90 SV Nordwest Leipzig
    'Aufbau Triebes': 'hist_fa_einheittriebes',                   // RSSF: 1961–84 Einheit, 1984–85 Aufbau, 1985–91 Einheit
    'Bau Neubrandenburg': 'hist_fa_baumechanikneubrandenburg',    // RSSF: 1985–90 Bau-Mechanik, 1991 Bau
    'SV Hafen Rostock/A.': 'hist_fa_schiffahrthafenrostockii',    // RSSF: 1961–90 Schiffahrt-Hafen, 1990 SV Hafen 1961 Rostock
    'WK Schmalkalden': 'hist_fa_motorschmalkalden',               // RSSF: Motor ⇄ „WM“ Schmalkalden 1979–84 und 1988–90
    'ETW Suhl': 'hist_motorsuhl',                                 // RSSF: BSG Motor Ernst Thälmann (Werk) Suhl, 1969 mit Simson = Motor Suhl
    'Rot-Weiß Wernigerode': 'hist_fa_motorwernigerode',           // RSSF: Motor Wernigerode → 1991 SV Rot-Weiss Wernigerode
    // Regel: Spielgemeinschaft unter eigenem Namen, nahtlos bzw. dazwischen
    'Dynamo/Vorwärts Pasewalk': 'hist_fa_dynamopasewalk',
    'SG Gönnersdorf-Brohl': 'hist_fb_fcgoennersdorf',             // Liga 7-4: SG Gönnersdorf 2005–10 → FC 2011–15 → SG G.-Brohl 2016 → SG 2017
    'FC Gönnersdorf': 'hist_fb_fcgoennersdorf',
    // Regel: eine Saison mitten in der Reihe (Kleinstadt bzw. Wendejahr)
    'SV Pasewalk': 'hist_fa_lokpasewalk',
    'Motor Falkenstein': 'hist_fa_fortschrittfalkenstein',
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
