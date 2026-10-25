// Browser-Pruefung: Ewige Tabelle in abgeschlossenen Saisons + historische Aufstiege (Sheet/Nutzer 25.10.2026)
//   - Aufstiege vor dem Sim-Start zaehlen (Folgesaison hoeher): 1. FC Koeln aus der 2. BL 7x (2000, 2003, 2005, 2008, 2014, 2019, 2025), Hamburger SV 1x (2024/25)
//   - „Stand nach Saison X“ = Abschlusstabellen bis X neu addiert; nach der letzten Saison MUSS er den Archiv-Summen
//     gleichen, und zwar in JEDER Liga mit Ewiger Tabelle (Spiel-Ligen und rein historische), auch nach zwei gespielten Saisons
//   - Bundesliga 1985/86: Reiter „Ewige Tabelle“ -> Stand nach 1985/86 (Bayern 8 Titel, 21 Jahre), „Gesamtstand heute“ fuehrt zurueck
//   - DDR-Oberliga 1980/81: BFC Dynamo 3 Titel; Vorgaenger-Liga zeigt die Ewige Tabelle der heutigen Liga
//   - Handy: kein waagerechter Seiten-Scroll
// node .claude/skills/run/ewige_stand_check.mjs   (--selbsttest: Stand laesst die letzte Saison weg -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/ewige-stand', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    if (SELBST) await p.addInitScript(() => {
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._ewigeStand) { const o = App._ewigeStand;
            App._ewigeStand = function (l, y) { return o.call(this, l, y - 1); }; clearInterval(t); } }, 5);
    });
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && typeof HIST_EXT !== 'undefined'
        && Engine.archive.histExtSeeded === HIST_EXT.version && Engine.archive.histAufVer === Engine.HIST_AUF_VER, null, { timeout: 120000 });
    // 1. historische Aufstiege
    const auf = await p.evaluate(() => { const E = Engine.archive.ewige['2'] || {};
        return { koeln: (E['1fckoeln_1070'] || {}).promotions, hsv: (E['hamburgersv_475'] || {}).promotions,
            summe: Object.values(Engine.archive.ewige).reduce((s, L) => s + Object.values(L).reduce((t, e) => t + (e.promotions || 0), 0), 0) }; });
    if (auf.koeln !== 7) B(`1. FC Koeln: ${auf.koeln} Aufstiege aus der 2. BL statt 7`);
    if (auf.hsv !== 1) B(`Hamburger SV: ${auf.hsv} Aufstiege aus der 2. BL statt 1`);
    if (art === 'desktop') console.log('Aufstiege gesamt (alle Ligen):', auf.summe);
    // 2. Stand nach der letzten Saison == Archiv-Summen, je Liga
    const gleich = async (wann) => {
        await p.evaluate(() => { App._ewSt = null; App._ewigeStand(['1'], 0); });
        await p.waitForFunction(() => App._ewSt && App._ewSt.byLid, null, { timeout: 120000 });
        return p.evaluate(() => {
            const A = Engine.archive.ewige, F = ['years', 'p', 'w', 'd', 'l', 'gf', 'ga', 'pts', 'titles', 'promotions'];
            const last = Engine.startYear + Engine.currentSeasonOffset - 1, out = { ligen: 0, abw: [] };
            const HL = HIST_EXT.ligen;
            for (const lid of Object.keys(A)) {
                if (!Object.keys(A[lid]).length) continue;
                const hl = App._histLeague(lid), y = hl ? hl.lastYear : last;
                const st = App._ewigeStand([lid], y) || {};
                out.ligen++;
                const ids = new Set([...Object.keys(A[lid]).filter(id => A[lid][id].years > 0), ...Object.keys(st)]);
                for (const id of ids) { const a = A[lid][id] || {}, s = st[id] || {};
                    const f = F.find(k => (a[k] || 0) !== (s[k] || 0));
                    if (f) { out.abw.push(`${lid} ${id} ${f}: Archiv ${a[f] || 0}, Stand ${s[f] || 0}`); break; } }
            }
            return out;
        });
    };
    let g = await gleich();
    if (g.abw.length) B(`Stand nach letzter Saison ≠ Archiv in ${g.abw.length} von ${g.ligen} Ligen, z. B. ${g.abw.slice(0, 3).join(' | ')}`);
    if (g.ligen < 100) B(`nur ${g.ligen} Ligen verglichen`);
    if (art === 'desktop') {   // zwei gespielte Saisons: Spiel-Saisons aus der Datenbank, Aufstiege aus der Folgesaison
        await p.evaluate(() => { Engine.fastMode = true; for (let i = 0; i < 2; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.saveGame(); });
        g = await gleich();
        if (g.abw.length) B(`nach 2 Saisons: Stand ≠ Archiv in ${g.abw.length} Ligen, z. B. ${g.abw.slice(0, 3).join(' | ')}`);
        const simAuf = await p.evaluate(() => { const y = Engine.startYear + Engine.currentSeasonOffset - 1, a = App._ewigeStand(['2'], y), v = App._ewigeStand(['2'], y - 2);
            return Object.values(a).reduce((s, e) => s + e.promotions, 0) - Object.values(v).reduce((s, e) => s + e.promotions, 0); });
        if (simAuf < 2) B(`2. BL: in zwei gespielten Saisons nur ${simAuf} Aufstiege im Stand`);
    }
    // 3. Bundesliga 1985/86, Reiter Ewige Tabelle
    await p.evaluate(() => { App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.viewArchivedSeason = { y: '1985/86', lid: '1' }; App.loadLeague('1'); });
    const reiter = p.locator('#content button', { hasText: 'Ewige Tabelle' });
    if (!(await reiter.count())) B('Bundesliga 1985/86: kein Reiter Ewige Tabelle');
    else {
        await reiter.first().click();
        await p.waitForFunction(() => document.getElementById('ew-tab'), null, { timeout: 60000 }).catch(() => B('Bundesliga 1985/86: Ewige Tabelle erscheint nicht'));
        const bl = await p.evaluate(() => { const z = {}; document.querySelectorAll('#ew-tab tbody tr').forEach(tr => { const n = tr.querySelector('.tmn'), td = tr.querySelectorAll('td');
            if (n) z[n.dataset.full] = [...td].map(t => t.innerText.trim()); });
            const kopf = [...document.querySelectorAll('#ew-tab thead th')].map(t => t.innerText.trim());
            return { txt: document.getElementById('content').innerText.includes('Stand nach Saison 1985/86'), bayern: z['FC Bayern München'], kopf, n: Object.keys(z).length }; });
        if (!bl.txt) B('Bundesliga 1985/86: Kopf „Stand nach Saison 1985/86“ fehlt');
        const sp = k => bl.kopf.findIndex(h => h.startsWith(k));
        if (!bl.bayern || bl.bayern[sp('Titel')] !== '8' || bl.bayern[sp('Jahre')] !== '21') B('Bayern nach 1985/86: ' + JSON.stringify(bl.bayern && { titel: bl.bayern[sp('Titel')], jahre: bl.bayern[sp('Jahre')] }));
        if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Seite ${w}px breiter als der Bildschirm`); }
        await p.screenshot({ path: `docs/ewige-stand/bl-1985-${art}${SELBST ? '-selbsttest' : ''}.png` });
        await p.locator('#ew-heute').click(); await p.waitForTimeout(500);
        const h = await p.evaluate(() => ({ va: App.viewArchivedSeason, tv: App.tableView, stand: !!document.getElementById('ew-heute'), tab: !!document.getElementById('ew-tab') }));
        if (h.va || h.tv !== 'ewige' || h.stand || !h.tab) B('„Gesamtstand heute“: ' + JSON.stringify(h));
        // Gegenknopf (Nutzer 25.10.2026: „geht nicht mehr rückgängig“) – geklickt, nicht nur gesucht; zweimal hin und her
        for (let i = 0; i < 2; i++) {
            if (!(await p.locator('#ew-zurueck').count())) { B(`kein Knopf zurück zum Stand nach 1985/86 (Runde ${i + 1})`); break; }
            await p.locator('#ew-zurueck').click(); await p.waitForFunction(() => document.getElementById('ew-tab'), null, { timeout: 60000 }).catch(() => {});
            const z = await p.evaluate(() => ({ va: App.viewArchivedSeason && App.viewArchivedSeason.y, lid: App.activeLeague, stand: !!document.getElementById('ew-heute') && document.getElementById('content').innerText.includes('Stand nach Saison 1985/86') }));
            if (z.va !== '1985/86' || z.lid !== '1' || !z.stand) { B('zurück zum Stand: ' + JSON.stringify(z)); break; }
            await p.locator('#ew-heute').click(); await p.waitForTimeout(400);
        }
        await p.evaluate(() => { App.viewArchivedSeason = null; App.loadLeague('2'); App.loadLeague('1'); });
        if (await p.locator('#ew-zurueck').count()) B('Rückweg-Knopf bleibt nach Ligawechsel stehen');
    }
    // 4. DDR-Oberliga 1980/81 + Vorgaenger-Liga
    await p.evaluate(() => { App.viewArchivedSeason = { y: '1980/81', lid: 'ddr1' }; App.tableView = 'ewige'; App.loadLeague('ddr1'); });
    await p.waitForFunction(() => document.getElementById('ew-tab'), null, { timeout: 60000 }).catch(() => B('DDR-Oberliga 1980/81: keine Ewige Tabelle'));
    const ddr = await p.evaluate(() => { const kopf = [...document.querySelectorAll('#ew-tab thead th')].map(t => t.innerText.trim()), ti = kopf.findIndex(h => h.startsWith('Titel'));
        const tr = [...document.querySelectorAll('#ew-tab tbody tr')].find(t => /BFC Dynamo|Berliner FC Dynamo|Dynamo Berlin/.test(t.innerText));
        return { stand: document.getElementById('content').innerText.includes('Stand nach Saison 1980/81'), titel: tr ? tr.querySelectorAll('td')[ti].innerText.trim() : null }; });
    if (!ddr.stand || ddr.titel !== '3') B('DDR-Oberliga 1980/81: ' + JSON.stringify(ddr));
    // fruehester Vorgaenger seiner heutigen Liga: nach drei Saisons hat dort niemand mehr als drei Jahre
    const vorg = await p.evaluate(() => { const NF = HIST_EXT.ligaNachfolger, L = HIST_EXT.ligen;
        return Object.keys(NF).find(h => Engine.leagues[NF[h]] && L[h].lastYear > L[h].firstYear + 3 && Object.keys(NF).every(o => NF[o] !== NF[h] || L[o].firstYear >= L[h].firstYear)); });
    await p.evaluate(v => { const h = HIST_EXT.ligen[v]; App.viewArchivedSeason = { y: App._seasonStrOf(h.firstYear + 2), lid: v }; App.tableView = 'ewige'; App.loadLeague(v); }, vorg);
    await p.waitForFunction(() => document.getElementById('ew-tab'), null, { timeout: 60000 }).catch(() => B('Vorgaenger ' + vorg + ': keine Ewige Tabelle'));
    const vg = await p.evaluate(v => { const h = HIST_EXT.ligen[v]; return { al: App.activeLeague, stand: document.getElementById('content').innerText.includes('Stand nach Saison ' + App._seasonStrOf(h.firstYear + 2)),
        jahre: Math.max(...[...document.querySelectorAll('#ew-tab tbody tr')].map(tr => parseInt(tr.querySelectorAll('td')[4].innerText) || 0)) }; }, vorg);
    if (vg.al !== vorg || !vg.stand || vg.jahre > 3) B(`Vorgaenger ${vorg}: ${JSON.stringify(vg)}`);
    await p.locator('#ew-heute').click(); await p.waitForTimeout(400);
    const vh = await p.evaluate(v => ({ al: App.activeLeague, soll: HIST_EXT.ligaNachfolger[v], zur: !!document.getElementById('ew-zurueck') }), vorg);
    if (vh.al !== vh.soll || !vh.zur) B(`Vorgaenger ${vorg}, Gesamtstand heute: ${JSON.stringify(vh)}`);
    else { await p.locator('#ew-zurueck').click(); await p.waitForFunction(() => document.getElementById('ew-tab'), null, { timeout: 60000 }).catch(() => {});
        const vz = await p.evaluate(() => ({ al: App.activeLeague, stand: !!document.getElementById('ew-heute') }));
        if (vz.al !== vorg || !vz.stand) B(`Vorgaenger ${vorg}, zurück zum Stand: ${JSON.stringify(vz)}`); }
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
