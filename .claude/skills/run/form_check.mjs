// Browser-Pruefung Formpunkte + Formtabelle (app/league.js _formSpiele) gegen template.html.
// - neuester Punkt = zuletzt gespielter Spieltag (vorher fehlte er), Hover-Titel "N. Spieltag: A x:y B"
// - Handy: Tipp auf die Punkte zeigt alle Spiele als Zeilen
// - Reiter "📈 Form": Punkte = Summe der letzten 5 aus seasonResults, absteigend sortiert
// - auch eine Liga der Ebene 7 nach "Saison" (fastMode) vollstaendig; historische Saison: kein Reiter
// node .claude/skills/run/form_check.mjs  -> Screenshots nach docs/formtabelle/ ; Exit 1 = Befund
// --selbsttest: das jeweils letzte Ergebnis wird vor der Pruefung aus seasonResults entfernt -> MUSS durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/formtabelle');
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
    page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof App !== 'undefined' && App.activeLeague && document.querySelectorAll('#league-list .league-item').length > 3, null, { timeout: 60000 });
    await warte(800);
    const pruef = (was, ok, info) => { if (!ok) befunde.push(`${name}: ${was} ${info ? JSON.stringify(info).slice(0, 400) : ''}`); };
    const vorher = await page.evaluate(() => !!document.querySelector('button[onclick="App.setTableView(\'form\')"]'));
    pruef('vor dem 1. Spieltag kein Form-Reiter', !vorher);
    for (let i = 0; i < 3; i++) { await page.click('#btn-play'); await warte(900); }
    await page.evaluate(() => { App.tableView = 'gesamt'; App.loadLeague('1'); });
    if (SELBST) await page.evaluate(() => { const letzte = new Set(); for (let i = Engine.seasonResults.length - 1; i >= 0; i--) { const r = Engine.seasonResults[i]; if (r.lid === '1' && !letzte.has(r.hId)) { letzte.add(r.hId); letzte.add(r.aId); Engine.seasonResults.splice(i, 1); } } App.loadLeague('1'); });
    await warte(500);
    const r = await page.evaluate(() => {
        const md = Engine.currentMatchday;
        const zeilen = [...document.querySelectorAll('.ltab tbody tr')];
        const dots = zeilen.map(z => [...z.querySelectorAll('.fdot')].map(d => d.title));
        return { md, n: zeilen.length, dots, frmF: (zeilen[0].querySelector('.frm') || {}).dataset?.f || '' };
    });
    const neuestOk = r.dots.every(d => d.length && d[0].startsWith(r.md + '. Spieltag:'));
    pruef('neuester Punkt = zuletzt gespielter Spieltag', neuestOk && r.dots.every(d => d.length === Math.min(5, r.md)), { md: r.md, bsp: r.dots.slice(0, 2) });
    pruef('Titel mit Spieltag und Ergebnis', /^\d+\. Spieltag: .+ \d+:\d+ .+$/.test(r.dots[0][0] || ''), r.dots[0]);
    // Handy/Desktop: Tipp auf die Punkte -> alle Zeilen
    await page.evaluate(() => document.querySelector('.ltab tbody tr .frm').scrollIntoView({ block: 'center' }));
    await warte(300);
    await page.locator('.ltab tbody tr').first().locator('.frm').click();
    await warte(300);
    const tip = await page.evaluate(() => { const t = document.getElementById('inf-tip'); return t && t.style.display === 'block' ? t.innerText : null; });
    pruef('Tipp zeigt alle Spiele zeilenweise', tip && tip.split('\n').filter(Boolean).length === Math.min(5, r.md), tip);
    await page.screenshot({ path: path.join(SHOT, `${name}-punkte.png`) });
    await page.locator('.ltab tbody tr').first().locator('.frm').click();   // zweiter Tipp schliesst
    await warte(200);
    const zu = await page.evaluate(() => { const t = document.getElementById('inf-tip'); return !t || t.style.display !== 'block'; });
    pruef('zweiter Tipp schliesst', zu);
    // Formtabelle
    await page.locator('button[onclick="App.setTableView(\'form\')"]').click();
    await warte(500);
    const f = await page.evaluate(() => {
        const pts = {};
        const byId = {};
        Engine.seasonResults.filter(x => x.lid === '1').forEach(x => {
            (byId[x.hId] = byId[x.hId] || []).push(x.s1 > x.s2 ? 3 : x.s1 === x.s2 ? 1 : 0);
            (byId[x.aId] = byId[x.aId] || []).push(x.s2 > x.s1 ? 3 : x.s1 === x.s2 ? 1 : 0);
        });
        Object.keys(byId).forEach(id => pts[Engine.teams[id].name] = byId[id].slice(-5).reduce((a, b) => a + b, 0));
        const zeilen = [...document.querySelectorAll('.ltab tbody tr')].map(z => ({ n: z.querySelector('.tmn').dataset.full, pkt: +z.querySelector('td:nth-child(10)').innerText }));
        return { zeilen, pts, aktiv: App.tableView };
    });
    const summenOk = f.zeilen.every(z => z.pkt === f.pts[z.n]);
    const sortOk = f.zeilen.every((z, i) => !i || f.zeilen[i - 1].pkt >= z.pkt);
    pruef('Formtabelle rechnet aus den letzten 5', f.aktiv === 'form' && summenOk && sortOk, f.zeilen.slice(0, 4).map(z => [z.n, z.pkt, f.pts[z.n]]));
    await page.screenshot({ path: path.join(SHOT, `${name}-formtabelle.png`) });
    if (!SELBST && name === 'desktop') {
        // Restsaison im fastMode: tiefe Liga trotzdem vollstaendig
        await page.click('#btn-saison');
        await page.waitForFunction(() => Engine.currentMatchday >= (Engine.totalMatchdays || 34), null, { timeout: 180000 }).catch(() => {});
        await warte(1500);
        await page.evaluate(() => { const m = document.getElementById('modal'); if (m) m.style.display = 'none'; });
        const tief = await page.evaluate(() => {
            const lid = Object.keys(Engine.leagues).find(l => Engine.leagues[l].level === 7);
            App.tableView = 'form'; App.loadLeague(lid);
            const d = [...document.querySelectorAll('.ltab tbody tr')].map(z => z.querySelectorAll('.fdot').length);
            return { lid, aktiv: App.tableView, reiter: !!document.querySelector('button[onclick="App.setTableView(\'form\')"]'), d };
        });
        pruef('Ebene 7 nach fastMode: Reiter + 5 Punkte je Verein', tief.reiter && tief.d.length && tief.d.every(x => x === 5), tief);
    }
    // Historische Saison (vor dem Sim-Start): kein Reiter, Ansicht faellt auf Gesamt zurueck
    await page.evaluate(() => { App.tableView = 'form'; App.viewArchivedSeason = { y: '1990/91', lid: '1' }; App.viewHistoryOffset = null; App.loadLeague('1'); });
    await warte(800);
    const h = await page.evaluate(() => ({ reiter: !!document.querySelector('button[onclick="App.setTableView(\'form\')"]'), dots: document.querySelectorAll('.fdot').length }));
    pruef('historische Saison ohne Form', !h.reiter && !h.dots, h);
    pruef('keine JS-Fehler', !fehler.length, fehler.slice(0, 3));
    await ctx.close();
}

const sicher = async (n, o) => { try { await lauf(n, o); } catch (e) { befunde.push(`${n}: Ablauf abgebrochen – ${String(e).split(String.fromCharCode(10))[0]}`); } };
await sicher('desktop', { viewport: { width: 1400, height: 900 } });
await sicher('handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 });
await browser.close();
if (befunde.length) { console.log('BEFUND:\n' + befunde.join('\n')); process.exit(1); }
console.log('OK – Formpunkte inkl. juengstem Spiel, Hover/Tipp, Formtabelle; Screenshots in docs/formtabelle/');
