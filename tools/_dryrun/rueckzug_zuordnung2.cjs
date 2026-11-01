// Rückzug-Scan Runde 2 (31.10.2026): Stufe „anders“ aus tools/_dryrun/rueckzug_stufen.txt, eingeordnet mit
// .claude/skills/run/rueckzug_scan.mjs + Klassifizierung (RSSF / Wechsel / Tippfehler / Wende 1990).
// SCHREIB = nur anders geschrieben (kein damaliger Name), UMBEN = Umbenennung (damaliger Name bleibt sichtbar).
// Belege: RSSF „East Germany – Name Changes“ https://rsssf.org/tablesd/ddr-names.html; sonst das Muster in den Daten
// (Name springt hin und her ohne gemeinsame Saison = dieselbe Mannschaft; Tippfehler).
//   node tools/_dryrun/rueckzug_zuordnung2.cjs          Probelauf: Treffer je Quellname (Ligen, Saisons)
//   node tools/_dryrun/rueckzug_zuordnung2.cjs --schreiben
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    // Name springt hin und her (nie gemeinsame Saison) – Quelle schreibt mal so, mal so
    'SC Buer-Hassel': 'hist_fa_schassel',
    'SpVgg Steinwenden': 'svsteinwenden_317',
    'Einheit Glindow': 'hist_fa_eintrachtglindow',
    'TSG Luckenwalde': 'TSV Luckenwalde',
    'Gürzenicher FC Düren 09': 'hist_fa_gfcdueren09',
    'SV Petershütte': 'hist_fa_tuspopetershuette',
    'SV Worms-Horchheim': 'svhorchheim_358',
    'VfL Grünstadt': 'vfrgruenstadt_330',
    'FC Katzweiler': 'hist_fa_svkatzweiler',
    'FC Hütschenhausen': 'hist_fa_fcgermaniahuetschenhausen',
    'ASV Niebelungen Worms': 'asvnibelungenworms_372',
    'FS Dannstadt': 'hist_fa_fgdannstadt',
    'SV Rieschweiler': 'sgrieschweiler_354',
    'SG Siegelbach': 'hist_fa_scsiegelbach',
    'SV Tälchen Krettnach': 'hist_fa_svkrettnach',
    'Magdeburger SV Börde': 'hist_fb_msvboerdemagdeburg', 'Börde Magdeburg': 'hist_fb_msvboerdemagdeburg',   // 2006/07 kurz, sonst MSV Börde 1949
    'TSG Schwerin-Süd': 'hist_fa_isgschwerinsued',            // RSSF: bis 1988 ISG Schwerin-Süd, 1981 nur in der Quelle TSG
    'TSG Geyer|1973': 'ISG Geyer',                            // RSSF: seit 1964 ISG – 1973/74 schreibt die Quelle noch TSG
    // Tippfehler
    'Elektron Gera': 'hist_fa_elektronikgera',
    'Dynamik Pasewalk': 'hist_fa_dynamopasewalk',
    'SSVgg Barmen': 'hist_fa_ssvgbarmen',
    'TuRU Düssldorf': 'turuduesseldorf_1154',
    'TuSpO Richtrath': 'hist_fa_tusporichrath',
    'Victoria Wertheim': 'hist_fa_viktoriawertheim',
    'SC Komet Kiel': 'hist_fa_sccometkiel',
    'Hassia Bingen 1b': 'hist_fa_hassiabingenii',
    'Marthon 02 Berlin': 'hist_fa_marathon02berlin',
    'SG Noswedel/Wadern': 'hist_fb_fcnoswendelwadern',
    'SV Wesern-Leteln': 'hist_fa_svweserleteln',
    'SpVgg Röhlingshausen': 'hist_fa_spvggroehlinghausen',
    'SpVgg Mael': 'hist_fa_spvggmarl',
    'Altchemnitzer BC': 'hist_fa_altchemnitzerbsc',
    'FV Illertissen ll': 'fvillertissenii_118',
    'FC Memmingen ll': 'fcmemmingenii_119',
    'SpVgg Ingelheim 1b': 'hist_fb_spvggingelheimii',
    'TSVgg Stadecken-Elsheim': 'hist_fb_tsvstadeckenelsheim',
};
const UMBEN = {
    // RSSF „East Germany – Name Changes“
    'Chemie Piesteritz': 'hist_wk_fcgruenweisspiesteritz',    // 1952–90 BSG Chemie, 1990 SV Grün-Weiss Piesteritz
    'TSG Geyer': 'hist_fa_isggeyer',                          // 1951–64 TSG, 1964–91 ISG
    'Aufbau DKK Krumhermersdorf': 'hist_fa_fortschrittkrumhermersdorf',   // 1979–88 Aufbau, 1988–90 Aufbau dkk
    'TSG Schkeuditz': 'hist_fa_mabschkeuditz', 'TSC Schkeuditz': 'hist_fa_mabschkeuditz',   // Motor/TSG/TSC/MAB im Wechsel 1952–91
    'Traktor Hötensleben': 'hist_fa_aktivisthoetensleben',    // 1968–79 Traktor, 1979–90 Aktivist
    'Erdgas Salzwedel': 'hist_fa_aktivistsalzwedel',          // 1977–90 Aktivist, 1990–91 SG Erdgas
    'Traktor Altruppin': 'hist_fa_eintrachtaltruppin',        // 1952–77 Traktor, 1977–91 SG Eintracht
    'Lok Neustadt': 'hist_fa_landbauneustadt',                // Lok/Motor bis 1978, 1978–91 Landbau (Neustadt/Dosse)
    'Grün-Weiß Rostock': 'hist_fa_tsgbaurostock',             // 1970–91 Bau, 1991 SV Grün-Weiss
    'ESV Greifswald': 'hist_fa_lokgreifswald',                // 1951–90 Lok, 1990 ESV
    // RSSF: 1951–69 Einheit, 1969–79 TSG, 1979–84 TSG/Post, 1984–88 Einheit, 1988–91 TSG/Post. TSG/Post bleibt eigene ID:
    // hist_fusion.json kennt 1979 TSG + Post Ludwigslust → TSG/Post (frühere Entscheidung). Einheit darum je Jahr.
    'Einheit Ludwigslust|1966': 'hist_fa_tsgludwigslust', 'Einheit Ludwigslust|1967': 'hist_fa_tsgludwigslust',
    'Einheit Ludwigslust|1984': 'hist_fa_tsgpostludwigslust', 'Einheit Ludwigslust|1985': 'hist_fa_tsgpostludwigslust', 'Einheit Ludwigslust|1986': 'hist_fa_tsgpostludwigslust',
    'Traktor Gadebusch': 'hist_fa_tsggadebusch',              // 1981–82 Traktor zwischen TSG
    'Motor Hildburghausen': 'hist_fa_eskahildburghausen2', 'Motor ESKA Hildburghausen': 'hist_fa_eskahildburghausen2',   // 1969–84 ESKA, 1984–88 Motor, 1988–91 ESKA
    // DDR-Namen im Wechsel ohne gemeinsame Saison (Sportvereinigung gewechselt, damaliger Name bleibt sichtbar)
    'Chemie Elsterwerda': 'hist_fa_tsgelsterwerda',
    'Empor Lobenstein': 'hist_fa_elektroniklobenstein',
    'Geologie Freiberg': 'hist_fa_unionfreiberg',
    'Vorwärts Strasburg': 'hist_fa_einheitstrasburg',
    'TSG Hargesheim': 'hist_fa_tsvhargesheim',
    // Spielgemeinschaft unter eigenem Namen (wie SG Wittlich/L/N)
    'SG Holz/Kutzhof': 'hist_fa_fckutzhof',
    'SG Wacker 03 Gotha/Friemar': 'fsvwacker03gotha_895',
    // Wende 1990: BSG → eingetragener Verein am selben Ort, kein zweiter Kandidat
    'Blau-Weiß 90 Gartz': 'hist_fa_aufbaugartz',
    'SV Mörtitz': 'hist_fa_traktormoertitz',
    'ESV Delitzsch': 'hist_fa_lokdelitzsch',
    'SV Schmölln': 'hist_fa_motorschmoelln',
};
const X = JSON.parse(fs.readFileSync(path.join(T, '_dryrun/seed_erweiterung.json'), 'utf8'));
const FB = JSON.parse(fs.readFileSync(path.join(T, 'fbde_ebene58.json'), 'utf8')); X.seasons.push(...FB.seasons);   // wie historie_einbau.mjs
const treffer = {};
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
    const nm = (r.nm || '').trim(), y = parseInt(String(s.y));
    for (const k of [nm, nm + '|' + y, nm + '|' + y + '|' + s.lid]) if (SCHREIB[k] || UMBEN[k]) (treffer[k] = treffer[k] || []).push(s.y + ' ' + s.lid.replace(/^h\d+d?-/, ''));
}
const vorhanden = { s: JSON.parse(fs.readFileSync(path.join(T, 'hist_schreibweise.json'), 'utf8')), a: JSON.parse(fs.readFileSync(path.join(T, 'hist_alias.json'), 'utf8')) };
let fehlt = 0;
for (const k of [...Object.keys(SCHREIB), ...Object.keys(UMBEN)]) {
    const t = treffer[k] || []; if (!t.length) fehlt++;
    const alt = vorhanden.s[k] != null ? ' [schon Schreibweise → ' + vorhanden.s[k] + ']' : vorhanden.a[k] != null ? ' [schon Alias → ' + vorhanden.a[k] + ']' : '';
    console.log(`${(t.length + '').padStart(3)}  ${k.padEnd(40)} ${[...new Set(t.map(x => x.split(' ')[0].slice(0, 4)))].join(' ')}${alt}`);
}
console.log('ohne Treffer:', fehlt);
if (process.argv.includes('--schreiben')) {
    // erster Lauf hatte Ludwigslust ohne Jahr gesetzt – wieder entfernen (TSG/Post ist Fusions-Nachfolger 1979)
    { const p = path.join(T, 'hist_alias.json'), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
      for (const k of ['Einheit Ludwigslust', 'TSG/Post Ludwigslust']) delete o[k];
      let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
      fs.writeFileSync(p, s); }
    for (const [f, neu] of [['hist_schreibweise.json', SCHREIB], ['hist_alias.json', UMBEN]]) {
        const p = path.join(T, f), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t);
        let n = 0; for (const [k, v] of Object.entries(neu)) if (o[k] !== v) { o[k] = v; n++; }
        let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
        fs.writeFileSync(p, s); console.log(f, n, 'Einträge gesetzt');
    }
}
