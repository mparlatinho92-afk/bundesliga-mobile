// Schritt 2 (Nutzer 14.11.2026): feststehende Sonder-Abstiege sichtbar in Tabelle („ZA“), Spieltags-Schlagzeilen (🚨-Zeile),
// Kalender (Zeile „Sonder-Abstiege“, Feld antippen) und Reiter „Sonder-Relegation“ der laufenden Saison („Platz frei in …“).
// Ein Bodenliga-Verein bekommt für den Test eine Insolvenz nach dem 6. Spiel (Engine._zwangPlan überschrieben – geprüft wird die
// ANZEIGE, die Engine prüft tools/sonder_meldung_check.cjs). Vor dem 6. Spiel darf nichts erscheinen. Desktop + Handy.
//   node .claude/skills/run/sonder_meldung_ui_check.mjs              gegen template.html
//   node .claude/skills/run/sonder_meldung_ui_check.mjs --selbsttest gegen index.html (alter Stand) – muss durchfallen
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
    // Verein: Bodenliga, Ziel ligalos (_zwangZiel), kein eigener Rückzug/Zwang
    const r = await page.evaluate(() => {
        const ZZ = Engine._zwangZiel ? t => Engine._zwangZiel(t) : () => ({ ziel: null });
        const t = Object.values(Engine.teams).find(t => t.leagueId && !t.isReserve && Engine.leagues[t.leagueId].level >= 6
            && Engine.homeFloorLeagueId(t) === t.leagueId && !ZZ(t).ziel);
        if (!t) return null;
        window.__ID = t.id;
        const o = Engine._zwangPlan;
        if (o) Engine._zwangPlan = function (x, n) { return x.id === window.__ID ? { art: 'insolvenz', k: 6 } : o.call(this, x, n); };
        Engine._smCache = {};
        const gesp = () => Engine.seasonResults.filter(r => r.lid === t.leagueId && (r.hId === t.id || r.aId === t.id)).length;
        while (gesp() < 5 && Engine.currentMatchday < Engine.totalMatchdays) Engine.playNextMatchday();
        App.matchdayViewIdx = null; App.viewHistoryOffset = null; App.loadLeague(t.leagueId);
        const vor = document.getElementById('content').innerText;
        while (gesp() < 6 && Engine.currentMatchday < Engine.totalMatchdays) Engine.playNextMatchday();
        App.resultsCollapsed = false; App.loadLeague(t.leagueId); App.updateStatus && App.updateStatus();
        const m = Engine.sonderMeldungen ? Engine.sonderMeldungen(t.leagueId).find(x => x.id === t.id) : null;
        return { id: t.id, name: t.name, lid: t.leagueId, liga: Engine.leagues[t.leagueId].name, vorZA: /\bZA\b/.test(vor) && vor.includes('Insolvenz'), vorMeld: vor.includes('Insolvenzverfahren'), m };
    });
    if (!r) { ok(name, false, 'kein passender Verein'); continue; }
    ok(`${name} vor dem 6. Spiel`, !r.vorZA && !r.vorMeld, `nichts gemeldet (${r.name}, ${r.liga})`);
    ok(`${name} Meldung in der Engine`, !!r.m && r.m.art === 'insolvenz', JSON.stringify(r.m));
    // Tabelle: Zeile des Vereins trägt „ZA“
    const zeile = await page.evaluate(nm => { const s = [...document.querySelectorAll('#content .tmn')].find(e => e.dataset.full === nm); const tr = s && s.closest('tr'); return tr ? tr.innerText.replace(/\s+/g, ' ') : ''; }, r.name);
    ok(`${name} Tabelle`, /ZA/.test(zeile) && /Insolvenz/.test(zeile), zeile.slice(0, 140));
    // Spieltags-Schlagzeile
    const meld = await page.evaluate(() => [...document.querySelectorAll('#content .res-meld div')].map(e => e.innerText));
    ok(`${name} Schlagzeile`, meld.some(x => x.includes(r.name) && /Insolvenzverfahren/.test(x)), meld.join(' | ') || '(keine)');
    await page.screenshot({ path: `docs/rueckzug_saison/meldung_${name}.png` });
    // Kalender
    const kal = await page.evaluate(t => {
        if (!App.kalToggle || !Engine.kalender) return { fehlt: 'kein Kalender' };
        App._kalOffen = false; App.kalToggle({ stopPropagation() {} });
        const tr = document.querySelector('#kal-panel tr[data-c="sonder"]');
        if (!tr) return { fehlt: 'Zeile fehlt' };
        const td = tr.querySelector(`td[data-t="${t}"]`);
        if (!td) return { fehlt: 'Feld fehlt' };
        td.querySelector('span').click();
        return { zeile: tr.innerText.replace(/\s+/g, ' ').slice(0, 40), info: document.getElementById('kal-info').innerText };
    }, r.m && r.m.t);
    ok(`${name} Kalender`, !kal.fehlt && kal.info.includes(r.name), kal.fehlt || kal.info.replace(/\s+/g, ' '));
    if (!kal.fehlt) await page.screenshot({ path: `docs/rueckzug_saison/meldung_kalender_${name}.png` });
    await page.evaluate(() => { if (App._kalOffen) App.kalToggle({ stopPropagation() {} }); });
    // Reiter Sonder-Relegation (laufende Saison)
    const sr = await page.evaluate(() => { App.viewHistoryOffset = null; App.amateurTab = -1; App.showAmateurpokal(); if (App.switchAmateurTab) App.switchAmateurTab(-8); return document.getElementById('content').innerText.replace(/\s+/g, ' '); });
    const i = sr.indexOf('Bisher steht fest');
    ok(`${name} Sonder-Relegation`, i >= 0 && sr.includes(r.name), i >= 0 ? sr.slice(i, i + 160) : sr.slice(0, 160));
    await page.screenshot({ path: `docs/rueckzug_saison/meldung_sr_${name}.png` });
    if (fehler.length) ok(`${name} JS-Fehler`, false, [...new Set(fehler)].join(' / '));
}
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? `BEFUND (${befund.length})` : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
