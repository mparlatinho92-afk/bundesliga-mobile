// Amateurpokal-Anstoßzeiten im Browser (template.html), Desktop + Handy: Runden-Reiter anklicken wie der Nutzer – jede Partie
// steht im Block (Tag, Datum, Uhrzeit) ihres Termins aus Engine.amateurAnstoss, Blöcke chronologisch, Kopfzeile mit Zeitraum,
// schon VOR dem Spielen der Runde (Nutzer 29.10.2026: „in den Runden-Reitern sofort sichtbar“). Geprüft: Quali (Sa-Termin) und
// 2. Runde (Mi-Termin, Di–Do-Slots).
//   node .claude/skills/run/amateur_anstoss_check.mjs [port]      Screenshots nach docs/amateur-anstoss/
//   node .claude/skills/run/amateur_anstoss_check.mjs --selbsttest Spielzeilen im DOM umgedreht – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/amateur-anstoss/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const bloecke = page => page.evaluate(() => {
    const ri = App.amateurTab, r = Engine.amateurpokal.rounds[ri], aus = [], fehl = [];
    let tag = '', zeit = '';
    document.querySelectorAll('.pokal-matches > .pm-tag, .pokal-matches > .pm-zeit, .pokal-matches .pokal-match').forEach(el => {
        if (el.classList.contains('pm-tag')) { tag = el.textContent.trim(); return; }
        if (el.classList.contains('pm-zeit')) { zeit = el.textContent.trim().replace(' Uhr', ''); return; }
        const heim = el.querySelector('.pm-home span').textContent.trim();
        const i = r.matches.findIndex(m => (Engine.teams[m.hId] || GAME_DATA.teams[m.hId] || {}).name === heim), a = Engine.amateurAnstoss(ri, i);
        const sollTxt = a && a.datum ? `${Engine._DAY_LABEL[a.d]}, ${String(a.datum.getDate()).padStart(2, '0')}.${String(a.datum.getMonth() + 1).padStart(2, '0')}.|${a.t}` : '?';
        if (sollTxt !== tag + '|' + zeit) fehl.push(`${heim}: Block ${tag} ${zeit}, Termin ${sollTxt}`);
        aus.push({ sort: a ? Engine._slotSort(a.d, a.t) : 0, d: a && a.d });
    });
    const unsortiert = aus.filter((x, k) => k && x.sort < aus[k - 1].sort).length;
    return { n: aus.length, soll: r.matches.length, played: r.played, fehl, unsortiert, tage: [...new Set(aus.map(x => x.d))],
             status: document.querySelector('.pm-status')?.textContent || '', bloeckeTag: document.querySelectorAll('.pokal-matches > .pm-tag').length };
});
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    // bis die 2. Runde ausgelost, aber noch nicht gespielt ist (Quali + 1. Runde gespielt)
    await page.evaluate(() => { let g = 0; while (!(Engine.amateurpokal && Engine.amateurpokal.rounds[2].matches.length) && g++ < 60) Engine.playNextMatchday(); });
    await page.evaluate(() => App.showAmateurpokal());
    for (const [ri, art, tage] of [[0, 'Sa', ['Fr', 'Sa', 'So', 'Mo']], [2, 'Mi', ['Di', 'Mi', 'Do']]]) {
        // Reiter anklicken wie der Nutzer
        const name = await page.evaluate(ri => Engine.amateurpokal.rounds[ri].name, ri);
        await page.locator('.pokal-tab-btn', { hasText: name }).first().click();
        await page.waitForTimeout(400);
        if (SELBST) await page.evaluate(() => { const c = document.querySelector('.pokal-matches'); const z = [...c.querySelectorAll('.pokal-match')]; z.reverse().forEach(x => c.appendChild(x.closest('.pm-wrap') || x)); });
        const b = await bloecke(page);
        soll(b.n === b.soll && b.n > 0, `${geraet} ${name}: ${b.n}/${b.soll} Partien in der Ansicht`);
        soll(!b.fehl.length, `${geraet} ${name}: ${b.fehl.length} Partien im falschen Block, z. B. ${b.fehl[0]}`);
        soll(!b.unsortiert, `${geraet} ${name}: ${b.unsortiert} Partien nicht chronologisch`);
        soll(b.bloeckeTag >= 2, `${geraet} ${name}: nur ${b.bloeckeTag} Tagesblock`);
        soll(b.tage.every(t => tage.includes(t)), `${geraet} ${name} (${art}-Termin): Tage ${b.tage.join(',')}`);
        soll(/\d\d\.\d\d\./.test(b.status), `${geraet} ${name}: Kopfzeile ohne Zeitraum (${b.status})`);
        if (ri === 2) soll(!b.played, `${geraet} ${name}: Runde war schon gespielt – „sofort sichtbar“ nicht geprüft`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-${ri === 0 ? 'quali' : 'runde2'}.png`, fullPage: false });
    }
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 4).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
