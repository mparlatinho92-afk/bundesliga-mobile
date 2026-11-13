// Tempo innerhalb der Saison (template.html): „Woche“ (App.nextStep) und „Saison“ (App.simRest) zerlegt in
// Engine-Rechnung, Speichern und Neuzeichnen. Misst nur, prüft nichts.
//   node .claude/skills/run/tempo_saison_mess.mjs [port] [--action]   (--action: Action-Modus an)
import { chromium } from 'playwright';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, ACTION = process.argv.includes('--action');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async (ACTION) => {
    const T = {}, wrap = (obj, name, key) => { const f = obj[name]; obj[name] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { T[key] = (T[key] || 0) + performance.now() - t; } }; };
    wrap(Engine, 'playNextMatchday', 'engine.spieltag'); wrap(Engine, 'saveGame', 'save'); wrap(Engine, 'simulateFullSeason', 'engine.rest');
    wrap(App, 'loadLeague', 'render.liga'); wrap(App, 'updateStatus', 'render.status'); wrap(App, 'triggerAutoSave', 'autosave.trigger');
    if (Engine.playActionStep) wrap(Engine, 'playActionStep', 'engine.action');
    if (!ACTION && App.actionCfg) App.actionCfg.on = false;
    const out = [];
    for (let i = 0; i < 6; i++) {
        for (const k in T) delete T[k];
        const t = performance.now();
        App.nextStep();
        const sync = performance.now() - t;
        await new Promise(res => requestAnimationFrame(res)); const bild = performance.now() - t;
        await new Promise(res => setTimeout(res, 50)); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        out.push({ klick: i + 1, md: Engine.currentMatchday, gesamt_sync: Math.round(sync), erstes_bild: Math.round(bild), bis_bild: Math.round(performance.now() - t), ...Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Math.round(v)])) });
    }
    for (const k in T) delete T[k];
    const t = performance.now();
    App.simRest();
    await new Promise(res => { const w = () => (document.getElementById('btn-saison').disabled ? setTimeout(w, 20) : res()); setTimeout(w, 20); });
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    out.push({ klick: 'Saison', gesamt: Math.round(performance.now() - t), ...Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Math.round(v)])) });
    return out;
}, ACTION);
r.forEach(x => console.log(JSON.stringify(x)));
await browser.close();
