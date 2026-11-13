// Messung (Fix-Liste: „Ewige Tabelle der Amateurligen und des Amateurpokals bekommt die Anzahl der Aufstiege“):
// je Ebene Aufstiege in archive.ewige gegen Meistertitel (grobe Erwartung: ≥ 1 Aufstieg je Saison einer Liga mit Aufstiegsrecht).
//   node .claude/skills/run/ewige_aufstiege_probe.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 0);
const b = await chromium.launch(), p = await (await b.newContext()).newPage();
p.on('dialog', d => d.accept());
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await p.waitForTimeout(4000);   // HistExt-Faltung
const r = await p.evaluate(n => {
    for (let i = 0; i < n; i++) { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    const E = Engine.archive.ewige || {}, out = {};
    for (const lid in Engine.leagues) {
        const lv = Engine.leagues[lid].level, X = E[lid] || {}, o = out[lv] || (out[lv] = { ligen: 0, titel: 0, auf: 0, null: 0, beispiel: [] });
        o.ligen++; let t = 0, au = 0; for (const id in X) { t += X[id].titles || 0; au += X[id].promotions || 0; }
        o.titel += t; o.auf += au; if (t > 3 && au === 0) { o.null++; if (o.beispiel.length < 4) o.beispiel.push(`${lid} ${Engine.leagues[lid].name} (${t} Titel)`); }
    }
    return out;
}, N);
for (const [lv, o] of Object.entries(r)) console.log(`Ebene ${lv}: ${o.ligen} Ligen · Titel ${o.titel} · Aufstiege ${o.auf} · Ligen mit Titeln, aber 0 Aufstiegen: ${o.null} ${o.beispiel.join('; ')}`);
await b.close();
