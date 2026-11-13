// Karte: Antippen des Regionalverband-Chips im Karten-Steckbrief wählt die Teilflächen und listet deren Vereine.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 1000, height: 780 } })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && App.showMap, null, { timeout: 90000 });
await p.evaluate(() => App.showMap()); await p.waitForTimeout(2500);
for (const [lv, soll] of [['Württemberg', ['Bayern', 'Baden-Württemberg', 'Hessen']], ['Saarland', ['Rheinland-Pfalz/Saar']], ['Westfalen', ['Westdeutscher Fußballverband']]]) {
    const r = await p.evaluate(lv => {
        const t = Object.values(GAME_DATA.teams).find(x => Engine._verbandOf(x) === lv);
        App._mapOpenSteckbrief(t.id);
        const chip = document.querySelector('#sb-regionen span');
        const logo = !!chip.querySelector('img');
        chip.click();
        const gewaehlt = [...(App._selectedPolyIds || [])].map(id => (App._polyIndex[id].excelFilter || [])[0]);
        const fremd = [...App._mapVisiblePolyIds()].map(id => (App._polyIndex[id].excelFilter || [])[0]).filter(n => ['Regionalliga Südwest', 'Hessen', 'Baden-Württemberg', 'Bayern', 'Rheinland-Pfalz/Saar'].includes(n) && !gewaehlt.includes(n));
        const n = document.querySelectorAll('#mcl-body [onclick]').length, soll = Object.values(GAME_DATA.teams).filter(x => App._regionalverband(x) === chip.textContent && (document.getElementById('map-chk-res')?.checked || !x.isReserve)).length;
        App._mapCloseClubList && App._mapCloseClubList();
        App._mapDrawAll && App._mapDrawAll();
        const feld = document.getElementById("map-region-search").value;
        return { chip: chip.textContent, logo, gewaehlt, fremd, feld, n, soll };
    }, lv);
    const ok = r.logo && soll.every(s => r.gewaehlt.includes(s)) && r.gewaehlt.length === soll.length && r.n > 0 && r.n === r.soll && r.fremd.length === 0 && r.feld === r.chip;
    console.log(`${ok ? 'OK  ' : 'FEHL'} ${lv}: ${JSON.stringify(r)}`);
    await p.waitForTimeout(600); await p.screenshot({ path: 'docs/pokal-ansicht/karte-rv-' + lv.toLowerCase().replace(/[^a-z]/g, '') + '.png' });
}
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
