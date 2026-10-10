// Browser-Pruefung: Ebene 5-8 aus fussball.de (v0.8.192) und der Schalter "fruehere Ebenen dazuzaehlen" in Ewiger Tabelle,
// Liga-Rekorden und Vereins-Rekordfenster. Desktop + Handy gegen template.html, Screenshots nach docs/fbde-ebene58/.
// Exit 1 = Befund. --selbsttest: App._feSchalter liefert nichts und der Abzug faellt weg – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Der Selbsttest schreibt seine Bilder woanders hin – sonst ueberschreibt er die echten (ist hier schon einmal passiert)
const SHOT = path.resolve(process.argv.includes('--selbsttest') ? 'docs/fbde-ebene58/_selbsttest' : 'docs/fbde-ebene58');
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
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    if (SELBST) await page.addInitScript(() => {
        // App/Engine sind const auf oberster Ebene – nicht window.App
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._feSchalter) { App._feSchalter = () => ''; App._feZaehlen = () => true; clearInterval(t); } }, 5);
    });
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await page.waitForFunction(() => Engine.archive.records && Engine.archive.records.bfH === HIST_EXT.version, null, { timeout: 120000 })
        .catch(() => befunde.push(name + ': Rekord-Nachlauf (bfH) nie gelaufen'));
    await page.evaluate(() => { try { localStorage.removeItem('ba_fe_zaehlen'); } catch (e) {} });

    // Verein mit Saisons vor UND nach 2008 in der Sachsenliga
    const fall = await page.evaluate(() => {
        const A = Engine.archive, fe = (A.histExtFe || {})['6-24'] || {}, ew = A.ewige['6-24'] || {};
        const id = Object.keys(fe).find(k => ew[k] && ew[k].years > fe[k].years && ew[k].years - fe[k].years >= 2);
        return id ? { id, name: ew[id].name, alle: ew[id].years, fe: fe[id].years } : null;
    });
    if (!fall) { befunde.push(name + ': kein Verein mit Saisons vor und nach 2008 in der Sachsenliga'); await ctx.close(); return; }

    // 1. Ewige Tabelle mit Schalter
    const jahre = () => page.evaluate(n => {
        const tr = [...document.querySelectorAll('table tbody tr')].find(r => { const s = r.querySelector('.tmn'); return s && s.dataset.full === n; });
        return tr ? +tr.children[4].innerText : null;
    }, fall.name);
    await page.evaluate(() => { App.loadLeague('6-24'); App.setTableView('ewige'); });
    await warte(600);
    const knopf = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Frühere Ebenen/.test(x.innerText)); return b ? b.innerText : null; });
    if (!knopf || !/dazugezählt/.test(knopf)) befunde.push(name + ': Schalter in der Ewigen Tabelle fehlt/falscher Standard: ' + knopf);
    const vorher = await jahre();
    await page.screenshot({ path: path.join(SHOT, name + '-ewige-an.png') });
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Frühere Ebenen/.test(x.innerText)); if (b) b.click(); else App._feUmschalten('liga'); });
    await warte(600);
    const nachher = await jahre();
    await page.screenshot({ path: path.join(SHOT, name + '-ewige-aus.png') });
    // die Ansicht "Aktuell" zaehlt die laufende Saison mit (+1, wenn der Verein gerade in der Liga spielt)
    const lfd = await page.evaluate(id => (Engine.teams[id] || {}).leagueId === '6-24' ? 1 : 0, fall.id);
    if (vorher !== fall.alle + lfd || nachher !== fall.alle + lfd - fall.fe) befunde.push(`${name}: Ewige Tabelle ${fall.name}: an ${vorher} (soll ${fall.alle + lfd}), aus ${nachher} (soll ${fall.alle + lfd - fall.fe})`);
    const ueber = await page.evaluate(() => [...document.querySelectorAll('#main-content *, .content *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('table')).length);
    if (ueber) befunde.push(name + ': ' + ueber + ' Elemente ragen ueber den Rand (Ewige Tabelle)');

    // 2. Liga-Rekorde: Schalter vorhanden, Zustand gemeinsam mit der Ewigen Tabelle (jetzt aus)
    await page.evaluate(() => App.setTableView('rekorde'));
    await warte(400);
    const rk = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Frühere Ebenen/.test(x.innerText)); return b ? b.innerText : null; });
    if (!rk || !/ausgeblendet/.test(rk)) befunde.push(name + ': Liga-Rekorde: Schalter fehlt oder teilt den Zustand nicht: ' + rk);
    await page.screenshot({ path: path.join(SHOT, name + '-rekorde.png') });

    // 3. Vereins-Rekordfenster: Zwickau war 2005/06 Meister der (damals fuenftklassigen) Sachsenliga
    await page.evaluate(() => { try { localStorage.removeItem('ba_fe_zaehlen'); } catch (e) {} App.showTeamRecords(Object.keys(GAME_DATA.teams).find(k => GAME_DATA.teams[k].name === 'FSV Zwickau')); });
    await warte(400);
    const zw = await page.evaluate(() => { const mc = document.querySelector('.modal-content'); return mc ? mc.textContent.replace(/\s+/g, ' ') : ''; });   // textContent: zugeklappte Ligen mitlesen
    if (!/Sachsenliga[\s\S]*Meister[\s\S]*2005\/06[\s\S]*frühere Ebene/.test(zw)) befunde.push(name + ': Zwickau: Sachsenliga-Meister 2005/06 mit "frühere Ebene" fehlt im Rekordfenster');
    await page.screenshot({ path: path.join(SHOT, name + '-zwickau.png') });
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler.slice(0, 3).join(' | '));
    console.log(name, JSON.stringify({ fall, vorher, nachher, knopf, rk }));
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
if (befunde.length) { console.log('BEFUND:\n- ' + befunde.join('\n- ')); process.exit(1); }
console.log('OK');
