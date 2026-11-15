// Meister-Pokal mit Zusatz (Nutzer 15.11.2026): ✓ Aufstieg sicher, ↕ Aufstiegsspiel, ✗ kein Aufstieg – wahlweise ausgegraut
// (··· → ⚙️ Einstellungen). Prüft: (1) laufende Saison – ein Meister mit sicherem Aufstieg trägt 🏆 + ✓ an der Platzzahl;
// (2) Einstellungen-Dialog: zwei Optionen, Umschalten ändert die Darstellung von „kein Aufstieg“ (✗ ↔ ausgegraut) und bleibt
// gespeichert; (3) Vorsaison im Liga-Fenster: Meister einer tieferen Liga zeigt den TATSÄCHLICHEN Ausgang (✓ = in der Folgesaison
// höher, sonst ✗). Desktop + Handy, Bilder docs/steht-fest/meister_*.png
//   node .claude/skills/run/meister_pokal_check.mjs [--selbsttest]
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const URL = `http://localhost:3334/${SELBST ? 'index.html' : 'template.html'}`;
const b = await chromium.launch(), befund = [];
const ok = (n, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${n}: ${txt}`); if (!bed) befund.push(n + ': ' + txt); };
for (const [name, opt] of [['Desktop', { viewport: { width: 1300, height: 900 } }], ['Handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const page = await (await b.newContext(opt)).newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 1000, null, { timeout: 90000 });
    // (1) laufende Saison bis kurz vor Schluss; eine Liga mit meister_auf suchen
    const r1 = await page.evaluate(() => {
        if (typeof Engine.stehtFest !== 'function') return { fehlt: true };
        const L = Engine.kalender.liga['2']; while (Engine.currentMatchday < L[L.length - 2]) Engine.playNextMatchday();
        const z = Engine.calcZones();
        const lid = Object.keys(Engine.leagues).find(l => Engine.leagues[l].level >= 2 && Object.values(Engine.stehtFest(l, null, z)).includes('meister_auf'));
        if (!lid) return { lid: null };
        App.zonesCache = null; App.matchdayViewIdx = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague(lid);
        const f = document.querySelector('#content td:first-child .fest');
        return { lid, name: Engine.leagues[lid].name, html: f ? f.outerHTML : '' };
    });
    if (r1.fehlt) { ok(name, false, 'Engine.stehtFest fehlt'); continue; }
    ok(`${name} laufend ✓`, !!r1.lid && /mk-ok/.test(r1.html || '') && /🏆/.test(r1.html), `${r1.name || 'keine Liga'}: ${(r1.html || '').replace(/<[^>]+>/g, '') || '(kein Kennzeichen)'}`);
    await page.screenshot({ path: `docs/steht-fest/meister_laufend_${name}.png` });
    // (2) Einstellungen
    const r2 = await page.evaluate(() => {
        if (!App.showEinstellungen) return { fehlt: true };
        App.showEinstellungen();
        const n = document.querySelectorAll('#modal-body input[name="mstil"]').length;
        App._meisterGrauSetzen(false); const x = App._festHtml('meister_nein');
        App._meisterGrauSetzen(true); const g = App._festHtml('meister_nein');
        const gespeichert = localStorage.getItem('ba_meister_stil');
        return { n, x, g, gespeichert };
    });
    if (r2.fehlt) ok(`${name} Einstellungen`, false, 'fehlt');
    else {
        ok(`${name} Einstellungen`, r2.n === 2, `${r2.n} Optionen`);
        ok(`${name} ✗ / ausgegraut`, /mk-no/.test(r2.x) && !/mk-no/.test(r2.g) && /fest-mg/.test(r2.g) && r2.gespeichert === 'grau', `rot: ${/mk-no/.test(r2.x)}, grau: ${/fest-mg/.test(r2.g)}, gespeichert ${r2.gespeichert}`);
        await page.screenshot({ path: `docs/steht-fest/meister_einstellungen_${name}.png` });
        await page.evaluate(() => { App._meisterGrauSetzen(false); document.getElementById('modal').style.display = 'none'; });
    }
    // (3) Vorsaison: Saison fertig + Wechsel, dann eine Liga der Ebene ≥ 5 in der Vorsaison ansehen
    const r3 = await page.evaluate(() => {
        Engine.simulateFullSeason(); Engine.processSeasonTransition();
        const idx = Engine.history.length - 1, H = Engine.history[idx];
        const fall = [];
        for (const lid of Object.keys(Engine.leagues)) {
            if (Engine.leagues[lid].level < 5) continue;
            const champ = Object.values(H.teams).find(t => t.leagueId === lid && t.rank === 1);
            if (!champ) continue;
            const jetzt = Engine.teams[champ.id], jl = jetzt && jetzt.leagueId ? Engine.leagues[jetzt.leagueId].level : 99;
            App.viewHistoryOffset = idx; App.matchdayViewIdx = null; App.tableView = 'gesamt'; App.loadLeague(lid);
            const f = document.querySelector('#content td:first-child .fest');
            fall.push({ lid, auf: jl < Engine.leagues[lid].level, html: f ? f.className + '|' + f.innerHTML : '' });
            if (fall.length >= 6) break;
        }
        return fall;
    });
    const falsch = r3.filter(x => !(x.auf ? /mk-ok/.test(x.html) : /mk-no|fest-mg/.test(x.html)));
    ok(`${name} Vorsaison`, r3.length >= 3 && !falsch.length, `${r3.length} Meister geprüft, ${r3.filter(x => x.auf).length} aufgestiegen, falsch: ${falsch.map(x => x.lid + ' ' + (x.html || 'kein Kennzeichen')).join(' / ') || '–'}`);
    await page.screenshot({ path: `docs/steht-fest/meister_vorsaison_${name}.png` });
    if (fehler.length) ok(`${name} JS-Fehler`, false, [...new Set(fehler)].join(' / '));
}
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? `BEFUND (${befund.length})` : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
