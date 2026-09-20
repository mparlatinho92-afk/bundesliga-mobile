// PRUEFUNG (Exit 1 bei Befund): Aufstiegsrunden (app/aufstieg_data.js) in Engine und Archiv.
//
//   node tools/aufstieg_test.cjs              alle Pruefungen
//   node tools/aufstieg_test.cjs --selbsttest gegen eine absichtlich kaputte Faltung - MUSS durchfallen
//
// Die WICHTIGSTE Pruefung ist die Trennung: kein Verein darf allein deshalb in einer Ewigen Tabelle stehen,
// weil er eine Aufstiegsrunde gespielt hat (Nutzerentscheidung 20.09.2026).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/aufstieg_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js']
    .forEach(f => (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const nm = id => (GAME_DATA.teams[id] || {}).name || HISTORIC_CLUBS[id] || (AUFSTIEG_SEED.vereine || {})[id] || id;
const befunde = [];
const pruefe = (ok, t) => { console.log((ok ? '  ok   ' : '  FEHL ') + t); if (!ok) befunde.push(t); };

// Soll-Werte aus den UNVERAENDERTEN Daten – erst danach darf saboteiert werden
const SOLL = (() => {
    let t = 0, erf = 0, duNeu = 0;
    (AUFSTIEG_SEED.runden || []).forEach(r => {
        const m = new Map();
        (r.gr || []).forEach(g => g.forEach(z => m.set(z.i, m.get(z.i) || !!z.a)));
        (r.du || []).forEach(d => { m.set(d.h, m.get(d.h) || !!d.w); m.set(d.a, m.get(d.a) || !d.w); });
        (r.sp || []).forEach(d => { m.set(d.h, m.get(d.h) || !!d.w); m.set(d.a, m.get(d.a) || !d.w); });
        t += m.size; m.forEach(v => { if (v) erf++; });
        duNeu += (r.du || []).filter(d => !d.rs).length;
    });
    return { t, erf, duNeu };
})();

if (SELBST) {
    // Sabotage: Gruppenspiele gelten als K.-o.-Duelle. Genau der Fehler, den die Trennung verhindern soll –
    // ein Teilnehmer von 1965 staende dann mit sechs "Relegationen" neben einem heutigen mit einer.
    (AUFSTIEG_SEED.runden || []).forEach(r => { if (r.gs && r.gs.length) { r.du = (r.du || []).concat(r.gs); r.gs = []; } });
}

(async () => {
    Engine.init();
    const A = Engine.archive;

    pruefe(A.aufSeeded === AUFSTIEG_SEED.version, 'Guard gesetzt (' + A.aufSeeded + ')');
    const n = Object.keys(A.aufstieg || {}).length;
    pruefe(n > 120, 'Vereine mit Aufstiegsrunden-Statistik: ' + n);

    // Teilnahmen = Summe der beteiligten Vereine je Runde (jeder Verein je Runde EINMAL), Soll steht oben fest
    const sollT = SOLL.t, sollS = SOLL.erf;
    const istT = Object.values(A.aufstieg).reduce((a, x) => a + x.t, 0);
    const istS = Object.values(A.aufstieg).reduce((a, x) => a + x.s, 0);
    pruefe(istT === sollT, 'Teilnahmen ' + istT + ' = Soll ' + sollT);
    pruefe(istS === sollS, 'Erfolge ' + istS + ' = Soll ' + sollS);

    // Kein Aufstiegsrunden-Verein darf in einer Ewigen Tabelle auftauchen, nur weil er hier steht
    const ewigeIds = new Set(Object.values(A.ewige || {}).flatMap(o => Object.keys(o)));
    const nurAuf = Object.keys(A.aufstieg).filter(id => !ewigeIds.has(id));
    pruefe(true, 'Vereine nur in der Aufstiegs-Sparte (ohne Ewige Tabelle): ' + nurAuf.length + (nurAuf.length ? ' -> ' + nurAuf.map(nm).join(', ') : ''));
    const hum = Object.keys(A.aufstieg).find(id => /hummels/i.test(nm(id)));
    pruefe(!!hum && !ewigeIds.has(hum), 'Hummelsbuetteler SV steht in der Sparte, NICHT in einer Ewigen Tabelle');

    // Duell-Chronik: die 47 neuen Duelle sind drin, die 27 aus RELEGATION_SEED nicht doppelt
    const alleRes = (A.relegation || []).flatMap(r => r.results.map(x => Object.assign({ y: r.y }, x)));
    const ausAuf = alleRes.filter(x => x.aufstieg);
    const sollNeu = SOLL.duNeu;
    pruefe(ausAuf.length === sollNeu, 'neue Duelle in der Chronik: ' + ausAuf.length + ' = Soll ' + sollNeu);
    const bl = alleRes.filter(x => x.match === '1.BL/2.BL');
    pruefe(bl.length === 27, 'RELEGATION_SEED unveraendert: ' + bl.length + ' Duelle 1.BL/2.BL');
    // keine Saison mit derselben Paarung zweimal
    const dop = [];
    alleRes.forEach((x, i) => alleRes.slice(i + 1).forEach(z => {
        if (x.y === z.y && ((x.hId === z.hId && x.aId === z.aId) || (x.hId === z.aId && x.aId === z.hId))) dop.push(x.y + ' ' + nm(x.hId) + '/' + nm(x.aId));
    }));
    pruefe(!dop.length, 'keine Paarung doppelt (' + (dop.join(', ') || '-') + ')');

    // Zweimal falten darf nichts verdoppeln
    const vorher = JSON.stringify(A.aufstieg), vorherRel = (A.relegation || []).length;
    await Engine._seedHistory();
    pruefe(JSON.stringify(A.aufstieg) === vorher && (A.relegation || []).length === vorherRel, 'zweites Falten aendert nichts');

    // Neue Datenversion: sauber neu falten, nicht doppelt
    const v = AUFSTIEG_SEED.version; AUFSTIEG_SEED.version = v + '-neu';
    await Engine._seedHistory();
    AUFSTIEG_SEED.version = v;
    const istT2 = Object.values(A.aufstieg).reduce((a, x) => a + x.t, 0);
    const ausAuf2 = (A.relegation || []).flatMap(r => r.results).filter(x => x.aufstieg).length;
    pruefe(istT2 === sollT && ausAuf2 === sollNeu, 'Neufaltung bei neuer Version: Teilnahmen ' + istT2 + ', Duelle ' + ausAuf2);

    // 6. GESPIELTE Saison: die Simulation fuellt dieselbe Sparte wie die Historie, und ein Undo dreht sie zurueck.
    //    Die echten Funktionen werden aufgerufen, nicht nachgebaut – eine nachgestellte Loeschung ueberspringt
    //    leicht genau den Schritt, um den es geht.
    const vorT = Object.values(A.aufstieg).reduce((a, x) => a + x.t, 0);
    const vorRel = (A.relegation || []).length;
    Engine.simulateFullSeason();
    const erg = Engine.processSeasonTransition();
    const nachT = Object.values(A.aufstieg).reduce((a, x) => a + x.t, 0);
    const duelle = (erg.relegation || []).filter(r => r.hId && r.aId).length;
    pruefe(duelle >= 2, 'Simulation spielt Relegation/Aufstiegsduelle: ' + duelle);
    pruefe(nachT === vorT + duelle * 2, 'gespielte Saison in der Sparte: ' + vorT + ' -> ' + nachT + ' (erwartet +' + duelle * 2 + ')');
    pruefe((A.relegation || []).length === vorRel + 1, 'Chronik um die gespielte Saison gewachsen');

    // Undo derselben Saison
    const snap = Engine.history[Engine.history.length - 1];
    if (snap && typeof Engine._unarchiveSeason === 'function') {
        Engine._unarchiveSeason(snap);
        const zurueckT = Object.values(A.aufstieg).reduce((a, x) => a + x.t, 0);
        pruefe(zurueckT === vorT, 'Undo dreht die Sparte zurueck: ' + zurueckT + ' = ' + vorT);
        pruefe((A.relegation || []).length === vorRel, 'Undo entfernt den Chronik-Eintrag');
    } else pruefe(false, '_unarchiveSeason nicht aufrufbar');

    // Spitzenreiter zur Anschauung
    console.log('\nMeiste Teilnahmen:');
    Object.entries(A.aufstieg).sort((a, b) => b[1].t - a[1].t || b[1].s - a[1].s).slice(0, 8)
        .forEach(([id, st]) => console.log('   ' + nm(id).padEnd(30) + st.t + ' Teilnahmen, ' + st.s + ' erfolgreich'));

    if (SELBST) {
        console.log(befunde.length ? '\nSelbsttest bestanden: die Sabotage wurde erkannt (' + befunde.length + ' Befund(e)).'
            : '\nSELBSTTEST FEHLGESCHLAGEN: die Sabotage blieb unbemerkt.');
        process.exit(befunde.length ? 0 : 1);
    }
    console.log('\n' + (befunde.length ? befunde.length + ' Befund(e).' : 'Alles gruen.'));
    process.exit(befunde.length ? 1 : 0);
})();
