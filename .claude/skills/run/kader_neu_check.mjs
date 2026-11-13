// Neue ligalose Vereine (tools/kader_neu.json, FIXES_OFFEN „Vereinsbestand“) im Browser, template.html, Desktop + Handy:
// stehen im Amateurpokal, Steckbrief öffnet, historische ID trägt ihre Geschichte mit (Röchling Völklingen: Ligazugehörigkeit vor 2025).
//   node .claude/skills/run/kader_neu_check.mjs [port]       Screenshots nach docs/kader-neu/
//   node .claude/skills/run/kader_neu_check.mjs --selbsttest  Röchling vor dem Rendern entfernt – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/kader-neu/';
fs.mkdirSync(OUT, { recursive: true });
const NEU = JSON.parse(fs.readFileSync('tools/kader_neu.json', 'utf8')).vereine;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { delete Engine.teams.hist_svroechlingvoelklingen; delete GAME_DATA.teams.hist_svroechlingvoelklingen; });
    // 1) Amateurpokal: alle neuen Vereine stehen im Teilnehmerfeld (ligalos = Amateurpokal)
    const ap = await page.evaluate(() => { App.showAmateurpokal(); return document.getElementById('content')?.textContent || ''; });
    const fehlt = NEU.filter(v => !ap.includes(v.name)).map(v => v.name);
    soll(!fehlt.length, `${geraet} Amateurpokal ohne: ${fehlt.join(', ')}`);
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Amateurpokal breiter als der Bildschirm`);
    await page.screenshot({ path: `${OUT}${geraet}-amateurpokal.png` });
    // 2) Steckbrief Röchling: öffnet, Ligazugehörigkeit enthält die Historie (Oberliga/Regionalliga vor dem Sim-Start)
    await page.evaluate(() => App.showSteckbrief('hist_svroechlingvoelklingen'));
    await page.waitForTimeout(1500);
    const sb = await page.evaluate(() => document.querySelector('.modal-content')?.textContent.replace(/\s+/g, ' ') || '');
    soll(/SV Röchling Völklingen/.test(sb), `${geraet} Steckbrief Röchling öffnet nicht`);
    soll(/LIGAZUGEHÖRIGKEIT · \d+ Saison/.test(sb) && /Regionalliga Südwest|Oberliga/.test(sb), `${geraet} Steckbrief Röchling ohne historische Ligazugehörigkeit (${sb.slice(0, 160)})`);
    await page.screenshot({ path: `${OUT}${geraet}-roechling.png` });
    // 3) Regionen ohne Excel-Eintrag (App._teamRegionen -> team.regions): Chips im Steckbrief, Vereinsliste der Region, Kartenfilter
    soll(/REGIONEN.*Saarland Süd-West/.test(sb) && !/REGIONEN –/.test(sb), `${geraet} Steckbrief Röchling ohne Regionen-Chips`);
    const liste = await page.evaluate(() => { App.showRegionClubs('Saarland Süd-West'); return document.querySelector('.modal-content')?.textContent || ''; });
    soll(/SV Röchling Völklingen/.test(liste) && /SV Geislautern/.test(liste), `${geraet} Vereinsliste Saarland Süd-West ohne Röchling/Geislautern`);
    if (geraet === 'desktop') {
        await page.evaluate(() => { document.getElementById('modal').style.display = 'none'; App.showMap(); });
        await page.waitForTimeout(3000);
        const mk = await page.evaluate(() => (App._mapMarkers || []).filter(m => ['hist_svroechlingvoelklingen', 'solingen03_1266', 'hist_fa_vflbochuma'].includes(m._teamId)).map(m => m._regions.length));
        soll(mk.length === 3 && mk.every(n => n > 0), `${geraet} Karte: neue Vereine ohne Punkt oder ohne Regionen für den Filter (${JSON.stringify(mk)})`);
    }
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
