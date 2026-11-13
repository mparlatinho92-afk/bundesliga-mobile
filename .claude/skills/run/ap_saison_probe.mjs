// Spielstand importieren, Amateurpokal einer vergangenen Saison öffnen und nachsehen, wo ein Verein auftaucht
// (Teilnehmerfeld, Aufsteiger-Reiter, Runden).
//   node .claude/skills/run/ap_saison_probe.mjs <spielstand.json> <teamId> <saison> [port]
import { chromium } from 'playwright';
const [DATEI, ID, JAHR, PORT = 3334] = process.argv.slice(2);
const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await p.setInputFiles('#importFileInput', DATEI);
await p.waitForFunction(() => Engine.history && Engine.history.length > 5, null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(4000);
const r = await p.evaluate(([id, y]) => {
    const i = Engine.history.findIndex(h => h.year === y), h = Engine.history[i], A = h && h.amateurpokal;
    if (!A) return { i, keinAP: true };
    const runden = (A.rounds || []).map(rd => ({ n: rd.name, drin: (rd.matches || []).some(m => m.hId === id || m.aId === id) }));
    return { i, promoted: (A.promoted || []).includes(id), nachrueck: A.nachrueck || null, n: A.n || null, field: A.field,
        imSnapshot: h.teams[id] ? h.teams[id].leagueId : 'nicht im Snapshot', folge: ((Engine.history[i + 1] || {}).teams || Engine.teams)[id]?.leagueId, runden: runden.filter(x => x.drin).map(x => x.n) };
}, [ID, JAHR]);
console.log(JSON.stringify(r));
for (const [tab, name] of [[-1, 'Teilnehmerfeld'], [-5, 'Aufsteiger']]) {
    const da = await p.evaluate(([i, tab, id]) => { App.viewHistoryOffset = i; App.amateurTab = tab; App.showAmateurpokal();
        return !!document.querySelector(`#content [onclick*="showSteckbrief('${id}')"]`); }, [r.i, tab, ID]);
    console.log(`${name}: ${da ? 'Verein da' : 'Verein FEHLT'}`);
}
if (fehler.length) console.log('JS:', [...new Set(fehler)].join(' / '));
await b.close();
