// Steckbrief → Zeile „🏅 Amateurpokal“ einer vergangenen Saison anklicken (Nutzer 13.11.2026, Neustadt/Orla 2100/01):
// Steckbrief schließt, der Amateurpokal DIESER Saison öffnet, der Verein steht im Teilnehmerfeld, obwohl er heute in
// einer Liga spielt. Feldgröße = A.field. Je Fall ein Verein, der damals ligalos war und heute in einer Liga spielt. Handy.
//   node .claude/skills/run/sb_amateur_klick_check.mjs [port] [saisons] [fälle]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 4), K = +(a[2] || 5);
const b = await chromium.launch(), befund = [];
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const faelle = await page.evaluate(([n, k]) => {
    Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false;
    const out = [];
    Engine.history.forEach((h, i) => (h.amateurpokal.promoted || []).forEach(id => {
        const played = (h.amateurpokal.rounds || []).some(r => r.played && r.matches.some(m => m.hId === id || m.aId === id));
        if (played && Engine.teams[id] && Engine.teams[id].leagueId && out.length < k) out.push({ id, y: h.year, i, field: h.amateurpokal.field });
    }));
    App.amateurTab = -2;   // zuletzt Ewige Tabelle offen – der Klick muss trotzdem die Saison zeigen
    return out;
}, [N, K]);
if (faelle.length < 3) befund.push(`nur ${faelle.length} Fälle – keine Aussage`);
for (const f of faelle) {
    await page.evaluate(id => App.showSteckbrief(id), f.id); await page.waitForTimeout(300);
    const zeile = page.locator('#modal div[onclick]').filter({ hasText: f.y }).filter({ hasText: 'Amateurpokal' }).first();
    if (!(await zeile.count())) { befund.push(`${f.id} ${f.y}: keine Amateurpokal-Zeile im Steckbrief`); continue; }
    await zeile.scrollIntoViewIfNeeded(); await zeile.click(); await page.waitForTimeout(400);
    const ist = await page.evaluate(id => {
        const m = document.getElementById('modal'), offen = !!m && m.style.display !== 'none' && getComputedStyle(m).display !== 'none';
        return { offen, liga: App.activeLeague, off: App.viewHistoryOffset, tab: App.amateurTab,
            imFeld: !!document.querySelector(`#content [onclick*="showSteckbrief('${id}')"]`),
            feld: +((/(\d+) ligalose Vereine/.exec(document.getElementById('content').textContent) || [])[1] || 0) };
    }, f.id);
    const fe = [];
    if (ist.offen) fe.push('Steckbrief bleibt offen');
    if (ist.liga !== '__amateur__') fe.push(`Ansicht ${ist.liga}`);
    if (ist.off !== f.i) fe.push(`Saison-Index ${ist.off} statt ${f.i}`);
    if (!ist.imFeld) fe.push('Verein fehlt im Teilnehmerfeld');
    if (ist.feld !== f.field) fe.push(`Feld ${ist.feld} statt ${f.field}`);
    console.log(`${f.id} ${f.y}: ${fe.length ? fe.join(' · ') : 'ok'} (Feld ${ist.feld})`);
    if (fe.length) befund.push(`${f.id} ${f.y}: ${fe.join(' · ')}`);
    if (f === faelle[0]) { await page.locator(`#content [onclick*="showSteckbrief('${f.id}')"]`).first().scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: 'docs/ewige-mobil/sb-amateur-klick.png' }); }
    await page.evaluate(() => { const m = document.getElementById('modal'); if (m) m.style.display = 'none'; App.viewHistoryOffset = null; });
}
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log(befund.length ? 'BEFUND:\n  ' + befund.join('\n  ') : 'Bestanden');
await b.close(); process.exit(befund.length ? 1 : 0);
