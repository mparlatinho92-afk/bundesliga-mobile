// Amateurpokal-Termine (Engine.amateurZeiten/amateurAnstoss, Slots gemessen von tools/amateurpokal_anstoss_fupa.mjs):
// jede ausgeloste Partie hat genau einen Anstoß aus der richtigen Slot-Gruppe (Sa-Termin → Fr–Mo, Mi-Termin → Di–Do),
// das Datum liegt am richtigen Wochentag höchstens 3 Tage neben dem Termin, die Zeiten bleiben je Auslosung stehen,
// und über viele Runden trifft die Verteilung die Messung (So 15:00 am Wochenende, Mi 19:00/19:30 unter der Woche).
//   node tools/amateur_anstoss_test.cjs [Saisons, Standard 3]
//   node tools/amateur_anstoss_test.cjs --selbsttest   Sabotage (immer Wochenend-Slots) – muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const SELBST = process.argv.includes('--selbsttest');
const SAISONS = +process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3;
if (SELBST) Engine._AMATEUR_SLOTS = { we: Engine._AMATEUR_SLOTS.we, mw: Engine._AMATEUR_SLOTS.we };
// --selbsttest-auslosung: einmal vergebene Zeiten bleiben auch nach neuer Auslosung stehen – der Auslosungs-Teil muss anschlagen
const SELBST_AUSL = process.argv.includes('--selbsttest-auslosung');
if (SELBST_AUSL) { const orig = Engine.amateurZeiten; Engine.amateurZeiten = function (ri) { const r = this.amateurpokal.rounds[ri]; return r && r.zeiten ? r.zeiten : orig.call(this, ri); }; }
const WE = new Set(['Fr', 'Sa', 'So', 'Mo']), MW = new Set(['Di', 'Mi', 'Do']);
const TAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const befund = [], zaehl = { we: {}, mw: {} };
let runden = 0, spiele = 0;
const pruefe = (ri, y) => {
    const A = Engine.amateurpokal, r = A.rounds[ri], n = r.matches.length;
    const z1 = Engine.amateurZeiten(ri), z2 = Engine.amateurZeiten(ri);
    if (z1 !== z2 || JSON.stringify(z1) !== JSON.stringify(z2)) befund.push(`${y} ${r.name}: Zeiten wechseln bei erneutem Aufruf`);
    const anker = Engine.terminDatum(r.matchday), mitte = Engine._terminMitte(r.matchday);
    if (!anker) { befund.push(`${y} ${r.name}: kein Termin im Saisonkalender`); return; }
    if (Object.keys(z1).length !== n) befund.push(`${y} ${r.name}: ${Object.keys(z1).length}/${n} Spiele mit Anstoß`);
    for (let i = 0; i < n; i++) {
        const a = Engine.amateurAnstoss(ri, i);
        if (!a || !a.datum) { befund.push(`${y} ${r.name} #${i}: kein Anstoß/Datum`); continue; }
        const g = mitte ? 'mw' : 'we';
        if (!(mitte ? MW : WE).has(a.d)) befund.push(`${y} ${r.name}: ${a.d} ${a.t} an einem ${mitte ? 'Mittwochs' : 'Samstags'}termin`);
        if (TAG[a.datum.getDay()] !== a.d) befund.push(`${y} ${r.name}: Datum ${a.datum.toDateString()} ist kein ${a.d}`);
        if (Math.abs(a.datum - anker) > 3.5 * 864e5) befund.push(`${y} ${r.name}: Datum mehr als 3 Tage vom Termin`);
        zaehl[g][a.d + ' ' + a.t] = (zaehl[g][a.d + ' ' + a.t] || 0) + 1;
        spiele++;
    }
    runden++;
};
Engine.init();
for (let s = 0; s < SAISONS; s++) {
    const y = Engine.getFormattedSeason();
    // jede Runde direkt nach der Auslosung prüfen (vor dem Spielen) – so sieht sie der Nutzer im Runden-Reiter
    const gesehen = new Set();
    while (Engine.currentMatchday < Engine.totalMatchdays) {
        (Engine.amateurpokal ? Engine.amateurpokal.rounds : []).forEach((r, ri) => {
            if (r.matches.length && !r.played && !gesehen.has(ri)) { gesehen.add(ri); pruefe(ri, y); }
        });
        if (!Engine.playNextMatchday()) break;
    }
    if (gesehen.size < 8) befund.push(`${y}: nur ${gesehen.size} Runden vor dem Spielen gesehen`);
    Engine.processSeasonTransition();
}
// neue Auslosung (Undo-Fall): zeitKey erkennt sie, die Zeiten werden neu vergeben
const A = Engine.amateurpokal;
if (A && A.rounds[0].matches.length > 1) {
    const r = A.rounds[0];
    Engine.amateurZeiten(0);
    const altKey = r.zeitKey;
    r.zeiten = { 0: 'Mo 03:33' };                       // Markierung: muss bei neuer Auslosung verschwinden
    [r.matches[0].hId, r.matches[1].hId] = [r.matches[1].hId, r.matches[0].hId];
    Engine.amateurZeiten(0);
    if (r.zeitKey === altKey || r.zeiten[0] === 'Mo 03:33' || Object.keys(r.zeiten).length !== r.matches.length)
        befund.push('neue Auslosung: Zeiten nicht neu vergeben');
}
// Verteilung gegen die Messung (Anteil des häufigsten Slots je Gruppe, ±8 Prozentpunkte bei >= 300 Spielen)
for (const g of ['we', 'mw']) {
    const n = Object.values(zaehl[g]).reduce((a, b) => a + b, 0);
    const soll = Engine._AMATEUR_SLOTS[g], W = soll.reduce((a, b) => a + b.w, 0);
    const top = soll[0], istAnteil = (zaehl[g][top.d + ' ' + top.t] || 0) / (n || 1), sollAnteil = top.w / W;
    console.log(`${g}: ${n} Spiele, ${Object.keys(zaehl[g]).length} Slots, ${top.d} ${top.t} ${(100 * istAnteil).toFixed(1)} % (Messung ${(100 * sollAnteil).toFixed(1)} %)`);
    if (n < 300) befund.push(`${g}: nur ${n} Spiele – zu wenig für einen Verteilungsvergleich`);
    else if (Math.abs(istAnteil - sollAnteil) > 0.08) befund.push(`${g}: ${top.d} ${top.t} ${(100 * istAnteil).toFixed(1)} % statt ${(100 * sollAnteil).toFixed(1)} %`);
}
console.log(`${SAISONS} Saisons, ${runden} Runden, ${spiele} Spiele geprüft`);
if (SELBST_AUSL) { const t = befund.filter(b => b.includes('Auslosung')); console.log(t.length ? 'Selbsttest Auslosung bestanden: ' + t[0] : 'SELBSTTEST AUSLOSUNG DURCHGEFALLEN'); process.exit(t.length ? 0 : 1); }
if (SELBST) { befund.slice(0, 5).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.slice(0, 30).forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
