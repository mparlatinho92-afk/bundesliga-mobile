// Browser-Pruefung Ausgruendungen (18.10.2026, tools/hist_ausgruendung.json): der Steckbrief nennt unter VEREINSNAMEN
// "Ausgründung JAHR aus VON" am ersten Namen nach der Ausgruendung, auch beim historischen Verein FSV Lok Dresden
// (SC Einheit 1954-65 und FSV Lok 1966-90 eine ID; BSG Lok Dresden 1963-67 bleibt getrennt, ohne Vermerk).
// node .claude/skills/run/ausgruendung_check.mjs   Exit 1 = Befund   (Server: python -m http.server 3334)
// --selbsttest: HIST_EXT.ausgruendung wird vorher geleert – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const BILD = process.argv.includes('--bild');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { HIST_EXT.ausgruendung = {}; });
    const AG = await page.evaluate(() => JSON.parse(JSON.stringify((typeof HIST_EXT !== 'undefined' && HIST_EXT.ausgruendung) || {})));
    const soll = SELBST ? JSON.parse(fs.readFileSync('tools/hist_ausgruendung.json', 'utf8')) : AG;
    delete soll._hinweis;
    if (Object.keys(soll).length < 16) befunde.push(`${name}: nur ${Object.keys(soll).length} Ausgruendungen geladen`);
    for (const [id, a] of Object.entries(soll)) {
        await page.evaluate(id => App.showSteckbrief(id), id); await warte(700);
        const r = await page.evaluate(() => {
            const m = document.querySelector('.modal-content'); if (!m) return null;
            const tag = [...m.querySelectorAll('div')].find(d => /^Ausgründung \d{4}/.test(d.textContent) && !d.children.length);
            const zeile = tag && tag.parentElement && tag.parentElement.parentElement;
            const mb = m.getBoundingClientRect(), tb = tag && tag.getBoundingClientRect();
            return { txt: m.innerText, tag: tag ? tag.textContent : null, zeile: zeile ? zeile.innerText : '', raus: tb ? tb.right > mb.right + 1 : false };
        });
        if (!r) { befunde.push(`${name} ${id}: kein Steckbrief`); continue; }
        const erwartet = `Ausgründung ${a.jahr} aus ${a.von}`;
        if (r.tag !== erwartet) befunde.push(`${name} ${id}: Vermerk "${r.tag}" statt "${erwartet}"`);
        else if (!r.zeile.includes(a.name) && !(id === 'rotweisserfurt_824' && r.zeile.includes('heute'))) befunde.push(`${name} ${id}: Vermerk steht nicht bei "${a.name}" (${r.zeile.replace(/\n/g, ' / ')})`);
        if (r.raus) befunde.push(`${name} ${id}: Vermerk ragt aus dem Steckbrief`);
        if (/undefined|NaN/.test(r.txt)) befunde.push(`${name} ${id}: undefined/NaN`);
        if (id === 'hist_einheitdresden') {
            if (!r.txt.includes('SC Einheit Dresden')) befunde.push(`${name} Dresden: SC Einheit fehlt unter VEREINSNAMEN`);
            if (!/AUFGEGANGEN IN[\s\S]*Dresdner SC/.test(r.txt)) befunde.push(`${name} Dresden: AUFGEGANGEN IN Dresdner SC fehlt`);
            if (BILD && name === 'handy') { fs.mkdirSync('docs/ausgruendung', { recursive: true }); await page.screenshot({ path: 'docs/ausgruendung/fsv-lok-dresden-handy.png', fullPage: false }); }
        }
        if (BILD && name === 'handy' && id === 'fccarlzeissjena_825') await page.screenshot({ path: 'docs/ausgruendung/jena-handy.png' });
        await page.evaluate(() => App.closeModal && App.closeModal());
    }
    // BSG Lok Dresden: eigene Linie, kein Vermerk; die alten Lok-IDs gibt es nicht mehr
    await page.evaluate(() => App.showSteckbrief('hist_fa_lokomotivedresden')); await warte(700);
    const bsg = await page.evaluate(() => { const m = document.querySelector('.modal-content'); return m ? m.innerText : ''; });
    if (/Ausgründung/.test(bsg)) befunde.push(`${name} BSG Lok Dresden: traegt einen Ausgruendungs-Vermerk`);
    // historischer Verein: keine LIGA/REGIONEN (zeigte vorher "🏅 Amateurpokal" und "–"); Spielverein behaelt sie
    if (/Amateurpokal|REGIONEN/.test(bsg)) befunde.push(`${name} BSG Lok Dresden: LIGA/REGIONEN beim historischen Verein`);
    await page.evaluate(() => App.closeModal && App.closeModal());
    await page.evaluate(() => App.showSteckbrief('fccarlzeissjena_825')); await warte(700);
    const jena = await page.evaluate(() => { const m = document.querySelector('.modal-content'); return m ? m.innerText : ''; });
    if (!/LIGA[\s\S]*REGIONEN/.test(jena)) befunde.push(`${name} Jena: LIGA/REGIONEN fehlen beim Spielverein`);
    await page.evaluate(() => App.closeModal && App.closeModal());
    const alt = await page.evaluate(() => ['hist_fa_lokdresden', 'hist_fa_fsvlokdresden'].filter(id => HISTORIC_CLUBS[id]));
    if (alt.length) befunde.push(`${name}: alte IDs noch vorhanden: ${alt.join(', ')}`);
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' | ')}`);
    await ctx.close();
}
await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
befunde.forEach(b => console.log('  FEHL ' + b));
if (SELBST) { console.log(befunde.length ? `Selbsttest bestanden (${befunde.length} Befunde)` : 'SELBSTTEST FEHLGESCHLAGEN'); process.exit(befunde.length ? 0 : 1); }
console.log(befunde.length ? `${befunde.length} Befund(e)` : 'Alles gruen');
process.exit(befunde.length ? 1 : 0);
