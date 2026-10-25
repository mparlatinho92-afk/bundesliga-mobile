// Stichprobe (25.10.2026): sechs Spielvereine stehen zum Sim-Start mit ihrer Historie in der Ewigen Tabelle (vorher 0 Saisons)
// node .claude/skills/run/neu_ewige_probe.mjs   (Server auf 3334)
import { chromium } from 'playwright';
const SOLL = { '6-12': { ssgnikolateslahamburg_511: 9, ssvrantzaubarmstedt_514: 7 }, '6-23': { spvgggeratal_869: 12 },
    '7-9': { steglitzerfcstern1900ii_808: 8 }, '8-3': { tsvlangenlonsheim_432: 12 }, '7-3': { svgruenewaldluexem_195: 13 } };
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://localhost:3334/template.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
const ist = await p.evaluate(S => { const o = {}; for (const [lid, m] of Object.entries(S)) for (const id of Object.keys(m)) { const e = (Engine.archive.ewige[lid] || {})[id]; o[lid + ' ' + id] = e ? e.years : 0; } return o; }, SOLL);
await b.close();
const bef = Object.entries(SOLL).flatMap(([lid, m]) => Object.entries(m).filter(([id, n]) => ist[lid + ' ' + id] !== n).map(([id, n]) => `${lid} ${id}: soll ${n}, ist ${ist[lid + ' ' + id]}`));
console.log(bef.length ? 'BEFUND\n  ' + bef.join('\n  ') : 'OK ' + JSON.stringify(ist)); process.exit(bef.length ? 1 : 0);
