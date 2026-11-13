// DFB-Teilnehmerfeld (Handy) mit Häkchen aus und an → docs/pokal-ansicht/bau-dfb-feld-aus.png / -an.png
//   node .claude/skills/run/dfb_feld_bild.mjs [port] [saisons]
import { chromium } from 'playwright';
const args = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const PORT = args[0] || 3334, SAISONS = +(args[1] || 2);
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
await p.evaluate(n => { Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false; }, SAISONS);
await p.evaluate(() => App.nextStep());
await p.evaluate(() => { App.showPokal(); App.switchPokalTab(-1); const s = document.getElementById('save-bar'); if (s) s.style.display = 'none'; });
await p.waitForTimeout(300);
const gequetscht = () => p.evaluate(() => [...document.querySelectorAll('.pokal-teiln span[onclick^="App.showSteckbrief"]')].filter(s => s.scrollWidth > s.clientWidth + 1 && s.clientWidth < 60).length);
console.log('aus: stark gekürzte Namen', await gequetscht());
await p.screenshot({ path: 'docs/pokal-ansicht/bau-dfb-feld-aus.png' });
await p.click('#content input[type=checkbox]'); await p.waitForTimeout(200);
await p.evaluate(() => { const s = document.getElementById('save-bar'); if (s) s.style.display = 'none'; });
console.log('an: stark gekürzte Namen', await gequetscht());
await p.screenshot({ path: 'docs/pokal-ansicht/bau-dfb-feld-an.png' });
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
