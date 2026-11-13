// Vergangene Sim-Saison (Nutzer 12.11.2026):
//  (a) einzelner Spieltag zeigt so viele ▲/▼ wie am Saisonende (keine spieltagsgenauen Zonen gespeichert),
//  (b) Hinweis über der Tabelle, wenn die Liga wächst/schrumpft ODER der Tausch je Richtung ungleich ist
//      („2 Absteiger, 3 kommen hoch, oben gleicht es aus“),
//  (c) Rückzug/Zwangsabstieg/Platz an die Erste (archive.strafen) zählen als Absteiger und stehen im Hinweis („davon …“)
//      und in der Zeile („↘ Rückzug: …“).
// Soll aus history[h] gegen history[h+1] bzw. Engine.teams; Ist aus dem DOM. Letzte Saison über App.prevSeason + _selectMatchday
// wie der Nutzer, ältere Saisons über viewHistoryOffset.
//   node .claude/skills/run/hist_spieltag_zonen_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, SAISONS = +(a[1] || 6);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), fehler = [], befund = [];
page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
// ältere Saisons schnell, die letzte ohne fastMode (der filtert matchdayHistory, docs/LIGABETRIEB.md)
await page.evaluate(n => {
    for (let i = 0; i < n - 1; i++) { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    Engine.fastMode = false; Engine.simulateFullSeason(); Engine.processSeasonTransition(); App.zonesCache = null;
}, SAISONS);
const soll = await page.evaluate(() => {
    const H = Engine.history, lv = id => id != null && Engine.leagues[id] ? Engine.leagues[id].level : null, out = [];
    for (let h = Math.max(0, H.length - 12); h < H.length; h++) {
        const jetzt = H[h].teams, ft = H[h + 1] ? H[h + 1].teams : Engine.teams;
        const S = ((Engine.archive.strafen || {})[H[h].year] || []).filter(s => s.art === 'zg' || s.art === 'zwang' || s.art === 'platz');
        Object.keys(Engine.leagues).forEach(lid => {
            const ll = Engine.leagues[lid].level, alt = Object.values(jetzt).filter(t => t.leagueId === lid); if (!alt.length) return;
            const r = { h, lid, auf: 0, ab: 0, rz: 0, weg: 0, vO: 0, vU: 0, q: 0, n1: alt.length, n2: 0 };
            alt.forEach(t => { const n = ft[t.id], nid = n ? n.leagueId : null; if (nid === lid) return; const nl = lv(nid);
                if (nl != null && nl < ll) r.auf++; else if (nl == null || nl > ll) { r.ab++; if (S.some(s => s.id === t.id && s.lid === lid)) r.rz++; } else r.weg++; });
            Object.entries(ft).forEach(([id, x]) => { if (!x || x.leagueId !== lid) return; r.n2++; const v = jetzt[id], vl = v ? lv(v.leagueId) : null;
                if (v && v.leagueId === lid) return; if (vl != null && vl < ll) r.vO++; else if (vl == null || vl > ll) r.vU++; else r.q++; });
            out.push(r);
        });
    }
    return out;
});
const lz = () => page.evaluate(() => ({
    up: document.querySelectorAll('table.ltab tr.row-fix-up, table.ltab tr.row-var-up').length,
    down: document.querySelectorAll('table.ltab tr.row-fix-down, table.ltab tr.row-var-down').length,
    rz: [...document.querySelectorAll('table.ltab td.inf .itxt')].filter(e => /^↘ (Rückzug|Zwangsabstieg|Platz an die Erste)/.test(e.textContent)).length,
    hinweis: (document.querySelector('#content .hist-tausch') || {}).textContent || '' }));
const letzte = Math.max(...soll.map(s => s.h));
let nH = 0, nGleich = 0, nRz = 0, nMd = 0;
for (const s of soll) {
    let ist, mitte = null;
    if (s.h === letzte) {
        await page.evaluate(lid => { App.viewHistoryOffset = null; App.viewArchivedSeason = null; App.matchdayViewIdx = null; App.tableView = 'gesamt'; App.loadLeague(lid); App.prevSeason(); }, s.lid);
        await page.waitForFunction(() => App.viewHistoryOffset !== null, null, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(100);
        if (await page.evaluate(() => App.viewHistoryOffset) !== s.h) { befund.push(`${s.lid}: prevSeason landet nicht in Saison ${s.h}`); continue; }
        ist = await lz();
        const idx = await page.evaluate(lid => { const mh = Engine.history[App.viewHistoryOffset].matchdayHistory || [];
            const ix = mh.map((m, i) => (m && (m.results || []).some(r => r.leagueId === lid)) ? i : -1).filter(i => i >= 0); return ix.length > 2 ? ix[Math.floor(ix.length / 2)] : null; }, s.lid);
        if (idx != null) { await page.evaluate(i => App._selectMatchday(i), idx); mitte = await lz(); nMd++; }
        await page.evaluate(() => { App.matchdayViewIdx = null; });
    } else {
        await page.evaluate(([lid, h]) => { App.viewArchivedSeason = null; App.matchdayViewIdx = null; App.tableView = 'gesamt'; App.viewHistoryOffset = h; App.loadLeague(lid); }, [s.lid, s.h]);
        ist = await lz();
    }
    const tag = `S${s.h} ${s.lid}`;
    if (ist.up !== s.auf || ist.down !== s.ab) befund.push(`${tag} Ende: ▲${ist.up}/${s.auf} ▼${ist.down}/${s.ab}`);
    if (mitte && (mitte.up !== s.auf || mitte.down !== s.ab)) befund.push(`${tag} Spieltag: ▲${mitte.up}/${s.auf} ▼${mitte.down}/${s.ab}`);
    if (ist.rz !== s.rz) befund.push(`${tag}: ${ist.rz} Zeilen „↘ Rückzug…“ statt ${s.rz}`);
    const sollH = s.n1 !== s.n2 || s.auf !== s.vO || s.ab !== s.vU || s.weg !== s.q;
    if (sollH !== !!ist.hinweis) { befund.push(`${tag}: Hinweis ${ist.hinweis ? 'zu viel' : 'fehlt'} (${s.n1}→${s.n2}, ▲${s.auf}↔${s.vO}, ▼${s.ab}↔${s.vU})`); continue; }
    if (!sollH) continue;
    nH++;
    const kopf = s.n1 === s.n2 ? `bleibt bei ${s.n2}` : `auf ${s.n2} (statt ${s.n1})`;
    if (!ist.hinweis.includes(kopf)) befund.push(`${tag}: Kopf „${kopf}“ fehlt: ${ist.hinweis}`);
    if ((s.ab || s.vU) && !ist.hinweis.includes(`unten: ${s.ab} Absteiger`)) befund.push(`${tag}: „unten: ${s.ab} Absteiger“ fehlt: ${ist.hinweis}`);
    if (s.rz && !/davon \d+ (Rückzug|Zwangsabstieg|Platz)/.test(ist.hinweis)) befund.push(`${tag}: Rückzug fehlt im Hinweis: ${ist.hinweis}`);
    if (s.rz) { nRz++; if (nRz <= 2) console.log(`${tag}: ${ist.hinweis.trim()}`); }
    if (s.n1 === s.n2) { nGleich++; if (nGleich <= 2) console.log(`${tag}: ${ist.hinweis.trim()}`); }
}
console.log(`Liga-Saisons ${soll.length} · Hinweise ${nH} (davon gleich groß ${nGleich}, mit Rückzug ${nRz}) · Spieltagsproben ${nMd}`);
if (nGleich < 3 || nRz < 3) befund.push(`zu wenig Fälle für eine Aussage (gleich groß ${nGleich}, Rückzug ${nRz}) – mehr Saisons`);
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log(befund.length ? 'BEFUND:\n  ' + befund.slice(0, 25).join('\n  ') + (befund.length > 25 ? `\n  … ${befund.length - 25} weitere` : '') : 'Bestanden');
await browser.close();
process.exit(befund.length ? 1 : 0);
