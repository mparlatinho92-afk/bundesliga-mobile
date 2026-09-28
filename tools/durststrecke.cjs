// Daten-Durststrecke: welche Spielvereine haben die längste Lücke in den historischen Abschlusstabellen
// (HISTORY_SEED + HistExt, 1963/64 bis zur letzten Seed-Saison)?
//
//   node tools/durststrecke.cjs [N]              Top N (Standard 30), Vergleich mit dem gespeicherten Stand
//   node tools/durststrecke.cjs [N] --speichern  aktuellen Stand als Vergleichsbasis ablegen (tools/durststrecke.json)
//
// Lücke = zusammenhängende Saisons OHNE Tabellenzeile zwischen zwei bekannten Saisons (innen).
// Randlücken (vor der ersten / nach der letzten bekannten Saison) stehen daneben, ranken aber nicht –
// ein Kreisligist ohne jede Tabelle ist keine Durststrecke, sondern Normalfall.
// Absichtlich OHNE Angabe, wo der Verein in der Lücke spielte – nur die bekannte Liga davor und danach.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 30);
const SPEICHERN = process.argv.includes('--speichern');
const BASIS = ROOT + 'tools/durststrecke.json';

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const jahr = y => +String(y).slice(0, 4);
const ligaName = lid => (HIST_EXT.ligen[lid] || GAME_DATA.leagues[lid] || {}).name || lid;
const remap = HIST_EXT.remap || {};

(async () => {
    const x = await HistExt.load();
    if (!x) { console.error('HistExt nicht entpackt'); process.exit(1); }
    const tab = [];
    HISTORY_SEED.seasons.forEach(s => tab.push({ y: s.y, lid: s.lid, rows: s.table }));
    Object.values(x.byKey).forEach(r => tab.push({ y: r.y, lid: r.lid, rows: r.rows }));
    const von = 1963, bis = Math.max(...HISTORY_SEED.seasons.map(s => jahr(s.y)));

    const belegt = {};   // id -> {jahr: lid}
    tab.forEach(t => t.rows.forEach(z => { const id = remap[z.id] || z.id; (belegt[id] = belegt[id] || {})[jahr(t.y)] = t.lid; }));

    const liste = Object.keys(GAME_DATA.teams).map(id => {
        const b = belegt[id] || {}, js = Object.keys(b).map(Number).sort((a, c) => a - c);
        const e = { id, name: GAME_DATA.teams[id].name, n: js.length, luecke: 0 };
        if (!js.length) return e;
        e.erste = js[0]; e.letzte = js[js.length - 1];
        e.vorn = js[0] - von; e.hinten = bis - e.letzte;
        for (let i = 1; i < js.length; i++) {
            const l = js[i] - js[i - 1] - 1;
            if (l > e.luecke) Object.assign(e, { luecke: l, ab: js[i - 1] + 1, bisJ: js[i] - 1, vorLiga: b[js[i - 1]], nachLiga: b[js[i]] });
        }
        e.fehlt = e.letzte - e.erste + 1 - js.length;   // alle Innenlücken zusammen
        return e;
    });

    const mit = liste.filter(e => e.luecke > 0).sort((a, c) => c.luecke - a.luecke || c.fehlt - a.fehlt);
    const basis = fs.existsSync(BASIS) ? JSON.parse(fs.readFileSync(BASIS, 'utf8')) : null;
    const alt = basis ? Object.fromEntries(basis.vereine.map(e => [e.id, e])) : {};
    const sz = j => `${j}/${String(j + 1).slice(2)}`;

    console.log(`Datenbasis ${sz(von)}–${sz(bis)}: ${tab.length} Liga-Saisons, ${liste.length} Spielvereine`);
    console.log(`  mit Innenlücke ${mit.length} · lückenlos ${liste.filter(e => e.n && !e.luecke).length} · ganz ohne Tabelle ${liste.filter(e => !e.n).length}`);
    if (basis) console.log(`  Vergleich mit Stand vom ${basis.stand} (Innenlücke gesamt ${basis.summe} -> ${mit.reduce((a, e) => a + e.fehlt, 0)} Saisons)`);
    console.log(`\nTop ${N} – längste Innenlücke`);
    console.log(' #  Lücke  Zeitraum        Verein                              zuletzt davor → wieder danach' + (basis ? '   vorher' : ''));
    mit.slice(0, N).forEach((e, i) => {
        const a = alt[e.id], d = a ? (a.luecke === e.luecke ? '=' : `${a.luecke}→${e.luecke}`) : (basis ? 'neu' : '');
        console.log(`${String(i + 1).padStart(2)}  ${String(e.luecke).padStart(4)}   ${sz(e.ab)}–${sz(e.bisJ)}  ${e.name.slice(0, 34).padEnd(34)}  ${ligaName(e.vorLiga)} → ${ligaName(e.nachLiga)}` + (d ? `   ${d}` : ''));
    });

    // Welche Ligen umrahmen die Lücken am häufigsten? (Hinweis, welche Staffeln/Epochen fehlen)
    const rahmen = {};
    mit.slice(0, N).forEach(e => [e.vorLiga, e.nachLiga].forEach(l => { rahmen[l] = (rahmen[l] || 0) + 1; }));
    console.log('\nLigen am Rand der Top-' + N + '-Lücken:');
    Object.entries(rahmen).sort((a, c) => c[1] - a[1]).slice(0, 12).forEach(([l, k]) => console.log(`  ${String(k).padStart(3)}×  ${ligaName(l)}`));

    if (basis) {
        const geschlossen = basis.vereine.filter(a => { const e = liste.find(v => v.id === a.id); return e && e.luecke < a.luecke; });
        console.log(`\nSeit dem gespeicherten Stand verkürzt: ${geschlossen.length} Vereine` +
            (geschlossen.length ? ' – ' + geschlossen.slice(0, 15).map(a => `${a.name} ${a.luecke}→${liste.find(v => v.id === a.id).luecke}`).join(', ') : ''));
    }
    if (SPEICHERN || !basis) {
        fs.writeFileSync(BASIS, JSON.stringify({ stand: new Date().toISOString().slice(0, 10), summe: mit.reduce((a, e) => a + e.fehlt, 0),
            vereine: mit.map(e => ({ id: e.id, name: e.name, luecke: e.luecke, ab: e.ab, bis: e.bisJ, fehlt: e.fehlt })) }, null, 1));
        console.log(`\nVergleichsbasis gespeichert: tools/durststrecke.json`);
    }
})();
