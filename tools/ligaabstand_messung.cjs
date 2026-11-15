// Stärke-Abstand 1. ↔ 2. Liga (Nutzer 15.11.2026: „die erste Liga gegenüber zweite Liga Favorit, aber ohne dass 2.-Liga-Aufsteiger
// in der Liga ständig untergehen müssen“). Misst dieselben Kennzahlen echt und im Spiel:
//   (a) DFB-Pokal: Bundesligist gegen Zweitligist – wer kommt weiter (echt: POKAL_HIST + HISTORY_SEED, eingleisige 2. BL ab 1981/82)
//   (b) Aufsteiger in die Bundesliga: Anteil, der nach EINER Saison wieder absteigt; Ø Endplatz der Aufsteiger
//   (c) Relegation BL-16. gegen 2.-BL-3.: Erstligist bleibt (nur Spiel; echt steht in docs/AUFSTIEGSRUNDEN.md)
//   (d) Absteiger aus der Bundesliga: Anteil, der direkt wieder aufsteigt
//   node tools/ligaabstand_messung.cjs [saisons=60] [KEY=WERT …]   (KEY = Engine-Konstante, z. B. STR_GED_MAX=12)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'app/pokal_hist_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const args = process.argv.slice(2), N = +(args.find(a => /^\d+$/.test(a)) || 60);
const setz = args.filter(a => a.includes('=')).map(a => a.split('='));
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '–';
// ── echt ──
const lvlEcht = {};   // 'YYYY/YY' -> id -> 1|2
HISTORY_SEED.seasons.forEach(s => { if (s.lid !== '1' && s.lid !== '2') return; const m = lvlEcht[s.y] = lvlEcht[s.y] || {}; s.table.forEach(r => { m[r.id] = +s.lid; }); });
const echt = { pokal: [0, 0], aufN: 0, aufAb: 0, aufPl: 0, abN: 0, abAuf: 0 };
POKAL_HIST.saisons.forEach(s => {
    const y = s.y; if (parseInt(y) < 1981) return;
    const L = lvlEcht[y]; if (!L) return;
    s.r.forEach(r => r.s.forEach(sp => {
        const [hi, ai, hg, ag, f] = sp; if (f & 8 || f & 64) return;   // Hinspiel / nicht entschieden zählt nicht
        const h = POKAL_HIST.ids[hi], a = POKAL_HIST.ids[ai], lh = L[h], la = L[a];
        if (!((lh === 1 && la === 2) || (lh === 2 && la === 1))) return;
        const gastWeiter = !!(f & 32), weiter = gastWeiter ? a : h;
        echt.pokal[0]++; if (L[weiter] === 1) echt.pokal[1]++;
    }));
});
const ys = Object.keys(lvlEcht).filter(y => parseInt(y) >= 1981).sort();
ys.forEach((y, i) => { const v = lvlEcht[ys[i - 1]], n = lvlEcht[ys[i + 1]], j = lvlEcht[y]; if (!v || !n) return;
    const tab = HISTORY_SEED.seasons.find(s => s.y === y && s.lid === '1').table;
    tab.forEach(r => { if (v[r.id] === 2) { echt.aufN++; echt.aufPl += r.rank; if (n[r.id] !== 1) echt.aufAb++; } });
    Object.entries(j).forEach(([id, l]) => { if (l === 1 && n[id] !== 1 && lvlEcht[ys[i + 2]]) { echt.abN++; if (lvlEcht[ys[i + 2]][id] === 1) echt.abAuf++; } });
});
// ── Spiel ──
Engine.init();
setz.forEach(([k, v]) => { Engine[k] = +v; });
const sim = { pokal: [0, 0], aufN: 0, aufAb: 0, aufPl: 0, abN: 0, abAuf: 0, rel: [0, 0], diff16: 0, diffN: 0 };
let vorher = null;   // id -> Ebene in der VORSAISON (während sie lief)
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason(); Engine.sortTables();
    const lv = id => { const t = Engine.teams[id]; return t && t.leagueId ? Engine.leagues[t.leagueId].level : 99; };
    // (a) Pokal dieser Saison
    (Engine.pokal && Engine.pokal.rounds || []).forEach(r => (r.matches || []).forEach(m => {
        if (!m.winnerId) return; const a = lv(m.hId), b = lv(m.aId);
        if ((a === 1 && b === 2) || (a === 2 && b === 1)) { sim.pokal[0]++; if (lv(m.winnerId) === 1) sim.pokal[1]++; }
    }));
    const jetzt = {}; Object.values(Engine.teams).forEach(t => { jetzt[t.id] = lv(t.id); });
    const bl = Object.values(Engine.teams).filter(t => jetzt[t.id] === 1);
    const auf = (vorher ? bl.filter(t => vorher[t.id] === 2) : []).map(t => ({ id: t.id, rank: t.rank || 0 }));   // Platz VOR dem Wechsel merken
    const R = Engine.relegation && Engine.relegation.d && Engine.relegation.d.bl;
    if (R && R.winnerId) { sim.rel[0]++; if (R.winnerId === R.hoch) sim.rel[1]++; sim.diff16 += (Engine.teams[R.hoch].strength || 0) - (Engine.teams[R.tief].strength || 0); sim.diffN++; }
    const abJetzt = vorher ? Object.keys(vorher).filter(id => vorher[id] === 1 && jetzt[id] === 2) : [];
    Engine.processSeasonTransition();
    auf.forEach(t => { sim.aufN++; sim.aufPl += t.rank; if (lv(t.id) !== 1) sim.aufAb++; });
    abJetzt.forEach(id => { sim.abN++; if (lv(id) === 1) sim.abAuf++; });
    vorher = jetzt;
}
console.log = _log;
console.log(`Einstellung: ${setz.map(x => x.join('=')).join(' ') || 'wie im Spiel'} · ${N} Saisons`);
console.log(`(a) Pokal BL gegen 2. BL, BL kommt weiter:  echt ${pct(echt.pokal[1], echt.pokal[0])} (${echt.pokal[0]} Spiele ab 1981/82) · Spiel ${pct(sim.pokal[1], sim.pokal[0])} (${sim.pokal[0]})`);
console.log(`(b) Aufsteiger sofort wieder ab:            echt ${pct(echt.aufAb, echt.aufN)} (${echt.aufN}), Ø Platz ${(echt.aufPl / echt.aufN).toFixed(1)} · Spiel ${pct(sim.aufAb, sim.aufN)} (${sim.aufN}), Ø Platz ${(sim.aufPl / Math.max(1, sim.aufN)).toFixed(1)}`);
console.log(`(c) Relegation, Erstligist bleibt:          echt 78 % (21/27) · Spiel ${pct(sim.rel[1], sim.rel[0])} (${sim.rel[0]}), Ø Stärke BL-16 − 2BL-3 ${(sim.diff16 / Math.max(1, sim.diffN)).toFixed(1)}`);
console.log(`(d) Absteiger sofort wieder rauf:           echt ${pct(echt.abAuf, echt.abN)} (${echt.abN}) · Spiel ${pct(sim.abAuf, sim.abN)} (${sim.abN})`);
