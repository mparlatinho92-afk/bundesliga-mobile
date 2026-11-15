// Eichung des Relegations-Klassenfaktors (Engine.RELE_KLASSE, Nutzer 15.11.2026: „Mischung aus Statistik und Plausibilität“).
// 1. sammelt die echten Paarungen (Stärke hoch/tief) aus N simulierten Saisons, 2. spielt jede Paarung je Zuschlag-Kandidat R-mal
// mit Hin- und Rückspiel (Engine._releSpiel) und meldet die Quote „Höherer bleibt“. Ziel: bl 72 %, zl 37 % (Herleitung in game_engine.js).
//   node tools/relegation_eichung.cjs [saisons=60] [wiederholungen=40]
// ACHTUNG (gemessen 15.11.2026): die Wiederholung am Saisonende UNTERSCHÄTZT die Wirkung (bl +16 → hier 72 %, in der Saison 83 %).
// Maßgeblich ist tools/relegation_quote_check.cjs (Duelle in der Saison gespielt); dieses Werkzeug nur zur groben Richtung.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 60, REP = +process.argv[3] || 40, ZIEL = { bl: 0.72, zl: 0.37 };
Engine.init();
Engine.RELE_KLASSE = { bl: { seite: 'hoch', plus: 0 }, zl: { seite: 'tief', plus: 0 } };
// Mit den ECHTEN Vereinen am Saisonende wiederholen: ihre Tagesform (_tagesform) trägt den Schwung aus der Saison – mit nachgebauten
// Vereinen ohne Form gewann der Höhere ohne Zuschlag 62 %/68 % statt 55 %/45 % (gemessen 15.11.2026)
const KAND = { bl: [0, 4, 8, 10, 12, 14, 16, 18, 20], zl: [0, 2, 4, 6, 8, 10, 12] }, sum = { bl: {}, zl: {} }, anz = { bl: 0, zl: 0 };
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const R = Engine.relegation;
    if (R && R.d) ['bl', 'zl'].forEach(k => {
        const d0 = R.d[k]; if (!d0) return; anz[k]++;
        KAND[k].forEach(p => { Engine.RELE_KLASSE[k].plus = p; let h = 0;
            for (let i = 0; i < REP; i++) { const d = { k, hoch: d0.hoch, tief: d0.tief }; Engine._releSpiel(d, 'hin'); Engine._releSpiel(d, 'rueck'); if (d.winnerId === d.hoch) h++; }
            sum[k][p] = (sum[k][p] || 0) + h; });
        Engine.RELE_KLASSE[k].plus = 0;
    });
    Engine.processSeasonTransition();
}
console.log = _log;
for (const k of ['bl', 'zl']) {
    let best = null;
    const zeilen = KAND[k].map(p => { const q = sum[k][p] / (anz[k] * REP); if (!best || Math.abs(q - ZIEL[k]) < Math.abs(best.q - ZIEL[k])) best = { p, q }; return `${p}: ${(100 * q).toFixed(1)} %`; });
    console.log(`${k} (${anz[k]} Duelle × ${REP}, Zuschlag für ${Engine.RELE_KLASSE[k].seite}): ${zeilen.join(' · ')}`);
    console.log(`  → bester Zuschlag ${best.p} (${(100 * best.q).toFixed(1)} %, Ziel ${100 * ZIEL[k]} %)`);
}
