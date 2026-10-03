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
    if (sb.epochen !== 5 || sb.ligen < 20) befunde.push(`${name}: Seitenleiste ${JSON.stringify(sb)}`);
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

    // 4b. Regionalliga Nord 2015/16 (Spiel-Liga vor dem Sim-Start) und Hessenliga 2010/11 (Übergangszeit: unter der Regionalliga Süd)
    const navVon = () => ev(() => [...document.querySelectorAll('#content .btn')].map(b => b.textContent.trim()).filter(t => /^[↑↓]/.test(t)));
    await ev(() => { App.viewArchivedSeason = { y: '2015/16', lid: '4-2' }; App.loadLeague('4-2'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(400);
    const rn = { zeilen: await ev(() => document.querySelectorAll('#content table.ltab tbody tr').length), nav: await navVon() };
    if (rn.zeilen !== 18 || rn.nav.filter(t => t.startsWith('↓')).length !== 4 || !rn.nav.some(t => /3\. Liga/.test(t))) befunde.push(`${name}: Regionalliga Nord 2015/16 ${JSON.stringify(rn)}`);
    await ss('4b-rl-nord');
    await ev(() => { App.viewArchivedSeason = { y: '2010/11', lid: '5-3' }; App.loadLeague('5-3'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(400);
    const he = await navVon();
    if (!he.some(t => /^↑.*Regionalliga Süd/.test(t)) || he.some(t => /Amateurpokal/.test(t))) befunde.push(`${name}: Hessenliga 2010/11 oben nicht Regionalliga Süd ${JSON.stringify(he)}`);
    await ss('4c-hessenliga');

    // 4d. Covid-Saison Oberliga Westfalen 2021/22: Vorrunde getrennt, Runden als Staffeln, Platz durchgezaehlt (Runde)
    await ev(() => { App.viewArchivedSeason = { y: '2021/22', lid: '5-10' }; App.loadLeague('5-10'); });
    await page.waitForFunction(() => document.querySelectorAll('#content table.ltab').length >= 3, null, { timeout: 20000 });
    await warte(400);
    const cv = await ev(() => { const t = document.getElementById('content').textContent;
        const erste = [...document.querySelectorAll('#content table.ltab')].map(tb => tb.querySelector('tbody tr td').textContent.trim());
        return { tabs: document.querySelectorAll('#content table.ltab').length, vor: /Vorrunde/.test(t), meister: /Meisterrunde/.test(t), ab: /Abstiegsrunde/.test(t), erste }; });
    if (cv.tabs !== 3 || !cv.vor || !cv.meister || !cv.ab || cv.erste[1] !== '1 (1)' || cv.erste[2] !== '11 (1)') befunde.push(`${name}: Westfalen 2021/22 ${JSON.stringify(cv)}`);
    await ss('4d-covid');
    await ev(() => { const b = [...document.querySelectorAll('#content table.ltab')][2]; if (b) b.scrollIntoView(); });
    await ss('4e-covid-abstieg');

    // 4f. Steckbrief SpVgg Vreden: Saison-Historie "Pl. 11 (1)" mit Abstiegsrunde, Ligaverlauf-Info mit Klammer
    await ev(() => { localStorage.setItem('ba_sb_verlauf_hist', '1'); App.showSteckbrief('spvggvreden_1219'); });
    await warte(2000);
    const vr = await ev(() => {
        const zeilen = [...document.querySelectorAll('#sb-hist-list > div')].map(d => d.textContent);
        const z = zeilen.find(t => t.startsWith('2021/22')) || null;
        const M = App._sbVLModel, st = M && M.st.find(x => x.y === 2021);
        let info = null;
        if (st) { const svg = document.getElementById('sbvl-svg'), i = M.st.indexOf(st); const r = svg.getBoundingClientRect();
            App._sbVerlaufPick({ clientX: r.left + (i + 0.5) * M.colW }); info = document.getElementById('sbvl-info').textContent; }
        return { z, info };
    });
    if (!vr.z || !/Abstiegsrunde/.test(vr.z) || !/Pl\. 11 \(1\)/.test(vr.z) || !vr.info || !/Platz 11 \(1\) von 21/.test(vr.info)) befunde.push(`${name}: Steckbrief Vreden ${JSON.stringify(vr)}`);
    await ev(() => { const b = document.getElementById('sb-verlauf'); if (b) b.scrollIntoView(); });
    await ss('4f-vreden');
    await ev(() => { document.getElementById('modal').style.display = 'none'; });

    // 4g. Abgebrochene Saison (Mittelrheinliga 2020/21): Vermerk + Punkte je Spiel; Doppelsaison Bayern: 2020/21 verweist auf 2019/20
    await ev(() => { App.viewArchivedSeason = { y: '2020/21', lid: '5-12' }; App.loadLeague('5-12'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(300);
    const ab = await ev(() => ({ t: document.getElementById('content').textContent.slice(0, 300), zeilen: document.querySelectorAll('#content table.ltab tbody tr').length,
        quo: /\(\d,\d\d\)/.test(document.querySelector('#content table.ltab tbody tr').textContent) }));
    if (!/abgebrochen/.test(ab.t) || !/Punkte je Spiel/.test(ab.t) || !ab.quo || ab.zeilen !== 17) befunde.push(`${name}: Mittelrheinliga 2020/21 ${JSON.stringify(ab)}`);
    await ss('4g-abbruch');
    await ev(() => { App.viewArchivedSeason = { y: '2020/21', lid: '4-5' }; App.loadLeague('4-5'); });
    await warte(1200);
    const dp = await ev(() => document.getElementById('content').textContent);
    if (!/als Doppelsaison gespielt/.test(dp) || !/2019–21/.test(dp)) befunde.push(`${name}: Regionalliga Bayern 2020/21 ohne Doppelsaison-Hinweis: ${dp.slice(0, 200)}`);
    await ev(() => { App.viewArchivedSeason = { y: '2020/21', lid: '5-1' }; App.loadLeague('5-1'); });
    await page.waitForFunction(() => document.querySelectorAll('#content table.ltab').length >= 2, null, { timeout: 20000 });
    await ss('4h-rlp-staffeln');

    // 4i. Umbenannter Verein: 1974/75 steht "Heidenheimer SB", nicht der heutige Name
    await ev(() => { App.viewArchivedSeason = { y: '1974/75', lid: 'h3-nordwuerttemberg-amateurliga' }; App.loadLeague('h3-nordwuerttemberg-amateurliga'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(300);
    const hd = await ev(() => document.getElementById('content').textContent);
    if (!/Heidenheimer SB/.test(hd) || /1\. FC Heidenheim/.test(hd)) befunde.push(`${name}: Heidenheim 1974/75 zeigt nicht den damaligen Namen`);

    // 4j. Oberligen 1994-2008 (Ebene 4): Staffeln, Regionalliga darueber (Wechsel 2000), Oberligen darunter, Aufsteiger-Info
    const archiv = async (y, lid, tabs = 1) => {
        await page.evaluate(([y, lid]) => { App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [y, lid]);
        await page.waitForFunction(n => document.querySelectorAll('#content table.ltab').length >= n, tabs, { timeout: 20000 });
        await warte(400);
    };
    await archiv('2000/01', 'h4-nordost-oberliga', 2);
    const no = { tabs: await ev(() => document.querySelectorAll('#content table.ltab').length), nav: await navVon(), breit: await ev(() => document.documentElement.scrollWidth > window.innerWidth + 1) };
    if (no.tabs !== 2 || !no.nav.some(t => /^↑.*Regionalliga Nord/.test(t)) || no.breit) befunde.push(`${name}: Oberliga Nordost 2000/01 ${JSON.stringify(no)}`);
    await ss('4j-oberliga-nordost');
    await archiv('1997/98', 'h4-westfalen-oberliga');
    const wo = await navVon();
    if (!wo.some(t => /^↑.*Regionalliga West\/Südwest/.test(t))) befunde.push(`${name}: Oberliga Westfalen 1997/98 oben nicht RL West/Suedwest ${JSON.stringify(wo)}`);
    await archiv('1995/96', 'h3-sued-regionalliga');
    const rs = (await navVon()).filter(t => t.startsWith('↓'));
    if (rs.length !== 3 || !rs.every(t => /Hessen|Baden-Württemberg|Bayern|BW|OL/.test(t))) befunde.push(`${name}: Regionalliga Sued 1995/96 unten ${JSON.stringify(rs)}`);
    await ss('4k-rl-sued-unten');
    await archiv('1994/95', 'h4-badenwuerttemberg-oberliga');
    const sh = await ev(() => { const tr = document.querySelector('#content table.ltab tbody tr'); return { erste: tr && tr.textContent, zeilen: document.querySelectorAll('#content table.ltab tbody tr').length }; });
    if (!sh.erste || !/Sandhausen/.test(sh.erste) || !/Regionalliga Süd|▲/.test(sh.erste) || sh.zeilen !== 17) befunde.push(`${name}: Oberliga BW 1994/95 ${JSON.stringify(sh)}`);
    await ss('4l-oberliga-bw');
    await ev(() => { localStorage.setItem('ba_sb_verlauf_hist', '1'); App.showSteckbrief('svsandhausen_904'); });
    await warte(2000);
    const sv = await ev(() => { const M = App._sbVLModel, st = M && M.st.find(x => x.y === 1994); return st ? { L: st.L, lid: st.lid, rank: st.rank } : null; });
    if (!sv || sv.L !== 4 || sv.lid !== 'h4-badenwuerttemberg-oberliga' || sv.rank !== 1) befunde.push(`${name}: Ligaverlauf Sandhausen 1994/95 ${JSON.stringify(sv)}`);
    await ev(() => { const b = document.getElementById('sb-verlauf'); if (b) b.scrollIntoView(); });
    await ss('4m-sandhausen-verlauf');
    await ev(() => { document.getElementById('modal').style.display = 'none'; });

    // 4n. Heutige Liga mit Vorgaengern (Oberliga Westfalen 5-10 <- Ebene 3 1978-94 + Ebene 4 1994-2008): EINE Saisonauswahl
    //     mit Kuerzel E3/E4 und Trennern, Blaettern ueber die Ebenengrenze, Seitenleiste markiert 5-10, Vermerk, Ewige ab 1978
    await ev(() => { App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague('5-10'); });
    await warte(500);
    await ev(() => { const s = document.querySelector('#season-info span'); if (s) s.click(); });
    await page.waitForFunction(() => { const p = document.getElementById('spicker'); return p && p.style.display !== 'none' && !/lädt/.test(p.textContent); }, null, { timeout: 20000 });
    const pk = await ev(() => { const p = document.getElementById('spicker');
        return { n: p.querySelectorAll('.dots-item').length, e3: p.querySelectorAll('.spicker-ebene').length, seps: [...p.querySelectorAll('.spicker-sep')].map(d => d.textContent),
            breit: p.scrollWidth > p.clientWidth + 1 || p.getBoundingClientRect().right > window.innerWidth }; });
    await ev(() => { const p = document.getElementById('spicker'); const s = p.querySelector('.spicker-sep'); if (s) p.scrollTop = s.offsetTop - 60; });
    await ss('4n-picker');
    if (pk.e3 !== 30 || pk.seps.length !== 2 || !/Ebene 4 · 1994–2008/.test(pk.seps[0]) || !/Ebene 3 · 1978–1994/.test(pk.seps[1]) || pk.breit) befunde.push(`${name}: Saisonauswahl 5-10 ${JSON.stringify(pk)}`);
    await ev(() => { const it = [...document.querySelectorAll('#spicker .dots-item')].find(d => /^1994\/95/.test(d.textContent)); if (it) it.click(); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab'), null, { timeout: 20000 });
    await warte(400);
    const zst = () => ev(() => ({ lid: App.activeLeague, y: App.viewArchivedSeason && App.viewArchivedSeason.y,
        sb: (document.querySelector('.league-item.active .league-name') || {}).textContent, vermerk: /Damals Ebene \d – heute Oberliga Westfalen \(Ebene 5\)/.test(document.getElementById('content').textContent) }));
    const w1 = await zst();
    if (w1.lid !== 'h4-westfalen-oberliga' || w1.y !== '1994/95' || !/Westfalen/.test(w1.sb || '') || !w1.vermerk) befunde.push(`${name}: 1994/95 aus der Auswahl ${JSON.stringify(w1)}`);
    await ss('4o-vorgaenger-saison');
    await ev(() => App.prevSeason()); await warte(1200);
    const w2 = await zst();
    if (w2.lid !== 'h3-westfalen-oberliga' || w2.y !== '1993/94' || !w2.vermerk) befunde.push(`${name}: zurueck ueber die Ebenengrenze ${JSON.stringify(w2)}`);
    await ev(() => { App.viewArchivedSeason = { y: '2007/08', lid: 'h4-westfalen-oberliga' }; App.loadLeague('h4-westfalen-oberliga'); }); await warte(800);
    await ev(() => App.nextSeasonView()); await warte(1200);
    const w3 = await zst();
    if (w3.lid !== '5-10' || !/^2012\/13/.test(w3.y || '')) befunde.push(`${name}: vor von 2007/08 in die heutige Liga (NRW-Liga-Luecke 2008-12) ${JSON.stringify(w3)}`);
    await ev(() => { App.viewArchivedSeason = { y: '1985/86', lid: '5-10' }; App.loadLeague('5-10'); }); await warte(800);
    const w4 = await zst();
    if (w4.lid !== 'h3-westfalen-oberliga') befunde.push(`${name}: 5-10 in einer alten Saison oeffnet nicht den Vorgaenger ${JSON.stringify(w4)}`);
    await ev(() => App.setTableView('ewige')); await warte(800);
    const ewW = await ev(() => ({ lid: App.activeLeague, zeilen: document.querySelectorAll('#content tbody tr').length, soll: Object.keys((Engine.archive.ewige || {})['5-10'] || {}).length }));
    // 5-10 allein (2012-2024) hat 46 Vereine, mit Ebene 3 + 4 sind es 105
    if (ewW.lid !== '5-10' || ewW.zeilen < 100 || ewW.zeilen < ewW.soll) befunde.push(`${name}: Ewige Tabelle aus der Vorgaenger-Saison ${JSON.stringify(ewW)}`);
    await ss('4p-ewige-westfalen');
    await ev(() => { App.tableView = 'gesamt'; App.viewArchivedSeason = null; });
    // Seitenleiste: Vorgaenger mit heutigem Nachfolger stehen nicht mehr unter "Historische Ligen"
    await ev(() => { localStorage.setItem('ba_sb_hist', JSON.stringify(['all', 'brd1', 'brd2', 'brd3', 'brd4', 'ddr'])); App.renderSidebar(); });
    const sbAlt = await ev(() => [...document.querySelectorAll('.hist-sb-liga')].map(e => e.title).filter(t => /Oberliga (Westfalen|Baden-Württemberg|Hessen|Südwest) /.test(t)));
    if (sbAlt.length) befunde.push(`${name}: Vorgaenger noch in der Seitenleiste ${JSON.stringify(sbAlt)}`);
    await ev(() => { localStorage.removeItem('ba_sb_hist'); App.renderSidebar(); });

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

    // 6b. Rekorde und Siegerliste der Ligen, deren Vor-Sim-Start-Saisons NUR in HistExt stehen
    //     (Nutzerbefund 20.09.2026: "3. Liga / Regionalliga: noch keine Rekorde erfasst"). Der Backfill
    //     scannte nur IndexedDB und sah diese 289 Liga-Saisons nie.
    await ev(() => { const m = document.getElementById('modal'); if (m) m.style.display = 'none';
        App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; });
    await warte(300);
    const rek = await ev(() => {
        const R = (Engine.archive && Engine.archive.records) || {};
        const L = R.l || {};
        const soll = ['3', '4-1', '4-2', '4-3', '4-4', '4-5'];
        return { guard: !!R.bfx, ohne: soll.filter(l => !L[l] || !Object.keys(L[l]).length),
            ligen: Object.keys(L).length, scan: null };
    });
    if (rek.ohne.length || !rek.guard || rek.ligen < 20)
        befunde.push(`${name}: Liga-Rekorde fehlen ${JSON.stringify(rek)}`);
    await ev(() => { App.loadLeague('4-4'); App.setTableView('rekorde'); });
    await warte(1000);
    const rTxt = await ev(() => /noch keine Rekorde erfasst/.test(document.getElementById('content').textContent));
    if (rTxt) befunde.push(`${name}: Regionalliga West meldet weiter "keine Rekorde erfasst"`);
    await ss('8-rekorde-rl');

    // Siegerliste: was wurde aus dem Meister? (Aufstieg direkt / ueber die Relegation / gescheitert)
    await ev(() => { App.loadLeague('4-4'); App.setTableView('sieger'); });
    await page.waitForFunction(() => { const t = document.getElementById('sieger-chron'); return t && !/lädt/.test(t.textContent) && t.querySelectorAll('tr').length; }, null, { timeout: 25000 });
    await warte(500);
    const sg = await ev(() => { const tr = [...document.querySelectorAll('#sieger-chron tr')];
        return { n: tr.length, mit: tr.filter(x => /aufgestiegen|Relegation|kein Aufstieg/.test(x.textContent)).length,
            grund: tr.filter(x => /kein Aufstieg/.test(x.textContent) && x.querySelector('[title]')).length }; });
    // 2019/20 fehlt zu Recht: Roedinghausen war Meister der West, stieg aber nicht auf (Verl rueckte nach)
    // Roedinghausen 2019/20 (Meister ohne Lizenzantrag) muss "kein Aufstieg" MIT Begruendung tragen
    if (sg.n < 10 || sg.mit < sg.n || !sg.grund) befunde.push(`${name}: Aufstiegs-Ausgang in der Siegerliste ${JSON.stringify(sg)}`);
    await ss('9-sieger-rl');

    // 6c. Die ABGEBENDE Liga muss ihre eigenen Aufstiegsduelle sehen (Nutzerbefund 20.09.2026:
    //     "die relegation der 3. liga und den regionalligen zaehlt bloss ab 25/26"). Ursache war,
    //     dass die gefalteten Duelle nur die Ziel-Liga trugen (lW), nicht die Herkunft (lH/lA).
    // Gemessen wird die INDEXEDDB, nicht archive.relegation: die Chronik-Ansicht liest von dort
    // (_fillRelegationChronik), und genau da fehlten die Duelle. In einem frischen Stand faellt das
    // nicht auf, weil die leere Datenbank den Fallback aufs Archiv ausloest.
    const relLig = await ev(async () => {
        const rel = await IDBStore.getRelegation();
        const alle = rel.flatMap(r => r.results || []);
        const zaehl = lid => alle.filter(e => e.lH === lid || e.lA === lid || e.lW === lid).length;
        return { rl: ['4-1', '4-2', '4-3', '4-4', '4-5'].map(zaehl), liga3: zaehl('3'),
            idbSaisons: rel.length, mitAufstieg: rel.filter(r => (r.results || []).some(e => e.aufstieg)).length };
    });
    if (relLig.rl.some(n => n < 5) || relLig.liga3 < 10 || !relLig.mitAufstieg)
        befunde.push(`${name}: Aufstiegsduelle fehlen in der abgebenden Liga ${JSON.stringify(relLig)}`);
    await ev(() => { App.loadLeague('4-4'); App.setTableView('relegation'); });
    await page.waitForFunction(() => { const t = document.getElementById('rel-chron'); return t && !/lädt/.test(t.textContent); }, null, { timeout: 25000 });
    await warte(600);
    const relRl = await ev(() => { const t = document.getElementById('rel-chron');
        return { txt: t ? t.textContent.replace(/\s+/g, ' ') : '', n: (document.getElementById('rel-count') || {}).textContent }; });
    // Die Herkunftskuerzel machen erst kenntlich, wer gegen wen antrat
    if (!/RL (Nordost|West|Nord|Südwest|Bayern)/.test(relRl.txt) || !/Saison/.test(relRl.n || ''))
        befunde.push(`${name}: Relegations-Chronik der Regionalliga West ${JSON.stringify(relRl).slice(0, 220)}`);
    await ss('10-relegation-rl');
    await ev(() => { App.setTableView('gesamt'); });
    await ev(() => { App.setTableView('gesamt'); });

    // 6c2. Auf-/Abstiegsziel in der Archivtabelle ist zur anderen Liga verlinkt (Nutzerbefund 20.09.2026).
    //      Geprueft wird der KLICK, nicht nur das Attribut – ein onclick, das nichts bewirkt, faellt sonst nicht auf.
    await ev(() => { App.viewArchivedSeason = { y: '2013/14', lid: '2' }; App.tableView = 'gesamt'; App.loadLeague('2'); });
    await page.waitForFunction(() => document.querySelector('#content table.ltab tbody tr'), null, { timeout: 20000 });
    await warte(700);
    const vorKlick = await ev(() => App.activeLeague + '|' + ((App.viewArchivedSeason || {}).y || ''));
    await ev(() => { const s = document.querySelector('#content table.ltab tbody tr .itxt'); if (s) s.click(); });
    await warte(1400);
    const nachKlick = await ev(() => App.activeLeague + '|' + ((App.viewArchivedSeason || {}).y || ''));
    // Der Aufsteiger von 2013/14 spielte 2014/15 in der 1. Bundesliga – dorthin muss der Klick fuehren
    if (nachKlick !== '1|2014/15') befunde.push(`${name}: Ziellink in der Archivtabelle ${vorKlick} -> ${nachKlick}`);
    await ss('12-ziellink');
    // ... und zwar in JEDER Liga und auch in der laufenden Saison (Nutzerwunsch: "alle anklickbaren saisons
    // egal welcher liga"). Ein Auf-/Abstiegsziel ohne Link ist ein Befund; Platzhalter ohne echte Liga
    // ("▼ tiefere Liga") duerfen keinen haben.
    const ueberall = await ev(async () => {
        const hol = async (lid, y) => {
            App.viewArchivedSeason = y ? { y, lid } : null; App.tableView = 'gesamt'; App.loadLeague(lid);
            await new Promise(r => setTimeout(r, 1100));
            const sp = [...document.querySelectorAll('#content table.ltab tbody tr .itxt')];
            const echt = sp.filter(x => /^[▲▼▽⇄]/.test(x.textContent.trim()) && !/tiefere Liga|Relegation$/.test(x.textContent));
            return { n: echt.length, ohne: echt.filter(x => !x.getAttribute('onclick')).map(x => x.textContent.trim()) };
        };
        return { arch2: await hol('2', '2013/14'), archRl: await hol('4-4', '2015/16'),
            archDdr: await hol('ddr1', '1985/86'), live2: await hol('2', null), liveRl: await hol('4-4', null) };
    });
    const ohneLink = Object.entries(ueberall).filter(([, v]) => v.n && v.ohne.length);
    if (ohneLink.length) befunde.push(`${name}: Auf-/Abstiegsziel ohne Link ${JSON.stringify(ohneLink).slice(0, 220)}`);
    // Die DDR-Oberliga darf KEINE Bundesliga-Europaplaetze zeigen (eigene Startplaetze)
    const ddrEu = await ev(async () => {
        App.viewArchivedSeason = { y: '1985/86', lid: 'ddr1' }; App.tableView = 'gesamt'; App.loadLeague('ddr1');
        await new Promise(r => setTimeout(r, 1100));
        return /UEFA-Pokal|Landesmeister-Pokal|Champions League/.test(document.getElementById('content').textContent);
    });
    if (ddrEu) befunde.push(`${name}: DDR-Oberliga zeigt Bundesliga-Europaplaetze`);
    await ev(() => { App.viewArchivedSeason = null; App.tableView = 'gesamt'; });

    // 6d. Europapokal-Startplaetze im Archiv (Nutzerwunsch 20.09.2026, historisch recherchiert statt geraten).
    //     Die Probe nimmt drei Saisons mit VERSCHIEDENER Staffelung – eine feste Regel muesste an zweien scheitern.
    const eu = await ev(async () => {
        const hol = async (y) => {
            App.viewArchivedSeason = { y, lid: '1' }; App.tableView = 'gesamt'; App.loadLeague('1');
            await new Promise(r => setTimeout(r, 1100));
            return [...document.querySelectorAll('#content table.ltab tbody tr')].slice(0, 8)
                .map(tr => (tr.lastElementChild || {}).textContent.trim());
        };
        return { a1963: await hol('1963/64'), a2013: await hol('2013/14'), a2023: await hol('2023/24') };
    });
    // 1963/64: nur der Meister (Platz 1), Platz 2 leer. 2013/14: Platz 4 Qualifikation. 2023/24: fuenf CL-Plaetze.
    const euOk = /Landesmeister/.test(eu.a1963[0] || '') && !(eu.a1963[1] || '').trim()
        && /Champions/.test(eu.a2013[0] || '') && /Qualifikation/.test(eu.a2013[3] || '')
        && /Champions/.test(eu.a2023[4] || '') && /Europa/.test(eu.a2023[5] || '');
    if (!euOk) befunde.push(`${name}: Europapokal-Startplaetze ${JSON.stringify(eu).slice(0, 260)}`);
    await ss('11-europa');
    await ev(() => { App.viewArchivedSeason = null; App.tableView = 'gesamt'; });

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
