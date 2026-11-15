// Schritt 3 (Nutzer 14.11.2026): „steht fest“-Kennzeichen in der Tabelle (gefülltes Kästchen an der Platzzahl, anders als die
// Vorjahres-Kürzel „(M, N ↑)“ hinter dem Namen) und Schlagzeile an dem Spieltag, an dem es feststand. Spielt Spieltag für Spieltag,
// bis in einer Liga etwas NEU feststeht (Engine.stehtFest), prüft dann Tabelle, Zeile unter den Ergebnissen und einen vergangenen
// Spieltag (Kennzeichen erst ab dem Tag). Desktop + Handy, Bilder docs/steht-fest/.
//   node .claude/skills/run/steht_fest_ui_check.mjs              gegen template.html
//   node .claude/skills/run/steht_fest_ui_check.mjs --selbsttest gegen index.html – muss durchfallen
import { chromium } from 'playwright';
import * as fs from 'node:fs';
fs.mkdirSync('docs/steht-fest', { recursive: true });
const SELBST = process.argv.includes('--selbsttest');
const URL = `http://localhost:3334/${SELBST ? 'index.html' : 'template.html'}`;
const b = await chromium.launch(), befund = [];
const ok = (n, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${n}: ${txt}`); if (!bed) befund.push(n + ': ' + txt); };
for (const [name, opt] of [['Desktop', { viewport: { width: 1300, height: 900 } }], ['Handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const page = await (await b.newContext(opt)).newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 1000, null, { timeout: 90000 });
    // Bundesliga: spielen, bis an ihrem letzten Spieltag etwas neu feststeht (spätestens Saisonende)
    const r = await page.evaluate(() => {
        if (typeof Engine.stehtFest !== 'function') return { fehlt: true };
        const K = Engine.kalender, L = K.liga['1'];
        const lmd = () => L.filter(x => x <= Engine.currentMatchday).length;
        let neu = {}, md = 0;
        while (Engine.currentMatchday < Engine.totalMatchdays) {
            Engine.playNextMatchday();
            const m = lmd();
            if (m === md || m < 2) continue;
            md = m;
            const z = Engine.calcZones(), j = Engine.stehtFest('1', md, z), v = Engine.stehtFest('1', md - 1, z);
            neu = Object.fromEntries(Object.entries(j).filter(([id, a]) => v[id] !== a));
            if (Object.keys(neu).length && Engine.ligaMd('1') === md && L.includes(Engine.currentMatchday)) break;
        }
        App.zonesCache = null; App.matchdayViewIdx = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.resultsCollapsed = false;
        App.loadLeague('1');
        const [id, art] = Object.entries(neu)[0] || [];
        return { md, id, art, name: id && Engine.teams[id].name, alle: Engine.stehtFest('1', null, App.zonesCache) };
    });
    if (r.fehlt) { ok(name, false, 'Engine.stehtFest fehlt'); continue; }
    ok(`${name} Fall`, !!r.id, `Spieltag ${r.md}: ${r.name} – ${r.art}`);
    if (!r.id) continue;
    // Tabelle: Kästchen an der Platzzahl (erste Zelle), nicht hinter dem Namen
    const zelle = await page.evaluate(nm => { const s = [...document.querySelectorAll('#content .tmn')].find(e => e.dataset.full === nm); const tr = s && s.closest('tr');
        const f = tr && tr.querySelector('td:first-child .fest'); return f ? f.className + ' | ' + f.title : ''; }, r.name);
    ok(`${name} Tabelle`, zelle.includes('fest-') && zelle.includes('steht fest'), zelle || '(kein Kennzeichen in der Platz-Spalte)');
    const nFest = await page.evaluate(() => document.querySelectorAll('#content td:first-child .fest').length);
    ok(`${name} Anzahl`, nFest === Object.keys(r.alle).length, `${nFest} Kennzeichen, Engine ${Object.keys(r.alle).length}`);
    // Schlagzeile unter den Ergebnissen
    const zeilen = await page.evaluate(() => [...document.querySelectorAll('#content .res-fest div')].map(e => e.innerText));
    ok(`${name} Schlagzeile`, zeilen.some(x => x.includes(r.name)), zeilen.join(' | ') || '(keine)');
    // Pkt-Spalte mobil nicht abgeschnitten (Mobil-Pflicht)
    // (die Ziel-Spalte ganz rechts ragte mobil schon vorher über den Rand – geprüft wird die Pkt-Spalte, CLAUDE.md Mobil-Pflicht)
    const pkt = await page.evaluate(() => { const th = [...document.querySelectorAll('#content table.ltab th')].find(e => e.innerText.trim() === 'Pkt'); if (!th) return null; const c = th.getBoundingClientRect(); return { r: Math.round(c.right), w: window.innerWidth }; });
    ok(`${name} Pkt-Spalte`, pkt && pkt.r <= pkt.w, JSON.stringify(pkt));
    await page.screenshot({ path: `docs/steht-fest/tabelle_${name}.png`, fullPage: false });
    await page.evaluate(() => { const e = document.querySelector('#content .res-fest'); if (e) e.scrollIntoView(); });
    await page.screenshot({ path: `docs/steht-fest/schlagzeile_${name}.png` });
    // vergangener Spieltag VOR dem Stichtag: dort darf das Kennzeichen des Vereins noch nicht stehen
    const vorher = await page.evaluate(([nm, md]) => {
        const L = Engine.kalender.liga['1'], slot = L[md - 2];
        const idx = Engine.matchdayHistory.findIndex(x => x && x.md === slot);
        if (idx < 0) return 'kein Verlauf';
        App._selectMatchday(idx);
        const s = [...document.querySelectorAll('#content .tmn')].find(e => e.dataset.full === nm); const tr = s && s.closest('tr');
        const f = tr && tr.querySelector('td:first-child .fest'); return f ? f.title : '';
    }, [r.name, r.md]);
    ok(`${name} vorher`, vorher === '' || (vorher !== 'kein Verlauf' && !vorher.includes(({ meister: 'Meister', auf: 'Aufstieg', cl: 'Champions', el: 'Europa', ecl: 'Conference', ab: 'Abstieg' })[r.art] || '§')), `Spieltag ${r.md - 1}: ${vorher || 'kein Kennzeichen'}`);
    if (fehler.length) ok(`${name} JS-Fehler`, false, [...new Set(fehler)].join(' / '));
}
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? `BEFUND (${befund.length})` : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
