// Relegation als Teil der Saison (Nutzer 15.11.2026): Termine im Kalender, Hin- und Rückspiel, Verlängerung/Elfmeterschießen,
// Übernahme im Saisonwechsel. Prüft headless über N Saisons:
//   (1) Kalender v2 hat drei Duelle (bl, zl, rl) mit zwei Terminen NACH dem letzten Spieltag aller beteiligten Ligen
//   (2) am Saisonende ist jedes Duell gespielt: Paarung = _relePaarung (gleiche Auswahl wie früher), Hin + Rück, Sieger schlüssig
//       (mehr Tore gesamt; bei Gleichstand n.V. bzw. i.E.), Heimrecht: bl Hinspiel beim Erstligisten, zl beim Drittligisten
//   (3) Saisonwechsel übernimmt genau dieses Ergebnis (archive.relegation, Format „Gesamt (Hin, Rück)“) und der Sieger spielt oben
//   (4) Rückgängig: rollbackReleToMatchday nimmt Rückspiel bzw. Duell zurück, Nachspielen ergibt wieder ein vollständiges Duell
//   (5) Altstand ohne Relegationstermine (Kalender v1): der Saisonwechsel spielt Hin und Rück nach
//   node tools/relegation_saison_check.cjs [saisons=12]
//   node tools/relegation_saison_check.cjs 4 --kaputt    Gegenprobe: Saisonwechsel würfelt neu statt zu übernehmen → muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 12, KAPUTT = process.argv.includes('--kaputt');
Engine.init();
const LOG = []; { const ol = Engine.log; Engine.log = function (lv, m) { LOG.push(String(m)); return ol.apply(this, arguments); }; }
if (KAPUTT) { const o = Engine._releErgebnis; Engine._releErgebnis = function (k, h, t) { if (this.relegation) this.relegation.d = {}; return o.call(this, k, h, t); }; }
const fehler = [], f = s => { if (fehler.length < 30) fehler.push(s); else fehler.length++; };
const n = { duelle: 0, nv: 0, pen: 0, tiefSiegt: 0, alt: 0 }, jeK = {};
for (let s = 0; s < N; s++) {
    const alt = s === N - 1;   // letzte Saison: Altstand-Weg (Kalender v1)
    if (alt) { Engine.kalV = 1; Engine.resetSeason && 0; }
    if (alt && Engine.kalender) Engine.kalender.rele = [];
    Engine.simulateFullSeason();
    const y = Engine.getFormattedSeason(), K = Engine.kalender;
    const lv = id => (Engine.leagues[(Engine.teams[id] || {}).leagueId] || {}).level;
    if (!alt) {
        // (1)
        const ks = (K.rele || []).map(r => r.k).sort().join(',');
        if (ks !== 'bl,rl,zl') f(`${y}: Relegationstermine ${ks || 'fehlen'}`);
        (K.rele || []).forEach(r => { const letzter = Math.max(...r.l.map(l => (K.liga[l] || []).slice(-1)[0] || 0));
            if (!(r.t[0] > letzter && r.t[1] > r.t[0])) f(`${y} ${r.k}: Termine ${r.t} nicht nach dem letzten Spieltag ${letzter}`); });
        // (2)
        const R = Engine.relegation;
        if (!R || R.y !== y) { f(`${y}: keine Relegation gespielt`); }
        else (K.rele || []).forEach(r => {
            const d = R.d[r.k], p = Engine._relePaarung(r.k);
            if (!d || !d.hin || !d.rueck || !d.winnerId) return f(`${y} ${r.k}: unvollständig ${JSON.stringify(d)}`);
            if (!p || p.hoch !== d.hoch || p.tief !== d.tief) f(`${y} ${r.k}: Paarung ${d.hoch}-${d.tief} ≠ ${p && p.hoch}-${p && p.tief}`);
            const aH = d.hin.s1 + d.rueck.s1, aT = d.hin.s2 + d.rueck.s2;
            const soll = aH > aT ? d.hoch : aT > aH ? d.tief : d.rueck.pen ? (d.rueck.pen[0] > d.rueck.pen[1] ? d.hoch : d.tief) : null;
            if (soll !== d.winnerId) f(`${y} ${r.k}: Sieger ${d.winnerId} passt nicht zu ${aH}:${aT} ${JSON.stringify(d.rueck)}`);
            if (aH === aT && !d.rueck.nv) f(`${y} ${r.k}: Gleichstand ohne Verlängerung`);
            if (r.k === 'bl' && !Engine._releHinHoch('bl', d)) f(`${y} bl: Hinspiel nicht beim Erstligisten`);
            if (r.k === 'zl' && Engine._releHinHoch('zl', d)) f(`${y} zl: Hinspiel nicht beim Drittligisten`);
            n.duelle++; const jk = jeK[r.k] = jeK[r.k] || [0, 0]; jk[0]++; if (d.winnerId === d.tief) jk[1]++; if (d.rueck.nv) n.nv++; if (d.rueck.pen) n.pen++; if (d.winnerId === d.tief) n.tiefSiegt++;
        });
        // (4) Rückgängig + Nachspielen: erst vor die Rückspiele, dann vor alle Hinspiele, danach jeden Relegationstermin nachspielen
        if (R && R.y === y && (K.rele || []).length) {
            const kopie = JSON.parse(JSON.stringify(R.d)), T = [...new Set(K.rele.flatMap(r => r.t))].sort((a, b) => a - b);
            const vorRueck = Math.min(...K.rele.map(r => r.t[1])) - 1, vorHin = Math.min(...K.rele.map(r => r.t[0])) - 1;
            Engine.rollbackReleToMatchday(vorRueck);
            K.rele.forEach(r => { const d = R.d[r.k]; if (r.t[0] <= vorRueck && (!d || !d.hin)) f(`${y} ${r.k}: Rückgängig vor den Rückspielen löscht das Hinspiel`); if (d && d.rueck && r.t[1] > vorRueck) f(`${y} ${r.k}: Rückspiel bleibt stehen`); });
            Engine.rollbackReleToMatchday(vorHin);
            if (Object.keys(R.d).length) f(`${y}: Rückgängig vor den Hinspielen lässt ${Object.keys(R.d).join(',')} stehen`);
            T.forEach(t => Engine._releTag(t));
            K.rele.forEach(r => { const d = R.d[r.k]; if (!d || !d.winnerId || d.hoch !== kopie[r.k].hoch || d.tief !== kopie[r.k].tief) f(`${y} ${r.k}: Nachspielen unvollständig`); });
        }
    }
    const vorher = alt ? null : JSON.parse(JSON.stringify(Engine.relegation));
    LOG.length = 0;
    Engine.processSeasonTransition();
    // (3)/(5)
    const arch = ((Engine.archive.relegation || []).find(x => x.y === y) || {}).results || [];
    const echte = arch.filter(x => x.hId && x.aId);
    if (echte.length !== 3) f(`${y}: ${echte.length} Duelle im Archiv statt 3`);
    echte.forEach(e => {
        if (!/^\d+:\d+ \(\d+:\d+, \d+:\d+\)/.test(e.result)) f(`${y} ${e.match}: Ergebnis „${e.result}“ ohne Hin/Rück`);
        if (vorher) { const k = /^1\.BL/.test(e.match) ? 'bl' : /^2\.BL/.test(e.match) ? 'zl' : 'rl', d = vorher.d[k];
            if (d && d.winnerId !== e.winnerId) f(`${y} ${k}: Saisonwechsel nimmt ${e.winnerId} statt des gespielten Siegers ${d.winnerId}`); }
        const zw = new Set(((Engine.archive.strafen || {})[y] || []).filter(x => x.art === 'zwang' || x.art === 'zg').map(x => x.id));
        if (zw.has(e.winnerId) || zw.has(e.winnerId === e.hId ? e.aId : e.hId)) return;   // Zwangsabsteiger: Lizenz verweigert – Ausgang nicht sportlich
        const wl = lv(e.winnerId), ll = lv(e.winnerId === e.hId ? e.aId : e.hId);
        if (/^Aufstieg/.test(e.match)) { if (wl !== 3) { const nm = (Engine.teams[e.winnerId] || {}).name; f(`${y} rl: Sieger ${nm} spielt auf Ebene ${wl} statt 3 – ${LOG.filter(m => m.includes(nm)).slice(0, 3).join(' / ') || 'kein Log'}`); } }
        else if (!(wl < ll || (wl === ll && false))) { if (wl >= ll) f(`${y} ${e.match}: Sieger Ebene ${wl}, Verlierer ${ll}`); }
    });
    if (alt) n.alt = echte.length;
}
console.log = _log;
console.log('je Duell (gespielt / Unterklassiger bzw. zweiter RL-Meister setzt sich durch): ' + Object.entries(jeK).map(([k, [a, b]]) => `${k} ${a}/${b}`).join(', '));
console.log(`${N} Saisons: ${n.duelle} Duelle in der Saison (davon ${n.nv} n.V., ${n.pen} i.E., ${n.tiefSiegt}× setzt sich der Unterklassige durch), Altstand-Weg ${n.alt} Duelle`);
if (n.duelle < 6) fehler.push('zu wenige Duelle – keine Aussage');
console.log(fehler.length ? `BEFUND (${fehler.length}):\n  ` + fehler.filter(Boolean).join('\n  ') + (fehler.length > 30 ? `\n  … ${fehler.length - 30} weitere` : '') : 'Bestanden');
process.exit(fehler.length ? 1 : 0);
