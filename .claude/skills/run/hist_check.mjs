// Browser-Pruefung der historischen Ligen gegen template.html (Desktop + Handy, dunkel + hell).
// node .claude/skills/run/hist_check.mjs   -> Screenshots nach %TEMP%/bundesliga-shots/hist-*.png
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = process.env.SCREENSHOT_DIR || 'C:\\Users\\lyric\\AppData\\Local\\Temp\\bundesliga-shots';
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt, theme) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    if (theme) await page.addInitScript(t => localStorage.setItem('theme', t), theme);
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    const ss = async n => { await page.screenshot({ path: path.join(SHOT, `hist-${name}-${n}.png`) }); };
    const ev = f => page.evaluate(f);
    const offenSidebar = async () => { if (ctxOpt.isMobile) await ev(() => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('visible'); }); await warte(300); };

    // 1. Seitenleiste
    await ev(() => { localStorage.removeItem('ba_sb_hist'); App.renderSidebar(); });
    await ev(() => App._histSbToggle('all'));
    await ev(() => App._histSbToggle('brd1'));
    await offenSidebar();
    const sb = await ev(() => ({ epochen: document.querySelectorAll('.hist-sb-epoche').length, ligen: document.querySelectorAll('.hist-sb-liga').length,
        ueber: [...document.querySelectorAll('.hist-sb-liga')].filter(e => e.scrollWidth > e.clientWidth + 1).length }));
    if (sb.epochen !== 4 || sb.ligen < 20) befunde.push(`${name}: Seitenleiste ${JSON.stringify(sb)}`);
    if (sb.ueber) befunde.push(`${name}: ${sb.ueber} Historien-Eintraege laufen ueber`);
    await ev(() => { const l = document.querySelector('.hist-sb-liga'); if (l) l.scrollIntoView(); });
    await ss('1-sidebar');

    // 2. Westfalen 1975/76: zwei Staffeln, Info-Spalte, Navigation
    await ev(() => { App.viewArchivedSeason = { y: '1975/76', lid: 'h3-westfalen-verbandsliga' }; App.tableView = 'gesamt'; App.loadLeague('h3-westfalen-verbandsliga'); document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('visible'); });
    await page.waitForFunction(() => document.querySelectorAll('#content table.ltab').length >= 1, null, { timeout: 20000 });
    await warte(500);
    const wf = await ev(() => ({ tabs: document.querySelectorAll('#content table.ltab').length, zeilen: document.querySelectorAll('#content table.ltab tbody tr').length,
        kopf: [...document.querySelectorAll('#content div')].map(d => d.textContent).filter(t => /^Staffel /.test(t)),
        nav: [...document.querySelectorAll('#content .btn')].slice(0, 12).map(b => b.textContent.trim()),
        breit: document.documentElement.scrollWidth > window.innerWidth + 1 }));
    if (wf.tabs !== 2 || wf.zeilen !== 36) befunde.push(`${name}: Westfalen 1975/76 ${JSON.stringify(wf)}`);
    if (wf.breit) befunde.push(`${name}: Seite scrollt waagerecht (Westfalen)`);
    await ss('2-westfalen');

    // 3. Bezirksliga Halle 1987/88: geschaetzte S/U/N kursiv, Staffelkopf
    await ev(() => { App.viewArchivedSeason = { y: '1987/88', lid: 'h3d-halle-bezirksliga' }; App.loadLeague('h3d-halle-bezirksliga'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(400);
    const ha = await ev(() => ({ kursiv: [...document.querySelectorAll('#content td')].filter(td => td.style.fontStyle === 'italic').length,
        hinweis: /geschätzt/.test(document.getElementById('content').textContent) && /Quellen: f-archiv\.de, ifosta\.de, Wikipedia/.test(document.getElementById('content').textContent),
        pkt: [...document.querySelectorAll('#content table.ltab tbody tr')].slice(0, 3).map(tr => tr.lastElementChild.previousElementSibling.textContent) }));
    if (!ha.kursiv || !ha.hinweis) befunde.push(`${name}: Schaetz-Kennzeichnung fehlt ${JSON.stringify(ha)}`);
    await ss('3-halle');

    // 4. 3. Liga 2010/11 (vor Sim-Start, aus der Erweiterung) + Ewige Tabelle
    await ev(() => { App.viewArchivedSeason = { y: '2010/11', lid: '3' }; App.loadLeague('3'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(400);
    const dl = await ev(() => ({ zeilen: document.querySelectorAll('#content table.ltab tbody tr').length, text: document.getElementById('content').textContent.slice(0, 400) }));
    if (!/Quellen: f-archiv/.test(dl.text)) befunde.push(`${name}: Quellenhinweis fehlt (3. Liga 2010/11)`);
    if (dl.zeilen !== 20) befunde.push(`${name}: 3. Liga 2010/11 ${JSON.stringify(dl)}`);
    await ss('4-dritte-liga');

    // 5. Ewige Tabelle + Sieger einer historischen Liga
    await ev(() => { App.tableView = 'ewige'; App.loadLeague('h2-sued-regionalliga'); });
    await warte(500);
    const ew = await ev(() => document.querySelectorAll('#content tbody tr').length);
    if (!(await ev(() => /Quellen: f-archiv/.test(document.getElementById('content').textContent)))) befunde.push(`${name}: Quellenhinweis fehlt (Ewige Tabelle)`);
    if (ew < 30) befunde.push(`${name}: Ewige Tabelle Regionalliga Sued hat ${ew} Zeilen`);
    await ss('5-ewige');
    await ev(() => { App.tableView = 'sieger'; App.loadLeague('h2d-ddrliga-ddrliga'); });
    await page.waitForFunction(() => { const t = document.getElementById('sieger-chron'); return t && !/lädt/.test(t.textContent); }, null, { timeout: 20000 });
    const si = await ev(() => ({ n: document.querySelectorAll('#sieger-chron tr').length, roh: /hist_/.test(document.getElementById('sieger-chron').textContent) }));
    if (si.n < 60 || si.roh) befunde.push(`${name}: Siegerliste DDR-Liga ${JSON.stringify(si)}`);
    await ss('6-sieger');
    await ev(() => { App.tableView = 'gesamt'; });

    // 6. Steckbrief + Ligaverlauf ab 1963 (Carl Zeiss Jena: Oberliga, DDR-Liga; SC Herford: Westfalen)
    await ev(() => { try { localStorage.setItem('ba_sb_verlauf_hist', '1'); } catch (e) {} App.showSteckbrief('scherford_1261'); });
    await warte(1500);
    const vl = await ev(() => { const b = document.getElementById('sb-verlauf'); return { svg: !!(b && b.querySelector('svg')), text: b ? b.textContent.slice(0, 120) : null, hist: (document.getElementById('sb-hist-count') || {}).textContent }; });
    if (!vl.svg) befunde.push(`${name}: Ligaverlauf SC Herford fehlt ${JSON.stringify(vl)}`);
    await ss('7-steckbrief');
    await ev(() => { const b = document.getElementById('sb-verlauf'); if (b) b.scrollIntoView(); });
    await ss('7b-verlauf');
    await ev(() => { document.getElementById('modal').style.display = 'none'; });

    // 7. Suche nach einem DDR-Namen
    const su = await ev(() => { const r = (typeof HISTORIC_NAMES !== 'undefined' && HISTORIC_NAMES.fortunababelsberg_754) || []; return r.map(e => e.name).join(', '); });
    if (!/Rotation/.test(su)) befunde.push(`${name}: Era-Name Rotation Babelsberg fehlt`);

    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 5).join(' | ')}`);
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await lauf('hell', { viewport: { width: 1400, height: 900 } }, 'light');
await browser.close();
console.log(befunde.length ? 'BEFUNDE:\n- ' + befunde.join('\n- ') : 'Browser: alles gruen');
console.log('Screenshots: ' + SHOT + '\\hist-*.png');
process.exit(befunde.length ? 1 : 0);
