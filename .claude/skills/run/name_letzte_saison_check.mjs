// Anzeigename historischer Vereine = Name der letzten Saison (Nutzer 14.11.2026: Ewige Tabelle der Verbandsliga MV zeigte
// „Verkehrsbetriebe Waren“, die Saisonansicht „SV Waren 09“ – das Spiel widersprach sich). Prüft in template.html:
//   (1) frisches Spiel: archive.ewige + gerenderte Ewige Tabelle 6-19 zeigen „SV Waren 09“, nicht den Grundnamen
//   (2) alter Spielstand (Grundname im Archiv, alte Datenversion): nach der Neufaltung steht „SV Waren 09“
//   (3) Engine._histHeuteName für alle HIST_EXT.letzter-Vereine = letzter Name; HISTORIC_CLUBS bleibt Grundname (Saisons ohne
//       Zeitnamen: Traktor Irxleben 1989/90 – mit HISTORIC_CLUBS = letzter Name fielen umbenannt_check und fusion_check durch)
//   node .claude/skills/run/name_letzte_saison_check.mjs [port]
//   node .claude/skills/run/name_letzte_saison_check.mjs --selbsttest    gegen index.html (gebauter alter Stand) – muss durchfallen
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const ID = 'hist_fa_verkehrsbetriebewaren', LID = '6-19', SOLL = 'SV Waren 09', ALT = 'Verkehrsbetriebe Waren';
const b = await chromium.launch(), befund = [];
const page = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/${SELBST ? 'index.html' : 'template.html'}`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 90000 });
await page.evaluate(() => Engine._seedHistoryExt());
await page.waitForFunction(() => typeof HistExt !== 'undefined' && Engine.archive.histExtSeeded === HistExt.version(), null, { timeout: 90000 });
const r1 = await page.evaluate(([ID, LID]) => {
    const e = (Engine.archive.ewige[LID] || {})[ID];
    const html = App._renderEwigeTabelle(LID);
    return { arch: e && e.name, html: html.includes('SV Waren 09'), alt: html.includes('Verkehrsbetriebe Waren'),
        hc: HISTORIC_CLUBS[ID], n: Object.keys((typeof HIST_EXT !== 'undefined' && HIST_EXT.letzter) || {}).length,
        falsch: Object.entries((typeof HIST_EXT !== 'undefined' && HIST_EXT.letzter) || {}).filter(([id, nm]) => Engine._histHeuteName(id) !== nm).length,
        grund: HISTORIC_CLUBS['hist_fa_traktorirxleben'] };
}, [ID, LID]);
console.log(`(1) frisch: Archiv „${r1.arch}“, Tabelle zeigt SV Waren 09: ${r1.html}, Grundname: ${r1.alt} · (3) letzter-Namen ${r1.n}, abweichend ${r1.falsch}, Grundname Irxleben ${r1.grund}`);
if (r1.arch !== SOLL) befund.push(`Archiv-Name „${r1.arch}“`);
if (!r1.html || r1.alt) befund.push('Ewige Tabelle zeigt nicht SV Waren 09');
if (r1.n < 50 || r1.falsch) befund.push(`heutiger Name: ${r1.falsch} von ${r1.n} falsch`);
if (r1.grund !== 'Traktor Irxleben') befund.push(`HISTORIC_CLUBS überschrieben (Irxleben: ${r1.grund})`);
// (2) alter Spielstand
const r2 = await page.evaluate(async ([ID, LID, ALT]) => {
    const A = Engine.archive; A.ewige[LID][ID].name = ALT; A.histExtSeeded = 'alt';
    await Engine._seedHistoryExt();
    return A.ewige[LID][ID] && A.ewige[LID][ID].name;
}, [ID, LID, ALT]);
console.log(`(2) alter Spielstand nach Neufaltung: „${r2}“`);
if (r2 !== SOLL) befund.push(`alter Spielstand behält „${r2}“`);
// (4) Steckbrief-Kopf und Suche wie der Nutzer: Suchfeld tippen, Treffer anklicken
await page.evaluate(() => App._gsOpen && App._gsOpen()); await page.waitForTimeout(300);
await page.fill('#gs-input', 'Verkehrsbetriebe Waren'); await page.waitForTimeout(400);
const treffer = await page.evaluate(() => [...document.querySelectorAll('#gs-list > *')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
const t1 = treffer.find(x => /Waren/.test(x)) || '';
console.log(`(4) Suche „Verkehrsbetriebe Waren“: ${t1 || '(kein Treffer)'}`);
if (!/^(Verein )?SV Waren 09/.test(t1)) befund.push(`Suche zeigt „${t1}“`);
const el = page.locator('#gs-list > *').filter({ hasText: 'Waren' }).first();
if (await el.count()) { await el.click(); await page.waitForTimeout(500); }
const kopf = await page.evaluate(() => (document.getElementById('modal-title') || {}).innerText || '');
console.log(`(4) Steckbrief-Kopf nach Klick: „${kopf}“`);
if (kopf.trim() !== SOLL) befund.push(`Steckbrief-Kopf „${kopf}“`);
// (5) der Grundname verschwindet nicht (Nutzer 14.11.2026: „der Steckbrief verschweigt jetzt die Verkehrsbetriebe komplett“):
// VEREINSNAMEN führt ihn mit Zeitraum, die Saison-Historie trägt ihn als Überschrift der Saisons ohne Zeitnamen
await page.waitForTimeout(800);
const sb = await page.evaluate(() => (document.getElementById('modal-body') || {}).innerText || '');
const vn = sb.slice(sb.indexOf('VEREINSNAMEN'), sb.indexOf('VEREINSNAMEN') + 500);
console.log(`(5) VEREINSNAMEN: ${vn.replace(/\s*\n\s*/g, ' | ').slice(0, 300)}`);
if (!/\d{4}\/\d{2,4}(–\d{4}\/\d{2,4})?\s*\n\s*Verkehrsbetriebe Waren/.test(vn))   // Zeitraum-Spalte, dann der Name
    befund.push('VEREINSNAMEN ohne „Verkehrsbetriebe Waren“ mit Zeitraum');
await page.screenshot({ path: 'docs/ewige-mobil/sb-waren-namen.png' });
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? 'BEFUND: ' + befund.join(' · ') : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
