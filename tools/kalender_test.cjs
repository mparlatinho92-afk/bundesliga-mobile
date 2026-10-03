/* Gegenprobe Saisonkalender: bauen die Schaetzregeln (Engine._kalenderRegel / pokalTermine) echte
 * Saisons nach, OHNE sie zu kennen? Vergleich gegen tools/kalender_real.json (node tools/kalender_real.mjs).
 *
 *   node tools/kalender_test.cjs              Exit 1 bei Befund
 *   node tools/kalender_test.cjs --selbsttest verschiebt die Regel um eine Woche -> MUSS durchfallen
 *
 * Gemessen je Liga und Saison: Anteil Spieltage auf dem echten Termin ("exakt") und Anteil
 * hoechstens eine Woche daneben ("±1 W"). Dazu Strukturpruefungen fuer ALLE Ebenen und Groessen:
 * genau n Termine, keine Dublette, nur Sa/Mi, kein Termin in der Winterpause.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const SELBST = process.argv.includes('--selbsttest');
if (SELBST) {   // absichtlich falsch: alles eine Woche spaeter
    const orig = Engine._kalenderRegel.bind(Engine), origP = Engine.pokalTermine.bind(Engine);
    const sh = a => Engine._kIso(Engine._kPlus(new Date(a + 'T12:00:00'), 7));
    Engine._kalenderRegel = (...a) => orig(...a).map(sh);
    Engine.pokalTermine = y => origP(y).map(sh);
}
const real = JSON.parse(fs.readFileSync(ROOT + 'tools/kalender_real.json', 'utf8'));
const day = a => new Date(a + 'T12:00:00');
// Schwellen, gesetzt nach der ersten Messung, damit eine Verschlechterung auffaellt.
// Regionalliga niedriger, und das ist belegt: die fuenf echten Staffeln 2024/25 treffen SICH
// GEGENSEITIG nur zu 21–74 % exakt und 53–97 % auf ±1 Woche – eine Regel fuer alle fuenf kann
// nicht besser sein als die Staffeln untereinander.
const MIN = { profi: { exakt: 0.60, woche: 0.90 }, rl: { exakt: 0.30, woche: 0.65 }, pokal: 5 };
let befund = 0;
const zeile = (name, plan, echt, min) => {
    let ex = 0, wo = 0;
    echt.forEach((e, i) => { const d = Math.abs(day(plan[i]) - day(e)) / 864e5; if (d === 0) ex++; if (d <= 7) wo++; });
    const qe = ex / echt.length, qw = wo / echt.length, schlecht = qe < min.exakt || qw < min.woche;
    if (schlecht) befund++;
    console.log(`${schlecht ? '✗' : '✓'} ${name.padEnd(26)} exakt ${(qe * 100).toFixed(0).padStart(3)} %   ±1 W ${(qw * 100).toFixed(0).padStart(3)} %   (${echt.length} ST)`);
};
const LV = { '1': 1, '2': 2, '3': 3 };
for (const [saison, ligen] of Object.entries(real)) {
    const y = +saison.slice(0, 4);
    if (y === 2022) continue;   // WM-Winter Katar: kein Muster
    for (const [lid, rr] of Object.entries(ligen)) {
        const echt = rr.map(r => r.anker);
        if (lid === 'pokal') {
            const p = Engine.pokalTermine(y), treffer = echt.filter((e, i) => e === p[i]).length;
            const ok = echt.length < 6 || treffer >= MIN.pokal;
            if (!ok) befund++;
            console.log(`${ok ? '✓' : '✗'} ${(saison + ' DFB-Pokal').padEnd(26)} ${treffer}/${echt.length} Runden exakt`);
            continue;
        }
        const level = LV[lid] || 4;
        // ohne Seed: die Regel muss es allein schaffen
        zeile(`${saison} ${lid}`, Engine._kalenderRegel(echt.length, y, level), echt, level === 4 ? MIN.rl : MIN.profi);
    }
}
// Struktur fuer alle Ebenen, Groessen und viele Jahre
let strukt = 0;
for (let y = 2025; y < 2125; y++) for (let level = 1; level <= 8; level++) for (const n of [14, 18, 26, 30, 33, 34, 36, 38, 39, 42]) {
    const p = Engine.kalenderPlan('x', n, y, level), feh = [];
    if (p.length !== n) feh.push(`Laenge ${p.length}`);
    if (new Set(p).size !== p.length) feh.push('Dublette');
    p.forEach(a => { const wd = day(a).getDay(); if (wd !== 6 && wd !== 3) feh.push(`${a} kein Sa/Mi`); });
    if (p.some((a, i) => i && a <= p[i - 1])) feh.push('nicht aufsteigend');
    if (p.some(a => /-12-2[5-9]|-12-3|-01-0[1-6]/.test(a))) feh.push('Weihnachten/Neujahr');
    if (feh.length) { strukt++; if (strukt <= 5) console.log(`✗ Struktur ${y} Ebene ${level} n=${n}: ${feh.slice(0, 3).join(', ')}`); }
}
console.log(strukt ? `✗ Struktur: ${strukt} Plaene fehlerhaft` : '✓ Struktur: 8 Ebenen × 10 Groessen × 100 Jahre');
befund += strukt;
console.log(befund ? `\nBEFUND: ${befund}` : '\nalles gruen');
if (SELBST) console.log(befund ? '(Selbsttest: korrekt durchgefallen)' : '(Selbsttest: NICHT durchgefallen – Pruefung misst nichts!)');
process.exit(SELBST ? (befund ? 0 : 1) : (befund ? 1 : 0));
