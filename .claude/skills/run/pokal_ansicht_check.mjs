// Prüfung des Baus Pokal-Ansicht + Kopfzeile + Seitenleisten-Griff (05.11.2026) – klickt statt nur zu suchen.
//   node .claude/skills/run/pokal_ansicht_check.mjs [port] [saisons] [wochen] → docs/pokal-ansicht/bau-*.png
import { chromium } from 'playwright';
const args = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const PORT = args[0] || 3334, SAISONS = +(args[1] || 15), WOCHEN = +(args[2] || 14), OUT = 'docs/pokal-ansicht/';
const browser = await chromium.launch();
const fehler = [], ergebnis = [];
const ok = (name, bed, info = '') => { ergebnis.push(`${bed ? 'OK  ' : 'FEHL'} ${name}${info ? ' – ' + info : ''}`); };
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 });
const page = await ctx.newPage();
page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
await page.evaluate(n => { Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false; }, SAISONS);
for (let i = 0; i < WOCHEN; i++) await page.evaluate(() => App.nextStep());
await page.waitForTimeout(300);
const ohneBar = () => page.evaluate(() => { const s = document.getElementById('save-bar'); if (s) s.style.display = 'none'; });

// 1 Kopfzeile: längster Liganame, Datum ganz?
const kopf = await page.evaluate(() => {
    const l = Object.values(Engine.leagues).sort((a, b) => b.name.length - a.name.length)[0];
    App.loadLeague(l.id);
    const c = document.getElementById('kal-chip'), b = c.querySelector('b'), sp = document.querySelector('#league-title .lt-name');
    return { liga: l.name, titel: sp.textContent, chipSichtbar: c.style.display !== 'none', datumGanz: b ? b.scrollWidth <= b.clientWidth + 1 : null, datum: b && b.textContent, eng: c.className };
});
ok('Kopf: Datum ganz sichtbar', !kopf.chipSichtbar || kopf.datumGanz, JSON.stringify(kopf));
await ohneBar(); await page.screenshot({ path: OUT + 'bau-kopf-lang.png', clip: { x: 0, y: 0, width: 412, height: 120 } });

// 2 DFB: Häkchen aus → an → Pills, Reiter Stand, Wiedereintritt setzt Häkchen zurück
await page.evaluate(() => { App.showPokal(); App.switchPokalTab(-1); });
let d = await page.evaluate(() => ({ haken: !!document.querySelector('#content input[type=checkbox]'), an: document.querySelector('#content input[type=checkbox]')?.checked, pills: document.body.innerHTML.includes('● ') }));
ok('DFB Feld: Häkchen da und aus', d.haken && !d.an);
await page.click('#content input[type=checkbox]'); await page.waitForTimeout(200);
d = await page.evaluate(() => ({ an: document.querySelector('#content input[type=checkbox]')?.checked, pills: [...document.querySelectorAll('.pokal-teiln span')].filter(s => /^(● |Aus |Sieger)/.test(s.textContent)).length }));
ok('DFB Feld: Klick aufs Häkchen zeigt Stand', d.an && d.pills >= 60, 'Marken ' + d.pills);
await ohneBar(); await page.screenshot({ path: OUT + 'bau-dfb-feld-an.png' });
await page.evaluate(() => App.loadLeague('1')); await page.evaluate(() => App.showPokal());
await page.evaluate(() => App.switchPokalTab(-1));
d = await page.evaluate(() => document.querySelector('#content input[type=checkbox]')?.checked);
ok('DFB: nach erneutem Öffnen Häkchen wieder aus', d === false);
const standBtn = page.locator('.pokal-tab-btn', { hasText: /^Stand$/ });
ok('DFB: Reiter Stand vorhanden', await standBtn.count() === 1);
await standBtn.click(); await page.waitForTimeout(200);
d = await page.evaluate(() => ({ trichter: document.body.innerText.includes('WER KOMMT WIE WEIT'), gruppen: (document.body.innerText.match(/NOCH DABEI|AUS ·/g) || []).length, tab: App.pokalTab }));
ok('DFB: Reiter Stand zeigt Trichter + Gruppen', d.trichter && d.gruppen > 0 && d.tab === -6, JSON.stringify(d));
await ohneBar(); await page.screenshot({ path: OUT + 'bau-dfb-stand.png' });

// 3 Amateurpokal: Optionen klicken
await page.evaluate(() => { App.showAmateurpokal(); App.switchAmateurTab(-1); });
const amaN = () => page.evaluate(() => document.querySelectorAll('#content span[onclick^="App.showSteckbrief"]').length);
const nAlle = await amaN();
d = await page.evaluate(() => ({ noch: [...document.querySelectorAll('#content button')].some(b => /Noch dabei/.test(b.textContent)), runde: [...document.querySelectorAll('#content button')].some(b => b.textContent === 'Runde') }));
ok('Ama: ohne Häkchen kein „Noch dabei“/„Runde“', !d.noch && !d.runde);
await page.locator('#content button', { hasText: 'Absteiger' }).click(); await page.waitForTimeout(150);
const nAb = await amaN();
ok('Ama: Filter Absteiger wirkt', nAb > 0 && nAb < nAlle, `${nAb} von ${nAlle}`);
await page.locator('#content button', { hasText: /^Alle/ }).click();
await page.locator('#content button', { hasText: 'Landesverband' }).click(); await page.waitForTimeout(150);
d = await page.evaluate(() => App._amaFeld.gruppe);
ok('Ama: Gruppe Landesverband', d === 'lv');
await ohneBar(); await page.screenshot({ path: OUT + 'bau-ama-feld-aus.png' });
await page.locator('#content button', { hasText: /^Name$/ }).click(); await page.waitForTimeout(150);
await page.locator('#content button', { hasText: /^keine$/ }).click(); await page.waitForTimeout(150);
d = await page.evaluate(() => { const n = [...document.querySelectorAll('#content span[onclick^="App.showSteckbrief"]')].map(s => s.textContent); return n.slice(0, 5).every((x, i, a) => i === 0 || a[i - 1].localeCompare(x, 'de') <= 0); });
ok('Ama: Sortierung Name, keine Gruppe', d);
await page.click('#content input[type=checkbox]'); await page.waitForTimeout(150);
await page.locator('#content button', { hasText: /Noch dabei/ }).click(); await page.waitForTimeout(150);
const nDrin = await amaN();
ok('Ama: Häkchen + „Noch dabei“ filtert', nDrin > 0 && nDrin < nAlle, `${nDrin} von ${nAlle}`);
await page.locator('#content button', { hasText: /^Runde$/ }).click(); await page.locator('#content button', { hasText: 'Regionalverband' }).click(); await page.waitForTimeout(150);
await ohneBar(); await page.screenshot({ path: OUT + 'bau-ama-feld-an.png' });
await page.locator('#content summary').click(); await page.waitForTimeout(100);
d = await page.evaluate(() => document.querySelector('#content details')?.open && document.querySelector('#content details').innerText);
ok('Ama: Quali-Regel aufklappbar', !!d, d && d.replace(/\s+/g, ' ').slice(0, 160));
await page.locator('.pokal-tab-btn', { hasText: /^Stand$/ }).click(); await page.waitForTimeout(200);
d = await page.evaluate(() => ({ t: document.body.innerText.includes('WER KOMMT WIE WEIT'), tab: App.amateurTab }));
ok('Ama: Reiter Stand', d.t && d.tab === -7);
await ohneBar(); await page.screenshot({ path: OUT + 'bau-ama-stand.png' });
await page.evaluate(() => App.loadLeague('1')); await page.evaluate(() => { App.showAmateurpokal(); App.switchAmateurTab(-1); });
d = await page.evaluate(() => ({ an: document.querySelector('#content input[type=checkbox]')?.checked, noch: [...document.querySelectorAll('#content button')].some(b => /Noch dabei/.test(b.textContent)) }));
ok('Ama: nach erneutem Öffnen Häkchen aus, Filter zurück', d.an === false && !d.noch);

// 4 Steckbrief: Verein mit vielen Pokal-Saisons
const sid = await page.evaluate(() => {
    const z = {};
    (Engine.history || []).concat([{ pokal: Engine.pokal, amateurpokal: Engine.amateurpokal }]).forEach(h => ['pokal', 'amateurpokal'].forEach(k => {
        const P = h[k]; if (!P || !P.rounds) return; const s = new Set(); P.rounds.forEach(r => (r.matches || []).forEach(m => { s.add(m.hId); s.add(m.aId); })); s.forEach(id => z[id] = (z[id] || 0) + 1);
    }));
    const fr = {}; (Engine.friendlies || []).forEach(f => [f.hId, f.aId].forEach(id => fr[id] = (fr[id] || 0) + 1));
    return Object.keys(z).sort((a, b) => (z[b] + (fr[b] || 0) / 50) - (z[a] + (fr[a] || 0) / 50))[0];
});
await page.evaluate(id => App.showSteckbrief(id), sid); await page.waitForTimeout(500);
d = await page.evaluate(() => ({ rows: document.querySelectorAll('#sb-pokal-list > div[onclick]').length, nav: document.querySelectorAll('#sb-pokal-nav button').length, alt: document.body.innerText.includes('DFB-POKAL-VERLAUF'), erste: document.querySelector('#sb-pokal-list > div[onclick]')?.innerText.replace(/\s+/g, ' ') }));
ok('Steckbrief: Liste mit Seiten', d.rows === 12 && d.nav >= 2 && !d.alt, JSON.stringify(d));
const erste1 = d.erste;
if (d.nav >= 2) { await page.locator('#sb-pokal-nav button').nth(1).click(); await page.waitForTimeout(100); }
d = await page.evaluate(() => document.querySelector('#sb-pokal-list > div[onclick]')?.innerText.replace(/\s+/g, ' '));
ok('Steckbrief: Seite 2 wechselt den Inhalt', d && d !== erste1, d);
await page.locator('#sb-pokal-nav button').nth(0).click();
await page.locator('#sb-pokal-list > div[onclick]').nth(0).click(); await page.waitForTimeout(100);
d = await page.evaluate(() => { const z = document.querySelector('#sb-pokal-list > div[onclick]'); return z.nextElementSibling.style.display !== 'none' && z.nextElementSibling.innerText.replace(/\s+/g, ' '); });
ok('Steckbrief: Zeile klappt Spiele auf', !!d, d);
d = await page.evaluate(() => { const t = [...document.querySelectorAll('#modal-body div')].find(x => x.firstElementChild && x.firstElementChild.textContent.trim() === 'TESTSPIELE'); return t ? { h: Math.round(t.getBoundingClientRect().height), aelter: !!t.querySelector('details') } : null; });
ok('Steckbrief: Testspiele kompakt', !d || d.h < 260, JSON.stringify(d));
await page.evaluate(() => { const z = document.getElementById('sb-pokal-list'); z && z.parentElement.scrollIntoView({ block: 'start' }); });
await page.waitForTimeout(200); await page.screenshot({ path: OUT + 'bau-steckbrief.png' });
await page.evaluate(() => App.closeModal && App.closeModal());

// 5 Desktop: Griff außerhalb der Seitenleiste, Scrollbalken-Rand frei
const desk = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
desk.on('pageerror', e => fehler.push('Desktop: ' + e.message));
await desk.goto(`http://localhost:${PORT}/template.html`);
await desk.waitForFunction(() => typeof Engine !== 'undefined' && document.getElementById('sidebar'), null, { timeout: 90000 });
await desk.waitForTimeout(800);
d = await desk.evaluate(() => {
    const sb = document.getElementById('sidebar').getBoundingClientRect(), rz = document.getElementById('sidebar-resizer').getBoundingClientRect();
    const y = sb.top + sb.height * 0.6, el = document.elementFromPoint(sb.right - 4, y);
    return { sbRechts: Math.round(sb.right), griffLinks: Math.round(rz.left), innenTrifft: el && (el.id || el.className), aussen: document.elementFromPoint(sb.right + 4, y)?.id };
});
ok('Desktop: Griff außerhalb, Rand der Leiste frei', d.griffLinks >= d.sbRechts - 1 && d.innenTrifft !== 'sidebar-resizer' && d.aussen === 'sidebar-resizer', JSON.stringify(d));
// Ziehen funktioniert noch
const w0 = await desk.evaluate(() => document.getElementById('sidebar').offsetWidth);
const rz = await desk.locator('#sidebar-resizer').boundingBox();
await desk.mouse.move(rz.x + 4, rz.y + 300); await desk.mouse.down(); await desk.mouse.move(rz.x + 64, rz.y + 300, { steps: 5 }); await desk.mouse.up();
const w1 = await desk.evaluate(() => document.getElementById('sidebar').offsetWidth);
ok('Desktop: Griff zieht die Breite', w1 > w0 + 30, `${w0} → ${w1}`);
await desk.evaluate(w => { document.getElementById('sidebar').style.width = w + 'px'; localStorage.setItem('ba_sidebar_w', w); }, w0);
// Mobil: Griff liegt bei zugeklappter Leiste nicht am Bildschirmrand
d = await page.evaluate(() => document.elementFromPoint(3, 500)?.id);
ok('Mobil: kein Griff am linken Bildschirmrand', d !== 'sidebar-resizer', d);

console.log(ergebnis.join('\n'));
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
