// Browser-Pruefung des Fenster-Verlaufs (app/nav_verlauf.js) gegen template.html – mit echten Klicks.
// Weg: Liga A -> Liga B -> Steckbrief -> anderer Steckbrief, dann ‹ im Modal, Schliessen, Browser-Zurueck,
// Zurueck am Ausgangszustand (App muss stehen bleiben), dann › bis zum Ende. Desktop + Handy.
// node .claude/skills/run/nav_check.mjs   -> Screenshots nach docs/nav-verlauf/ ; Exit 1 = Befund
// --selbsttest: navBack wird vorher stillgelegt – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/nav-verlauf');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof App !== 'undefined' && App.activeLeague && document.querySelectorAll('#league-list .league-item').length > 3, null, { timeout: 60000 });
    await warte(800);
    if (SELBST) await page.evaluate(() => { App.navBack = () => {}; });
    const mobil = !!ctxOpt.isMobile;
    const ist = () => page.evaluate(() => ({
        main: App.activeLeague,
        modal: getComputedStyle(document.getElementById('modal')).display !== 'none' ? document.getElementById('modal-title').innerText : null,
        idx: App._navIdx, len: App._navStack.length,
    }));
    const pruef = (was, ok, info) => { if (!ok) befunde.push(`${name}: ${was} ${info ? JSON.stringify(info) : ''}`); };
    const ligaKlick = async (n) => {
        if (mobil) { await page.click('#btn-menu'); await warte(400); }
        const items = page.locator('#league-list .league-item:not(.active)');
        await items.nth(n).click();
        await warte(700);
    };
    const s0 = await ist();
    await ligaKlick(2);
    const s1 = await ist();
    await ligaKlick(3);
    const s2 = await ist();
    pruef('Ligawechsel wird Station', s1.main !== s0.main && s2.main !== s1.main && s2.len === 3, { s0, s1, s2 });
    await page.locator('#content [onclick*="showSteckbrief"]').nth(0).click();
    await warte(900);
    const s3 = await ist();
    // zweiter Steckbrief: ueber den Rekorde-Link im Modal (anderes Fenster, gleicher Layer)
    const rek = page.locator('#modal-body [onclick*="showTeamRecords"]').first();
    let s4 = s3;
    if (await rek.count()) { await rek.click(); await warte(700); s4 = await ist(); }
    pruef('Steckbrief/Rekorde werden Stationen', s3.modal && s4.modal && s4.modal !== s3.modal && s4.len === 5, { s3, s4 });
    await page.screenshot({ path: path.join(SHOT, `${name}-modal.png`) });
    // ‹ im Modal -> Steckbrief
    await page.locator('#modal .nav-vz-back').click(); await warte(900);
    const b1 = await ist();
    pruef('‹ im Modal fuehrt zum Steckbrief', b1.modal === s3.modal && b1.main === s2.main, { b1, s3 });
    // Schliessen = zurueck zur Liga, Vorwaerts bleibt
    await page.locator('#modal .modal-header button.btn').click(); await warte(600);
    const b2 = await ist();
    pruef('Schliessen fuehrt zur Liga ohne Doppelgaenger', !b2.modal && b2.main === s2.main && b2.idx === 2 && b2.len === 5, b2);
    // Browser-/Android-Zurueck
    await page.goBack().catch(() => {}); await warte(900);
    const b3 = await ist();
    pruef('Zurueck-Geste fuehrt zur vorigen Liga', b3.main === s1.main && b3.idx === 1, b3);
    await page.goBack().catch(() => {}); await warte(900);
    await page.goBack().catch(() => {}); await warte(900);
    const b4 = await ist().catch(() => null);
    pruef('Am Ausgangszustand bleibt die App stehen', b4 && b4.main === s0.main && b4.idx === 0 && page.url().includes('template.html'), { b4, url: page.url() });
    const zurAus = await page.locator('header .nav-vz-back').isDisabled();
    pruef('‹ am Anfang ausgegraut', zurAus);
    await page.screenshot({ path: path.join(SHOT, `${name}-start.png`) });
    // › so weit es geht
    for (let i = 0; i < 6; i++) {
        const btn = (await ist()).modal ? page.locator('#modal .nav-vz-fwd') : page.locator('header .nav-vz-fwd');
        if (await btn.isDisabled()) break;
        await btn.click(); await warte(800);
    }
    const f = await ist();
    pruef('› laeuft bis zum Ende', f.idx === f.len - 1 && f.modal === s4.modal && f.main === s2.main, { f, s4 });
    // Saison-Blaettern zaehlt als Schritt (<< in der Kopfzeile), ‹ fuehrt Saison fuer Saison zurueck bis "laufend"
    await page.locator('#modal .modal-header button.btn').click(); await warte(600);
    const saisonIst = () => page.evaluate(() => ({ main: App.activeLeague, saison: App._navSaison(), idx: App._navIdx, len: App._navStack.length }));
    const z0 = await saisonIst();
    const zur = page.locator('header .controls button[title="Vorherige Saison"]');
    await zur.click(); await warte(1200);
    const z1 = await saisonIst();
    await zur.click(); await warte(1200);
    const z2 = await saisonIst();
    pruef('<< wird Station', z0.saison === null && z1.saison && z2.saison && z1.saison !== z2.saison && z2.len === z0.idx + 3 && z2.main === z0.main, { z0, z1, z2 });
    await page.locator('header .nav-vz-back').click(); await warte(1000);
    const z3 = await saisonIst();
    await page.locator('header .nav-vz-back').click(); await warte(1000);
    const z4 = await saisonIst();
    pruef('‹ blaettert Saison zurueck bis laufend', z3.saison === z1.saison && z4.saison === null && z4.main === z0.main, { z3, z4 });
    await page.locator('header .nav-vz-fwd').click(); await warte(1000);
    await page.locator('header .nav-vz-fwd').click(); await warte(1000);
    const z5 = await saisonIst();
    const titel = await page.locator('#season-info').innerText();
    pruef('› zurueck in die aeltere Saison, Kopfzeile folgt', z5.saison === z2.saison && titel.includes(z2.saison.slice(0, 4)), { z5, titel });
    // Simulieren darf keine Schritte erzeugen – auch nicht ueber den Saisonwechsel (laufend = null, nicht Jahr)
    await page.locator('header .nav-vz-back').click(); await warte(1000);
    await page.locator('header .nav-vz-back').click(); await warte(1000);
    const v0 = await saisonIst();
    page.on('dialog', d => d.accept());
    await page.click('#btn-play'); await warte(1500);
    await page.click('#btn-saison'); await page.waitForFunction(() => !Engine.isSimulating, null, { timeout: 120000 }).catch(() => {}); await warte(3000);
    await page.evaluate(() => { const m = document.getElementById('modal'); if (m) m.style.display = 'none'; });
    await warte(500);
    const v1 = await saisonIst();
    pruef('Simulieren erzeugt keine Schritte', v1.len === v0.len && v1.idx === v0.idx, { v0, v1 });
    // Pyramide: Jahr blaettern (◀) ist ein Schritt
    const pyrBtn = page.locator('#content button:has-text("Pyramide")').first();
    if (await pyrBtn.count()) {
        await pyrBtn.click(); await warte(1500);
        const p0 = await saisonIst();
        await page.locator('.pyr-jahr button').first().click(); await warte(1500);
        const p1 = await saisonIst();
        await page.locator('header .nav-vz-back').click(); await warte(1500);
        const p2 = await saisonIst();
        pruef('Pyramiden-Jahr wird Station', p0.main === '__pyramide__' && p1.saison && p1.saison !== p0.saison && p2.saison === p0.saison && p2.main === '__pyramide__', { p0, p1, p2 });
    } else pruef('Pyramiden-Knopf gefunden', false);
    await page.screenshot({ path: path.join(SHOT, `${name}-saison.png`) });
    pruef('keine JS-Fehler', !fehler.length, fehler.slice(0, 3));
    console.log(name, { s0: s0.main, s1: s1.main, s2: s2.main, s3: s3.modal, s4: s4.modal, ende: f });
    await ctx.close();
}

const sicher = async (n, o) => { try { await lauf(n, o); } catch (e) { befunde.push(`${n}: Ablauf abgebrochen – ${String(e).split(String.fromCharCode(10))[0]}`); } };
await sicher('desktop', { viewport: { width: 1400, height: 900 } });
await sicher('handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 });
await browser.close();
if (befunde.length) { console.log('BEFUND:\n' + befunde.join('\n')); process.exit(1); }
console.log('OK – Verlauf vor/zurueck in Liga, Modal, Geste; Screenshots in docs/nav-verlauf/');
