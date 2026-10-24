// Browser-Pruefung Chemie Leipzig (Sheet 24.10.2026 „Ligaverlauf ... fehlen Saisons, fehlt der Verein?“, Nutzer: Tradition mit Notiz)
//   - Steckbrief VEREINSNAMEN: ZSG Industrie 1949/50, EINE Zeile FC Sachsen Leipzig 1990/91–2010/11, keine Kurzform „Chemie Leipzig“,
//     bei „heute“ der Vermerk aus tools/hist_tradition.json (rechtliche Nachfolge nicht geklaert)
//   - Ligaverlauf: Saisons 1949–2025 da, keine Namensgrenze 1971 (Kurzform), Grenze 1990 und 2011
//   - SG Leipzig-Leutzsch traegt 2013/14 als SG Sachsen Leipzig, der heutige Verein nicht mehr
// node .claude/skills/run/chemie_leipzig_check.mjs   (--selbsttest: Vermerk + Namen-Zusammenlegung sabotiert -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const ID = 'bsgchemieleipzig_829', LZ = 'hist_fb_sgleipzigleutzsch';
fs.mkdirSync('docs/ligaverlauf', { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    if (SELBST) await p.addInitScript(() => {
        const t = setInterval(() => { if (typeof HIST_EXT !== 'undefined' && typeof HISTORIC_NAMES !== 'undefined') { HIST_EXT.tradition = {};
            HISTORIC_NAMES.bsgchemieleipzig_829 = [{ from: '1949/50', to: '1949/50', name: 'ZSG Industrie Leipzig' }, { from: '1990/91', to: '1990/91', name: 'FC Sachsen Leipzig' }, { from: '1991/92', to: '2010/11', name: 'FC Sachsen Leipzig' }]; clearInterval(t); } }, 5);
    });
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && typeof HIST_EXT !== 'undefined' && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await p.evaluate(() => { try { localStorage.setItem('ba_sb_verlauf_hist', '1'); } catch (e) {} });
    await p.evaluate(id => App.showSteckbrief(id), ID);
    await p.waitForFunction(() => App._sbVLModel && App._sbVLModel.team === 'bsgchemieleipzig_829', null, { timeout: 60000 });
    const r = await p.evaluate(() => {
        const box = [...document.querySelectorAll('#modal div')].find(d => d.firstElementChild && d.firstElementChild.textContent === 'VEREINSNAMEN');
        const zeilen = box ? [...box.children].slice(1).map(z => z.innerText.replace(/\s+/g, ' ').trim()) : [];
        const M = App._sbVLModel, jahre = M.st.filter(s => s.L).map(s => s.y);
        const namen = M.st.map(s => App._histClubName('bsgchemieleipzig_829', String(s.y)) || '');
        const grenzen = namen.map((n, i) => i && n !== namen[i - 1] ? M.st[i].y : null).filter(Boolean);
        // Decke: die Linie (Meister 1950/51, 1963/64) klebt nicht an der Oberkante; DDR-Liga-Band beschriftet
        const svg = document.getElementById('sbvl-svg'), pfad = svg && svg.querySelector('path[d^="M"]');
        // gemessen gegen die Oberkante des Bandes an der Meister-Saison, nicht gegen den SVG-Rand (das maß die Luft ÜBER dem Band
        // und war grün, während der Meister weiter an der Bandkante klebte – Nutzerbefund 24.10.2026)
        const xs = [1950, 1963].map(y => (M.st.findIndex(s => s.y === y) + .5) * M.colW + svg.getBoundingClientRect().left);
        const bandTop = Math.max(...xs.map(x => Math.min(...[...svg.querySelectorAll('rect')].filter(r => !r.closest('defs')).map(r => r.getBoundingClientRect())
            .filter(b => b.left <= x && b.right >= x && b.height > 1).map(b => b.top))));
        const abstand = pfad ? pfad.getBoundingClientRect().top - bandTop : -1;
        const texte = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent) : [];
        return { zeilen, jahre, grenzen, abstand, texte };
    });
    if (r.abstand < 3) B(`Ligaverlauf: Linie klebt an der Decke (Abstand ${r.abstand.toFixed(1)} px)`);
    if (r.texte.includes('ZSG Industrie Leipzig')) B('Ligaverlauf: Schriftzug „ZSG Industrie Leipzig“ (nur 1949/50) ragt über die 50er/60er');
    if (!r.texte.includes('FC Sachsen Leipzig')) B('Ligaverlauf: Schriftzug „FC Sachsen Leipzig“ fehlt');
    for (const t of ['DDR-Oberliga', 'DDR-Liga']) if (!r.texte.includes(t)) B(`Ligaverlauf: Band „${t}“ nicht beschriftet`);
    const z = r.zeilen.join(' | ');
    if (!r.zeilen.some(t => /^1990\/91–2010\/11 FC Sachsen Leipzig$/.test(t))) B('VEREINSNAMEN ohne eine Zeile „1990/91–2010/11 FC Sachsen Leipzig“: ' + z);
    if (r.zeilen.filter(t => !/^heute/.test(t) && /FC Sachsen Leipzig/.test(t)).length !== 1) B('FC Sachsen Leipzig steht mehrfach: ' + z);
    if (r.zeilen.some(t => /(^| )Chemie Leipzig$/.test(t) && !/BSG/.test(t))) B('Kurzform „Chemie Leipzig“ als damaliger Name: ' + z);
    if (!r.zeilen.some(t => /^heute BSG Chemie Leipzig.*Neugründung 1997.*nicht geklärt/.test(t))) B('Vermerk bei heute fehlt: ' + z);
    for (const y of [1950, 1963, 1971, 1990, 1991, 2008, 2010, 2011, 2012, 2014, 2024]) if (!r.jahre.includes(y)) B('Ligaverlauf ohne Saison ' + y);
    if (r.jahre.includes(2013)) B('Ligaverlauf: 2013/14 (SG Sachsen Leipzig) haengt noch am heutigen Verein');
    if (r.grenzen.includes(1971)) B('Ligaverlauf: Namensgrenze 1971 (Kurzform Chemie Leipzig)');
    if (!r.grenzen.includes(1990) || !r.grenzen.includes(2011)) B('Ligaverlauf: Grenzen 1990/2011 fehlen ' + JSON.stringify(r.grenzen));
    if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Seite ${w}px breiter als der Bildschirm`); }
    const nb = p.locator('#modal div', { hasText: /^VEREINSNAMEN/ }).last();
    if (await nb.count()) { await nb.scrollIntoViewIfNeeded(); await p.screenshot({ path: `docs/ligaverlauf/chemie-leipzig-steckbrief-${art}${SELBST ? '-selbsttest' : ''}.png` }); }
    // Leutzsch: 2013/14 als SG Sachsen Leipzig
    const lz = await p.evaluate(id => ({ n: App._histClubName(id, '2013/14'), s: App._staffelName('6-24', '2013/14', id) }), LZ);
    if (lz.n !== 'SG Sachsen Leipzig') B('Leutzsch 2013/14 heisst nicht SG Sachsen Leipzig: ' + lz.n);
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
