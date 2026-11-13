// Pokalrekorde mit den historischen Spielen seit 1935 (app/pokal_hist.js _pokalHistRek, Nutzer 28.10.2026), template.html:
// Reiter „Rekorde“ im DFB-Pokal + Vereinsrekorde (Bayern, Knielingen ohne Spiel-Verein), Desktop + Handy.
//   node .claude/skills/run/pokal_rek_check.mjs [port]       Screenshots nach docs/pokal-rekorde/
//   node .claude/skills/run/pokal_rek_check.mjs --selbsttest  POKAL_HIST vor dem Rendern geleert – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/pokal-rekorde/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { POKAL_HIST.saisons.length = 0; App._phRek = null; });
    const zeilen = sel => page.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' ¦ '), sel);
    const breit = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    // 1) Reiter Rekorde: 17:0 Stuttgarter Kickers 1941, 609 Tore 1980/81, 15 Elfmeterschießen 2016/17
    await page.evaluate(() => { App._navSaisonSetzen(null, '1'); App.pokalHistY = null; App.pokalTab = -5; App.showPokal(); });
    const tab = await zeilen('#content');
    console.log(`${geraet} Rekorde: ${tab.slice(0, 400)}`);
    soll(/Höchster Sieg\s*.*1941.*Stuttgarter Kickers.*VfB (05 )?Knielingen.*17:0/.test(tab), `${geraet} Höchster Sieg nicht 17:0 Stuttgarter Kickers 1941`);
    soll(/Torreichste Pokalsaison.*1980\/81.*609 Tore/.test(tab), `${geraet} torreichste Saison nicht 609 (1980/81)`);
    soll(/Elfmeterschießen.*2016\/17.*15/.test(tab), `${geraet} Elfmeterschießen nicht 15 (2016/17)`);
    soll(/Titel in Folge.*bis 1941.*Dresdner SC.*2/.test(tab), `${geraet} Titel in Folge nicht 2 (Dresdner SC bis 1941)`);
    soll(!/hist_/.test(tab),`${geraet} Rekorde zeigen eine rohe ID`);
    if ((await breit()) > 1) befund.push(`${geraet} Rekorde: Seite breiter als der Bildschirm`);
    await page.screenshot({ path: `${OUT}${geraet}-rekorde.png` });
    // Mischung: ein Sim-Rekord schlägt die Historie nur mit echt besserem Wert (17:0 gleich → bleibt 1941, 18:0 → gewinnt)
    const misch = await page.evaluate(() => {
        const R = Engine.archive.records || (Engine.archive.records = { t: {}, l: {} }), P = R.p || (R.p = {}), alt = P.hs, out = [];
        for (const v of [17, 18]) { P.hs = [v, v, 0, '2030/31', 'fcbayernmuenchen_0', 'hsvhamburg_0']; App.showPokal();
            out.push((document.querySelector('#content').textContent.match(/Höchster Sieg\s*(\S+)/) || [])[1]); }
        if (alt) P.hs = alt; else delete P.hs; App.showPokal(); return out;
    });
    soll(misch[0] === '1941' && misch[1] === '2030/31', `${geraet} Mischung Sim/Historie falsch: ${misch}`);

    // 2) Vereinsrekorde Bayern: 16:1 Waldberg, 0:5 Gladbach, Sieger
    await page.evaluate(() => App.showTeamRecords('fcbayernmuenchen_0'));
    await page.waitForTimeout(200);
    const bay = await zeilen('.modal-content');
    console.log(`${geraet} Bayern: ${(bay.match(/POKAL.*$/) || [''])[0].slice(0, 400)}`);
    soll(/Höchster Sieg im Pokal.*1997\/98.*DJK Waldberg.*16:1/.test(bay), `${geraet} Bayern höchster Pokalsieg nicht 16:1 Waldberg`);
    soll(/Höchste Niederlage im Pokal.*2021\/22.*Mönchengladbach.*0:5/.test(bay), `${geraet} Bayern höchste Pokalniederlage nicht 0:5 Gladbach`);
    soll(/Weiteste DFB-Pokal-Runde.*🏆 Sieger/.test(bay), `${geraet} Bayern weiteste Runde nicht Sieger`);
    await page.screenshot({ path: `${OUT}${geraet}-bayern.png` });

    // 3) Ein Verein, den nur der historische Pokal kennt: Knielingen 0:17 (1941)
    const kn = await page.evaluate(() => { App.showTeamRecords('hist_fa_vfbknielingen'); return document.querySelector('.modal-content')?.textContent.replace(/\s+/g, ' ') || ''; });
    soll(/Höchste Niederlage im Pokal.*1941.*Stuttgarter Kickers.*0:17/.test(kn), `${geraet} Knielingen: 0:17 fehlt (${kn.slice(0, 160)})`);
    if ((await breit()) > 1) befund.push(`${geraet} Vereinsrekorde: Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
