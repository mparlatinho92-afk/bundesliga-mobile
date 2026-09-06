/* Schlaegt der Klassenunterschied im POKAL durch?
 *
 *   node tools/pokal_effekt.cjs [saisons] [GOAL_X=wert ...]
 *
 * DFB-Pokal, Amateurpokal und Testspiele bekommen bewusst KEINE eigenen Wahrscheinlichkeiten -
 * sie fallen aus demselben _goalRates/_torZiehung heraus wie die Liga. Genau deshalb muss man
 * hier nachsehen: im Ligabetrieb treffen fast nur Gleichstarke aufeinander, im Pokal prallen
 * Ebene 1 und Ebene 8 aufeinander, und erst dort wird sichtbar, ob die Staerkewerte wirklich
 * etwas bewirken.
 *
 * Ausgabe je Ebenen-Abstand: Spiele, Tore des HOEHERKLASSIGEN, Tore des tieferklassigen,
 * Ueberraschungen (der Tieferklassige kommt weiter). Testspiele analog nach Staerkeunterschied,
 * weil dort keine Ligaebene garantiert ist (ligalose Vereine).
 *
 * ACHTUNG STICHPROBEN-NULL: bei grossem Ebenenabstand stehen hinter einer Zeile oft nur 20-30
 * Partien. Bei einer echten Quote von 2 % sind das 0,6 erwartete Sensationen - eine angezeigte
 * Null heisst dort NICHT, dass die Sensation unmoeglich waere. Deshalb steht die absolute Zahl
 * daneben und duenne Zeilen sind mit "?" markiert. Ob eine Null strukturell ist, entscheidet
 * NUR tools/sensation_check.cjs (200.000 Ziehungen je Paarung, Exit 1 bei echter Null).
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..') + path.sep;
const _ls = {};
global.localStorage = { getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global;
global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.indexedDB = undefined;
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const N = parseInt(process.argv[2] || '15', 10);
process.argv.slice(3).forEach(arg => {
    const m = arg.match(/^(GOAL_[A-Z_]+)=(-?[\d.]+)$/);
    if (!m) { console.error('Unbrauchbares Argument: ' + arg); process.exit(1); }
    if (!(m[1] in Engine)) { console.error('Unbekannte Konstante: ' + m[1]); process.exit(1); }
    Engine[m[1]] = +m[2];
});

Engine.init();
Engine.fastMode = true;

const cup = {}, fr = {};
const lvlOf = id => {
    const t = Engine.teams[id]; if (!t || !t.leagueId) return null;
    const L = Engine.leagues[t.leagueId]; return L ? L.level : null;
};
const strOf = id => { const t = Engine.teams[id]; return t ? (t.strength != null ? t.strength : 20) : null; };

for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();

    [Engine.pokal, Engine.amateurpokal].forEach((pk, ki) => {
        const name = ki === 0 ? 'DFB' : 'Amateur';
        (pk && pk.rounds || []).forEach(rd => (rd.matches || []).forEach(m => {
            if (m.hGoals == null) return;
            const lh = lvlOf(m.hId), la = lvlOf(m.aId);
            if (lh == null || la == null) return;                 // ligalose: kein Ebenenabstand
            const gap = Math.abs(lh - la);
            const k = name + ' ' + gap;
            const b = cup[k] || (cup[k] = { n: 0, hoch: 0, tief: 0, sens: 0, max: 0 });
            const hochIstHeim = lh <= la;                          // kleineres Level = hoeherklassig
            const gh = hochIstHeim ? m.hGoals : m.aGoals;
            const gt = hochIstHeim ? m.aGoals : m.hGoals;
            b.n++; b.hoch += gh; b.tief += gt;
            b.max = Math.max(b.max, gh, gt);
            const sieger = m.winnerId;
            if (sieger && sieger === (hochIstHeim ? m.aId : m.hId)) b.sens++;
        }));
    });

    (Engine.friendlies || []).forEach(f => {
        const sh = strOf(f.hId), sa = strOf(f.aId);
        if (sh == null || sa == null) return;
        const d = Math.abs(sh - sa);
        const k = d < 5 ? '0-4' : d < 15 ? '5-14' : d < 30 ? '15-29' : '30+';
        const b = fr[k] || (fr[k] = { n: 0, hoch: 0, tief: 0 });
        b.n++;
        b.hoch += sh >= sa ? f.s1 : f.s2;
        b.tief += sh >= sa ? f.s2 : f.s1;
    });

    Engine.processSeasonTransition();
}

const p2 = x => x.toFixed(2).padStart(5);
console.log(`\n${N} Saisons\n`);
console.log('=== Pokal nach Ebenen-Abstand ===');
console.log('Wettbewerb | Abstand |  Spiele | hoeherklassig | tieferklassig | Tore/Spiel | Sensationen | max');
// erwartet = wieviele Sensationen bei dieser Spielzahl ueberhaupt zu erwarten waeren; < 3 ist
// keine Aussage. Grobe Referenz aus sensation_check.cjs, 1. Runde: 41/25/14/7/3/1,2/0,4 %.
const ERW = [50, 41, 25, 14, 7, 3, 1.2, 0.4];
Object.keys(cup).sort((a, b) => {
    const [wa, ga] = a.split(' '), [wb, gb] = b.split(' ');
    return wa === wb ? +ga - +gb : wa < wb ? -1 : 1;
}).forEach(k => {
    const b = cup[k], [w, g] = k.split(' ');
    const erw = (ERW[Math.min(+g, ERW.length - 1)] / 100) * b.n;   // erwartete Anzahl
    const duenn = erw < 3 ? ' ?' : '  ';                            // zu wenig fuer eine Aussage
    console.log(`${w.padStart(10)} | ${g.padStart(7)} | ${String(b.n).padStart(7)} |         ${p2(b.hoch / b.n)} |         ${p2(b.tief / b.n)} |      ${p2((b.hoch + b.tief) / b.n)} |  ${String(b.sens).padStart(3)} = ${(b.sens / b.n * 100).toFixed(1).padStart(4)} %${duenn}| ${b.max}`);
});
console.log('  ? = zu wenige Partien fuer eine Aussage ueber Sensationen (unter 3 erwartete).');
console.log('    Ob eine Null strukturell ist, klaert NUR tools/sensation_check.cjs.');
console.log('\n=== Testspiele nach Staerkeunterschied ===');
console.log('  |dS| |  Spiele | staerker | schwaecher | Tore/Spiel');
['0-4', '5-14', '15-29', '30+'].forEach(k => {
    const b = fr[k]; if (!b) return;
    console.log(`${k.padStart(6)} | ${String(b.n).padStart(7)} |    ${p2(b.hoch / b.n)} |      ${p2(b.tief / b.n)} |      ${p2((b.hoch + b.tief) / b.n)}`);
});
