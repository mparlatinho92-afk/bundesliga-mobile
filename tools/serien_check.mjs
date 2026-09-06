/* Fehlt der Engine die FORM? Gemessen an Serien, nicht am Gefuehl.
 *
 *   node tools/serien_check.mjs
 *
 * Wenn Spiele unabhaengig gezogen werden, entstehen Serien trotzdem - rein zufaellig. Die Frage
 * ist, ob sie LANG genug werden. Real haengen Ergebnisse zusammen (Lauf, Krise, Verletzungswelle);
 * im Modell haengt nichts zusammen, die Tagesform wird je Spiel neu gewuerfelt.
 *
 * Gemessen wird je Verein und Saison die laengste Siegserie und die laengste sieglose Serie,
 * einmal aus echten Bundesligaspielen (openfootball, alle verfuegbaren Saisons) und einmal aus
 * der Engine. Die Verteilungen muessen sich decken - tun sie es nicht, fehlt Form.
 *
 * Ausgabe: Anteil der Vereins-Saisons mit einer Serie von mindestens X.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + path.sep;

// ---------------------------------------------------------------- real
const RAW = 'https://raw.githubusercontent.com/openfootball/deutschland/master/';
const tree = await (await fetch('https://api.github.com/repos/openfootball/deutschland/git/trees/master?recursive=1')).json();
const dateien = tree.tree.filter(x => /^\d{4}-\d{2}\/1-bundesliga\d*\.txt$/.test(x.path));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const serienAus = folgen => {              // folgen: Map teamName -> Array von 'S'|'U'|'N'
    const out = { sieg: [], sieglos: [] };
    for (const [, f] of folgen) {
        let s = 0, bs = 0, u = 0, bu = 0;
        for (const e of f) {
            s = e === 'S' ? s + 1 : 0; if (s > bs) bs = s;
            u = e === 'S' ? 0 : u + 1; if (u > bu) bu = u;
        }
        out.sieg.push(bs); out.sieglos.push(bu);
    }
    return out;
};

const realSieg = [], realSieglos = [];
for (const f of dateien) {
    const r = await fetch(RAW + f.path); await sleep(30);
    if (!r.ok) continue;
    const folgen = new Map();
    for (const line of (await r.text()).split('\n')) {
        // "    15:30  RB Leipzig              v VfL Bochum 1848          1-0 (0-0)"
        const m = line.match(/^\s+(?:\d{1,2}:\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d{1,2})-(\d{1,2})/);
        if (!m) continue;
        const [, h, a, gh, ga] = m;
        const eh = +gh > +ga ? 'S' : +gh === +ga ? 'U' : 'N';
        const ea = +ga > +gh ? 'S' : +gh === +ga ? 'U' : 'N';
        if (!folgen.has(h.trim())) folgen.set(h.trim(), []);
        if (!folgen.has(a.trim())) folgen.set(a.trim(), []);
        folgen.get(h.trim()).push(eh);
        folgen.get(a.trim()).push(ea);
    }
    if (folgen.size < 10) continue;
    const s = serienAus(folgen);
    realSieg.push(...s.sieg); realSieglos.push(...s.sieglos);
}
console.error(`${dateien.length} Saisondateien, ${realSieg.length} Vereins-Saisons real`);

// ---------------------------------------------------------------- Engine
const _ls = {};
global.localStorage = { getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global;
global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.indexedDB = undefined;
for (const f of ['game_data.js', 'app/history_data.js', 'game_engine.js'])
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '));

// KEY=VALUE-Argumente wie in den anderen Werkzeugen
process.argv.slice(3).forEach(x => {
    const m = x.match(/^([A-Z_]+)=(-?[0-9.]+)$/);
    if (!m || !(m[1] in Engine)) { console.error('Unbrauchbar: ' + x); process.exit(1); }
    Engine[m[1]] = +m[2];
});
Engine._groesse=null;
console.error('  '+Object.keys(Engine).filter(k=>/^STR_/.test(k)).map(k=>k+' '+Engine[k]).join(' | '));
Engine.init(); Engine.fastMode = true;
const engSieg = [], engSieglos = [];
const N = parseInt(process.argv[2] || '40', 10);
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const folgen = new Map();
    Engine.seasonResults.forEach(r => {
        if (r.lid !== '1') return;                       // nur 1. Bundesliga, wie der reale Satz
        const eh = r.s1 > r.s2 ? 'S' : r.s1 === r.s2 ? 'U' : 'N';
        const ea = r.s2 > r.s1 ? 'S' : r.s1 === r.s2 ? 'U' : 'N';
        if (!folgen.has(r.hId)) folgen.set(r.hId, []);
        if (!folgen.has(r.aId)) folgen.set(r.aId, []);
        folgen.get(r.hId).push(eh); folgen.get(r.aId).push(ea);
    });
    const x = serienAus(folgen);
    engSieg.push(...x.sieg); engSieglos.push(...x.sieglos);
    Engine.processSeasonTransition();
}

const anteil = (arr, x) => arr.filter(v => v >= x).length / arr.length * 100;
const zeile = (name, r, e) => {
    console.log(`\n${name}   (real ${r.length} Vereins-Saisons, Engine ${e.length})`);
    console.log('  mind. |   real | Engine');
    for (let x = 3; x <= 10; x++)
        console.log(`  ${String(x).padStart(5)} | ${anteil(r, x).toFixed(1).padStart(5)} % | ${anteil(e, x).toFixed(1).padStart(5)} %`);
    console.log(`  laengste: real ${Math.max(...r)}, Engine ${Math.max(...e)}   |   Ø real ${(r.reduce((a, b) => a + b, 0) / r.length).toFixed(2)}, Engine ${(e.reduce((a, b) => a + b, 0) / e.length).toFixed(2)}`);
};
zeile('SIEGSERIE', realSieg, engSieg);
zeile('SIEGLOS-SERIE', realSieglos, engSieglos);
