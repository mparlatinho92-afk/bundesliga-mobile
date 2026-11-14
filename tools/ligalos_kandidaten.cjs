// Kandidaten zum Auffüllen dünner Amateurpokal-Regionen (Nutzer 14.11.2026: „mindestens 8 je Region“). Quelle: die echten
// Tabellen der Bodenliga der letzten 5 Saisons als verkürzte Ewige Tabelle. Vorschlag = Vereine, die dort spielten, aber
// nicht im Spiel sind. Ausgeschlossen (aber genannt): harte Abstürze – Rückzug/Sonder-Abstieg wie im Archiv (verschwunden, während ein
// schlechter Platzierter derselben Staffel in der Liga blieb).
//   node tools/ligalos_kandidaten.cjs [min=8] [saisons=5]   -> docs/ligalos-kandidaten/liste.txt
// Region = Feld der Sonder-Relegation: Bodenliga + ihre dynamische Staffelgruppe (Engine._dynGruppen, Berlin 7-8/7-9).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const R = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
const ld = f => eval.call(global, fs.readFileSync(R + f, 'utf8').replace(/^const /gm, 'var '));
ld('game_data.js'); ld('app/history_data.js'); ld('app/history_ext.js'); ld('game_engine.js');
Engine.init();
console.log = _log;
const MIN = +process.argv[2] || 8, N = +(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : 5);
const E = Engine, RM = HIST_EXT.remap || {};
const ext = JSON.parse(zlib.gunzipSync(Buffer.from(HIST_EXT.gz, 'base64')).toString());
const recs = HISTORY_SEED.seasons.map(s => ({ y: parseInt(s.y), lid: s.lid, rows: s.table }))
    .concat(ext.map(t => ({ y: parseInt(t.y), lid: t.lid, rows: t.rows, an: t.an })));
// Name = der aus der letzten Saison, in der der Verein spielte (Zeitname, sonst Grundname) – nicht der Grundname: „Verkehrsbetriebe
// Waren“ hieß zuletzt SV Waren 09 (Nutzer 14.11.2026)
const sj = s => parseInt(String(s || '')) || 0;
const name = id => {
    if (GAME_DATA.teams[id]) return GAME_DATA.teams[id].name;
    const y = Math.max(0, ...Object.keys(wo[id] || {}).map(Number));
    const L = ((typeof HISTORIC_NAMES !== 'undefined' && HISTORIC_NAMES[id]) || []).concat((HIST_EXT.namen || {})[id] || []);
    const e = L.find(e => (e.from ? sj(e.from) : -1e9) <= y && y <= (e.to ? sj(e.to) : 1e9));
    return (e && e.name) || HIST_EXT.vereine[id] || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || id;
};
// längere Spanne für einzelne Bodenligen: --lang 6-18,6-19:8 (Nutzer: Bremen und MV 8 statt 5 Jahre)
const LANG = {}; (() => { const i = process.argv.indexOf('--lang'); if (i < 0) return; const [ids, n] = process.argv[i + 1].split(':'); ids.split(',').forEach(x => LANG[x] = +n); })();
const lvlOf = lid => (GAME_DATA.leagues[lid] || HIST_EXT.ligen[lid] || {}).level || 99;
const lname = lid => (GAME_DATA.leagues[lid] || HIST_EXT.ligen[lid] || {}).name || lid;
// wo spielte wer in welchem Jahr
const wo = {};
recs.forEach(r => r.rows.forEach(z => { const id = RM[z.id] || z.id; (wo[id] = wo[id] || {})[r.y] = r.lid; }));
const MAXY = Math.max(...recs.map(r => r.y)), Y0 = MAXY - N + 1;
// Schon im Spiel unter anderer Schreibweise/ID (Nutzer 14.11.2026: „Seligenstadt haben wir schon“) – von Hand geprüft
const DUBLETTE = {
    hist_fb_spfrdseligenstadt: 'sportfreundeseligenstadt_1053',
    hist_fb_fceichenzell: 'fcbritanniaeichenzell_1024',
    hist_fb_sgbronnzell: 'sgviktoriabronnzell_1016',
    hist_fb_sgkleihundoh: 'sgkleinalmerodehundelshausendohrenbach_1025',   // „SG Klei. /Hun. /Doh.“
};
const imSpiel = id => !!GAME_DATA.teams[id] || !!DUBLETTE[id];
// Spielvereine mit demselben Ortswort – Hinweis zum Prüfen, keine Entscheidung (TS ≠ FV Mosbach)
const STOP = new Set('sv fc sg tsv vfb vfl sc fsv ssv tus spvgg sportfreunde spfrd eintracht union borussia germania fortuna viktoria concordia blau weiss weiß rot grün gelb schwarz djk tsg bsc asv ts wsc vfr fv olympia aufbau frankonia ot ii sportverein turnverein bremen berlin'.split(' '));
const worte = n => String(n).toLowerCase().replace(/[^a-zäöüß0-9 /-]/g, ' ').split(/[\s/-]+/).filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w));
// Abkürzungen der Quelle („SG Klei. /Hun. /Doh.“): jede Vorsilbe mit Punkt muss ein Wort des Spielvereins anfangen
const kuerzel = nm => (String(nm).toLowerCase().match(/[a-zäöüß]{3,}(?=\.)/g) || []);
const aehnlich = nm => { const w = worte(nm), k = kuerzel(nm); return Object.values(GAME_DATA.teams).filter(t => {
    const tw = String(t.name).toLowerCase().split(/[^a-zäöüß]+/);
    return (k.length >= 2 && k.every(p => tw.some(x => x.startsWith(p)))) || worte(t.name).some(x => w.some(v => x === v || (v.length >= 5 && (x.startsWith(v) || v.startsWith(x)))));
}).map(t => t.name); };

// Regionen (Pools) wie in _sonderRelegation
const boden = Object.values(E.leagues).filter(l => !(E.DOWN_MAP[l.id] || []).length && l.level >= 5);
const gruppen = E._dynGruppen().map(g => g[0]).concat([['7-8', '7-9']]);
const poolVon = lid => { const g = new Set([lid]); gruppen.forEach(ids => { if (ids.includes(lid)) ids.forEach(x => g.add(x)); }); return [...g].filter(x => boden.some(b => b.id === x)).sort(); };
const pools = {}; boden.forEach(b => { const p = poolVon(b.id); pools[p.join('+')] = p; });
const ligalos = Object.values(E.teams).filter(t => !t.leagueId);

let out = `Ligalose je Region (Feld der Sonder-Relegation), Ziel mindestens ${MIN}. Quelle: echte Tabellen ${Y0}/${String(Y0 + 1).slice(-2)}–${MAXY}/${String(MAXY + 1).slice(-2)}.\n`
    + `Spalten: Sz = Saisons in der Bodenliga (letzte ${N}), Pkt/Sp (3-Punkte), bester Platz, letzte Saison mit Platz; ▲ = kam in diesen Jahren aus der Liga darüber.\n\n`;
const zusammen = [];
Object.values(pools).sort((a, b) => a.join().localeCompare(b.join())).forEach(pool => {
    const ueber = new Set(); pool.forEach(s => { for (let x = s, g = 0; x && g < 12; x = E.UP_MAP[x], g++) ueber.add(x); });
    const n = ligalos.filter(t => ueber.has(E.resolveHomeLeagueId(t))).length;
    if (n >= MIN) return;
    const titel = pool.map(lname).join(' + ');
    const Y0 = MAXY - Math.max(N, ...pool.map(x => LANG[x] || 0)) + 1;
    // verkürzte Ewige Tabelle der letzten N Saisons
    const tab = {};
    recs.filter(r => pool.includes(r.lid) && r.y >= Y0).forEach(r => {
        r.rows.forEach(z => {
            const id = RM[z.id] || z.id, o = tab[id] = tab[id] || { id, sz: 0, sp: 0, pkt: 0, best: 99, last: 0, lastRank: 0, lid: r.lid };
            o.sz++; o.sp += (z.s || 0) + (z.u || 0) + (z.n || 0); o.pkt += 3 * (z.s || 0) + (z.u || 0);
            o.best = Math.min(o.best, z.rank || 99); if (r.y >= o.last) { o.last = r.y; o.lastRank = z.rank; o.lid = r.lid; }
        });
    });
    // Schicksal nach der letzten Saison: Rückzug (Sonder-Abstieg) wie im Archiv (app/league.js rueckzug)
    const schicksal = o => {
        if (o.last === MAXY) return { art: 'aktuell', txt: `spielt ${MAXY}/${String(MAXY + 1).slice(-2)} noch` };
        const nachher = Object.entries(wo[o.id] || {}).filter(([y]) => +y > o.last).sort((a, b) => a[0] - b[0])[0];
        if (nachher && lvlOf(nachher[1]) <= lvlOf(o.lid)) return { art: 'weiter', txt: `${nachher[0]}: ${lname(nachher[1])}` };
        if (nachher && lvlOf(nachher[1]) >= lvlOf(o.lid) + 2) return { art: 'hart', txt: `${nachher[0]}: ${lname(nachher[1])} (zwei Ebenen tiefer)` };
        const rec = recs.find(r => r.lid === o.lid && r.y === o.last), z0 = rec && rec.rows.find(z => (RM[z.id] || z.id) === o.id);
        const bleibt = q => { const w = (wo[RM[q.id] || q.id] || {})[o.last + 1]; return w && lvlOf(w) <= lvlOf(o.lid); };
        const rz = rec && z0 && rec.rows.some(q => (q.g || '') === (z0.g || '') && (q.rank || 0) > (z0.rank || 0) && bleibt(q));
        if (rz && rec.an) return { art: 'unsicher', txt: `? verschwunden nach ${o.last}/${String(o.last + 1).slice(-2)} – Saison annulliert, Rückzug unsicher` };
        if (rz) return { art: 'hart', txt: `↘ Rückzug nach ${o.last}/${String(o.last + 1).slice(-2)} (Platz ${o.lastRank}, Schlechtere blieben)` };
        return { art: 'ab', txt: `abgestiegen nach ${o.last}/${String(o.last + 1).slice(-2)} (Platz ${o.lastRank})` };
    };
    const vonOben = o => pool.some(p => { const up = E.UP_MAP[p]; return up && Object.entries(wo[o.id] || {}).some(([y, l]) => +y >= Y0 - 2 && +y <= MAXY && l === up); });
    const alle = Object.values(tab).map(o => Object.assign(o, { s: schicksal(o), oben: vonOben(o), ppg: o.sp ? o.pkt / o.sp : 0 }));
    const imSpielL = alle.filter(o => imSpiel(o.id)), frei = alle.filter(o => !imSpiel(o.id));
    const ok = frei.filter(o => o.s.art !== 'hart' && o.s.art !== 'unsicher').sort((a, b) => (b.oben - a.oben) || (b.sz - a.sz) || (b.ppg - a.ppg));
    const hart = frei.filter(o => o.s.art === 'hart'), unsicher = frei.filter(o => o.s.art === 'unsicher');
    const fehlt = MIN - n;
    const zeile = o => `   ${o.oben ? '▲' : ' '} ${name(o.id).padEnd(34).slice(0, 34)} Sz ${o.sz}  ${o.ppg.toFixed(2)} Pkt/Sp  best ${String(o.best).padStart(2)}.  zuletzt ${o.last}/${String(o.last + 1).slice(-2)} ${String(o.lastRank).padStart(2)}.  ${o.s.txt}   [${o.id}]${(() => { const h = aehnlich(name(o.id)); return h.length ? "   ⚑ prüfen: " + h.slice(0, 3).join(", ") : ""; })()}`;
    out += `═ ${titel} (${Y0}/${String(Y0 + 1).slice(-2)}–${MAXY}/${String(MAXY + 1).slice(-2)}): ${n} Ligalose, fehlen ${fehlt}. In der Tabelle ${alle.length} Vereine, davon ${imSpielL.length} im Spiel (${imSpielL.filter(o => !E.teams[o.id] || !E.teams[o.id].leagueId).length} ligalos), ${frei.length} nicht im Spiel.\n`;
    out += `  Vorschlag (die ersten ${fehlt}):\n` + ok.slice(0, fehlt).map(zeile).join('\n') + '\n';
    if (ok.length > fehlt) out += `  weitere:\n` + ok.slice(fehlt).map(zeile).join('\n') + '\n';
    if (ok.length < fehlt) out += `  ⚠ nur ${ok.length} geeignete – ${fehlt - ok.length} fehlen weiter\n`;
    if (unsicher.length) out += `  unsicher (annullierte Saison, nicht im Vorschlag):\n` + unsicher.map(zeile).join('\n') + '\n';
    if (hart.length) out += `  ausgeschlossen, harter Absturz:\n` + hart.map(zeile).join('\n') + '\n';
    out += '\n';
    zusammen.push(`${titel}: ${n} → fehlen ${fehlt}, geeignet ${ok.length}, hart ${hart.length}, unsicher ${unsicher.length}`);
});
fs.mkdirSync(R + 'docs/ligalos-kandidaten', { recursive: true });
fs.writeFileSync(R + 'docs/ligalos-kandidaten/liste.txt', out);
console.log(zusammen.join('\n'));
console.log(`→ docs/ligalos-kandidaten/liste.txt`);
