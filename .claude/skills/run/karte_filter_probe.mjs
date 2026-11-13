// Welche Regionsnamen tragen die Kartenflächen (excelFilter)? Für die Übersetzung Regionalverband → Teilgebiete.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 1000, height: 780 } })).newPage();
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && App.showMap, null, { timeout: 90000 });
await p.evaluate(() => App.showMap()); await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(() => {
    const z = {}; Object.values(App._polyIndex || {}).forEach(poly => (poly?.excelFilter || []).forEach(f => z[f] = (z[f] || 0) + 1));
    const k = ['Regionalliga Südwest', 'Bayern', 'Baden-Württemberg', 'Hessen', 'Rheinland-Pfalz/Saar', 'Norddeutscher Fußball-Verband', 'Nordostdeutscher Fußballverband', 'Westdeutscher Fußballverband'];
    const sw = Object.values(App._polyIndex).filter(x => x?.excelFilter?.includes('Regionalliga Südwest')).length;
    const teile = Object.values(App._polyIndex).filter(x => ['Baden-Württemberg', 'Hessen', 'Rheinland-Pfalz/Saar'].some(t => x?.excelFilter?.includes(t))).length;
    return { anzahl: Object.fromEntries(k.map(x => [x, z[x] || 0])), sw, teile, beispiel: Object.values(App._polyIndex).find(x => x?.excelFilter)?.excelFilter };
})));
await browser.close();
