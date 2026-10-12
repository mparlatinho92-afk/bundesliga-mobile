// Browser-Pruefung: der blaue ···-Button bleibt mobil in der ersten Kopfzeile rechts und ganz sichtbar - auch bei
// schmalen Android-Breiten und langen Liganamen (Nutzerbefund 12.10.2026: links abgeschnitten / umgebrochen).
// Screenshots nach docs/dots-mobil/. Exit 1 = Befund. --selbsttest: alte Regel (.hdr-left flex 1 1 auto) - MUSS durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SELBST = process.argv.includes('--selbsttest');
const SHOT = path.resolve(SELBST ? 'docs/dots-mobil/_selbsttest' : 'docs/dots-mobil');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const LIGEN = ['1', '6-6', '7-1'];          // kurz, lang, Bezirksliga
const browser = await chromium.launch({ headless: true });
const befunde = [];
for (const w of [320, 360, 390, 412]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 120000 });
    if (SELBST) await page.addStyleTag({ content: '@media (max-width:768px),(pointer:coarse){ .hdr-left { flex: 1 1 auto !important; } }' });
    for (const lid of LIGEN) {
        const name = await page.evaluate(l => { if (!GAME_DATA.leagues[l]) return null; App.loadLeague(l); return GAME_DATA.leagues[l].name; }, lid);
        if (!name) continue;
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
            const b = document.getElementById('dots-btn').getBoundingClientRect(), t = document.getElementById('league-title').getBoundingClientRect();
            return { l: b.left, r: b.right, top: b.top, titelTop: t.top, titelH: t.height, vw: innerWidth };
        });
        const ok = r.l >= 0 && r.r <= r.vw && Math.abs(r.top - r.titelTop) < r.titelH && r.r > r.vw * 0.8;
        console.log(`${w}px ${name.padEnd(30)} Button ${Math.round(r.l)}-${Math.round(r.r)}  ${ok ? 'ok' : 'FEHLER'}`);
        if (!ok) befunde.push(`${w}px ${name}: Button ${Math.round(r.l)}-${Math.round(r.r)}, nicht rechts in Zeile 1`);
        await (await page.$('header')).screenshot({ path: path.join(SHOT, `${w}_${lid}.png`) });
    }
    if (fehler.length) befunde.push(`${w}px JS-Fehler ${fehler[0]}`);
    await ctx.close();
}
await browser.close();
console.log(befunde.length ? 'BEFUND:\n  ' + befunde.join('\n  ') : 'OK – Bilder in ' + SHOT);
process.exit(befunde.length ? 1 : 0);
