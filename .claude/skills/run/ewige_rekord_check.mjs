// Browser-Pruefung: Ewige Tabelle mit Vereinssuche + Sortierung je Spalte, Rekord-Saisons als Link in die Abschlusstabelle
// (Liga-Rekorde, Vereins-Rekordfenster SAISON + JE LIGA). Desktop + Handy gegen template.html, Screenshots nach docs/ewige-suche/.
// Exit 1 = Befund. --selbsttest: Saison-Links und Sortierung stillgelegt – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SELBST = process.argv.includes('--selbsttest');
const SHOT = path.resolve(SELBST ? 'docs/ewige-suche/_selbsttest' : 'docs/ewige-suche');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    const B = t => befunde.push(name + ': ' + t);
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    if (SELBST) await page.addInitScript(() => {
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._recSaisonLink) { App._recSaisonLink = y => y; App._ewigeSort = () => {}; clearInterval(t); } }, 5);
    });
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await page.waitForFunction(() => Engine.archive.records && Engine.archive.records.bfH === HIST_EXT.version, null, { timeout: 120000 }).catch(() => B('Rekord-Nachlauf nie gelaufen'));

    // ---- 1. Ewige Tabelle 1. Bundesliga: Suche
    await page.evaluate(() => { App._ewSort = null; App._ewSuche = null; App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.loadLeague('1'); App.setTableView('ewige'); });
    await warte(500);
    const zeilen = () => page.evaluate(() => [...document.querySelectorAll('#ew-tab tbody tr')].filter(tr => tr.style.display !== 'none').map(tr => ({
        pl: parseInt(tr.children[0].innerText), name: tr.dataset.n, gf: parseInt(tr.children[11].innerText) })));
    const alle = await zeilen();
    if (alle.length < 40) B('Ewige Tabelle 1. BL hat nur ' + alle.length + ' Zeilen');
    const rangVon = Object.fromEntries(alle.map(z => [z.name, z.pl]));
    const feld = page.locator('#ew-suche');
    if (!(await feld.count())) B('Suchfeld fehlt');
    else {
        await feld.click();
        await feld.pressSequentially('bayern', { delay: 20 });
        const tr = await zeilen();
        const fokus = await page.evaluate(() => document.activeElement && document.activeElement.id);
        const treffer = await page.evaluate(() => (document.getElementById('ew-treffer') || {}).textContent);
        if (!tr.length || tr.some(z => z.name.indexOf('bayern') < 0)) B('Suche "bayern" zeigt ' + JSON.stringify(tr.map(z => z.name)));
        if (tr.some(z => z.pl !== rangVon[z.name])) B('Suche verändert den Platz');
        if (fokus !== 'ew-suche') B('Suchfeld verliert beim Tippen den Fokus (' + fokus + ')');
        if (!new RegExp('^' + tr.length + ' Treffer$').test(treffer || '')) B('Trefferzahl "' + treffer + '" statt ' + tr.length);
        await page.evaluate(() => document.getElementById('ew-suche').scrollIntoView({ block: 'start' }));   // Handy: Aktionen-Leiste deckt den Fuß ab
        await page.screenshot({ path: path.join(SHOT, name + '-suche.png') });
        await feld.fill('');
        await page.evaluate(() => App._ewigeFilter('', '1'));
    }

    // ---- 2. Sortierung: Tore absteigend, nochmal = aufsteigend, Mannschaft alphabetisch; Platz bleibt der echte Rang
    const kopf = t => page.evaluate(t => { const th = [...document.querySelectorAll('#ew-tab thead th')].find(x => x.innerText.replace(/[▲▼\s]/g, '') === t); if (th) th.click(); return !!th; }, t);
    if (!(await kopf('Tore'))) B('Spaltenkopf Tore fehlt');
    await warte(300);
    let z = await zeilen();
    const ab = z.every((r, i) => !i || z[i - 1].gf >= r.gf), anders = z.some((r, i) => r.pl !== i + 1);
    if (!ab || !anders) B('Sortierung Tore absteigend greift nicht (erste: ' + z.slice(0, 3).map(r => r.name + ' ' + r.gf).join(', ') + ')');
    if (z.some(r => r.pl !== rangVon[r.name])) B('Sortierung verändert den Platz');
    await page.evaluate(() => document.getElementById('ew-suche').scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(SHOT, name + '-sort-tore.png') });
    await kopf('Tore'); await warte(300);
    z = await zeilen();
    if (!z.every((r, i) => !i || z[i - 1].gf <= r.gf)) B('zweiter Klick auf Tore dreht nicht auf aufsteigend');
    await kopf('Mannschaft'); await warte(300);
    z = await zeilen();
    if (!z.every((r, i) => !i || z[i - 1].name.localeCompare(r.name, 'de') <= 0)) B('Sortierung nach Mannschaft nicht alphabetisch');
    // Suche überlebt den Neuaufbau beim Sortieren
    await page.evaluate(() => App._ewigeFilter('köln', '1')); await kopf('Pkt.'); await warte(300);
    z = await zeilen();
    if (!z.length || z.some(r => r.name.indexOf('köln') < 0)) B('Suche geht beim Sortieren verloren');
    const ueber = await page.evaluate(() => [...document.querySelectorAll('#content *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest('table') && !(() => { for (let x = e.parentElement; x; x = x.parentElement) if (/auto|scroll/.test(getComputedStyle(x).overflowX)) return true; })()).map(e => e.tagName + (e.id ? '#' + e.id : '') + ' ' + Math.round(e.getBoundingClientRect().right) + 'px'));
    if (ueber.length) B(ueber.length + ' Elemente ragen über den Rand (Ewige Tabelle): ' + ueber.slice(0, 4).join(', '));
    await page.evaluate(() => { App._ewSort = null; App._ewSuche = null; });

    // ---- 3. Liga-Rekorde: Saison anklicken -> Abschlusstabelle dieser Saison
    await page.evaluate(() => App.setTableView('rekorde')); await warte(400);
    const link = await page.evaluate(() => { const s = [...document.querySelectorAll('#content span[onclick*="_recSaisonOeffnen"]')][0]; return s ? s.innerText : null; });
    if (!link) B('Liga-Rekorde: keine anklickbare Saison');
    else {
        await page.screenshot({ path: path.join(SHOT, name + '-ligarekorde.png') });
        await page.locator('#content span[onclick*="_recSaisonOeffnen"]').first().click();
        await warte(700);
        const ist = await page.evaluate(() => ({ tv: App.tableView, s: App._navSaison(), lid: App.activeLeague, zeilen: document.querySelectorAll('#content table tbody tr').length }));
        if (ist.tv !== 'gesamt' || ist.s !== link || ist.lid !== '1' || ist.zeilen < 16) B('Liga-Rekord-Link ' + link + ' öffnet ' + JSON.stringify(ist));
        await page.screenshot({ path: path.join(SHOT, name + '-ligarekorde-sprung.png') });
    }

    // ---- 4. Vereins-Rekordfenster: SAISON-Beleg und JE LIGA (Zwickau, Sachsenliga 2005/06 = Archiv vor dem Sim-Start)
    const zw = await page.evaluate(() => Object.keys(GAME_DATA.teams).find(k => GAME_DATA.teams[k].name === 'FSV Zwickau'));
    await page.evaluate(id => App.showTeamRecords(id), zw); await warte(400);
    const n = await page.evaluate(() => document.querySelectorAll('.modal-content span[onclick*="_recSaisonOeffnen"]').length);
    if (n < 3) B('Vereins-Rekordfenster: nur ' + n + ' anklickbare Saisons');
    await page.screenshot({ path: path.join(SHOT, name + '-vereinsrekorde.png') });
    const ziel = page.locator('.modal-content details span[onclick*="_recSaisonOeffnen(\'2005/06\',\'6-24\')"]').first();
    if (!(await ziel.count())) B('JE LIGA: Sachsenliga 2005/06 nicht anklickbar');
    else {
        await page.evaluate(() => document.querySelectorAll('.modal-content details').forEach(d => d.open = true));
        await ziel.click(); await warte(900);
        const ist = await page.evaluate(id => ({ modal: getComputedStyle(document.getElementById('modal')).display, s: App._navSaison(), lid: App.activeLeague, tv: App.tableView,
            erster: (() => { const tr = document.querySelector('#content table tbody tr'); const t = tr && tr.querySelector('[onclick*="showSteckbrief"]'); return t ? t.getAttribute('onclick') : ''; })().indexOf(id) >= 0 }), zw);
        if (ist.modal !== 'none' || ist.s !== '2005/06' || ist.lid !== '6-24' || ist.tv !== 'gesamt' || !ist.erster) B('JE-LIGA-Link öffnet ' + JSON.stringify(ist));
        await page.screenshot({ path: path.join(SHOT, name + '-zwickau-2005.png') });
    }
    if (fehler.length) B('JS-Fehler ' + fehler.slice(0, 3).join(' | '));
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await browser.close();
if (befunde.length) { console.log('BEFUND (' + befunde.length + ')\n  ' + befunde.join('\n  ')); process.exit(1); }
console.log('OK – Screenshots in ' + SHOT);
