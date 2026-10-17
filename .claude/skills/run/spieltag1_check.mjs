// Browser-Pruefung: keine Tabellen-Kommentare, solange die Tabelle vor dem Spiel leer war (Nutzer 17.10.2026: „vor Spieltag 1
// Ausschluss von Formulierungen die den Tabellenstand kommentieren. Wenn alle 0 haben, ist das sinnlos").
//   A) Vorschau Spieltag 1: kein Spiel des Tages mit Tabellen-Grund (topduell/abstiegskrimi/europa/rangduell/ueberraschung/form*)
//   B) Ergebnisse von Liga-Spieltag 1: dito, und keine Schlagzeilen-Kategorie spitzenspiel/kellerduell
//   C) Gegenprobe ab Liga-Spieltag 2: Tabellen-Gruende kommen wieder vor (sonst waere die Sperre ein Dauer-Aus)
// Saisonkalender: ein Termin ist nicht fuer jede Liga deren Spieltag – B/C werden je Liga nach ihrem eigenen Spieltag
// einsortiert und ueber mehrere Termine gesammelt.
// node .claude/skills/run/spieltag1_check.mjs  (--selbsttest: Sperre ausgehebelt -> MUSS in A UND B durchfallen); Screenshot docs/spieltag1/
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/spieltag1', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 });
const p = await ctx.newPage(), err = [], bef = [];
p.on('pageerror', e => err.push(String(e)));
await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
await p.waitForFunction(() => !!App._histIndex(), null, { timeout: 60000, polling: 300 }).catch(() => {});
if (SELBST) await p.evaluate(() => {
    const o = App._sdtCtx; App._sdtCtx = function (t, l) { return o.call(this, t, l, false); };
    const c = App._reportCategory; App._reportCategory = function (r, x) { return c.call(this, Object.assign({}, r, { md: 99 }), x); };
});
const TAB = ['topduell', 'abstiegskrimi', 'europa', 'rangduell', 'ueberraschung', 'formstark', 'formkrise'];
// je Liga: Vorschau-Grund, und falls Ergebnisse da sind: Liga-Spieltag, Grund, Tabellen-Kategorien
const messen = () => p.evaluate(TAB => {
    const out = [];
    for (const lid of Object.keys(Engine.leagues)) {
        const teams = Object.values(Engine.teams).filter(t => t.leagueId === lid);
        if (teams.length < 2) continue;
        const byId = {}, byName = {}; teams.forEach(t => { byId[t.id] = t; byName[t.name] = t; });
        const o = { lid };
        const up = App._upcomingFixtures(lid);
        if (up) o.prev = App._spielDesTagesPrev(up.groups.reduce((a, g) => a.concat(g.matches), []), byId, lid).reasonKey;
        const day = (Engine.matchdayResults || []).filter(r => r.leagueId === lid);
        if (day.length) {
            o.md = day[0].md || Engine.currentMatchday;
            o.res = App._spielDesTages(day, byName, lid, o.md).reasonKey;
            o.kat = day.map(r => App._reportCategory(r.md ? r : Object.assign({}, r, { md: o.md }), byName)).filter(k => k === 'spitzenspiel' || k === 'kellerduell').length;
        }
        out.push(o);
    }
    return out;
}, TAB);
const A = await messen();
const aTab = A.filter(o => o.prev && TAB.includes(o.prev));
if (aTab.length) bef.push(`A Vorschau Spieltag 1: ${aTab.length} von ${A.filter(o => o.prev).length} Ligen mit Tabellen-Grund (${aTab.slice(0, 4).map(o => o.lid + ':' + o.prev).join(', ')})`);
const B = { ligen: 0, tab: [], kat: 0 }, C = { ligen: 0, tab: 0, kat: 0 };
for (let i = 0; i < 10; i++) {
    await p.evaluate(() => { Engine.playNextMatchday(); });
    if (i === 0) { await p.evaluate(() => App.loadLeague('1')); await p.waitForTimeout(600); await p.screenshot({ path: 'docs/spieltag1/nach-termin1-handy.png' }); }
    for (const o of await messen()) {
        if (o.md == null) continue;
        if (o.md <= 1) { B.ligen++; if (TAB.includes(o.res)) B.tab.push(o.lid + ':' + o.res); B.kat += o.kat; }
        else { C.ligen++; if (TAB.includes(o.res)) C.tab++; C.kat += o.kat; }
    }
}
if (B.ligen < 30) bef.push(`B: nur ${B.ligen} Ligen mit Spieltag-1-Ergebnissen erfasst – zu wenig fuer eine Aussage`);
if (B.tab.length) bef.push(`B Ergebnisse Spieltag 1: ${B.tab.length} von ${B.ligen} Ligen mit Tabellen-Grund (${B.tab.slice(0, 4).join(', ')})`);
if (B.kat) bef.push(`B Ergebnisse Spieltag 1: ${B.kat} Schlagzeilen spitzenspiel/kellerduell`);
if (!C.tab && !C.kat) bef.push(`C ab Spieltag 2: kein einziger Tabellen-Grund in ${C.ligen} Liga-Spieltagen – die Sperre wirkt dauerhaft`);
console.log(`A Vorschau Sp.1: ${A.filter(o => o.prev).length} Ligen, Tabellen-Grund ${aTab.length} | B Ergebnisse Sp.1: ${B.ligen} Ligen, Tabellen-Grund ${B.tab.length}, Kategorien ${B.kat} | C ab Sp.2: ${C.ligen} Liga-Spieltage, Tabellen-Grund ${C.tab}, Kategorien ${C.kat}`);
if (err.length) bef.push('JS-Fehler ' + err[0]);
await b.close();
if (SELBST) {
    const a = bef.some(x => x.startsWith('A ')), bb = bef.some(x => x.startsWith('B Ergebnisse'));
    if (a && bb) { console.log('Selbsttest bestanden – A und B schlagen an:\n  ' + bef.join('\n  ')); process.exit(0); }
    console.log('Selbsttest NICHT bestanden (A ' + a + ', B ' + bb + '):\n  ' + bef.join('\n  ')); process.exit(1);
}
if (bef.length) { console.log('BEFUND (' + bef.length + ')\n  ' + bef.join('\n  ')); process.exit(1); }
console.log('Alles gruen');
