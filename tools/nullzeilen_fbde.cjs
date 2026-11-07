// fussball.de: Tabellenzeilen mit 0 Spielen – hat der Verein in derselben Staffel Spiele in spiele.csv (= während der Saison raus, annulliert)?
const fs = require('fs'), path = require('path'), readline = require('readline');
const G = 'G:\\Meine Ablage\\fussball.de';
const OUT = process.argv[2];
async function lese(p, f) {
    const rl = readline.createInterface({ input: fs.createReadStream(p, 'utf8'), crlfDelay: Infinity });
    let kopf = null;
    for await (let z of rl) { z = z.replace(/^\uFEFF/, ''); const t = z.split(';'); if (!kopf) { kopf = t; continue; } const o = {}; kopf.forEach((k, i) => o[k] = t[i]); f(o); }
}
(async () => {
    const null0 = [];
    for (const v of fs.readdirSync(G)) {
        const pt = path.join(G, v, 'tabellen.csv'), ps = path.join(G, v, 'spiele.csv');
        if (!fs.existsSync(pt) || !fs.existsSync(ps)) continue;
        const zeilen = {}, staffelSpiele = {};
        await lese(pt, o => { if (+o.spiele === 0 && o.mannschaft) zeilen[o.staffel_id + '|' + o.mannschaft] = { v, saison: o.saison, klasse: o.spielklasse, staffel: o.staffel, phase: o.phase, mannschaft: o.mannschaft, hinweis: o.hinweis, platz: o.platz, sp: 0, mitTor: 0 }; });
        if (!Object.keys(zeilen).length) continue;
        const gesehen = new Set();
        await lese(ps, o => {
            if (o.spiel_id) { if (gesehen.has(o.spiel_id)) return; gesehen.add(o.spiel_id); }
            staffelSpiele[o.staffel_id] = (staffelSpiele[o.staffel_id] || 0) + 1;
            for (const m of [o.heim, o.gast]) { const z = zeilen[o.staffel_id + '|' + m]; if (z) { z.sp++; if (o.tore_heim !== '' || o.original_heim) z.mitTor++; } }
        });
        for (const k in zeilen) { const sid = k.split('|')[0]; zeilen[k].staffelHatSpiele = staffelSpiele[sid] || 0; null0.push(zeilen[k]); }
    }
    const mit = null0.filter(z => z.mitTor > 0), ohne = null0.filter(z => z.mitTor === 0 && z.staffelHatSpiele), unbek = null0.filter(z => !z.staffelHatSpiele);
    console.log('fussball.de Null-Zeilen gesamt', null0.length);
    console.log('  mit gespielten Spielen (während der Saison raus):', mit.length);
    console.log('  ohne ein Spiel, Staffel hat Spiele (nie angetreten):', ohne.length);
    console.log('  Staffel ohne Spieleliste (unbekannt):', unbek.length);
    const h = {}; null0.forEach(z => { const k = (z.hinweis || '(leer)').slice(0, 40); h[k] = (h[k] || 0) + 1; }); console.log('Hinweise', h);
    console.log('Beispiele ohne Spiel:'); ohne.slice(0, 12).forEach(z => console.log('   ', z.v, z.saison, z.klasse, z.staffel, z.phase, z.mannschaft, '|', z.hinweis));
    fs.writeFileSync(OUT, JSON.stringify(null0));
})();
