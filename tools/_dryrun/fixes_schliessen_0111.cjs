// FIXES_OFFEN.md (01.11.2026, Nutzer „ja beide“): zwei Punkte schließen, die keine Fehler mehr sind –
//   „◐ Nachfolger historischer Vereine“: Stufen 1–4 + Restlisten erledigt; Rest VfR Konstanz steht unter „Verschwundene Meister“,
//      Leipzig-Leutzsch ist entschieden, die Datenfrage Duisburg-Amateure wird ein eigener offener Punkt (sonst ginge sie verloren)
//   „Amateurligen 1963–78 ohne Tabelle: keine Einzelspiel-Rekorde“: Grenze der Quelle, kein Fix möglich
// Alle Unterpunkte bleiben wörtlich in der Erledigt-Zeile erhalten.
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../FIXES_OFFEN.md');
const t = fs.readFileSync(P, 'utf8'), nl = t.includes('\r\n') ? '\r\n' : '\n'; let L = t.split(nl);
const finde = start => { const i = L.findIndex(l => l.startsWith(start)); if (i < 0 || L.filter(l => l.startsWith(start)).length !== 1) throw new Error('Anker: ' + start); return i; };
const pipe = s => s.replace(/\|/g, '/');
// 1) Nachfolger-Punkt samt Unterpunkten
const a = finde('- ◐ Generell Deutschlandweit, jede Ära prüfen');
let e = a + 1; while (e < L.length && /^\s+- /.test(L[e])) e++;
const haupt = L[a].replace(/^- ◐ /, ''), unter = L.slice(a + 1, e).map(l => l.replace(/^\s+- /, ''));
if (!unter.some(u => u.startsWith('❔ Rest:'))) throw new Error('Rest-Unterpunkt fehlt');
L.splice(a, e - a);
const zeile1 = `| ${pipe(haupt)} | v0.8.220–v0.8.228.4, geschlossen 01.11.2026 (Nutzer „ja beide“): alle vier Stufen und die Restlisten erledigt. Rest weitergeführt: VfR Konstanz → Punkt „Verschwundene Meister“, Datenfrage Duisburg-Amateure → eigener Punkt unter Historische Vereine, Leipzig-Leutzsch entschieden 24.10.2026. Unterpunkte: ${pipe(unter.join(' · '))} |`;
// 2) Amateurligen 1963–78
const b = finde('- Amateurligen 1963–78 ohne Tabelle: keine Einzelspiel-Rekorde');
const haupt2 = L[b].replace(/^- /, ''); L.splice(b, 1);
const zeile2 = `| ${pipe(haupt2)} | geschlossen 01.11.2026 als bekannte Grenze (Nutzer „ja beide“): für diese Ligen und Jahre gibt es keine Einzelspiele in den Quellen – kein Fix möglich, siehe docs/EINZELSPIELE.md |`;
// 3) Datenfrage als eigener offener Punkt unter „❌ Offen / Historische Vereine“
const o = L.findIndex(l => l.startsWith('## ❌ Offen')), h = L.findIndex((l, i) => i > o && l.startsWith('### Historische Vereine'));
if (o < 0 || h < 0) throw new Error('Abschnitt Offen/Historische Vereine');
let ins = h + 1; while (ins < L.length && (L[ins].startsWith('- ') || /^\s+- /.test(L[ins]) || L[ins] === '')) { if (L[ins] === '' && !L[ins + 1].startsWith('- ')) break; ins++; }
L.splice(ins, 0, '- Datenfrage Duisburg-Amateure (aus dem Nachfolger-Punkt, 01.11.2026 ausgegliedert): „Eintracht Duisburg“ 1964–66 (= Amateure?), Amateure von MSV/Kickers/Arminia ohne II im Spiel – an welche ID gehören ihre Saisons?');
// 4) Erledigt-Zeilen oben in die Tabelle
const k = L.findIndex(l => l.startsWith('## ✅ Erledigt')), tab = L.findIndex((l, i) => i > k && /^\|---/.test(l));
L.splice(tab + 1, 0, zeile1, zeile2);
fs.writeFileSync(P, L.join(nl)); console.log('ok – Datenfrage eingefügt in Zeile', ins + 1);
