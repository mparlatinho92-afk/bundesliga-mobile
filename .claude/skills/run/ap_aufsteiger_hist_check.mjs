// Amateurpokal, Reiter „Aufsteiger“ vergangener Saisons (Nutzer 13.11.2026: SV Westfalia Soest als Auf- UND Absteiger).
// Soll unabhängig aus den Schnappschüssen: ▲ unter der Liga, in der der Verein in der Folgesaison spielt; ▼ je Liga genau die
// Vereine, die damals in dieser Liga standen und in der Folgesaison ligalos waren. Ist aus dem DOM nach Klick wie der Nutzer.
// Kein Verein darf zugleich ▲ und ▼ stehen. Handy-Ansicht.
//   node .claude/skills/run/ap_aufsteiger_hist_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 6);
const b = await chromium.launch(), befund = [];
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const soll = await page.evaluate(n => {
    Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false;
    const nm = l => (Engine.leagues[l] || {}).name || l;
    return Engine.history.map((h, i) => { const folge = (Engine.history[i + 1] || {}).teams || Engine.teams, s = {};
        (h.amateurpokal.promoted || []).forEach(id => { const l = folge[id] && folge[id].leagueId; if (!l) return; (s[nm(l)] = s[nm(l)] || { auf: [], ab: [] }).auf.push(id); });
        Object.keys(s).forEach(L => { const lid = Object.keys(Engine.leagues).find(k => nm(k) === L);
            s[L].ab = Object.keys(h.teams).filter(id => h.teams[id].leagueId === lid && !(folge[id] && folge[id].leagueId)); });
        return s; });
}, N);
let ligen = 0, falsch = 0, doppelt = 0;
for (let i = 0; i < soll.length; i++) {
    await page.evaluate(i => { App.viewHistoryOffset = i; App.amateurTab = -1; App.showAmateurpokal(); }, i);
    await page.locator('#content [onclick]').filter({ hasText: /^Aufsteiger/ }).first().click(); await page.waitForTimeout(200);
    const ist = await page.evaluate(() => {
        const z = {}; let L = null;
        const box = [...document.querySelectorAll('#content div')].find(d => /Aufsteiger\. Je Bodenliga/.test(d.textContent) && d.nextElementSibling)?.nextElementSibling;
        if (!box) return null;
        for (const e of box.children) {
            const t = e.textContent.trim();
            if (/^NACHRÜCKER/.test(t)) break;
            if (e.style.letterSpacing) { L = t; z[L] = { auf: [], ab: [] }; continue; }
            const sp = e.querySelector('span[onclick*="showSteckbrief"]'); if (!sp || !L) continue;
            const id = /showSteckbrief\('([^']+)'/.exec(sp.getAttribute('onclick'))[1], pf = e.querySelector('span').textContent.trim();
            if (pf === '▲') z[L].auf.push(id); else if (pf === '▼') z[L].ab.push(id);
        }
        return z;
    });
    if (!ist) { befund.push(`Saison ${i}: kein Aufsteiger-Block`); continue; }
    const S = soll[i], so = x => [...x].sort().join(',');
    new Set([...Object.keys(S), ...Object.keys(ist)]).forEach(L => { ligen++;
        const s = S[L] || { auf: [], ab: [] }, t = ist[L] || { auf: [], ab: [] };
        if (so(s.auf) !== so(t.auf) || so(s.ab) !== so(t.ab)) { if (falsch++ < 4) befund.push(`Saison ${i} ${L}: ▲ ${so(t.auf)} statt ${so(s.auf)} · ▼ ${so(t.ab)} statt ${so(s.ab)}`); }
        t.auf.forEach(id => { if (t.ab.includes(id)) doppelt++; }); });
}
console.log(`${soll.length} Saisons · ${ligen} Liga-Blöcke · abweichend ${falsch} · zugleich ▲ und ▼ ${doppelt}`);
if (ligen < 30) befund.push('zu wenig Liga-Blöcke für eine Aussage');
if (doppelt) befund.push(`${doppelt}× derselbe Verein als Auf- und Absteiger`);
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log(befund.length ? 'BEFUND:\n  ' + befund.join('\n  ') : 'Bestanden');
await b.close(); process.exit(befund.length ? 1 : 0);
