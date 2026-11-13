// Ewige Tabelle am Handy: Bild + Spaltenbreiten (Fix-Liste 12.11.2026: „zwischen Verein und den anderen Reitern zu viel Platz“).
//   node .claude/skills/run/ewige_mobil_bild.mjs [port] [liga] [name]   → docs/ewige-mobil/<name>.png
import { chromium } from 'playwright';
import fs from 'node:fs';
const a = process.argv.slice(2), PORT = a[0] || 3334, LID = a[1] || '1', NAME = a[2] || 'ist';
fs.mkdirSync('docs/ewige-mobil', { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await page.evaluate(lid => { App.tableView = 'ewige'; App.loadLeague(lid); }, LID);
await page.waitForTimeout(1500);
const m = await page.evaluate(() => {
    const t = document.getElementById('ew-tab'); if (!t) return null;
    const ths = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim().replace(/[▲▼]/g, '') + ':' + Math.round(th.getBoundingClientRect().width));
    const box = t.parentElement, r = t.getBoundingClientRect();
    const n = t.querySelector('tbody tr .tmn');
    return { ths: ths.join(' '), tab: Math.round(r.width), box: Math.round(box.clientWidth), boxScroll: box.scrollWidth, ov: getComputedStyle(box).overflowX,
             name: n ? n.textContent : '', seite: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
console.log(JSON.stringify(m, null, 1));
await page.evaluate(() => document.getElementById('ew-tab')?.scrollIntoView()); await page.waitForTimeout(300);
await page.screenshot({ path: `docs/ewige-mobil/${NAME}.png` });
if (fehler.length) console.log('JS-Fehler:', fehler.join(' / '));
await browser.close();
