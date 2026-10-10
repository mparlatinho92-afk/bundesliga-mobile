// Browser-Pruefung: Steckbrief-Block LIGAZUGEHOERIGKEIT (Titel + Vize je Liga) und Rekordfenster "JE LIGA",
// Desktop + Handy, gegen template.html. Screenshots nach docs/rekorde-je-liga/ ; Exit 1 = Befund.
// --selbsttest: Engine._recLigaSlots wird vor dem Backfill stillgelegt – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/rekorde-je-liga');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    if (SELBST) await page.addInitScript(() => {
        // Engine ist eine const auf oberster Ebene – NICHT window.Engine (so lief der Selbsttest zuerst grün durch)
        const t = setInterval(() => { if (typeof Engine !== 'undefined' && Engine._recLigaSlots) { Engine._recLigaSlots = () => {}; clearInterval(t); } }, 5);
    });
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    await page.waitForFunction(() => Engine.archive.records && Engine.archive.records.bfL, null, { timeout: 90000 }).catch(() => befunde.push(name + ': records.bfL nie gesetzt'));
    const id = await page.evaluate(() => Object.keys(GAME_DATA.teams).find(k => GAME_DATA.teams[k].name === 'FC Bayern München'));
    if (!id) { befunde.push(name + ': Bayern nicht gefunden'); await ctx.close(); return; }

    // Steckbrief
    await page.evaluate(id => App.showSteckbrief(id), id);
    await warte(2500);
    const sb = await page.evaluate(() => {
        const mc = document.querySelector('.modal-content'), txt = mc ? mc.innerText : '';
        const zeile = [...mc.querySelectorAll('div')].find(d => /^1\. Bundesliga/.test(d.innerText) && d.innerText.includes('×') && d.children.length === 2);
        const chip = document.getElementById('sb-vize-chip');
        const ueber = [...mc.querySelectorAll('span,div')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length;
        return { lz: txt.includes('LIGAZUGEHÖRIGKEIT'), karriere: /KARRIERE/.test(txt), zeile: zeile ? zeile.innerText : null,
                 vizeChip: chip ? chip.innerText + '|' + chip.style.display : null, ueber };
    });
    await page.screenshot({ path: path.join(SHOT, name + '-steckbrief.png') });
    if (!sb.lz || sb.karriere) befunde.push(name + ': Überschrift ' + JSON.stringify(sb));
    const m = sb.zeile && sb.zeile.match(/🏆 (\d+)/), v = sb.zeile && sb.zeile.match(/🥈 (\d+)/);
    if (!m || +m[1] < 30) befunde.push(name + ': Bundesliga-Titel fehlen in der Zeile: ' + sb.zeile);
    if (!v || +v[1] < 5) befunde.push(name + ': Bundesliga-Vize fehlen in der Zeile: ' + sb.zeile);
    if (sb.ueber) befunde.push(name + ': ' + sb.ueber + ' Elemente ragen über den Rand (Steckbrief)');

    // Rekordfenster
    await page.evaluate(id => App.showTeamRecords(id), id);
    await warte(400);
    const rk = await page.evaluate(() => {
        const mc = document.querySelector('.modal-content');
        const d = [...mc.querySelectorAll('details.rec-liga')];
        const ueber = [...mc.querySelectorAll('span,div')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length;
        return { n: d.length, erste: d[0] ? d[0].innerText.slice(0, 400) : '', offen: d.map(x => x.open), ueber };
    });
    await page.screenshot({ path: path.join(SHOT, name + '-rekorde.png'), fullPage: false });
    if (!rk.n) befunde.push(name + ': kein Block JE LIGA');
    if (!/1\. Bundesliga/.test(rk.erste) || !/Meiste Punkte/.test(rk.erste) || !/Meister/.test(rk.erste)) befunde.push(name + ': erster Ligablock unvollständig: ' + rk.erste);
    if (rk.offen[0] !== true || rk.offen.slice(1).some(Boolean)) befunde.push(name + ': Aufklappzustand ' + rk.offen);
    if (rk.ueber) befunde.push(name + ': ' + rk.ueber + ' Elemente ragen über den Rand (Rekorde)');
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler.slice(0, 3).join(' | '));
    console.log(name, JSON.stringify({ zeile: sb.zeile, vizeChip: sb.vizeChip, ligen: rk.n }));
    console.log(rk.erste.replace(/\n+/g, ' / '));
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
if (befunde.length) { console.log('BEFUND:\n- ' + befunde.join('\n- ')); process.exit(1); }
console.log('OK');
