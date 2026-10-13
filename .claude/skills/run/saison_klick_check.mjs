// Browser-Pruefung "Saison-Historie im Steckbrief ist verlinkt" gegen template.html: ein echter Klick auf eine Zeile
// schliesst den Steckbrief und zeigt GENAU diese Saison dieser Liga (Archiv, historische Liga, laufende Saison).
// Desktop + Handy (Tipp). node .claude/skills/run/saison_klick_check.mjs -> Screenshots nach docs/saison-klick/ ; Exit 1 = Befund
// --selbsttest: _sbSaisonGo verhaelt sich wie vorher (nur loadLeague der Liga) - dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/saison-klick');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

// Verein, Saison der Zeile, erwartete Liga (Archiv der Spiel-Liga / historische Liga / laufende Saison)
const faelle = [
    { id: 'tussteinbachdonnersberg_342', y: '2022/23', lid: '6-1', name: 'Steinbach' },
    { id: 'tussteinbachdonnersberg_342', y: '2016/17', lid: '8-4', name: 'Steinbach' },
    { id: 'vfcplauen_837', y: '1970/71', lid: null, name: 'Plauen' },        // DDR-Zeit: historische Liga, lid aus der Zeile
    { id: 'tussteinbachdonnersberg_342', y: null, lid: '7-2', name: 'Steinbach' },   // laufende Saison
];

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { App._sbSaisonGo = function (lid) { this.loadLeague(lid); }; });
    for (const f of faelle) {
        const tag = `${name} ${f.id} ${f.y || 'laufend'}`;
        await page.evaluate(id => App.showSteckbrief(id), f.id);
        await warte(1500);   // Voll-Historie kommt async aus IndexedDB nach
        // Seite mit der Zeile suchen, Zeile per Index markieren
        const ziel = await page.evaluate(y => {
            const st = App._sbHist; if (!st) return null;
            const idx = st.rows.findIndex(r => y ? (String(r.year) === y && !r.isCurrent) : r.isCurrent);
            if (idx < 0) return { fehlt: true, jahre: st.rows.map(r => r.year).slice(0, 40) };
            const p = Math.floor(idx / st.per); App._sbHistGoto(p);
            const row = st.rows[idx];
            const el = [...document.getElementById('sb-hist-list').children].find(e => e.getAttribute('onclick') && e.textContent.includes(row.isCurrent ? row.ligaName : row.year));
            if (!el) return { fehlt: true };
            el.setAttribute('data-test-ziel', '1');
            return { lid: row.leagueId };
        }, f.y);
        if (!ziel || ziel.fehlt) { befunde.push(`${tag}: Zeile nicht gefunden ${ziel && ziel.jahre ? ziel.jahre.join(',') : ''}`); continue; }
        const sel = '[data-test-ziel="1"]';
        await page.locator(sel).scrollIntoViewIfNeeded();
        if (ctxOpt.hasTouch) await page.locator(sel).tap(); else await page.locator(sel).click();
        await warte(1200);
        const ist = await page.evaluate(() => ({
            modal: document.getElementById('modal').style.display,
            lid: App.activeLeague, va: App.viewArchivedSeason, off: App.viewHistoryOffset,
            gesehen: App._viewedSeason(), titel: document.getElementById('league-title').innerText,
            inhalt: document.getElementById('content').innerText.slice(0, 4000) }));
        const sollLid = f.lid || ziel.lid;
        const live = await page.evaluate(() => Engine.getFormattedSeason());
        const sollY = f.y || live;
        const ok = ist.modal === 'none' && ist.lid === sollLid && ist.gesehen === sollY && ist.inhalt.includes(f.name)
            && (f.y ? true : ist.va === null && ist.off === null);
        console.log(`${ok ? 'ok  ' : 'FEHL'} ${tag}: Liga ${ist.lid} (soll ${sollLid}), Saison ${ist.gesehen} (soll ${sollY}), Steckbrief ${ist.modal === 'none' ? 'zu' : 'offen'}, ${f.name} ${ist.inhalt.includes(f.name) ? 'in' : 'NICHT in'} der Tabelle`);
        if (!ok) befunde.push(tag);
        await page.screenshot({ path: path.join(SHOT, `${name}-${f.id.split('_')[0]}-${(f.y || 'laufend').replace('/', '-')}.png`) });
    }
    if (fehler.length) { befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' | ')}`); console.log('JS-Fehler:', fehler.slice(0, 3)); }
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1280, height: 900 } });
await lauf('handy', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
await browser.close();
if (SELBST) {
    console.log(befunde.length ? `\nSelbsttest bestanden: die Sabotage wurde erkannt (${befunde.length} Befunde).` : '\nSELBSTTEST FEHLGESCHLAGEN: Sabotage unbemerkt.');
    process.exit(befunde.length ? 0 : 1);
}
console.log(befunde.length ? `\n${befunde.length} Befund(e):\n  ` + befunde.join('\n  ') : '\nalles ok');
process.exit(befunde.length ? 1 : 0);
