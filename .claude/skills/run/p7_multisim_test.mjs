// Probelauf für docs/handouts/P7_multisim.js mit einer Attrappe als Engine: Lauf bis zum Ende, Stopp mittendrin,
// Schließen + Neustart (kein Hintergrundlauf), Exception → sauberes Ende mit Save.
//   node .claude/skills/run/p7_multisim_test.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const code = fs.readFileSync('docs/handouts/P7_multisim.js', 'utf8');
const browser = await chromium.launch();
const p = await browser.newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
let antwort = '5'; p.on('dialog', d => d.accept(antwort));
await p.setContent('<html><body><button id="go">go</button></body></html>');
await p.addScriptTag({ content: code + '\nwindow.MultiSim = MultiSim;' });
await p.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', MultiSim.overlayHtml());
    window.F = { year: 2026, saves: 0, seasons: 0, titles: {}, boom: -1, fast: false,
        runSeason() { const t0 = performance.now(); while (performance.now() - t0 < 30); if (this.seasons === this.boom) throw new Error('Testfehler'); },
        transition() { this.seasons++; this.year++; const w = 'd' + (this.year % 3); this.titles[w] = (this.titles[w] || 0) + 1; } };
    window.hooks = () => ({ runSeason: () => F.runSeason(), transition: () => F.transition(), label: () => String(F.year), zielLabel: k => String(F.year + k - 1),
        save: () => F.saves++, setFast: on => F.fast = on, snapshot: () => ({ ...F.titles }),
        summary: snap => Object.entries(F.titles).map(([id, n]) => [id, n - (snap[id] || 0)]).filter(x => x[1] > 0).map(([id, n]) => `<div>${id} ${n}×</div>`).join('') });
});
const warte = (f, arg = null, ms = 8000) => p.waitForFunction(f, arg, { timeout: ms });
const erg = [];
// 1 ganzer Lauf
await p.evaluate(() => MultiSim.start(hooks()));
await warte(() => document.getElementById('msim-btn').textContent === 'Schließen');
let r = await p.evaluate(() => ({ s: F.seasons, saves: F.saves, fast: F.fast, kopf: document.getElementById('msim-counter').textContent, sum: document.getElementById('msim-summary').innerText }));
erg.push([r.s === 5 && r.saves === 1 && !r.fast && /✓ 5 Saisons/.test(r.kopf) && /×/.test(r.sum), 'Lauf 5 Saisons, 1 Save, Zusammenfassung', JSON.stringify(r)]);
await p.click('#msim-btn');
// 2 Stopp mittendrin
antwort = '50';
await p.evaluate(() => MultiSim.start(hooks()));
await warte(() => F.seasons >= 8);
await p.click('#msim-btn');
await warte(() => document.getElementById('msim-btn').textContent === 'Schließen');
r = await p.evaluate(() => ({ s: F.seasons, saves: F.saves, kopf: document.getElementById('msim-counter').textContent }));
erg.push([r.s < 55 && r.saves === 2 && /Gestoppt/.test(r.kopf), 'Stopp mittendrin speichert', JSON.stringify(r)]);
await p.click('#msim-btn');
// 3 Schließen während des Laufs stoppt den Lauf (kein Hintergrundlauf)
await p.evaluate(() => MultiSim.start(hooks()));
await warte(n => F.seasons >= n, r.s + 3);
await p.evaluate(() => MultiSim.close());
const s1 = await p.evaluate(() => F.seasons); await p.waitForTimeout(600);
const s2 = await p.evaluate(() => F.seasons);
erg.push([s2 - s1 <= 1, 'Schließen hält den Lauf an', `${s1} → ${s2}`]);
// 4 Exception → sauberes Ende mit Save
antwort = '10';
await p.evaluate(() => { F.boom = F.seasons + 2; MultiSim.start(hooks()); });
await warte(() => document.getElementById('msim-btn').textContent === 'Schließen');
r = await p.evaluate(() => ({ kopf: document.getElementById('msim-counter').textContent, fast: F.fast }));
erg.push([/Exception nach 2/.test(r.kopf) && !r.fast, 'Exception endet sauber', JSON.stringify(r)]);
erg.forEach(([ok, n, i]) => console.log(`${ok ? 'OK  ' : 'FEHL'} ${n} – ${i}`));
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
