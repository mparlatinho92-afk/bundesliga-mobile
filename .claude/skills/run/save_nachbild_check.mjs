// Speichern NACH dem Neuzeichnen (Tempo Stufe 1, 28.10.2026), template.html: landet jeder Klick trotzdem im Spielstand?
// Woche, drei schnelle Klicks, Saison, Auto-Save-Kopie, pagehide sofort, Spielstandwechsel dazwischen schreibt nicht.
//   node .claude/skills/run/save_nachbild_check.mjs [port]
//   node .claude/skills/run/save_nachbild_check.mjs --selbsttest   saveNachBild verschluckt den Save – muss durchfallen
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
const page = await browser.newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(SELBST => {
    if (App.actionCfg) App.actionCfg.on = false;
    window.__gespeichert = () => { const s = JSON.parse(Engine._decodeSave(localStorage.getItem('ba_save_v66'))); return { m: s.m, sid: s.sid }; };
    window.__bild = () => new Promise(r => requestAnimationFrame(() => setTimeout(() => setTimeout(r, 30), 0)));
    if (SELBST) Engine.saveNachBild = function () {};
}, SELBST);

// 1) Woche: direkt nach dem Klick noch alter Stand, nach dem Bild der neue; Auto-Save-Kopie zieht nach
let r = await page.evaluate(async () => {
    const vor = __gespeichert().m, t = performance.now(); App.nextStep(); const klick = performance.now() - t;
    const sofort = __gespeichert().m; await __bild();
    const auto = JSON.parse(sessionStorage.getItem('ba_autosave_v66') || '{}');
    return { vor, sofort, nach: __gespeichert().m, md: Engine.currentMatchday, klick: Math.round(klick), autoMd: auto.matchday };
});
console.log(`Woche: gespeichert ${r.vor} → sofort ${r.sofort} → nach Bild ${r.nach} (Spieltag ${r.md}), Klick ${r.klick} ms, Auto-Save ${r.autoMd}`);
soll(r.nach === r.md && r.autoMd === r.md, `Woche: Spieltag ${r.md} nicht gespeichert (${r.nach}) oder Auto-Save ${r.autoMd}`);
soll(r.sofort === r.vor, `Woche: Save lief noch im Klick (${r.sofort})`);

// 2) drei Klicks im selben Bild -> ein Save mit dem neuesten Stand
r = await page.evaluate(async () => { App.nextStep(); App.nextStep(); App.nextStep(); await __bild(); return { nach: __gespeichert().m, md: Engine.currentMatchday }; });
console.log(`3 schnelle Klicks: gespeichert ${r.nach}, Spieltag ${r.md}`);
soll(r.nach === r.md, `3 Klicks: gespeichert ${r.nach} statt ${r.md}`);

// 3) pagehide schreibt sofort
r = await page.evaluate(() => { App.nextStep(); window.dispatchEvent(new Event('pagehide')); return { nach: __gespeichert().m, md: Engine.currentMatchday }; });
console.log(`pagehide: gespeichert ${r.nach}, Spieltag ${r.md}`);
soll(r.nach === r.md, `pagehide: offener Save nicht geschrieben (${r.nach} statt ${r.md})`);
await page.evaluate(() => App._claimLock && App._claimLock());

// 4) Spielstand wechselt zwischen Klick und Bild -> der alte Auftrag schreibt NICHT
r = await page.evaluate(async () => {
    const alt = Engine.saveId, vor = __gespeichert();
    App.nextStep(); Engine.saveId = 'test-anderer-stand'; await __bild();
    const nach = __gespeichert(); Engine.saveId = alt; Engine.saveGame();
    return { vor, nach };
});
console.log(`Stand gewechselt: vorher ${JSON.stringify(r.vor)} → nachher ${JSON.stringify(r.nach)}`);
soll(r.nach.m === r.vor.m && r.nach.sid !== 'test-anderer-stand', `Stand gewechselt: alter Auftrag hat geschrieben ${JSON.stringify(r.nach)}`);

// 5) Saison: am Ende ist der letzte Spieltag gespeichert
r = await page.evaluate(async () => {
    App.simRest();
    await new Promise(res => { const w = () => (document.getElementById('btn-saison').disabled ? setTimeout(w, 20) : res()); setTimeout(w, 20); });
    await __bild();
    return { nach: __gespeichert().m, md: Engine.currentMatchday, ende: Engine.totalMatchdays };
});
console.log(`Saison: gespeichert ${r.nach}, Spieltag ${r.md} / ${r.ende}`);
soll(r.nach === r.md && r.md === r.ende, `Saison: Ende nicht gespeichert (${r.nach}, ${r.md}/${r.ende})`);
if (fehler.length) befund.push(`JS-Fehler ${fehler.join(' / ')}`);
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
