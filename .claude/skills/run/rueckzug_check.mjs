// Browser-Pruefung: Auf-/Abstiegsspalte im Archiv vor dem Sim-Start (Nutzer 25.10.2026)
//   - „Amateurpokal“ gibt es nur in Sim-Saisons: Thüringenliga 2001–2024 zeigt ihn nie
//   - Meister 2015/16 Dachwig/Döllstädt: kein roter Abstieg, sondern „Fusion: FC An der Fahner Höhe“, Klick -> 2016/17 dieser Liga
//   - 2008/09: Platz 2 und 12 verlassen die Liga, schlechter Platzierte bleiben -> „Rückzug in tiefere Liga“, mit rotem Hintergrund;
//     Platz 4 (SG Rudisleben/BC 07 Arnstadt) -> „Fusion: SV 09 Arnstadt“. Rückzug ist rot (Nutzer 25.10.2026: „eine art abstieg“), Fusion nicht
//   - echte Absteiger ohne Folgeliga im Spiel: „▼ tiefere Liga“ (rot); Handy zeigt die Kurzform, Seite scrollt nicht waagerecht
// node .claude/skills/run/rueckzug_check.mjs   (--selbsttest: Sim-Start ins Jahr 1900 -> alles „Sim-Saison“ -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/rueckzug', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    if (SELBST) await p.evaluate(() => { Engine.startYear = 1900; });
    const zeige = async y => {
        await p.evaluate(y => { App.tableView = 'gesamt'; App.viewHistoryOffset = null; App.viewArchivedSeason = { y, lid: '6-23' }; App.loadLeague('6-23'); }, y);
        await p.waitForFunction(y => (document.querySelector('#content table.ltab') || /keine archivierte/.test(document.getElementById('content').textContent)) && App.viewArchivedSeason && App.viewArchivedSeason.y === y, y, { timeout: 60000 });
        await p.waitForTimeout(200);
        return p.evaluate(() => [...document.querySelectorAll('#content table.ltab tbody tr')].map(tr => ({ pl: parseInt(tr.querySelector('td').innerText),
            rot: tr.classList.contains('row-fix-down'), txt: ((tr.querySelector('.itxt') || {}).textContent || '').trim(), kurz: ((tr.querySelector('.iarr') || {}).textContent || '').trim(),
            sichtbar: (() => { const a = tr.querySelector('.iarr'), t = tr.querySelector('.itxt'); const vis = e => e && getComputedStyle(e).display !== 'none'; return vis(t) ? 'voll' : vis(a) ? 'kurz' : '-'; })() })));
    };
    // 1. nie „Amateurpokal“ vor dem Sim-Start
    const ap = [];
    for (let j = 2001; j <= 2023; j++) { const y = j === 1999 ? '1999/2000' : `${j}/${String(j + 1).slice(-2)}`;
        const z = await zeige(y); if (z.some(r => /Amateurpokal/.test(r.txt))) ap.push(y); }
    if (ap.length) B(`„Amateurpokal“ vor dem Sim-Start in Thüringenliga ${ap.join(', ')}`);
    // 2. Dachwig 2015/16
    let z = await zeige('2015/16');
    const m = z.find(r => r.pl === 1);
    if (!m || m.rot || !/Fusion: FC An der Fahner Höhe/.test(m.txt)) B('2015/16 Meister: ' + JSON.stringify(m));
    const ab = z.filter(r => r.rot);
    if (ab.length !== 4 || ab.some(r => r.txt !== '▼ tiefere Liga')) B('2015/16 Absteiger: ' + JSON.stringify(ab.map(r => r.pl + ' ' + r.txt)));
    if (art === 'handy') { if (z.some(r => r.txt && r.sichtbar === '-')) B('Handy: Info-Spalte unsichtbar');
        const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Seite ${w}px breiter als der Bildschirm`); }
    await p.screenshot({ path: `docs/rueckzug/thueringenliga-2015-${art}${SELBST ? '-selbsttest' : ''}.png`, fullPage: art === 'desktop' });
    if (m && /Fusion/.test(m.txt)) {   // Klick auf den Fusionsnachfolger: Folgesaison derselben Liga (dort spielt er)
        await p.locator('#content table.ltab tbody tr').first().locator(art === 'handy' ? '.iarr' : '.itxt').click(); await p.waitForTimeout(800);
        const st = await p.evaluate(() => ({ lid: App.activeLeague, y: App.viewArchivedSeason && App.viewArchivedSeason.y, da: /Fahner Höhe/.test(document.getElementById('content').textContent) }));
        if (st.lid !== '6-23' || st.y !== '2016/17' || !st.da) B('Klick Fusion: ' + JSON.stringify(st));
    }
    // 3. 2008/09: Rückzug statt Abstieg
    z = await zeige('2008/09');
    // Platz 4 SG Rudisleben/BC 07 Arnstadt ging 2009 im SV 09 Arnstadt auf (Wikipedia SV 09 Arnstadt) -> Fusion statt Rückzug
    const rz = z.filter(r => /Rückzug/.test(r.txt)).map(r => r.pl), fu = z.find(r => r.pl === 4);
    if (JSON.stringify(rz) !== '[2,12]' || z.some(r => /Rückzug/.test(r.txt) && !r.rot) || z.some(r => /Fusion/.test(r.txt) && r.rot) || !fu || !/Fusion: SV 09 Arnstadt/.test(fu.txt))
        B('2008/09 Rückzug/Fusion: ' + JSON.stringify(z.filter(r => r.txt).map(r => r.pl + ' ' + r.txt + (r.rot ? ' (rot)' : ''))));
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
