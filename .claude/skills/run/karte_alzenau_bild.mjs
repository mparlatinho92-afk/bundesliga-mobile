// Bild der Karte um Alzenau (Sheet 07.11.2026: nur Gemarkung Alzenau hessisch) → docs/karte-alzenau/
import { chromium } from 'playwright';
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 1000, height: 780 } })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && App.showMap, null, { timeout: 90000 });
await p.evaluate(() => App.showMap()); await p.waitForTimeout(2500);
await p.evaluate(() => { App._mapObj.setView([50.085, 9.08], 12); }); await p.waitForTimeout(3500);
await p.screenshot({ path: 'docs/karte-alzenau/alzenau-z12.png' });
await p.evaluate(() => { App._mapObj.setView([50.1, 9.05], 10); }); await p.waitForTimeout(3000);
await p.screenshot({ path: 'docs/karte-alzenau/alzenau-z10.png' });
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
