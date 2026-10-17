// Browser-Pruefung Paket 9 (Historie-Schlagzeilen) gegen template.html: Index wird im Hintergrund gebaut (IndexedDB + HistExt),
// eine Liga mit Historien-Anlass beim Spiel des Tages zeigt den Anriss aus REPORTS_HIST_PREVIEW ohne offene Slots, Desktop + Handy.
// node .claude/skills/run/historie_schlagzeilen_check.mjs   -> Screenshots nach docs/historie-schlagzeilen/ ; Exit 1 = Befund
// --selbsttest: REPORTS_HIST_PREVIEW wird geleert – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/historie-schlagzeilen');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const HIST_KEYS = ['wiedersehen', 'erstduell', 'dauerduell', 'rueckkehr', 'exmeister', 'rekordmeister', 'revanche'];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];

for (const [name, opt] of [['desktop', { viewport: { width: 1300, height: 900 } }],
                           ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    if (SELBST) await page.evaluate(() => { window.REPORTS_HIST_PREVIEW = {}; });
    // Index anstossen und warten (asynchron)
    await page.waitForFunction(() => !!App._histIndex(), null, { timeout: 60000, polling: 300 }).catch(() => befunde.push(name + ': Index nie fertig'));
    const info = await page.evaluate(() => { const X = App._histIdx; return X ? { tab: X.ty.length, vereine: Object.keys(X.team).length } : null; });
    if (!info || info.tab < 2500) befunde.push(name + ': Index zu klein ' + JSON.stringify(info));
    // Liga suchen, deren Vorschau-Spiel-des-Tages einen Historien-Anlass hat
    const treffer = await page.evaluate(keys => {
        for (const lid of Object.keys(Engine.leagues)) {
            const up = App._upcomingFixtures(lid); if (!up) continue;
            const byId = {}; Object.values(Engine.teams).filter(t => t.leagueId === lid).forEach(t => byId[t.id] = t);
            const fp = App._spielDesTagesPrev(up.groups.reduce((a, g) => a.concat(g.matches), []), byId, lid);
            if (keys.includes(fp.reasonKey)) return { lid, key: fp.reasonKey, reason: fp.reason };
        }
        return null;
    }, HIST_KEYS);
    if (!treffer) { befunde.push(name + ': keine Liga mit Historien-Anlass'); await ctx.close(); continue; }
    await page.evaluate(lid => App.loadLeague(lid), treffer.lid);
    await page.waitForTimeout(800);
    const note = await page.evaluate(() => { const e = document.querySelector('.res-item-feat .res-line-feat'); return e ? e.textContent.trim() : ''; });
    const pool = await page.evaluate(k => (window.REPORTS_HIST_PREVIEW && window.REPORTS_HIST_PREVIEW[k]) || [], treffer.key);
    // der Anriss muss aus dem Historien-Pool stammen (Muster mit Slots als Platzhalter)
    const passt = pool.some(z => new RegExp('^' + z.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[a-z]+\\?\}/g, '.+') + '$').test(note));
    if (!note) befunde.push(name + ': kein Anriss beim Spiel des Tages (' + treffer.lid + ')');
    else if (/\{/.test(note)) befunde.push(name + ': offener Slot: ' + note);
    else if (!passt) befunde.push(name + ': Anriss nicht aus REPORTS_HIST_PREVIEW.' + treffer.key + ': ' + note);
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (ueber) befunde.push(name + ': waagrechter Ueberlauf');
    await page.evaluate(() => { const e = document.querySelector('.res-item-feat'); if (e) e.scrollIntoView({ block: 'center' }); });
    await page.screenshot({ path: path.join(SHOT, `${name}-${treffer.key}.png`) });
    console.log(`${name}: Index ${info && info.tab} Tabellen, Liga ${treffer.lid} (${treffer.key}): ${note}`);
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler[0]);
    await ctx.close();
}
await browser.close();
if (befunde.length) { console.log((SELBST ? 'Selbsttest bestanden – ' : '') + 'BEFUND (' + befunde.length + ')\n  ' + befunde.join('\n  ')); process.exit(SELBST ? 0 : 1); }
if (SELBST) { console.log('Selbsttest NICHT bestanden: die Sabotage wurde nicht erkannt'); process.exit(1); }
console.log('Alles gruen – Screenshots in ' + SHOT);
