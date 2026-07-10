# Paket 3 — Integrations-Spec: Vorschau-Anrisse (Spiel des Tages)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — nur den Anlass des kommenden Duells anteasern.
> 2. **NUR `{heim}`/`{gast}`** — vor dem Spiel gibt es kein Ergebnis, keinen Sieger.
> 3. **Nicht raten, wer die Eigenschaft hat** (asymmetrische Keys, s. §4).

**Deliverable:** gefülltes `window.REPORTS_PREVIEW` in `data_reports.js`. Ersetzt für das Spiel
des Tages in der **Vorschau** das Label „Spiel des Tages · {reason}" durch einen Fable-Satz.
Assembler (`_previewTeaser`) + Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_PREVIEW` (Gerüst mit allen Keys steht, Arrays leer).
- Greift nur beim **Spiel des Tages der Vorschau** (genau eine noch nicht gespielte Partie/Liga).
- **Leeres Array → Fallback** aufs Label „Spiel des Tages · {reason}". Teilweises Füllen sicher.

## 2. Struktur & Slots
```js
window.REPORTS_PREVIEW = { reasonKey: [ …zeilen… ], … };
```
- Slots **ausschließlich** `{heim}` (Heimteam) und `{gast}` (Gast). **Kein** `{score}`,
  **kein** `{sieger}/{verlierer}` (das Spiel ist noch nicht gespielt).
- Ton: **Vorfreude / Ankündigung**, Präsens/Futur — „{heim} empfängt {gast} …", „Zum
  Spitzenspiel kommt es …", „{gast} gastiert bei {heim}". Der Satz soll den Anlass verraten
  (das ersetzt die Begründung) und Lust aufs Spiel machen.

## 3. reasonKeys
Dieselben wie Paket 2 (`derby`, `tradition`, `topduell`, `abstiegskrimi`, `europa`, `rangduell`,
`formstark`, `formkrise`, `ueberraschung`). Bedeutung siehe `paket2-kontext/SPEC.md §3`.

## 4. Fallstricke
- **Symmetrie:** symmetrische Keys (derby/topduell/abstiegskrimi/europa/rangduell) dürfen den
  Anlass beiden Teams zuschreiben. Bei asymmetrischen (tradition/formstark/formkrise/
  ueberraschung) NICHT festlegen, welche Seite die Eigenschaft trägt → aufs **Duell** abzielen:
  „Formcheck: {heim} fordert {gast}" ✅, nicht „Krisenteam {gast} muss bei {heim} ran" ❌.
- **Heim/Gast-Rollen korrekt:** `{heim}` hat Heimrecht — Verben passend („empfängt {gast}",
  „reist zu {heim}"). Nicht vertauschen.
- **Keine realen Fakten / keine Ergebnis-Vorwegnahme** (kein „{heim} gewinnt sicher").

## 5. Determinismus
Seed aus `hId|aId` (Paarung) → vor dem Spiel stabil, gleiche Vorschau bei Re-Render/Reload.

## 6. Mengen (Regel 6)
Pro Key **≥10** Zeilen. Da nur ein Anriss pro Spieltag/Liga sichtbar ist, reicht das für lange
Abwechslung.

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check`, Test §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const A={};eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
const bad=/\{score\}|\{sieger\}|\{verlierer\}/;let f=0;
for(const k in window.REPORTS_PREVIEW){const a=window.REPORTS_PREVIEW[k];
  const b=a.some(l=>bad.test(l));if(b)f++;
  console.log(k.padEnd(14),a.length,b?"⚠ verbotener Slot":"");}
console.log("Beispiel:",A._previewTeaser("derby","Gladbach","Köln","x")||"(leer)");
console.log(f?"FEHLER":"ok");'
```
Erwartung: pro Key ≥10, nur `{heim}`/`{gast}`-Slots, Beispiel liefert einen Satz.
