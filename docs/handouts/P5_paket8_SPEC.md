# Paket 8 — Integrations-Spec: Pokal-Schlagzeilen (K.o.-Runden)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — keine echte Pokalhistorie, kein „Titelverteidiger",
>    kein „Rekordsieger". Der Klassenunterschied ist das einzige gedeckte Sachargument.
> 2. **Kein Rundenfortschritt** („nächste Runde", „Achtelfinale", „Weiterkommen") — dieselbe
>    Zeile kann im **Finale** stehen, wo es keine nächste Runde gibt.
> 3. **Klassen-Vokabular nur in `pokalsensation`** — sonst ist der Gegner ein Favorit
>    (Stärke), kein Klub aus einer höheren Liga.

**Status:** ✅ **GELIEFERT (v0.8.57)** — 100 Zeilen, **Erstbefüllung durch Opus statt Fable**
(auf Wunsch: „ohne dass man Fable braucht"). Interface, Klassifikator und Verdrahtung standen
bereits seit v0.8.56. Fable kann die Pools jederzeit **erweitern oder ersetzen** — die Bank ist
reines Lookup, die Auswahl-Logik bleibt unberührt.

**Deliverable:** `window.REPORTS_POKAL` in `data_reports.js`.

## 1. Einbau-Ort & Wirkung
- `app/pokal.js` (`showPokal`) hebt **pro K.o.-Runde genau eine** Partie hervor und setzt
  darunter eine Schlagzeile (`.pm-wrap` > `.pokal-match.pm-nb` + `.pm-line`, Gold).
- Auswahl trifft `_pokalFeat` (Opus): höchster Wucht-Score gewinnt, **Klassensprung dominiert**
  (100 je Ligastufe, + 3×Stärkeabstand, + 22 i.E. / 14 n.V., + 4×Tordifferenz).
- Gilt für laufende **und** archivierte Saisons (History-Blättern). Kein Ära-Register —
  Gegenwartston wie Paket 1/2.
- **Fehlender/leerer Pool → Fallback** auf `window.REPORTS` (Paket 1), dort gefiltert
  über `_POKAL_TABU` (`Punkt|Spieltag|Liga|Tabelle`). Das Feature bleibt also auch bei
  halb gefüllter Bank funktionsfähig.

## 2. Struktur & Slots
```js
window.REPORTS_POKAL = {
  pokalsensation: […], ueberraschung: […], elfmeterkrimi: […],
  verlaengerung: […],  kantersieg: […],    deutlich: […], knapp: […]
};
```
| Slot | Inhalt |
|---|---|
| `{sieger}` / `{verlierer}` | Teamnamen — **nie deklinieren**, artikellos konstruieren. Im K.o. gibt es immer beide (kein Remis-Fall) |
| `{score}` | Ergebnis **aus Siegersicht inkl. Zusatz**: `"2:1"`, `"3:2 n.V."`, `"5:4 i.E."` (Elfmeterstand, bei Auswärtssieg gedreht) |
| `{tore}` | Dasselbe Spiel **ohne** Zusatz — bei i.E. also der 120-Minuten-Stand (`"2:2"`). Nur für Zeilen, die reguläres Ergebnis und Entscheidung trennen wollen |
| `{heim}` / `{gast}` | Verfügbar, aber **nur in winner-neutralen Halbsätzen** — im Pokal gewinnt oft der Gastgeber nicht |

## 3. Kategorien (Klassifikator = Opus, `_pokalKind`, steht)
Priorität von oben nach unten, erste Regel gewinnt:

| Key | Bedingung |
|---|---|
| `pokalsensation` | Sieger kommt aus einer **≥2 Stufen tieferen** Liga (`leagues.level`) |
| `ueberraschung`  | Sieger **1 Stufe tiefer** ODER Stärkeabstand ≥10 in gleicher Klasse |
| `elfmeterkrimi`  | im Elfmeterschießen entschieden (`m.penalties`) |
| `verlaengerung`  | nach Verlängerung entschieden (`m.nv`) |
| `kantersieg`     | Tordifferenz ≥4 |
| `deutlich`       | Tordifferenz 2–3 |
| `knapp`          | Tordifferenz 1, reguläre Spielzeit |

## 4. Fallstricke
- **Finale-Falle:** Kein Rundenfortschritt (s. Kern-Verbot 2). „ist raus", „ausgeschieden",
  „scheitert an" sind auch im Finale wahr — „zieht weiter" nicht.
- **Klassen-Vokabular** („Klassenunterschied", „Amateur", „Liga tiefer") ausschließlich in
  `pokalsensation`. `ueberraschung` feuert auch bei gleicher Klasse → nur Favorit/Außenseiter.
- **`{score}` trägt den Zusatz schon** — nie „gewinnt {score} im Elfmeterschießen" schreiben
  (ergäbe „5:4 i.E. im Elfmeterschießen"). Entweder `{score}` **oder** die Entscheidungsart
  ausformulieren, nicht beides für dieselbe Information.
- **Kein Heimrecht behaupten** bei `{sieger}`/`{verlierer}` — wer Gastgeber war, steckt in
  `{heim}`, nicht im Sieger.
- **Level-neutral:** Pokal-Partien reichen von Bundesliga bis Oberliga. Kein Vokabular, das
  Profibetrieb voraussetzt (Ausnahme: `pokalsensation`, wo der Klassenunterschied Thema ist).
- **Keine erfundenen Akteure/Ursachen** — kein gehaltener Elfmeter eines benannten Torwarts,
  keine Verletzung, kein Platzverweis. Die Sim liefert nur Tore und Entscheidungsart.
- **Kein Spielverlauf, den der State nicht kennt** — sparsam mit „von Beginn an", „nach
  frühem Rückstand". Die Bank kennt nur den Endstand.

## 5. Determinismus
Seed aus `sieger|verlierer|hGoals|aGoals` (`_reportSeed`) → identische Zeile bei
Re-Render/Reload/Blättern.

## 6. Mengen (Regel 6)
Pro Pool **≥14** (`pokalsensation` ≥16 — feuert am häufigsten, weil die frühen Runden voller
Verbandsvertreter sind). Aktuell 100 Zeilen. Pro Saison entstehen nur ~6 Pokal-Schlagzeilen
(6 Runden), der Wiederholungsdruck ist also deutlich geringer als bei Paket 1.

## 7. Opus-Nacharbeiten bei reinem Bank-Ausbau
Keine Code-/Schema-Änderung nötig. `node --check`, QA §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e '
global.window={};eval(require("fs").readFileSync("data_reports.js","utf8"));
const B=window.REPORTS_POKAL;let tot=0;
const bad=/nächste Runde|Achtelfinale|Viertelfinale|Halbfinale|Weiterkommen|Titelverteidiger|Rekordsieger/i;
for(const k in B){const a=B[k];tot+=a.length;const dup=a.length-new Set(a).size;
  const b=a.filter(l=>bad.test(l));
  console.log(k.padEnd(16),String(a.length).padStart(3),a.length<14?"⚠ zu wenig":"",dup?"⚠ Duplikate":"",b.length?"⚠ VERBOTEN: "+b[0]:"");}
const slots=new Set();for(const k in B)B[k].forEach(l=>(l.match(/\{\w+\}/g)||[]).forEach(s=>slots.add(s)));
console.log("Slots:",[...slots].join(" "),"(erlaubt: {sieger} {verlierer} {score} {tore} {heim} {gast})");
for(const k in B)if(k!=="pokalsensation"){const h=B[k].filter(l=>/Klasse|Amateur|\bLiga\b/i.test(l));
  if(h.length)console.log("⚠ Klassen-Leck in",k,h);}
console.log("Gesamt:",tot);'
```
Erwartung: 7 Pools, keine Warnung, Slots nur aus der erlaubten Liste.
