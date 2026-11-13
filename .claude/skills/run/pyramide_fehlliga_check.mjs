// Archiv-Navigation einer heutigen Liga in Saisons ohne eigene Tabelle (Nutzerbefund 05.11.2026: Sachsenliga 1989/90 stand zwischen
// westdeutschen Landesligen und schlug die Bezirksligen im Südwesten vor). Desktop + Handy, klickt die Vorschläge.
// node .claude/skills/run/pyramide_fehlliga_check.mjs   -> docs/pyramide-fehlende-ligen/ ; Exit 1 = Befund
// --selbsttest: altes Verhalten (immer nach Ebene raten, keine Damals-Vorschläge) – dann MUSS die Prüfung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
const SHOT = path.resolve('../../../docs/pyramide-fehlende-ligen');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true });
const befunde = [];
const ok = (name, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${name}: ${txt}`); if (!bed) befunde.push(name + ': ' + txt); };

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { App._archRatenErlaubt = () => true; App._archDamals = () => []; });
    const oeffne = async (lid, y) => {
        await page.evaluate(([lid, y]) => { App.tableView = 'gesamt'; App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [lid, y]);
        await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(400);
    };
    const lies = () => page.evaluate(() => {
        const c = document.getElementById('content');
        const reihen = [...c.querySelectorAll('.navleiste > div')].slice(1).map(d => [...d.querySelectorAll('.navknopf')].map(b => (b.title === 'keine Archivdaten' ? '' : b.title) || b.textContent.replace(/^[↑↓] /, '').trim()));
        const vorschlag = [...c.querySelectorAll('button.btn')].filter(b => /viewArchivedSeason/.test(b.getAttribute('onclick') || '')).map(b => b.textContent.trim());
        const kopf = (c.textContent.match(/(Das Gebiet dieser Liga spielte|Auf dieser Ebene spielten)/) || [])[1] || '';
        return { reihen, vorschlag, kopf, tabelle: c.querySelectorAll('table tbody tr').length };
    });
    // 1 Sachsenliga 1989/90: keine westdeutschen Nachbarn, DDR-Bezirksligen Sachsens als Vorschlag, Klick öffnet Bezirksliga Dresden
    await oeffne('6-24', '1989/90');
    let r = await lies();
    const west = r.reihen.flat().filter(t => /Landesliga (Bremen|Mittelrhein|Südwest)|Bezirksliga (Nahe|Rheinhessen|Vorderpfalz|Westpfalz)/.test(t));
    ok(`${name} Sachsenliga 1989/90 Navleiste`, west.length === 0, west.length ? 'westdeutsche Ligen: ' + west.join(', ') : JSON.stringify(r.reihen));
    const soll = ['Bezirksliga Dresden (DDR)', 'Bezirksliga Leipzig (DDR)', 'Bezirksliga Karl-Marx-Stadt (DDR)'];
    ok(`${name} Sachsenliga 1989/90 Vorschlag`, JSON.stringify(r.vorschlag) === JSON.stringify(soll) && r.kopf === 'Das Gebiet dieser Liga spielte', `${r.kopf} → ${r.vorschlag.join(' | ')}`);
    await page.screenshot({ path: path.join(SHOT, `sachsenliga-1989-${name}.png`) });
    const dd = page.locator('#content button.btn', { hasText: 'Bezirksliga Dresden' });
    if (await dd.count()) {
        await dd.first().click();
        await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(500);
        const t = await page.evaluate(() => ({ lid: App.activeLeague, y: App.viewArchivedSeason && App.viewArchivedSeason.y, n: document.querySelectorAll('#content table tbody tr').length }));
        ok(`${name} Klick Bezirksliga Dresden`, t.lid === 'h3d-dresden-bezirksliga' && t.y === '1989/90' && t.n >= 10, JSON.stringify(t));
    } else ok(`${name} Klick Bezirksliga Dresden`, false, 'Knopf fehlt');
    // 2 Westfalenliga Staffel 2 1985/86: damals Verbandsliga Westfalen (Ebene 4), keine Ebene-5/6-Nachbarn
    await oeffne('6-26', '1985/86');
    r = await lies();
    const fremd = r.reihen.flat().filter(t => /Landesliga Bremen|Bezirksliga Nahe/.test(t));
    ok(`${name} Westfalenliga 2 1985/86`, !fremd.length && r.vorschlag.join() === 'Verbandsliga Westfalen' && r.kopf === 'Das Gebiet dieser Liga spielte', `${fremd.join(', ') || 'keine fremden Nachbarn'} · ${r.kopf} → ${r.vorschlag.join(' | ')}`);
    const vw = page.locator('#content button.btn', { hasText: 'Verbandsliga Westfalen' });
    if (await vw.count()) {
        await vw.first().click();
        await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(500);
        const t = await page.evaluate(() => ({ lid: App.activeLeague, n: document.querySelectorAll('#content table tbody tr').length }));
        ok(`${name} Klick Verbandsliga Westfalen`, /westfalen-verbandsliga/.test(t.lid) && t.n >= 10, JSON.stringify(t));
    }
    // 3 Gegenstück, darf sich nicht ändern: 3. Liga 2005/06 (gleiche Ebene damals) -> Regionalliga Nord/Süd
    await oeffne('3', '2005/06');
    r = await lies();
    ok(`${name} 3. Liga 2005/06 unverändert`, r.kopf === 'Auf dieser Ebene spielten' && r.vorschlag.join(' | ') === 'Regionalliga Nord | Regionalliga Süd', `${r.kopf} → ${r.vorschlag.join(' | ')}`);
    // 4 Sachsenliga mit Tabelle (1995/96 = Landesliga Sachsen) unverändert
    await oeffne('6-24', '1995/96');
    r = await lies();
    ok(`${name} Sachsenliga 1995/96 mit Tabelle`, r.tabelle >= 10 && r.reihen[0].join().includes('Oberliga Nordost Süd'), `${r.tabelle} Zeilen, oben ${r.reihen[0].join(' | ')}`);
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler.join(' | '));
    await ctx.close();
}
await lauf('desktop', { viewport: { width: 1280, height: 900 } });
await lauf('handy', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await browser.close();
console.log(befunde.length ? `\n${befunde.length} Befund(e)${SELBST ? ' – Selbsttest wie erwartet durchgefallen' : ''}` : '\nalles grün');
process.exit(befunde.length ? 1 : 0);
