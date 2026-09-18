// Browser-Pruefung der Fusionen (tools/hist_fusion.json) gegen template.html: Steckbrief-Block VORGAENGER / AUFGEGANGEN IN
// und Vorgaenger-Linien im Ligaverlauf, Desktop + Handy, dunkel + hell.
// node .claude/skills/run/fusion_check.mjs   -> Screenshots nach docs/fusion/ ; Exit 1 = Befund
// --selbsttest: HIST_EXT.fusion wird vorher geleert – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/fusion');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt, theme) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    await page.addInitScript(t => { localStorage.setItem('theme', t); localStorage.setItem('ba_sb_verlauf_hist', '1'); }, theme);
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { HIST_EXT.fusion = {}; });
    const faelle = [
        { id: 'fcingolstadt04_4', block: 'VORGÄNGER', linien: 2, namen: ['MTV Ingolstadt', 'ESV Ingolstadt'] },
        { id: 'hist_bsv07schwenningen', block: 'VORGÄNGER', linien: 2, namen: ['VfR Schwenningen', 'SC Schwenningen'] },
        { id: 'hist_fa_vfrschwenningen', block: 'AUFGEGANGEN IN', linien: 0, namen: ['BSV 07 Schwenningen'] },
        { id: 'vfbmerseburg_897', block: 'VORGÄNGER', linien: 1, namen: ['Buna Schkopau'] },
    ];
    for (const f of faelle) {
        await page.evaluate(id => App.showSteckbrief(id), f.id);
        await page.waitForFunction(() => document.querySelector('#sbvl-svg') || (document.getElementById('sb-verlauf') && document.getElementById('sb-verlauf').dataset.done), null, { timeout: 15000 }).catch(() => {});
        await warte(600);
        const r = await page.evaluate(() => {
            const mc = document.querySelector('.modal-content'), txt = mc ? mc.innerText : '';
            const linien = document.querySelectorAll('#sbvl-svg path[stroke-dasharray]').length;
            const ueber = mc ? [...mc.querySelectorAll('span,div')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length : 0;
            return { txt, linien, ueber };
        });
        const tag = `${name} ${f.id}`;
        if (!r.txt.includes(f.block)) befunde.push(`${tag}: Block "${f.block}" fehlt`);
        f.namen.forEach(n => { if (!r.txt.includes(n)) befunde.push(`${tag}: "${n}" fehlt`); });
        if (r.linien !== f.linien) befunde.push(`${tag}: ${r.linien} Vorgaenger-Linien statt ${f.linien}`);
        if (r.ueber) befunde.push(`${tag}: ${r.ueber} Elemente ragen rechts aus dem Bild`);
        const box = await page.$('.modal-content');
        if (box) await box.evaluate(e => { const v = document.getElementById('sb-verlauf'); if (v) v.scrollIntoView({ block: 'center' }); });
        if (!SELBST) await page.screenshot({ path: path.join(SHOT, `${name}-${f.id}.png`) });   // Selbsttest-Bilder wuerden die echten ueberschreiben
        await page.evaluate(() => App.closeModal && App.closeModal());
    }
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' | ')}`);
    await ctx.close();
}

await lauf('desktop-dunkel', { viewport: { width: 1400, height: 900 } }, 'dark');
await lauf('handy-hell', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light');
await browser.close();
befunde.forEach(b => console.log('  FEHL ' + b));
if (SELBST) { console.log(befunde.length ? `Selbsttest bestanden (${befunde.length} Befunde)` : 'SELBSTTEST FEHLGESCHLAGEN'); process.exit(befunde.length ? 0 : 1); }
console.log(befunde.length ? `${befunde.length} Befund(e)` : `Alles gruen – Screenshots in ${SHOT}`);
process.exit(befunde.length ? 1 : 0);
