// Browser-Pruefung: Gemeinde + Einwohner je Spielstaette im Steckbrief (tools/stadion_gemeinden.py).
// Ortsteil -> "Gemeinde X, N Einw.", Ort = Gemeinde -> nur "N Einw.". Desktop + Handy, Screenshots nach
// docs/gemeinden/. Exit 1 = Befund. --selbsttest: _stadionHtml ohne Gemeinde-Teil - dann MUSS es durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SELBST = process.argv.includes('--selbsttest');
const SHOT = path.resolve(SELBST ? 'docs/gemeinden/_selbsttest' : 'docs/gemeinden');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const FAELLE = [
    { id: 'djkschwebenried_', muss: /Schwebenried · .*Gemeinde Arnstein, [\d.]+ Einw\./ },        // Ortsteil
    { id: 'borussiadortmund_1195', muss: /Dortmund-Westfalenhalle · 81\.365 Plätze · 603\.462 Einw\./, nicht: /Gemeinde Dortmund/ },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 120000 });
    if (SELBST) await page.evaluate(() => { for (const t of Object.values(GAME_DATA.teams)) (t.venues || []).forEach(v => { delete v.gem; delete v.ew; }); });
    for (const f of FAELLE) {
        const id = await page.evaluate(p => Object.keys(GAME_DATA.teams).find(k => k.startsWith(p)), f.id);
        if (!id) { befunde.push(`${name}: Verein ${f.id} fehlt`); continue; }
        await page.evaluate(i => App.showSteckbrief(i), id);
        await page.waitForTimeout(500);
        const txt = await page.evaluate(() => {
            const k = [...document.querySelectorAll('.modal-content div')].find(d => /^STADION/.test(d.textContent || '') && d.children.length === 0);
            const box = k && k.parentElement;
            if (box && box.scrollIntoView) box.scrollIntoView({ block: 'center' });
            return { text: box ? box.innerText.replace(/\s+/g, ' ') : '', ueber: document.documentElement.scrollWidth > window.innerWidth + 1 };
        });
        console.log(`${name} ${id}: ${txt.text}`);
        if (!f.muss.test(txt.text)) befunde.push(`${name} ${id}: erwartet ${f.muss}, ist "${txt.text}"`);
        if (f.nicht && f.nicht.test(txt.text)) befunde.push(`${name} ${id}: Gemeinde doppelt genannt`);
        if (txt.ueber) befunde.push(`${name}: Seite scrollt waagrecht`);
        await page.screenshot({ path: path.join(SHOT, `${name}-${id}.png`) });
        await page.evaluate(() => App.closeModal && App.closeModal());
    }
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler[0]}`);
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
console.log(befunde.length ? 'BEFUND:\n  ' + befunde.join('\n  ') : 'OK – Bilder in ' + SHOT);
process.exit(befunde.length ? 1 : 0);
