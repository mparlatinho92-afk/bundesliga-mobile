// saveGame zerlegt (template.html): Größe je Feld des Spieltag-Saves, Zeit für JSON, LZ-Kompression und localStorage –
// am Saisonanfang, zur Saisonmitte und am Saisonende. Wo wird saveGame aufgerufen (Stack)? Misst nur.
//   node .claude/skills/run/tempo_save_mess.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
    const out = [], stacks = new Set();
    const orig = Engine.saveGame;
    Engine.saveGame = function () { stacks.add((new Error().stack || '').split('\n').slice(2, 5).map(s => s.trim().replace(/\(.*\//, '(')).join(' < ')); return orig.apply(this, arguments); };
    const mess = label => {
        const E = Engine, kb = s => Math.round(s.length / 1024);
        const teile = { r: E.seasonResults, p: E.pokal, ap: E.amateurpokal, as: E.actionState, f: E.friendlies, dh: E.matchdayHistory };
        const g = {}; for (const k in teile) g[k] = kb(JSON.stringify(teile[k] || null));
        let t = performance.now(); E.saveGame(); const save = performance.now() - t;
        const roh = JSON.stringify({ r: E.seasonResults, p: E.pokal, ap: E.amateurpokal, as: E.actionState });
        t = performance.now(); const z = LZString.compressToUTF16(roh); const lz = performance.now() - t;
        t = performance.now(); JSON.stringify({ r: E.seasonResults }); const js = performance.now() - t;
        out.push({ label, md: E.currentMatchday, save_ms: Math.round(save), lz_ms_dieser_teile: Math.round(lz), json_r_ms: Math.round(js), kB: g, gespeichert_kB: kb(localStorage.getItem('ba_save_v66') || ''), results: E.seasonResults.length });
    };
    App.actionCfg && (App.actionCfg.on = false);
    mess('Anfang');
    for (let i = 0; i < 17; i++) Engine.playNextMatchday();
    mess('Mitte');
    while (Engine.playNextMatchday()) {}
    mess('Ende');
    return { out, stacks: [...stacks].slice(0, 6) };
});
r.out.forEach(x => console.log(JSON.stringify(x)));
console.log('saveGame-Aufrufer:\n  ' + r.stacks.join('\n  '));
await browser.close();
