// DFB-Pokal im Action-Modus: echte Tage + Anstoßzeiten je Runde (Engine._pokalSlots, gemessen an openfootball 2024/25).
//   node tools/pokal_anstoss_test.cjs              eine Saison je Tiefe 1–3 durchspielen + Plan der Tiefe 4 prüfen
//   node tools/pokal_anstoss_test.cjs --selbsttest  Sabotage (alle Spiele in einen Slot) muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const SELBST = process.argv.includes('--selbsttest');
if (SELBST) Engine._pokalSlots = function (ri) { return [{ d: 'Di', t: '18:30', idx: this.pokal.rounds[ri].matches.map((m, i) => i) }]; };

// Soll je Rundengröße: erlaubte Tag+Zeit und Mindestzahl verschiedener Slots
const SOLL = n => n === 1 ? { ok: ['Sa 20:00', 'Mi 20:45'], min: 1 }
    : n < 8 ? { ok: ['Di 20:45', 'Mi 20:45', 'Sa 18:00', 'So 18:00'], min: 2 }
    : n >= 32 ? { ok: ['Fr 18:00', 'Fr 20:45', 'Sa 13:00', 'Sa 15:30', 'Sa 18:00', 'So 13:00', 'So 15:30', 'So 18:00', 'Mo 18:00', 'Mo 20:45', 'Di 18:00', 'Di 20:45', 'Mi 18:00', 'Mi 20:45'], min: 4 }
    : { ok: ['Di 18:00', 'Di 20:45', 'Mi 18:00', 'Mi 20:45'], min: 4 };
const befund = [];
const pruefePlan = (depth, ri) => {
    const st = Engine.actionState, r = Engine.pokal.rounds[ri], n = r.matches.length;
    const pd = st.days.filter(d => d.pokalRound === ri);
    const zeit = (pd[0] && pd[0].pokalZeit) || {};
    const idx = [].concat(...pd.map(d => d.conf ? d.matches.map(m => m.pokalIdx) : d.pokalIdx));
    if (idx.length !== n || new Set(idx).size !== n) befund.push(`T${depth} ${r.name}: ${idx.length}/${n} Spiele verplant`);
    const slots = new Set(Object.values(zeit)), s = SOLL(n);
    [...slots].filter(z => !s.ok.includes(z)).forEach(z => befund.push(`T${depth} ${r.name}: unerwarteter Slot ${z}`));
    if (slots.size < Math.min(s.min, n)) befund.push(`T${depth} ${r.name}: nur ${slots.size} Slot(s) für ${n} Spiele`);
    if (pd.filter(d => d.pokalAdvance).length !== 1 || !pd[pd.length - 1].pokalAdvance) befund.push(`T${depth} ${r.name}: pokalAdvance nicht genau am letzten Tag`);
    for (let i = 1; i < st.days.length; i++) if (st.days[i].sort < st.days[i - 1].sort) befund.push(`T${depth} ${r.name}: Zeitachse unsortiert`);
    return [...slots].sort((a, b) => Engine._slotSort(...a.split(' ')) - Engine._slotSort(...b.split(' '))).map(z => `${z}×${Object.values(zeit).filter(x => x === z).length}`).join(' ');
};
for (const depth of [1, 2, 3, 4]) {
    Engine.init();
    const cfg = { on: true, leagues: { '1': true }, pokal: true, depth };
    let runden = 0;
    while (Engine.currentMatchday < Engine.totalMatchdays) {
        const md = Engine.currentMatchday + 1;
        if (depth === 4) {                      // Tiefe 4: nur den Plan bauen und prüfen (die Konferenz läuft in der App)
            if (md === 1 || !Engine.pokal) Engine.initPokal();
            const ri = Engine.pokal.rounds.findIndex(r => r.matchday === md && !r.played);
            if (ri >= 0) {
                Engine.currentMatchday = md; Engine._buildActionPlan(cfg);
                const z = pruefePlan(depth, ri); if (!SELBST) console.log(`T4 ${Engine.pokal.rounds[ri].name}: ${z}`);
                Engine.actionState = null; Engine.currentMatchday = md - 1;
            }
            Engine.playNextMatchday(); continue;
        }
        Engine.startActionMatchday(cfg);
        const ri = Engine.pokal.rounds.findIndex(r => r.matchday === md && !r.played);
        if (ri < 0) { let g = 0; while (Engine.actionState && g++ < 500) Engine.playActionStep(); continue; }
        const z = pruefePlan(depth, ri);
        if (depth === 2 && !SELBST) console.log(`T2 ${Engine.pokal.rounds[ri].name}: ${z}`);
        let guard = 0;
        while (Engine.actionState && guard++ < 500) Engine.playActionStep();
        if (!Engine.pokal.rounds[ri].played) befund.push(`T${depth} ${Engine.pokal.rounds[ri].name}: Runde nach dem Action-Tag nicht gespielt`);
        if (Engine.pokal.rounds[ri].matches.some(m => m.hGoals == null)) befund.push(`T${depth} ${Engine.pokal.rounds[ri].name}: Spiel ohne Ergebnis`);
        runden++;
    }
    if (depth < 4 && !Engine.pokal.winner) befund.push(`T${depth}: kein Pokalsieger nach ${runden} Action-Runden`);
}
if (SELBST) {
    console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN: Sabotage nicht erkannt');
    process.exit(befund.length ? 0 : 1);
}
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
