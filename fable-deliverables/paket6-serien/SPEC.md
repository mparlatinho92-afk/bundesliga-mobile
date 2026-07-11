# Paket 6 — Integrations-Spec: Serien-Texte (Sieges-/Krisenserien)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — und keine Behauptungen über Tabelle/Saisonziel (die Serie
>    weiß nur, dass sie existiert).
> 2. **Keine Ordinalzahlen in Templates** („das fünfte Spiel" ❌ — Genus/Kasus-Falle, §4).
> 3. **Zeilen müssen für jede Serienlänge funktionieren** (n=4 wie n=15).

**Deliverable:** gefülltes `window.REPORTS_STREAK` in `data_reports.js`. Zeigt unter den
Spieltags-Ergebnissen der aktiven Liga bis zu **zwei** Serien-Zeilen (📈 Lauf / 📉 Krise).
Erkennung (`_streakData`) + Assembler (`_streakLines`) + Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_STREAK` (Gerüst mit allen Keys steht, Arrays leer).
- Greift nur in der **Live-Ansicht** (kein Spieltags-Blättern, keine History-Saison), unterhalb
  der Ergebnisliste des Spieltags. Serien zählen nur **innerhalb der laufenden Saison**
  (`Engine.seasonResults` je Liga).
- **Leerer Pool → Zeile entfällt** ersatzlos (additiv). Kein Ära-Register (nur Gegenwart).

## 2. Struktur & Slots
```js
window.REPORTS_STREAK = { sieg: […], ungeschlagen: […], niederlage: […], sieglos: […] };
```
| Slot | Inhalt |
|---|---|
| `{team}` | Teamname (nicht deklinieren) |
| `{n}` | Serienlänge als **Kardinalzahl-Wort** („vier" … „zwölf", darüber Ziffer) — nur in kasus-invarianten Konstruktionen: „{n} Siege in Folge", „seit {n} Spielen", „bei {n} Siegen" |

## 3. Typen & Schwellen (Klassifikator = Opus, steht)
- `sieg` — ≥**4** Siege in Folge (Priorität hoch)
- `ungeschlagen` — ≥**6** Spiele ohne Niederlage (nur wenn kein sieg-Treffer fürs selbe Team)
- `niederlage` — ≥**4** Niederlagen in Folge (Priorität hoch)
- `sieglos` — ≥**6** Spiele ohne Sieg (nur wenn kein niederlage-Treffer)
- Pro Spieltag/Liga max. **2** Zeilen (die längsten/stärksten Serien gewinnen).

## 4. Fallstricke
- **Keine Ordinalzahlen** („der fünfte Sieg", „zum sechsten Mal") — Genus/Kasus hängt am
  Kontext. Nur Kardinal-Konstruktionen mit `{n}` (s. §2). „Nummer {n}" ist erlaubt.
- **Länge-neutral:** sieg/niederlage ab 4, ungeschlagen/sieglos ab 6 — nach oben offen.
  Kein „historisch", „Rekord", „noch nie" (die Sim vergleicht nicht mit früher).
- **ungeschlagen enthält Remis, sieglos auch** — Zeilen dürfen also weder „gewinnt weiter"
  (bei ungeschlagen) noch „verliert weiter" (bei sieglos) sagen.
- **Keine Tabellen-/Kontextbehauptungen:** kein „Aufstiegskurs", „Abstiegskampf", „Spitzenreiter" —
  eine Siegesserie kann auch ein Kellerkind hinlegen.
- **Liga-neutral** (1. Bundesliga bis Kreisliga): „Dreier" (3 Punkte) ist ok, „Champions League"-
  Vokabular nicht.
- `{team}` artikellos einsetzbar; keine erfundenen Personen/Ursachen (kein „seit dem
  Trainerwechsel").

## 5. Determinismus
Seed aus `teamId|typ|n` → gleiche Zeile bei Re-Render/Reload; wächst die Serie, wechselt
die Zeile natürlich mit.

## 6. Mengen (Regel 6)
Pro Typ **≥12** Zeilen (4 Typen → ≥48). Serien halten oft mehrere Wochen — derselbe Typ
feuert dann mehrfach hintereinander fürs selbe Team (nur n wächst), Varianz ist hier wichtig.

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check`, Test §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const App=global.App={};global.Engine={seasonResults:[]};
eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
const B=window.REPORTS_STREAK;let f=0;const bad=/\{score\}|\{sieger\}|\{gegner\}|\{heim\}|\{gast\}|te Spiel|ten Sieg|ten Mal/;
for(const k in B){const a=B[k];const b=a.some(l=>bad.test(l));if(a.length<12||b)f++;
  console.log(k.padEnd(14),a.length,b?"⚠ Slot/Ordinal":a.length<12?"⚠ zu wenig":"");}
for(let i=0;i<5;i++)Engine.seasonResults.push({lid:"1",hId:"A",aId:"B"+i,s1:2,s2:0});
for(let i=0;i<7;i++)Engine.seasonResults.push({lid:"1",hId:"C",aId:"D"+i,s1:0,s2:0});
const teams=[{id:"A",name:"SV Serie"},{id:"C",name:"FC Remis"}];
console.log(App._streakLines("1",teams));
console.log(f?"FEHLER":"ok");'
```
Erwartung: alle Pools ≥12, keine Ordinal-Muster, Ausgabe = 2 Zeilen (Siegesserie „fünf" 📈 +
Ungeschlagen-Serie „sieben" 📈).
