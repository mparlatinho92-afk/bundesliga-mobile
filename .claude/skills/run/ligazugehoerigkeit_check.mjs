// Browser-Prüfung Steckbrief „LIGAZUGEHÖRIGKEIT · N Saisons“ gegen die Zahl verschiedener Saisons in den Daten
// (historische Ligen + Seed + laufende Saison), Desktop + Handy. Klickt im Vorgänger-Block von Rapid auf den Altchemnitzer BSC.
// node .claude/skills/run/ligazugehoerigkeit_check.mjs  -> docs/ligazugehoerigkeit/ ; Exit 1 = Befund
// --selbsttest: App._ewigeEigen wird durch die rohe Summe ersetzt – dann MUSS die Prüfung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('../../../docs/ligazugehoerigkeit');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { App._ewigeEigen = (ew, id) => { const o = {}; for (const l in ew) if (ew[l][id]) o[l] = Object.assign({}, ew[l][id]); return o; }; });
    // Soll unabhängig von der Anzeige: verschiedene Saisons in den Rohdaten
    const soll = await page.evaluate(ids => {
        const x = HistExt.loaded(), RM = HistExt.remap ? HistExt.remap() : {}, out = {};
        ids.forEach(id => {
            const s = new Set();
            for (const lid in x.byLid) for (const rec of x.byLid[lid]) for (const r of rec.rows) if (r.id === id) s.add(parseInt(rec.y));
            (HISTORY_SEED.seasons || []).forEach(z => z.table.forEach(r => { if ((RM[r.id] || r.id) === id) s.add(parseInt(z.y)); }));
            out[id] = s.size + (Engine.teams[id] && Engine.teams[id].leagueId ? 1 : 0);
        });
        return out;
    }, ['rapidchemnitz_886', 'hist_fa_altchemnitzerbsc', 'scpreussenmuenster_1202', 'borussianeunkirchen_249']);
    const kopf = () => page.evaluate(() => {
        const el = [...document.querySelectorAll('.modal-content div')].find(d => /^LIGAZUGEHÖRIGKEIT · \d+/.test(d.textContent) && d.children.length === 0);
        return el ? parseInt(el.textContent.match(/(\d+)/)[1]) : null;
    });
    const pruefe = async (id, wie) => {
        const ist = await kopf();
        const ok = ist === soll[id];
        console.log(`${ok ? '✓' : '✗'} ${name} ${id} (${wie}): Kopf ${ist}, Daten ${soll[id]}`);
        if (!ok) befunde.push(`${name} ${id}: ${ist} statt ${soll[id]}`);
    };
    for (const id of ['scpreussenmuenster_1202', 'borussianeunkirchen_249', 'rapidchemnitz_886']) {
        await page.evaluate(i => App.showSteckbrief(i), id);
        await page.waitForTimeout(800);
        await pruefe(id, 'geöffnet');
    }
    await page.screenshot({ path: path.join(SHOT, `rapid-${name}.png`) });
    // im Vorgänger-Block klicken (echter Klick, nicht Funktionsaufruf)
    const link = page.locator('.modal-content span[onclick*="hist_fa_altchemnitzerbsc"]').first();
    if (!(await link.count())) befunde.push(name + ': Link Altchemnitzer BSC fehlt');
    else {
        await link.click();
        await page.waitForTimeout(800);
        await pruefe('hist_fa_altchemnitzerbsc', 'per Klick');
        await page.screenshot({ path: path.join(SHOT, `altchemnitzer-${name}.png`) });
    }
    // Ewige Tabelle 2. Bundesliga: RWE 16 Jahre / 562 Spiele wie Wikipedia (1993/94 ohne Wertung zählt als Jahr, v0.8.228.75)
    await page.locator('#modal .modal-header button', { hasText: 'Schließen' }).click();
    await page.evaluate(() => App.loadLeague('2'));
    await page.waitForTimeout(800);
    await page.locator('button', { hasText: 'Ewige Tabelle' }).first().click();
    await page.waitForSelector('#ew-tab', { timeout: 30000 });
    await page.locator('#ew-suche').fill('Rot-Weiss Essen');
    await page.waitForTimeout(500);
    const zelle = await page.evaluate(() => {
        const kopf = [...document.querySelectorAll('#ew-tab thead th')].map(t => t.textContent.replace(/[▲▼]/g, '').trim());
        const tr = [...document.querySelectorAll('#ew-tab tbody tr')].find(t => t.offsetParent !== null && /Rot-Weiss Essen/.test(t.textContent));
        if (!tr) return null;
        const td = [...tr.children].map(c => c.textContent.trim());
        return { jahre: td[kopf.indexOf('Jahre')], sp: td[kopf.indexOf('Sp.')] };
    });
    const ewOk = zelle && zelle.jahre === '16' && zelle.sp === '562';
    console.log(`${ewOk ? '✓' : '✗'} ${name} Ewige Tabelle 2. BL RWE (per Klick): ${JSON.stringify(zelle)}, Wikipedia 16 Jahre / 562 Sp.`);
    if (!ewOk) befunde.push(`${name} Ewige Tabelle RWE ${JSON.stringify(zelle)}`);
    await page.screenshot({ path: path.join(SHOT, `ewige-2bl-rwe-${name}.png`) });
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler.join(' | '));
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1280, height: 900 } });
await lauf('handy', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await browser.close();
console.log(befunde.length ? `\n${befunde.length} Befund(e)${SELBST ? ' – Selbsttest wie erwartet durchgefallen' : ''}` : '\nalles grün');
process.exit(befunde.length ? 1 : 0);
