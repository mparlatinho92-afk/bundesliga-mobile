// Browser-Pruefung: Tabellenstatus fuer gesperrte Reserven (Sheet 18.10.2026: „Aufstieg in 2. Liga wird auch für
// 2. Mannschaften angezeigt, obwohl sie niemals aufsteigen können. nachrücker korrekt darstellen“).
//   A) 3. Liga: II auf Platz 1 -> „– kein Aufstiegsrecht“, Platz 2+3 ▲, Platz 4 ⇄ (Nachruecker)
//   B) Werder III auf Platz 1 ihrer Liga, Werder II eine Ebene darueber -> III gesperrt, Platz 2 ▲
//   C) Konferenz-Live-Tabelle und Ligapyramide faerben dieselben Zeilen (kein ▲ an der Reserve)
// node .claude/skills/run/reserve_sperre_check.mjs  (--selbsttest: Zonen wieder nach Platz -> MUSS durchfallen)
// Screenshots docs/reserve-sperre/ (Handy + Desktop)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/reserve-sperre', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }],
                          ['desktop', { viewport: { width: 1400, height: 900 } }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 90000 });
    if (SELBST) await p.evaluate(() => {
        Engine.aufstiegsZonen = function(lid, teams, zonen) {
            const z = zonen[lid], out = {};
            teams.forEach((t, i) => { if (i < z.fixUp) out[t.id] = 'fix'; else if (i < z.fixUp + z.varUp) out[t.id] = 'var'; });
            return out;
        };
    });
    // Lage herstellen: Verein auf Platz 1 (Raenge tauschen), Zonen neu rechnen, Tabelle zeigen
    const lage = (name) => p.evaluate(name => {
        const t = Object.values(Engine.teams).find(x => x.name === name);
        // zum Saisonstart fehlen Raenge teils -> neu durchnummerieren, t vorne
        const tab = Object.values(Engine.teams).filter(x => x.leagueId === t.leagueId && x !== t).sort((a, b) => (a.rank || 99) - (b.rank || 99));
        [t, ...tab].forEach((x, i) => x.rank = i + 1);
        App.zonesCache = null; App.viewArchivedSeason = null; App.loadLeague(t.leagueId);
        return t.leagueId;
    }, name);
    const zeilen = () => p.$$eval('table.ltab tbody tr', trs => trs.slice(0, 5).map(tr => ({
        name: tr.querySelector('.tmn')?.dataset.full, cls: tr.className.trim(),
        info: (tr.querySelector('.inf .iarr')?.dataset.f || '').trim() })));

    // A
    const res3 = await p.evaluate(() => {
        const l3 = Object.values(Engine.leagues).find(l => l.level === 3);
        let r = Object.values(Engine.teams).find(t => t.leagueId === l3.id && t.isReserve);
        return r ? r.name : null;
    });
    if (!res3) { bef.push(`${art} A: keine Reserve in der 3. Liga gefunden`); }
    else {
        await lage(res3); await p.waitForTimeout(500);
        const z = await zeilen();
        if (z[0].name !== res3) bef.push(`${art} A: ${res3} steht nicht auf Platz 1`);
        if (/▲|⇄/.test(z[0].info) || /up/.test(z[0].cls)) bef.push(`${art} A: ${res3} zeigt „${z[0].info}“ (${z[0].cls})`);
        if (!/kein Aufstiegsrecht/.test(z[0].info)) bef.push(`${art} A: Platz 1 ohne Hinweis „kein Aufstiegsrecht“`);
        if (!/^▲/.test(z[1].info) || !/^▲/.test(z[2].info)) bef.push(`${art} A: Platz 2/3 nicht ▲ (${z[1].info} / ${z[2].info})`);
        if (!/^⇄/.test(z[3].info)) bef.push(`${art} A: Platz 4 nicht ⇄ (${z[3].info})`);
        console.log(`${art} A ${res3}:`, z.slice(0, 4).map(r => `${r.name} → ${r.info || '–'}`).join(' | '));
        await p.screenshot({ path: `docs/reserve-sperre/3liga-${art}${SELBST ? '-selbsttest' : ''}.png` });
        // C: Konferenz-Live-Tabelle und Pyramide
        const c = await p.evaluate(name => {
            const t = Object.values(Engine.teams).find(x => x.name === name);
            const div = document.createElement('div'); div.innerHTML = App._liveTableHtml(t.leagueId);
            const tr = div.querySelector('tbody tr');
            return tr ? tr.className : '';
        }, res3);
        if (/up/.test(c)) bef.push(`${art} C: Live-Tabelle faerbt ${res3} als Aufsteiger (${c})`);
    }

    // B: Werder III eine Ebene unter die II
    const b3 = await p.evaluate(() => {
        const iii = Object.values(Engine.teams).find(t => t.name === 'SV Werder Bremen III');
        const ii = Object.values(Engine.teams).find(t => t.name === 'SV Werder Bremen II');
        const lv = t => Engine.leagues[t.leagueId].level;
        if (lv(iii) !== lv(ii) + 1) { const z = Engine.findTarget(iii, lv(ii) + 1, iii.leagueId); iii.leagueId = z.id; iii.rank = 0; }
        // II ins Mittelfeld (Platz 8): sie bleibt auf ihrer Ebene, also darf die III nicht hoch
        const t2 = Object.values(Engine.teams).filter(x => x.leagueId === ii.leagueId && x !== ii).sort((a, b) => (a.rank || 99) - (b.rank || 99));
        t2.splice(7, 0, ii); t2.forEach((x, i) => x.rank = i + 1);
        return { ii: lv(ii), iii: lv(iii) };
    });
    await lage('SV Werder Bremen III'); await p.waitForTimeout(500);
    const zb = await zeilen();
    console.log(`${art} B (II Ebene ${b3.ii}, III Ebene ${b3.iii}):`, zb.slice(0, 3).map(r => `${r.name} → ${r.info || '–'}`).join(' | '));
    if (zb[0].name !== 'SV Werder Bremen III') bef.push(`${art} B: Werder III nicht auf Platz 1`);
    if (/▲|⇄/.test(zb[0].info)) bef.push(`${art} B: Werder III zeigt „${zb[0].info}“`);
    if (!/^▲/.test(zb[1].info)) bef.push(`${art} B: Platz 2 rueckt nicht nach (${zb[1].info || 'leer'})`);
    await p.screenshot({ path: `docs/reserve-sperre/werder3-${art}${SELBST ? '-selbsttest' : ''}.png` });
    // B2: steht die II auf dem Aufstiegsplatz, darf die III nachziehen (Vorausschau auf die naechste Saison)
    const b2 = await p.evaluate(() => {
        const ii = Object.values(Engine.teams).find(t => t.name === 'SV Werder Bremen II');
        const iii = Object.values(Engine.teams).find(t => t.name === 'SV Werder Bremen III');
        const t2 = Object.values(Engine.teams).filter(x => x.leagueId === ii.leagueId && x !== ii).sort((a, b) => a.rank - b.rank);
        [ii, ...t2].forEach((x, i) => x.rank = i + 1);
        App.zonesCache = null;
        const z = Engine.calcZones();
        const tab = Object.values(Engine.teams).filter(x => x.leagueId === iii.leagueId).sort((a, b) => a.rank - b.rank);
        return { iiFix: z[ii.leagueId].fixUp, iii: Engine.aufstiegsZonen(iii.leagueId, tab, z)[iii.id] || '' };
    });
    if (b2.iiFix > 0 && b2.iii !== 'fix') bef.push(`${art} B2: II auf dem Aufstiegsplatz, III trotzdem „${b2.iii}“ statt ▲`);
    console.log(`${art} B2: II Platz 1 (fixUp ${b2.iiFix}) -> III ${b2.iii || '–'}`);
    // Mobil: Pkt-Spalte nicht abgeschnitten
    if (art === 'handy') {
        const breit = await p.evaluate(() => { const t = document.querySelector('table.ltab'); return t ? t.scrollWidth - t.parentElement.clientWidth : 0; });
        if (breit > 2) bef.push(`handy: Tabelle ${breit}px breiter als ihr Rahmen`);
    }
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `\nBEFUND (${bef.length})\n  ` + bef.join('\n  ') : '\nOK');
process.exit(bef.length ? 1 : 0);
