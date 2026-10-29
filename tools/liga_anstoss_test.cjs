// Liga-Anstoßzeiten (Engine.ligaAnstoss, Nutzer 29.10.2026: Vorschau und Ergebnisse je Tag und Uhrzeit wie beim Pokal):
//   - jede Partie jedes Termins hat genau einen Anstoß, Anzahl je Slot = größter Rest der Slot-Gewichte (_ligaSlots)
//   - FEST: zweiter Aufruf und Aufruf nach geleertem Zwischenspeicher liefern dieselben Zeiten
//   - Datum am richtigen Wochentag, höchstens 3 Tage neben dem Termin
//   - der Action-Modus (Tiefe 2 = je Uhrzeit) spielt jede Partie genau in ihrem Slot
//   node tools/liga_anstoss_test.cjs [Termine, Standard 12]
//   node tools/liga_anstoss_test.cjs --selbsttest   Zeiten bei jedem Aufruf neu gewürfelt – muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const SELBST = process.argv.includes('--selbsttest');
const TERMINE = +process.argv.slice(2).find(a => /^\d+$/.test(a)) || 12;
if (SELBST) {   // Sabotage: gewürfelt statt fest (der alte Zustand des Action-Modus)
    const orig = Engine.ligaAnstoss;
    Engine.ligaAnstoss = function (md, lid) {
        this._ligaZeitCache = {};
        const z = orig.call(this, md, lid); if (!z) return z;
        const ids = Object.keys(z), werte = ids.map(i => ({ ...z[i] }));
        for (let i = werte.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [werte[i], werte[j]] = [werte[j], werte[i]]; }
        const out = {}; ids.forEach((id, k) => out[id] = { ...werte[k], aId: z[id].aId }); return out;
    };
}
const TAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const befund = [];
let partien = 0, termine = 0, actionGeprueft = 0;
Engine.init();
const lids = Object.keys(Engine.leagues);
for (let t = 0; t < TERMINE; t++) {
    const md = Engine.currentMatchday + 1;
    if (!Engine.schedule[md]) Engine.generateSchedule();
    const anker = Engine.terminDatum(md);
    for (const lid of lids) {
        const ms = (Engine.schedule[md] || []).filter(m => m.lid === lid);
        if (!ms.length) continue;
        const z1 = Engine.ligaAnstoss(md, lid), z2 = Engine.ligaAnstoss(md, lid);
        Engine._ligaZeitCache = {};
        const z3 = Engine.ligaAnstoss(md, lid);
        const f = z => JSON.stringify(Object.keys(z).sort().map(k => [k, z[k].d, z[k].t]));
        if (f(z1) !== f(z2) || f(z1) !== f(z3)) befund.push(`T${md} ${lid}: Zeiten nicht fest`);
        if (ms.some(m => !z1[m.hId] || z1[m.hId].aId !== m.aId)) befund.push(`T${md} ${lid}: Partie ohne Anstoß`);
        // Anzahl je Slot = größter Rest
        const slots = Engine._ligaSlots(md, lid, ms[0].md), W = slots.reduce((s, x) => s + x.w, 0);
        const ist = {}; Object.values(z1).forEach(e => ist[e.d + ' ' + e.t] = (ist[e.d + ' ' + e.t] || 0) + 1);
        slots.forEach(s => { const soll = ms.length * s.w / W, n = ist[s.d + ' ' + s.t] || 0;
            if (Math.abs(n - soll) >= 1) befund.push(`T${md} ${lid}: ${s.d} ${s.t} ${n} Spiele, Gewicht verlangt ~${soll.toFixed(1)}`); });
        if (anker) Object.values(z1).forEach(e => {
            if (TAG[e.datum.getDay()] !== e.d) befund.push(`T${md} ${lid}: Datum ${e.datum.toDateString()} ist kein ${e.d}`);
            if (Math.abs(e.datum - anker) > 3.5 * 864e5) befund.push(`T${md} ${lid}: Datum mehr als 3 Tage vom Termin`);
        });
        partien += ms.length;
    }
    // Action-Modus Tiefe 2: Plan für Bundesliga + eine Amateurliga gegen ligaAnstoss halten
    Engine.currentMatchday = md;
    const cfg = { on: true, leagues: { '1': true, '7-1': true }, pokal: false, depth: 2 };
    Engine._buildActionPlan(cfg);
    for (const day of (Engine.actionState ? Engine.actionState.days : [])) for (const m of (day.matches || [])) {
        if (!cfg.leagues[m.lid]) continue;
        const e = (Engine.ligaAnstoss(md, m.lid) || {})[m.hId];
        actionGeprueft++;
        if (!e || day.label !== `${e.d} ${e.t}`) befund.push(`T${md} ${m.lid}: Action-Slot ${day.label}, Vorschau ${e ? e.d + ' ' + e.t : '–'}`);
    }
    Engine.actionState = null;
    Engine.currentMatchday = md - 1;
    Engine.playNextMatchday();
    termine++;
}
if (actionGeprueft < TERMINE * 5) befund.push(`Action-Vergleich prüfte nur ${actionGeprueft} Partien`);
console.log(`${termine} Termine, ${partien} Partien geprüft, davon ${actionGeprueft} im Action-Plan`);
if (SELBST) console.log('  davon Action-Befunde: ' + befund.filter(b => b.includes('Action-Slot')).length);
if (SELBST) { befund.slice(0, 4).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.slice(0, 30).forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
