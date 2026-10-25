// Browser-Pruefung: Spalte „Zuletzt“ der Ewigen Tabelle (Sheet: letzte Saison in dieser Liga, eingeklappt mit Verbleib;
// Sonderfall Landesliga Berlin: Staffel UND Liga – gemeinsame Ansicht zaehlt beide Staffeln, Staffelansicht nur die eigene)
//   - eingeklappt: keine Spalte; aufgeklappt: „Zuletzt“ direkt vor „Verbleib“, Zellen gefuellt (nicht „…“)
//   - Rot-Weiss Essen: Bundesliga zuletzt 1976/77 (Wikipedia), Spielvereine der laufenden Saison = laufende Saison
//   - Berlin: gemeinsam = Maximum beider Staffeln, je Verein
//   - Sortierung nach Zuletzt (neueste zuerst), Handy ohne waagerechten Seiten-Scroll
// node .claude/skills/run/zuletzt_check.mjs   (--selbsttest: jede Saison ein Jahr zu frueh -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/verbleib', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    if (SELBST) await p.addInitScript(() => {
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._ewZuletzt) { const o = App._ewZuletzt;
            App._ewZuletzt = function (l, c) { const f = o.call(this, l, c); return f && (id => f(id) ? f(id) - 1 : 0); }; clearInterval(t); } }, 5);
    });
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && typeof HIST_EXT !== 'undefined' && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await p.evaluate(() => { try { localStorage.setItem('ba_ew_verbleib', '0'); } catch (e) {} App._ewVb = null; });
    const zeige = (lid, tv) => p.evaluate(([lid, tv]) => { App._ewSort = null; App._ewSuche = null; App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.loadLeague(lid); App.setTableView(tv || 'ewige'); }, [lid, tv]);
    const spalten = () => p.$$eval('#ew-tab thead th', ths => ths.map(t => t.innerText.trim()));
    const fertig = () => p.waitForFunction(() => [...document.querySelectorAll('#ew-tab td.ew-zl')].length && ![...document.querySelectorAll('#ew-tab td.ew-zl')].some(t => t.innerText === '…'), null, { timeout: 60000 }).catch(() => B('Zuletzt bleibt bei „…“'));

    await zeige('1'); await p.waitForTimeout(400);
    if ((await spalten()).some(s => /Zuletzt/.test(s))) B('Zuletzt ist ohne Klick schon offen');
    await p.locator('button', { hasText: 'Verbleib' }).first().click();
    await fertig();
    const sp = await spalten();
    if (sp[sp.length - 2] !== 'Zuletzt' || !/Verbleib/.test(sp[sp.length - 1])) B('Spalten am Ende: ' + sp.slice(-3).join(' | '));
    const bl = await p.evaluate(() => {
        const z = {}; document.querySelectorAll('#ew-tab tbody tr').forEach(tr => { const n = tr.querySelector('.tmn'); if (n) z[n.dataset.full] = tr.querySelector('td.ew-zl').innerText; });
        const cur = App._seasonStrOf(Engine.startYear + Engine.currentSeasonOffset);
        const live = Object.values(Engine.teams).filter(t => t.leagueId === '1').map(t => [t.name, z[t.name]]).filter(x => x[1] !== cur);
        return { rwe: z[(Engine.teams.rotweissessen_1127 || {}).name], live, cur, leer: Object.values(z).filter(v => v === '—').length, n: Object.keys(z).length };
    });
    if (bl.rwe !== '1976/77') B(`Rot-Weiss Essen Bundesliga zuletzt „${bl.rwe}“ statt 1976/77`);
    if (bl.live.length) B(`${bl.live.length} Bundesligisten nicht mit ${bl.cur}: ${JSON.stringify(bl.live.slice(0, 3))}`);
    if (bl.leer) B(`${bl.leer} von ${bl.n} ohne Saison`);
    // Sortierung: Klick auf Zuletzt -> neueste zuerst
    await p.locator('#ew-tab thead th', { hasText: 'Zuletzt' }).click(); await fertig();
    const sortiert = await p.$$eval('#ew-tab td.ew-zl', t => t.map(x => parseInt(x.innerText) || 0));
    if (sortiert.some((v, i) => i && v > sortiert[i - 1])) B('Sortierung nach Zuletzt nicht absteigend');
    // Berlin: gemeinsam = Maximum beider Staffeln
    const werte = async (lid, tv) => { await zeige(lid, tv); await fertig();
        return p.evaluate(() => { const z = {}; document.querySelectorAll('#ew-tab tbody tr').forEach(tr => { const n = tr.querySelector('.tmn'); if (n) z[n.dataset.full] = parseInt(tr.querySelector('td.ew-zl').innerText) || 0; }); return z; }); };
    const s1 = await werte('7-8'), s2 = await werte('7-9'), ges = await werte('7-8', 'ewige-combi');
    const falsch = Object.keys(ges).filter(n => ges[n] !== Math.max(s1[n] || 0, s2[n] || 0));
    if (!Object.keys(ges).length) B('Berlin gesamt: keine Zeilen');
    if (falsch.length) B(`Berlin gesamt: ${falsch.length} Vereine nicht Maximum beider Staffeln, z. B. ${falsch[0]} ${ges[falsch[0]]} vs ${s1[falsch[0]]}/${s2[falsch[0]]}`);
    if (!Object.keys(ges).some(n => s1[n] && s2[n] && s1[n] !== s2[n])) B('Berlin: kein Verein mit verschiedenen Staffel-Werten – Prüfung ohne Aussagekraft');
    if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Seite ${w}px breiter als der Bildschirm`); }
    await zeige('1'); await fertig();
    await p.screenshot({ path: `docs/verbleib/zuletzt-bl-${art}${SELBST ? '-selbsttest' : ''}.png` });
    await p.evaluate(() => App._ewigeVerbleibToggle());
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
