// Spielstand-Datei laden und das DFB-Teilnehmerfeld gegen die Vorsaison prüfen (Nutzerbefund 05.11.2026).
//   node .claude/skills/run/save_pokal_feld_check.mjs <datei.json> [port] → docs/pokal-ansicht/save-dfb-feld.png
import { chromium } from 'playwright';
import fs from 'fs';
const DATEI = process.argv[2], PORT = process.argv[3] || 3334;
const raw = fs.readFileSync(DATEI, 'utf8');
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine._encodeSave, null, { timeout: 90000 });
// wie importGameState: komprimiert ablegen, Archiv-/Ergebnis-Keys des alten Stands weg, neu laden
// Kodieren in der App, Ablegen auf einer leeren Seite derselben Herkunft – die laufende App speichert beim Verlassen sonst
// ihren eigenen (leeren) Stand drüber
const enc = await p.evaluate(r => Engine._encodeSave(r), raw);
await p.goto(`http://localhost:${PORT}/schemas/functions.schema.json`);
await p.evaluate(v => { localStorage.clear(); localStorage.setItem('ba_save_v66', v); sessionStorage.clear(); }, enc);
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== "undefined" && Engine.teams && Object.keys(Engine.teams).length > 0, null, { timeout: 120000 });
console.log("geladen:", JSON.stringify(await p.evaluate(() => ({ s: Engine.getFormattedSeason(), md: Engine.currentMatchday, h: Engine.history.length, key: (localStorage.getItem("ba_save_v66") || "").length }))), fehler.join(" | "));
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
    const P = Engine.pokal, H = Engine.history[Engine.history.length - 1];
    const e = P.entrants, ids = Object.keys(e);
    const falsch = ids.filter(id => e[id].vl && (H.teams[id]?.leagueId !== e[id].vl || H.teams[id]?.rank !== e[id].vr));
    const t1 = ids.filter(id => e[id].topf === 1), bl = Object.keys(H.teams).filter(id => H.teams[id].leagueId === '1');
    const zl = Object.keys(H.teams).filter(id => H.teams[id].leagueId === '2' && !Engine.teams[id]?.isReserve).sort((a, b) => H.teams[a].rank - H.teams[b].rank).slice(0, 14);
    const soll = new Set([...bl, ...zl]);
    return { saison: Engine.getFormattedSeason(), md: Engine.currentMatchday, auslosung: P.y, vorsaison: H.year, mitVl: ids.filter(id => e[id].vl).length, falscheVorsaison: falsch.length, t1FalschDrin: t1.filter(id => !soll.has(id)).map(id => Engine.teams[id]?.name) };
});
console.log(JSON.stringify(r));
const ok = r.auslosung === r.saison && r.mitVl > 40 && r.falscheVorsaison === 0 && r.t1FalschDrin.length === 0;
console.log(ok ? 'OK   Feld bezieht sich auf ' + r.vorsaison : 'FEHL');
await p.evaluate(() => { App.showPokal(); App.switchPokalTab(-1); const s = document.getElementById('save-bar'); if (s) s.style.display = 'none'; });
await p.waitForTimeout(400);
const kopf = await p.evaluate(() => [...document.querySelectorAll('.pokal-teiln-liga > div:first-child')].slice(0, 3).map(d => d.textContent.trim()));
console.log('Überschriften:', kopf.join(' | '));
await p.screenshot({ path: 'docs/pokal-ansicht/save-dfb-feld.png' });
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
