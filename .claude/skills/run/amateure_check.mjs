// Browser-Pruefung: damaliger Name "… Amateure" (v0.8.197) in einer Archivtabelle. Desktop zeigt ihn ganz, das Handy
// kuerzt zuerst NUR "Amateure" zu "Am." (Nutzer 11.10.2026: "Amateure dann kürzen, wenn mobil platz braucht").
// Screenshots nach docs/amateure-mobil/. Exit 1 = Befund. --selbsttest: _fitTeamNames tut nichts – dann MUSS es durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SELBST = process.argv.includes('--selbsttest');
const SHOT = path.resolve(SELBST ? 'docs/amateure-mobil/_selbsttest' : 'docs/amateure-mobil');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const ID = 'borussiamoenchengladbachii_1128', LID = 'h4-nordrhein-oberliga', Y = '2002/03';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    if (SELBST) await page.addInitScript(() => {
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._fitTeamNames) { App._fitTeamNames = () => {}; clearInterval(t); } }, 5);
    });
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await page.evaluate(([y, lid]) => App._gotoSeason(y, 'arch', null, lid), [Y, LID]);
    await page.waitForTimeout(800);
    const z = await page.evaluate(id => {
        const tr = [...document.querySelectorAll('table tbody tr')].find(r => r.innerHTML.includes(id) || (r.querySelector('.tmn') && /Mönchengladbach/.test(r.querySelector('.tmn').dataset.full || '')));
        if (!tr) return null;
        const s = tr.querySelector('.tmn'), td = s.closest('td');
        if (td.scrollIntoView) td.scrollIntoView({ block: 'center' });
        const cs = getComputedStyle(td);
        let others = 0; for (const c of td.children) if (c !== s) others += c.getBoundingClientRect().width;
        const frei = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - others;
        return { full: s.dataset.full, text: s.textContent, breite: s.getBoundingClientRect().width, frei,
            ueberlauf: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, ID);
    await page.screenshot({ path: path.join(SHOT, name + '.png') });
    if (!z) { befunde.push(`${name}: Zeile Gladbach Amateure ${Y} nicht gefunden`); await ctx.close(); return; }
    console.log(`${name}: data-full="${z.full}" gezeigt="${z.text}" (${Math.round(z.breite)} / ${Math.round(z.frei)} px)`);
    if (z.full !== 'Borussia Mönchengladbach Amateure') befunde.push(`${name}: damaliger Name fehlt (${z.full})`);
    if (z.breite > z.frei + 1) befunde.push(`${name}: Name laeuft ueber (${Math.round(z.breite)} > ${Math.round(z.frei)} px)`);
    if (/Amat…|Amateu…|Ama…/.test(z.text)) befunde.push(`${name}: "Amateure" blind angeschnitten statt "Am." (${z.text})`);
    if (name === 'desktop' && z.text !== z.full) befunde.push(`desktop: voller Name gekuerzt (${z.text})`);
    if (name === 'handy' && z.text !== z.full && !/ Am\.$/.test(z.text)) befunde.push(`handy: gekuerzt ohne "Am." (${z.text})`);
    if (z.ueberlauf) befunde.push(`${name}: Seite scrollt waagrecht`);
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler[0]}`);
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
console.log(befunde.length ? 'BEFUND:\n  ' + befunde.join('\n  ') : 'OK – Bilder in ' + SHOT);
process.exit(befunde.length ? 1 : 0);
