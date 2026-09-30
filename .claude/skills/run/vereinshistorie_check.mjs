// Browser-Pruefung "Vereinshistorie" gegen template.html: Steckbrief-Block VEREINSNAMEN, Aera-Ueberschriften in der
// Saison-Historie (auf ALLEN Seiten) und damalige Namen im Ligaverlauf. Desktop + Handy, dunkel + hell.
// node .claude/skills/run/vereinshistorie_check.mjs   -> Screenshots nach docs/vereinshistorie/ ; Exit 1 = Befund
// --selbsttest: HISTORIC_NAMES wird vorher geleert - dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/vereinshistorie');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

const faelle = [
    { id: 'vfcplauen_837', namen: ['Motor WEMA Plauen', 'Motor Plauen'] },
    { id: 'fsvwackernordhausen_860', namen: ['Motor Nordhausen West', 'Motor Nordhausen', 'Wacker Nordhausen'] },
    { id: '1fcheidenheim1846_901', namen: ['VfL Heidenheim', 'Heidenheimer SB'] },
    { id: 'svlichtenberg47_707', namen: ['EAB Lichtenberg 47', 'EAB 47 Berlin'] },
];

async function lauf(name, ctxOpt, theme) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    await page.addInitScript(t => { localStorage.setItem('theme', t); localStorage.setItem('ba_sb_verlauf_hist', '1'); }, theme);
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { for (const k in HISTORIC_NAMES) delete HISTORIC_NAMES[k]; });
    for (const f of faelle) {
        await page.evaluate(id => App.showSteckbrief(id), f.id);
        await page.waitForFunction(() => document.querySelector('#sbvl-svg'), null, { timeout: 15000 }).catch(() => {});
        await warte(1500);   // Voll-Historie kommt async aus IndexedDB nach
        const r = await page.evaluate(() => {
            const mc = document.querySelector('.modal-content'), txt = mc ? mc.innerText : '';
            const i = txt.indexOf('VEREINSNAMEN'), block = i >= 0 ? txt.slice(i, txt.indexOf('\n\n', i + 12) > 0 ? txt.indexOf('\n\n', i + 12) : i + 600) : '';
            // alle Seiten der Saison-Historie durchgehen und die Ueberschriften einsammeln
            const kopf = [], st = App._sbHist, seiten = st ? Math.ceil(st.rows.length / st.per) : 0;
            let obenAktuell = null;
            for (let p = 0; p < seiten; p++) {
                App._sbHistGoto(p);
                const list = document.getElementById('sb-hist-list');
                [...list.children].forEach((el, j) => {
                    if (!el.onclick && el.textContent) kopf.push(el.textContent.trim());
                    if (p === 0 && j === 0) obenAktuell = !el.onclick ? 'KOPF: ' + el.textContent : 'zeile';
                });
            }
            App._sbHistGoto(0);
            const svgTxt = [...document.querySelectorAll('#sbvl-svg text')].map(t => t.textContent);
            const ueber = mc ? [...mc.querySelectorAll('span,div')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length : 0;
            return { block, kopf, obenAktuell, svgTxt, ueber, zeilen: st ? st.rows.length : 0, aktuellOben: st && st.rows[0] && st.rows[0].isCurrent };
        });
        const tag = `${name} ${f.id}`;
        // Rueckfall Info-Text: ECHTER Tipp/Klick auf die aelteste Saison mit damaligem Namen (Handy: touchscreen.tap)
        const ziel = await page.evaluate(() => {
            const M = App._sbVLModel, svg = document.getElementById('sbvl-svg'); if (!M || !svg) return null;
            // Mitte der laengsten Aera (eine einzelne Saison ist auf dem Handy nur ~5 px breit)
            const nm = M.st.map(s => App._histClubName(M.team, App._seasonStrOf(s.y)));
            let best = null;
            for (let a = 0; a < nm.length; a++) { if (!nm[a]) continue; let b = a; while (b + 1 < nm.length && nm[b + 1] === nm[a]) b++; if (!best || b - a > best[1] - best[0]) best = [a, b]; a = b; }
            if (!best) return null;
            const i = Math.floor((best[0] + best[1]) / 2);
            svg.scrollIntoView({ block: 'center' });
            svg.parentElement.scrollLeft = Math.max(0, (i - 3) * M.colW);
            const r = svg.getBoundingClientRect();
            return { x: r.left + (i + .5) * M.colW, y: r.top + 20, erwartet: App._histClubName(M.team, App._seasonStrOf(M.st[i].y)) };
        });
        // Drei Linienarten muessen sich unterscheiden: Jahrzehnt / Namenswechsel / Zeiger (Nutzerbefund 29.09.2026)
        const lin = await page.evaluate(() => {
            const sig = l => [getComputedStyle(l).stroke, l.getAttribute('stroke-dasharray') || '-'].join(' ')   // Deckkraft zaehlt NICHT: daran unterschieden sich die alten, verwechselbaren Linien;
            const all = [...document.querySelectorAll('#sbvl-svg line')];
            const cur = document.getElementById('sbvl-cur');
            const dek = all.find(l => l !== cur && !l.getAttribute('stroke-dasharray'));
            const nam = all.find(l => (l.getAttribute('style') || '').includes('--c-gold'));
            return { cur: cur && sig(cur), dek: dek && sig(dek), nam: nam && sig(nam), leg: /Namenswechsel/.test((document.getElementById('sb-verlauf') || {}).innerText || '') };
        });
        if (!lin.nam) befunde.push(`${tag}: keine Namenswechsel-Linie`);
        if (!lin.leg) befunde.push(`${tag}: Legende "Namenswechsel" fehlt`);
        if (new Set([lin.cur, lin.dek, lin.nam]).size < 3) befunde.push(`${tag}: Linienarten nicht unterscheidbar (${JSON.stringify(lin)})`);
        if (!ziel) befunde.push(`${tag}: keine Saison mit damaligem Namen im Ligaverlauf`);
        else {
            if (ctxOpt.hasTouch) await page.touchscreen.tap(ziel.x, ziel.y); else await page.mouse.click(ziel.x, ziel.y);
            await warte(200);
            const info = await page.evaluate(() => (document.getElementById('sbvl-info') || {}).textContent || '');
            if (!info.includes('als ' + ziel.erwartet)) befunde.push(`${tag}: Info nach Tippen ohne "als ${ziel.erwartet}" (${info})`);
            else console.log(`  ${tag}: Tippen -> "${info}"`);
        }
        if (!r.block) befunde.push(`${tag}: Block VEREINSNAMEN fehlt`);
        else {
            f.namen.forEach(n => { if (!r.block.includes(n)) befunde.push(`${tag}: VEREINSNAMEN ohne "${n}"`); });
            if (!/heute/.test(r.block)) befunde.push(`${tag}: VEREINSNAMEN ohne "heute"`);
        }
        f.namen.forEach(n => { if (!r.kopf.includes(n)) befunde.push(`${tag}: keine Ueberschrift "${n}" in der Saison-Historie (${r.kopf.join(' | ')})`); });
        if (r.aktuellOben && r.obenAktuell !== 'zeile') befunde.push(`${tag}: Ueberschrift ueber der aktuellen Saison (${r.obenAktuell})`);
        if (!f.namen.some(n => r.svgTxt.includes(n))) befunde.push(`${tag}: kein damaliger Name im Ligaverlauf (${r.svgTxt.filter(t => !/^\d{4}$|Ebene/.test(t)).join(' | ')})`);
        if (r.ueber) befunde.push(`${tag}: ${r.ueber} Elemente ragen ueber den Rand`);
        console.log(`  ${tag}: ${r.zeilen} Saisons, Ueberschriften [${r.kopf.join(' | ')}], im Verlauf [${f.namen.filter(n => r.svgTxt.includes(n)).join(' | ')}]`);
        if (!SELBST && f.id === 'fsvwackernordhausen_860') {
            const mc = await page.$('.modal-content');
            if (mc) await mc.screenshot({ path: path.join(SHOT, `${name}-${f.id}.png`) });
            const vl = await page.$('#sb-verlauf'), hl = await page.$('#sb-hist-list');
            if (vl) { await vl.scrollIntoViewIfNeeded(); await vl.screenshot({ path: path.join(SHOT, `${name}-${f.id}-verlauf.png`) }); }
            await page.evaluate(() => App._sbHistGoto(1));
            if (hl) { await hl.scrollIntoViewIfNeeded(); await hl.screenshot({ path: path.join(SHOT, `${name}-${f.id}-historie-s2.png`) }); }
        }
    }
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' / ')}`);
    await ctx.close();
}

await lauf('desktop-dunkel', { viewport: { width: 1280, height: 900 } }, 'dark');
await lauf('handy-hell', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light');
await browser.close();
if (befunde.length) { console.log('\nBEFUND:'); befunde.forEach(b => console.log('  ' + b)); process.exit(1); }
console.log('\nOK - Vereinsnamen, Aera-Ueberschriften und Ligaverlauf in beiden Ansichten.');
