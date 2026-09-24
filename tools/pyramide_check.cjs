// PRUEFUNG (Exit 1 bei Befund): Ligapyramide (app/pyramide.js, App._pyrBaue) fuer JEDE Saison mit Tabellen.
//
//   node tools/pyramide_check.cjs              alle Saisons: Seed + HistExt + 3 gespielte Saisons + laufende
//   node tools/pyramide_check.cjs --selbsttest dieselbe Pruefung, aber eine Liga steht im falschen Gebiet – MUSS durchfallen
//   node tools/pyramide_check.cjs 1975/76      nur diese Saison, mit Baum-Ausgabe
//
// Headless wie tools/historie_einbau_test.cjs. IndexedDB gibt es in Node nicht; die Tabellen kommen deshalb direkt
// aus denselben Quellen, die IDBStore.getSeasonAll mischt: HISTORY_SEED, HistExt, Engine._idbPending.
// Geprueft wird die ECHTE Funktion _pyrBaue – nicht nachgebaut.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
const NUR = process.argv.slice(2).find(a => /^\d{4}/.test(a));

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.App = {};
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'game_engine.js', 'app/league.js', 'app/pyramide.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const befunde = [];
const fehl = t => { befunde.push(t); };

if (SELBST) {
    // Sabotage: die Amateurliga Hessen gilt als DDR-Liga – sie haengt dann unter einer DDR-Staffel
    const orig = App._histGebiet;
    App._histGebiet = function (lid) { return lid === 'h3-hessen-amateurliga' ? 'DDR' : orig.call(this, lid); };
}

(async () => {
    Engine.init();
    // drei gespielte Saisons: ihre Tabellen liegen danach in Engine._idbPending (so wie vor dem ersten Speichern)
    for (let i = 0; i < 3; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    const idx = await HistExt.load();
    const tab = y => {
        if (!y) return {};
        if (y === App._pyrLiveJahr()) { const o = {}; Object.values(Engine.teams).forEach(t => { if (t.leagueId) (o[t.leagueId] = o[t.leagueId] || { rows: [] }).rows.push({ id: t.id, rank: t.rank }); }); return o; }
        const o = {};
        HISTORY_SEED.seasons.filter(s => s.y === y).forEach(s => { o[s.lid] = { rows: s.table }; });
        Object.entries((idx && idx.bySeason[y]) || {}).forEach(([l, r]) => { if (!o[l]) o[l] = r; });
        ((Engine._idbPending && Engine._idbPending.tables) || []).filter(t => t.y === y).forEach(t => { if (!o[t.lid]) o[t.lid] = t; });
        return o;
    };
    const jahre = NUR ? [NUR] : await App._pyrJahre();
    const rowsOf = r => (r && r.rows) || [];
    let geprueft = 0, unsicherAlle = [], geisterSumme = 0;
    jahre.forEach(y => {
        const cur = tab(y), nxt = tab(App._nextSeasonStr(y)), prv = tab(App._prevSeasonStr(y));
        const D = App._pyrBaue(y, cur, nxt, prv, 'eng');
        const K = {}; D.knoten.forEach(k => { if (K[k.key]) fehl(`${y}: Schluessel doppelt ${k.key}`); K[k.key] = k; });
        const echt = D.knoten.filter(k => !k.ghost);
        // 1) jede Tabelle genau einmal (je Staffel ein Knoten), 2) Summe der Groessen = Zeilen
        Object.keys(cur).forEach(l => {
            const rec = cur[l], rows = rowsOf(rec); if (!rows.length) return;
            const kn = echt.filter(k => k.lid === l);
            const gs = !rec.vr && rows.some(r => r.g) ? new Set(rows.map(r => r.g).filter(Boolean)).size : 1;
            if (kn.length !== gs) fehl(`${y}: ${l} erscheint ${kn.length}x statt ${gs}x`);
            const soll = rec.vr ? new Set(rows.map(r => r.id)).size : rows.length;
            const ist = kn.reduce((s, k) => s + k.size, 0);
            if (ist !== soll) fehl(`${y}: ${l} Groesse ${ist} statt ${soll}`);
        });
        // 3) Eltern existieren, eine Ebene hoeher, im selben Gebiet; echte Ligen haengen an echten Ligen
        D.knoten.forEach(k => {
            if (!k.parent) {
                if (!k.ghost && k.level !== 1 && echt.some(o => o.gebiet === k.gebiet && o.level === 1)) fehl(`${y}: ${k.key} (Ebene ${k.level}) ohne Liga darueber`);
                return;
            }
            const p = K[k.parent];
            if (!p) { fehl(`${y}: ${k.key} -> Eltern ${k.parent} fehlen`); return; }
            if (p.level !== k.level - 1) fehl(`${y}: ${k.key} (Ebene ${k.level}) haengt an ${p.key} (Ebene ${p.level})`);
            if (p.gebiet !== k.gebiet) fehl(`${y}: ${k.key} (${k.gebiet}) haengt an ${p.key} (${p.gebiet})`);
            if (!k.ghost && p.ghost) fehl(`${y}: echte Liga ${k.key} haengt an Platzhalter ${p.key}`);
        });
        // 4) kein Kreis
        D.knoten.forEach(k => { let n = k, i = 0; while (n && n.parent && i++ < 20) n = K[n.parent]; if (i >= 20) fehl(`${y}: Kreis ab ${k.key}`); });
        // 5) Platzhalter (eng): gab es in der Saison davor oder danach, jetzt nicht
        D.knoten.filter(k => k.ghost && !k.fill).forEach(k => {
            if (rowsOf(cur[k.lid]).length) fehl(`${y}: Platzhalter ${k.lid} hat eine Tabelle`);
            if (!rowsOf(prv[k.lid]).length && !rowsOf(nxt[k.lid]).length) fehl(`${y}: Platzhalter ${k.lid} weder davor noch danach`);
        });
        geisterSumme += D.knoten.filter(k => k.ghost && !k.fill).length;
        echt.filter(k => k.unsicher).forEach(k => unsicherAlle.push(`${y} ${k.key}`));
        geprueft++;
        if (NUR) {
            const zeig = (k, t) => { console.log('  '.repeat(t) + (k.ghost ? '▢ ' + (k.lid || '(Ebene fehlt)') : `${k.name} [${k.size}] ▲${k.up} ▼${k.down}${k.unsicher ? ' *' : ''}`));
                D.knoten.filter(c => c.parent === k.key).forEach(c => zeig(c, t + 1)); };
            D.knoten.filter(k => !k.parent).forEach(k => zeig(k, 0));
        }
    });
    console.log(`${geprueft} Saisons geprueft (${jahre[0]} … ${jahre[jahre.length - 1]}), ${geisterSumme} Platzhalter (eng).`);
    console.log(`Zuordnung zur Staffel darueber unsicher (markiert mit *): ${unsicherAlle.length}${unsicherAlle.length ? ' – ' + unsicherAlle.slice(0, process.env.ALLE ? 999 : 12).join(', ') + (unsicherAlle.length > 12 ? ' …' : '') : ''}`);
    if (befunde.length) { console.log(`\nBEFUND: ${befunde.length}`); befunde.slice(0, 40).forEach(b => console.log('  FEHL ' + b)); if (befunde.length > 40) console.log('  …'); process.exit(1); }
    console.log('OK');
})().catch(e => { console.error(e); process.exit(2); });
