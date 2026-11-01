// Neuaufbau der Historie gegen den gebauten Stand vergleichen – VOR dem Einspielen (Befund 21.10.2026: ein Neuaufbau verschob
// 60 Zeilen auf andere Vereine, weil nachtraegliche Eintraege in app/history_data.js auf die Zuordnung zurueckwirkten).
//
//   node tools/historie_neuaufbau_vergleich.cjs                 gebauter Stand (git HEAD:app/history_ext.js) gegen app/history_ext.js
//   node tools/historie_neuaufbau_vergleich.cjs <alt.js> [neu]  zwei Dateien
//   node tools/historie_neuaufbau_vergleich.cjs --erwartet=N    N ID-Wechsel sind gewollt (z. B. eine neue Verbindung) – mehr = Befund
//   node tools/historie_neuaufbau_vergleich.cjs --selbsttest    verschiebt im neuen Stand eine Zeile auf eine andere ID -> MUSS durchfallen
//   node tools/historie_neuaufbau_vergleich.cjs --echt-erwartet=N   N echte S/U/N duerfen sich aendern (belegte Korrektur) – mehr = Befund
//   node tools/historie_neuaufbau_vergleich.cjs --selbsttest-echt   macht im neuen Stand einen echten Wert zur Schaetzung -> MUSS durchfallen
//   node tools/historie_neuaufbau_vergleich.cjs --abweichung-weg=N  N Eintraege aus tools/hist_quellen_abweichung.json duerfen fehlen
//   node tools/historie_neuaufbau_vergleich.cjs --selbsttest-abw    loescht im neuen Stand einen Abweichungs-Eintrag -> MUSS durchfallen
//     (--abweichung-alt=<datei> vergleicht gegen eine Datei statt git HEAD, z. B. vor dem ersten Commit)
//
// Meldet: Tabellen weg/neu, ID-Wechsel je Zeile (gleicher Platz/Staffel/Tore, andere ID) gruppiert, Tabellen mit nur Wertaenderungen
// je Liga, Zeilen mit S/U/N 0-0-0 bei Spielen > 0 (verlorene Werte), Aenderungen an nachfolgerExtern/fusion/remap/ligaNachfolger.
// Exit 1 = mehr ID-Wechsel als erwartet, Tabellen verloren, neue 0-0-0-Zeilen oder ECHTE S/U/N geaendert bzw. zur Schaetzung (e:1)
// geworden (01.11.2026: ein geleerter ifosta-Zwischenspeicher haette 368 echte Zeilen zu Schaetzungen gemacht, fussball-ddr.de als
// ganze Staffel 40 echte Werte ueberschrieben – beides meldete diese Pruefung nur als Zahl und sagte „OK“).
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..') + '/';
const args = process.argv.slice(2);
const SELBST = args.includes('--selbsttest');
const ERW = +((args.find(a => a.startsWith('--erwartet=')) || '=0').split('=')[1]);
const ECHT_ERW = +((args.find(a => a.startsWith('--echt-erwartet=')) || '=0').split('=')[1]);
const SELBST_ECHT = args.includes('--selbsttest-echt');
const ABW_WEG = +((args.find(a => a.startsWith('--abweichung-weg=')) || '=0').split('=')[1]);
const SELBST_ABW = args.includes('--selbsttest-abw');
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
    if (SELBST_ECHT) { const k = Object.keys(b.tab).find(k => b.tab[k].some(z => !z.e && z.s != null)); const z = b.tab[k].find(z => !z.e && z.s != null); z.e = 1; z.s++; z.n--; }
    const bef = [];
    const ka = Object.keys(a.tab), kb = Object.keys(b.tab);
    const weg = ka.filter(k => !b.tab[k]), dazu = kb.filter(k => !a.tab[k]);
    console.log(`Tabellen alt/neu: ${ka.length}/${kb.length} | weg ${weg.length} | neu ${dazu.length}`);
    weg.slice(0, 10).forEach(k => console.log('  - weg', k)); dazu.slice(0, 10).forEach(k => console.log('  + neu', k));
    if (weg.length) bef.push(`${weg.length} Tabellen verloren`);
    const pos = z => z.rank + '|' + (z.g || '') + '|' + z.gf + ':' + z.ga;
    const sig = z => JSON.stringify(z);
    const wechsel = {}, werte = {};
    let nWechsel = 0, nullNeu = 0; const echtWeg = [];
    const nullSUN = z => (z.s || 0) + (z.u || 0) + (z.n || 0) === 0 && ((z.sp || 0) > 0 || (z.gf || 0) + (z.ga || 0) > 0);
    for (const k of ka) if (b.tab[k]) {
        const A = new Set(a.tab[k].map(sig));
        const P = {}; for (const z of a.tab[k]) P[pos(z)] = z;
        for (const z of b.tab[k]) {
            if (A.has(sig(z))) continue;
            const o = P[pos(z)];
            if (o && o.id !== z.id) { nWechsel++; const g = `${o.id} -> ${z.id}`; (wechsel[g] = wechsel[g] || []).push(k); }
            else { const l = k.split('|')[1]; werte[l] = (werte[l] || 0) + 1;
                // echter Wert vorher (ohne e), jetzt anders oder geschaetzt -> verloren, wenn nicht ausdruecklich erwartet
                if (o && !o.e && o.s != null && (z.e || o.s !== z.s || o.u !== z.u || o.n !== z.n))
                    echtWeg.push(`${k} Pl.${z.rank} ${o.s}-${o.u}-${o.n} -> ${z.s}-${z.u}-${z.n}${z.e ? ' (geschaetzt)' : ''}`); }
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
    console.log(`echte S/U/N geaendert oder zur Schaetzung geworden: ${echtWeg.length}${ECHT_ERW ? ` (erwartet ${ECHT_ERW})` : ''}`);
    echtWeg.slice(0, 8).forEach(t => console.log('  ! ' + t));
    if (echtWeg.length > ECHT_ERW) bef.push(`${echtWeg.length} echte S/U/N geaendert oder zur Schaetzung geworden (Zwischenspeicher vollstaendig? Quelle ueberschreibt?)`);
    // auch ganz neue Tabellen (25.10.2026: 1.585 Zeilen der Verbandsligen 1994-2008 kamen mit 0-0-0, die Pruefung sah nur geaenderte)
    for (const k of dazu) for (const z of b.tab[k]) if (nullSUN(z)) nullNeu++;
    console.log('neue Zeilen mit S/U/N 0-0-0 trotz Spielen:', nullNeu);
    if (nullNeu) bef.push(`${nullNeu} Zeilen haben ihre S/U/N verloren (Zwischenspeicher vollstaendig?)`);
    // Quellenabweichungen (tools/hist_quellen_abweichung.json, erzeugt von historie_dryrun.mjs): ein Eintrag aus git HEAD, der fehlt,
    // heisst: eine Quelle ist weg oder sagt nichts mehr – die zweite Variante waere verloren (Nutzer 01.11.2026)
    {
        const lies = t => { try { return JSON.parse(t).zeilen.map(e => `${e.saison}|${e.lid}|${e.platz}|${e.verein}`); } catch (e) { return null; } };
        let alt = null; const ALT_DATEI = (args.find(x => x.startsWith('--abweichung-alt=')) || '').split('=')[1];
        if (ALT_DATEI) alt = lies(fs.readFileSync(path.resolve(ALT_DATEI), 'utf8')); else try { alt = lies(execSync('git show HEAD:tools/hist_quellen_abweichung.json', { cwd: ROOT, maxBuffer: 1 << 26, stdio: ['pipe', 'pipe', 'ignore'] }).toString()); } catch (e) {}
        const jetzt = lies(fs.readFileSync(ROOT + 'tools/hist_quellen_abweichung.json', 'utf8')) || [];
        if (SELBST_ABW && alt && alt.length) jetzt.splice(jetzt.indexOf(alt[0]), 1);
        if (alt) {
            const J = new Set(jetzt), weg = alt.filter(k => !J.has(k));
            console.log(`Quellenabweichungen: ${alt.length} -> ${jetzt.length}, verschwunden ${weg.length}${ABW_WEG ? ` (erwartet ${ABW_WEG})` : ''}`);
            weg.slice(0, 8).forEach(k => console.log('  - ' + k));
            if (weg.length > ABW_WEG) bef.push(`${weg.length} Quellenabweichungen verschwunden (Quelle/Zwischenspeicher weg?) – siehe git diff tools/hist_quellen_abweichung.json`);
        } else console.log(`Quellenabweichungen: ${jetzt.length} (noch nicht in git)`);
    }
    for (const f of ['nachfolgerExtern', 'fusion', 'remap', 'ligaNachfolger', 'ausgruendung']) {
        const A = a.H[f] || {}, B = b.H[f] || {};
        const d = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
        if (d.length) console.log(`${f}: ${d.length} geaendert – ${d.slice(0, 8).join(', ')}${d.length > 8 ? ' …' : ''}`);
    }
    console.log(bef.length ? `\nBEFUND\n  ${bef.join('\n  ')}` : '\nOK – Neuaufbau verschiebt keine Vereine');
    process.exit(bef.length ? 1 : 0);
})();
