# Paket 2 — Integrations-Spec: Kontext-Schlagzeilen (Spiel des Tages)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — „im Derby"/„im Titelduell" ja (kommt aus State), „Rekordmeister"/
>    „Absteiger 2019" nein. Sim-Historie ist fiktiv.
> 2. **`{score}` vormontiert**, Sieger-Slots nur in `win`, NIE in `draw`.
> 3. **Nicht raten, wer die Eigenschaft hat** (s. §5, wichtigster Fallstrick dieses Pakets).

**Deliverable:** gefülltes `window.REPORTS_CONTEXT` in `data_reports.js`. Nur Sprache — Assembler
(`_matchHeadline`), Auswahl (`_matchInterest` liefert `reasonKey`) und Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_CONTEXT` (Gerüst mit allen Keys steht, Arrays leer).
- **Nur das Spiel des Tages** eines Spieltags nutzt diese Bank (genau eine Partie/Liga). Alle
  anderen Ergebnisse bleiben score-basiert (Paket 1).
- **Leeres Array → automatischer Fallback** auf die Score-Schlagzeile. Heißt: teilweises Füllen
  ist sicher; fang mit den wirkungsvollsten Keys an (`derby`, `topduell`, `abstiegskrimi`).

## 2. Struktur & Slots
```js
window.REPORTS_CONTEXT = { reasonKey: { win: [ … ], draw: [ … ] }, … };
```
- **`win`** (das Spiel des Tages hatte einen Sieger): Slots `{sieger}` `{verlierer}` `{score}`
  (+ `{heim}`/`{gast}`). `{score}` ist aus Siegersicht.
- **`draw`** (Remis): Slots NUR `{heim}` `{gast}` `{score}` — **keine** `{sieger}/{verlierer}`.

## 3. Die reasonKeys (aus `_matchInterest`)
| Key | Anlass | Symmetrie |
|---|---|---|
| `derby` | geografisch nah (Stadt-/Regionalduell) | **symmetrisch** |
| `topduell` | beide Spitze (Spitzenspiel / Aufstiegsduell) | **symmetrisch** |
| `abstiegskrimi` | beide Tabellenkeller | **symmetrisch** |
| `europa` | beide im Europa-/Aufstiegsverfolger-Bereich | **symmetrisch** |
| `rangduell` | direkte Tabellennachbarn (z.B. 10.↔11.) | **symmetrisch** |
| `tradition` | mind. ein Traditionsklub (ewige Tabelle) | **asymmetrisch möglich** |
| `formstark` | mind. ein Team in Topform | **asymmetrisch möglich** |
| `formkrise` | mind. ein Team in der Krise | **asymmetrisch möglich** |
| `ueberraschung` | Über-/Unterperformer vs. Vorsaison | **asymmetrisch möglich** |

## 4. Determinismus
`_reportSeed` (Hash aus `home|away|score`) wählt die Zeile → über Reloads stabil (Regel 8).
Mehr Zeilen ⇒ weniger Wiederholung.

## 5. Fallstricke
- **Symmetrie beachten (Kern-Fallstrick):** Bei **symmetrischen** Keys teilen sich BEIDE Teams
  den Anlass → `{sieger}`/`{verlierer}` dürfen ihn tragen („Im Derby behält {sieger} die
  Oberhand"). Bei **asymmetrischen** Keys (`tradition`/`formstark`/`formkrise`/`ueberraschung`)
  ist NICHT bekannt, ob `{sieger}` die Eigenschaft hat. Also **neutral zum Anlass** bleiben:
  „In einem Duell mit Formschwankungen setzt sich {sieger} durch" ✅ –
  „Krisenteam {verlierer} verliert weiter" ❌ (falsche Annahme).
- **`draw`-Zeilen nie mit Sieger-Slot** (Assembler filtert nicht — falsche Zeile = Bug).
- **Kein Spielverlauf erfinden** (keine Torschützen/Minuten/Führungen, die der Endstand nicht
  hergibt — außer bei Remis mit Toren ist „Ausgleich" beweisbar).
- **Keine realen Fakten** (Regel 2).

## 6. Mengen (Regel 6)
Pro Key: **≥12 `win`** und **≥8 `draw`** (bei `ueberraschung` selten Remis → ≥5 `draw` ok).
Ton wie Paket 1 mischen (Boulevard / Lokalsport / Pathos).

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check data_reports.js` + der
Test aus §8, Changelog, `manage-v` (Hotfix, additiv).

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const A={};eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
const win=/\{sieger\}|\{verlierer\}/;let f=0;
for(const k in window.REPORTS_CONTEXT){const b=window.REPORTS_CONTEXT[k];
  const badDraw=(b.draw||[]).some(l=>win.test(l));if(badDraw)f++;
  console.log(k.padEnd(14),"win",(b.win||[]).length,"draw",(b.draw||[]).length,badDraw?"⚠ Sieger-Slot in draw":"");}
console.log(f?"FEHLER":"ok");'
```
Erwartung: pro Key win ≥12 / draw ≥8 (ueberraschung ≥5), keine Sieger-Slots in `draw`.
