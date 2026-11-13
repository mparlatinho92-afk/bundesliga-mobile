// Fix-Liste „Mobil-Check Historie (Badges M/P am Vereinsnamen in der .ltab-Tabelle) – vermutlich längst erledigt, im Spiel prüfen“
// (01.11.2026): Handy 412 px, Archiv Bundesliga 1991/92 (Vorjahresmeister Kaiserslautern „(M)“, Pokalsieger Werder „(P)“) und live
// Bundesliga. Geprüft: Abzeichen im Namen sichtbar (nicht abgeschnitten, nicht ausgeblendet), Pkt-Spalte vollständig im Bild, keine
// waagerechte Seitenverschiebung.   node .claude/skills/run/badges_mobil_check.mjs   (--selbsttest: Abzeichen per CSS ausblenden → MUSS durchfallen)
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/badges-mobil', { recursive: true });
const b = await chromium.launch(), bef = [];
const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const err = []; p.on('pageerror', e => err.push(e.message));
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
if (SELBST) await p.addStyleTag({ content: '.ltab .tm span[style*="font-size:12px"]{display:none!important}' });
const messe = () => p.evaluate(() => {
    const tab = document.querySelector('#content table.ltab'); if (!tab) return null;
    const vw = document.documentElement.clientWidth, rows = [...tab.querySelectorAll('tbody tr')];
    const mit = rows.map(tr => { const tm = tr.querySelector('.tm'); const t = tm ? tm.innerText : ''; const m = t.match(/\(([MPVNAR,\s]+)\)/);
        if (!m) return null; const sp = [...tm.querySelectorAll('span')].find(s => /\(/.test(s.textContent) && /[MP]/.test(s.textContent));
        const r = sp && sp.getBoundingClientRect(), td = tm.getBoundingClientRect();
        return { name: t.split('(')[0].trim(), b: m[1].trim(), sichtbar: !!(sp && r.width > 0 && getComputedStyle(sp).display !== 'none'), drin: !!(sp && r.right <= td.right + 1) }; }).filter(Boolean);
    const pkt = [...tab.querySelectorAll('thead th')].findIndex(th => /Pkt/.test(th.textContent));
    const pktZ = pkt >= 0 ? rows.map(tr => tr.children[pkt]).filter(Boolean).map(td => td.getBoundingClientRect().right) : [];
    return { mit, pktRechts: Math.max(0, ...pktZ), vw, breit: document.documentElement.scrollWidth - vw };
});
for (const [art, los] of [['archiv-1991-92', () => p.evaluate(() => App._sbSaisonGo('1', '1991/92'))], ['live', () => p.evaluate(() => { Engine.simulateFullSeason(); Engine.processSeasonTransition();   // erst nach einer Sim-Saison gibt es Vorjahresmeister/-pokalsieger
        App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.loadLeague('1'); })]]) {
    await los(); await p.waitForTimeout(1500);
    const m = await messe(); if (!m) { bef.push(`${art}: keine Tabelle`); continue; }
    console.log(art, JSON.stringify(m.mit), 'Pkt rechts', Math.round(m.pktRechts), '/', m.vw);
    if (art.startsWith('archiv')) {
        const k = m.mit.find(x => /Kaiserslautern/.test(x.name) && /M/.test(x.b)), w = m.mit.find(x => /Werder|Bremen/.test(x.name) && /P/.test(x.b));
        if (!k || !k.sichtbar || !k.drin) bef.push(`${art}: (M) bei Kaiserslautern fehlt/abgeschnitten ${JSON.stringify(k)}`);
        if (!w || !w.sichtbar || !w.drin) bef.push(`${art}: (P) bei Werder fehlt/abgeschnitten ${JSON.stringify(w)}`);
    } else { const mp = m.mit.filter(x => /[MP]/.test(x.b));   // nur M/P (der Fix-Punkt); die Messung erkennt den Span über [MP]
        if (!mp.length || mp.some(x => !x.sichtbar || !x.drin)) bef.push(`${art}: Abzeichen M/P ${JSON.stringify(mp)}`); }
    if (m.pktRechts > m.vw + 1) bef.push(`${art}: Pkt-Spalte abgeschnitten (${Math.round(m.pktRechts)} > ${m.vw})`);
    if (m.breit > 1) bef.push(`${art}: Seite ${m.breit}px breiter als der Bildschirm`);
    if (!SELBST) await p.screenshot({ path: `docs/badges-mobil/${art}-handy.png` });
}
err.forEach(e => bef.push('JS-Fehler: ' + e));
await b.close();
console.log(bef.length ? 'BEFUND\n  ' + bef.join('\n  ') : 'Alles gruen');
process.exit(bef.length ? 1 : 0);
