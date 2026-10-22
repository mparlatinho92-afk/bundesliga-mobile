// Neuaufbau der Historie gegen den gebauten Stand vergleichen – VOR dem Einspielen (Befund 21.10.2026: ein Neuaufbau verschob
// 60 Zeilen auf andere Vereine, weil nachtraegliche Eintraege in app/history_data.js auf die Zuordnung zurueckwirkten).
//
//   node tools/historie_neuaufbau_vergleich.cjs                 gebauter Stand (git HEAD:app/history_ext.js) gegen app/history_ext.js
//   node tools/historie_neuaufbau_vergleich.cjs <alt.js> [neu]  zwei Dateien
//   node tools/historie_neuaufbau_vergleich.cjs --erwartet=N    N ID-Wechsel sind gewollt (z. B. eine neue Verbindung) – mehr = Befund
//   node tools/historie_neuaufbau_vergleich.cjs --selbsttest    verschiebt im neuen Stand eine Zeile auf eine andere ID -> MUSS durchfallen
//
// Meldet: Tabellen weg/neu, ID-Wechsel je Zeile (gleicher Platz/Staffel/Tore, andere ID) gruppiert, Tabellen mit nur Wertaenderungen
// je Liga, Zeilen mit S/U/N 0-0-0 bei Spielen > 0 (verlorene Werte), Aenderungen an nachfolgerExtern/fusion/remap/ligaNachfolger.
// Exit 1 = mehr ID-Wechsel als erwartet, Tabellen verloren oder neue 0-0-0-Zeilen.
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..') + '/';
const args = process.argv.slice(2);
const SELBST = args.includes('--selbsttest');
const ERW = +((args.find(a => a.startsWith('--erwartet=')) || '=0').split('=')[1]);
const dateien = args.filter(a => !a.startsWith('--'));
let alt = dateien[0];
if (!alt) { alt = path.join(os.tmpdir(), 'history_ext.HEAD.js'); fs.writeFileSync(alt, execSync('git show HEAD:app/history_ext.js', { cwd: ROOT, maxBuffer: 1 << 28 })); }
const neu = dateien[1] || ROOT + 'app/history_ext.js';

async function lade(datei) {
    const ctx = { console, setTimeout, TextDecoder, Uint8Array, Blob, Response, DecompressionStream, atob, Promise };
    ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(datei, 'utf8').replace(/^const /gm, 'var '), ctx);
    vm.runInContext(fs.readFileSync(ROOT + 'app/hist_ext.js', 'utf8').replace(/^const /gm, 'var '), ctx);
    await vm.runInContext('HistExt.load()', ctx);
    const x = vm.runInContext('HistExt.loaded()', ctx), H = vm.runInContext('HIST_EXT', ctx);
    const tab = {};
    for (const [k, r] of Object.entries(x.byKey)) tab[k] = r.rows.map(z => ({ ...z }));
    return { tab, H };
}
(async () => {
    const [a, b] = await Promise.all([lade(alt), lade(neu)]);
    if (SELBST) { const k = Object.keys(b.tab).find(k => b.tab[k].length > 3); b.tab[k][2].id = 'hist_selbsttest_falsch'; }
    const bef = [];
    const ka = Object.keys(a.tab), kb = Object.keys(b.tab);
    const weg = ka.filter(k => !b.tab[k]), dazu = kb.filter(k => !a.tab[k]);
    console.log(`Tabellen alt/neu: ${ka.length}/${kb.length} | weg ${weg.length} | neu ${dazu.length}`);
    weg.slice(0, 10).forEach(k => console.log('  - weg', k)); dazu.slice(0, 10).forEach(k => console.log('  + neu', k));
    if (weg.length) bef.push(`${weg.length} Tabellen verloren`);
    const pos = z => z.rank + '|' + (z.g || '') + '|' + z.gf + ':' + z.ga;
    const sig = z => JSON.stringify(z);
    const wechsel = {}, werte = {};
    let nWechsel = 0, nullNeu = 0;
    const nullSUN = z => (z.s || 0) + (z.u || 0) + (z.n || 0) === 0 && ((z.sp || 0) > 0 || (z.gf || 0) + (z.ga || 0) > 0);
    for (const k of ka) if (b.tab[k]) {
        const A = new Set(a.tab[k].map(sig));
        const P = {}; for (const z of a.tab[k]) P[pos(z)] = z;
        for (const z of b.tab[k]) {
            if (A.has(sig(z))) continue;
            const o = P[pos(z)];
            if (o && o.id !== z.id) { nWechsel++; const g = `${o.id} -> ${z.id}`; (wechsel[g] = wechsel[g] || []).push(k); }
            else { const l = k.split('|')[1]; werte[l] = (werte[l] || 0) + 1; }
            if (nullSUN(z) && !(o && nullSUN(o))) nullNeu++;
        }
    }
    const name = id => (b.H.vereine && b.H.vereine[id]) || (a.H.vereine && a.H.vereine[id]) || '';
    console.log(`ID-Wechsel: ${nWechsel}${ERW ? ` (erwartet ${ERW})` : ''}`);
    Object.entries(wechsel).sort((x, y) => y[1].length - x[1].length).forEach(([g, ks]) => {
        const [i1, i2] = g.split(' -> ');
        console.log(`  ${String(ks.length).padStart(3)}  ${g}   [${name(i1)} -> ${name(i2)}]   ${ks.slice(0, 3).join(', ')}${ks.length > 3 ? ' …' : ''}`);
    });
    if (nWechsel > ERW) bef.push(`${nWechsel} ID-Wechsel (erwartet ${ERW})`);
    console.log('Zeilen mit geaenderten Werten je Liga:', JSON.stringify(werte));
    console.log('neue Zeilen mit S/U/N 0-0-0 trotz Spielen:', nullNeu);
    if (nullNeu) bef.push(`${nullNeu} Zeilen haben ihre S/U/N verloren (Zwischenspeicher vollstaendig?)`);
    for (const f of ['nachfolgerExtern', 'fusion', 'remap', 'ligaNachfolger', 'ausgruendung']) {
        const A = a.H[f] || {}, B = b.H[f] || {};
        const d = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
        if (d.length) console.log(`${f}: ${d.length} geaendert – ${d.slice(0, 8).join(', ')}${d.length > 8 ? ' …' : ''}`);
    }
    console.log(bef.length ? `\nBEFUND\n  ${bef.join('\n  ')}` : '\nOK – Neuaufbau verschiebt keine Vereine');
    process.exit(bef.length ? 1 : 0);
})();
