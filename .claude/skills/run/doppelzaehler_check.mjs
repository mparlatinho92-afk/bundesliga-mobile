// Doppelzähler nach dem Neuladen (Nutzer 13.11.2026): neues Spiel, sofort Saisons simulieren (der einmalige Rekord-Backfill
// läuft asynchron und ist dann noch nicht durch), speichern, neu laden. apUp (Amateurpokal-Aufstiege) und vp (Verbandspokalsiege)
// müssen gleich bleiben und zum history-Fenster passen (neues Spiel = ganze Geschichte im Fenster).
//   node .claude/skills/run/doppelzaehler_check.mjs [port] [warte|sofort|heil] [gegen]
//   sofort gegen = live0 vor dem Speichern löschen (Stand von vor dem Fix) – _recDoppelHeilung setzt es beim Laden neu, besteht also
//   heil gegen   = Heilungs-Guard bleibt stehen – MUSS durchfallen
import { chromium } from 'playwright';
const [PORT = 3334, MODUS = 'sofort', GEGEN = ''] = process.argv.slice(2);
const b = await chromium.launch(), p = await (await b.newContext()).newPage(); p.on('dialog', d => d.accept());
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
const bereit = () => p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const zahl = () => p.evaluate(() => {
    const T = ((Engine.archive || {}).records || {}).t || {}, sum = k => Object.values(T).reduce((s, o) => s + ((o[k] || [0])[0]), 0);
    let apSoll = 0, vpSoll = 0;
    (Engine.history || []).forEach(h => { const A = h.amateurpokal || {}; apSoll += (A.promoted || []).length + (A.nachrueck || []).length;
        Object.values((h.pokal || {}).entrants || {}).forEach(e => { if (e && e.type === 'VP') vpSoll++; }); });
    return { ap: sum('apUp'), apSoll, vp: sum('vp'), vpSoll, bf: (Engine.archive.records || {}).bf || 0, live0: (Engine.archive.records || {}).live0 || null, n: Engine.history.length };
});
await p.goto(`http://localhost:${PORT}/template.html`); await bereit();
if (MODUS === 'warte') await p.waitForFunction(() => Engine.archive && Engine.archive.records && Engine.archive.records.bf, null, { timeout: 120000 });
// heil = verdoppelter Altstand: Zähler nach dem Spielen künstlich verdoppeln, Heilungs-Guard weg → nach dem Laden wieder einfach.
// heil gegen = Guard bleibt stehen → Heilung läuft nicht, MUSS durchfallen.
if (MODUS === 'heil') await p.waitForFunction(() => Engine.archive && Engine.archive.records && Engine.archive.records.bf, null, { timeout: 120000 });
await p.evaluate(([g, heil]) => { Engine.fastMode = true; for (let i = 0; i < 5; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    Engine.fastMode = false; const R = Engine.archive.records;
    if (g && !heil) delete R.live0;
    if (heil) { Object.values(R.t).forEach(o => { if (o.apUp) o.apUp[0] *= 2; if (o.vp) o.vp[0] *= 2; }); if (g) R.dh = 1; else delete R.dh; }
    Engine._archiveDirty = true; Engine.saveGame(); }, [GEGEN === 'gegen', MODUS === 'heil']);
const vor = await zahl(); await p.waitForTimeout(4000);
await p.reload(); await bereit();
await p.waitForFunction(() => Engine.archive && Engine.archive.records && Engine.archive.records.bf, null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(1500);
const nach = await zahl();
console.log(`${MODUS}${GEGEN ? ' GEGENPROBE' : ''}: vorher ${JSON.stringify(vor)}\n  nach Neuladen ${JSON.stringify(nach)}`);
const befund = [];
if (vor.ap < 3 || vor.vp < 3) befund.push('zu wenig Fälle für eine Aussage');
if (MODUS !== 'heil' && nach.ap !== vor.ap) befund.push(`apUp ${vor.ap} → ${nach.ap}`);
if (MODUS !== 'heil' && nach.vp !== vor.vp) befund.push(`vp ${vor.vp} → ${nach.vp}`);
if (MODUS === 'heil' && vor.ap !== 2 * vor.apSoll) befund.push('Verdopplung im Test nicht angekommen');
if (nach.ap !== nach.apSoll) befund.push(`apUp ${nach.ap} ≠ Fenster ${nach.apSoll}`);
if (nach.vp !== nach.vpSoll) befund.push(`vp ${nach.vp} ≠ Fenster ${nach.vpSoll}`);
if (!nach.bf) befund.push('Backfill nicht gelaufen');
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log(befund.length ? 'BEFUND: ' + befund.join(' · ') : 'Bestanden');
await b.close(); process.exit(befund.length ? 1 : 0);
