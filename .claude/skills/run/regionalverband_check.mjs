// Regionalverbände (Nutzerbefund 06.11.2026): Steckbrief-Chips, Vereinsliste je Region, Amateurpokal-Gruppen.
//   node .claude/skills/run/regionalverband_check.mjs [port] → docs/pokal-ansicht/bau-regionalverband-*.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 3334;
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
const ok = (b, n, i = '') => console.log(`${b ? 'OK  ' : 'FEHL'} ${n}${i ? ' – ' + i : ''}`);
// Soll je Landesverband
const SOLL = { Württemberg: 'Süddeutscher', Hessen: 'Süddeutscher', Bayern: 'Süddeutscher', Baden: 'Süddeutscher', Südbaden: 'Süddeutscher',
    Rheinland: 'Regional-Verband Südwest', Saarland: 'Regional-Verband Südwest', Südwest: 'Regional-Verband Südwest',
    Niedersachsen: 'Norddeutscher', Sachsen: 'Nordostdeutscher', Westfalen: 'Westdeutscher' };
for (const [lv, soll] of Object.entries(SOLL)) {
    const r = await p.evaluate(lv => {
        const t = Object.values(GAME_DATA.teams).find(x => Engine._verbandOf(x) === lv);
        App.showSteckbrief(t.id);
        const chips = [...document.querySelectorAll('#modal-body span[onclick^="App.showRegionClubs"]')].map(s => s.textContent);
        return { verein: t.name, chips };
    }, lv);
    ok(r.chips[0] && r.chips[0].includes(soll) && !r.chips.includes('Regionalliga Südwest'), `${lv}: erster Chip`, `${r.verein}: ${r.chips.join(' › ')}`);
    if (lv === 'Württemberg') await p.screenshot({ path: 'docs/pokal-ansicht/bau-regionalverband-steckbrief.png' });
}
// Antippen des Verband-Chips listet alle Vereine dieses Verbands
const liste = await p.evaluate(() => {
    const t = Object.values(GAME_DATA.teams).find(x => Engine._verbandOf(x) === 'Hessen');
    App.showSteckbrief(t.id);
    document.querySelector('#modal-body span[onclick^="App.showRegionClubs"]').click();
    const n = document.querySelectorAll('#modal-body [onclick^="App.showSteckbrief"]').length;
    const soll = Object.values(GAME_DATA.teams).filter(x => App._regionalverband(x) === 'Süddeutscher Fußball-Verband').length;
    return { n, soll };
});
ok(liste.n === liste.soll && liste.n > 0, 'Chip „Süddeutscher Fußball-Verband“ listet alle SFV-Vereine', JSON.stringify(liste));
await p.evaluate(() => App.closeModal && App.closeModal());
// Amateurpokal: Gruppe Regionalverband
await p.evaluate(() => { App.showAmateurpokal(); App.switchAmateurTab(-1); App._amaFeldSet('gruppe', 'rv'); });
await p.waitForTimeout(300);
const kopf = await p.evaluate(() => [...document.querySelectorAll('#content div')].filter(d => /^[A-ZÄÖÜa-zäöüß -]+\s\(\d+\)$/.test(d.textContent.trim()) && d.style.letterSpacing).map(d => d.textContent.trim()));
ok(kopf.length >= 4 && !kopf.some(k => /Regionalliga/.test(k)), 'Amateurpokal-Gruppen', kopf.join(' | '));
await p.evaluate(() => { const s = document.getElementById('save-bar'); if (s) s.style.display = 'none'; });
await p.screenshot({ path: 'docs/pokal-ansicht/bau-regionalverband-ama.png' });
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
