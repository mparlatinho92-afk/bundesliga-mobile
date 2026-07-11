# Paket 5 — Integrations-Spec: Saison-Rückblick (History-Archiv)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — die Sim-Historie ist fiktiv, auch wenn echte Jahre (1963/64 …)
>    davorstehen. Kein „Rekordmeister", keine realen Titel.
> 2. **Ära-Register pflichtig (Regel 3)** — jede Zeile gehört genau EINEM Register (e63/e71/e83/e95/e10).
> 3. **Keine Saisonverlaufs-Behauptungen** — der State liefert nur die ABSCHLUSS-Tabelle (§4).

**Deliverable:** gefülltes `window.REPORTS_SEASON` in `data_reports.js`. Erzeugt über der
Abschlusstabelle einer **vergangenen** Saison einen 1–2-Satz-Rückblick (Meister-Satz + ggf.
Absteiger-Satz). Assembler (`_seasonReview`) + Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_SEASON` (Gerüst mit allen Keys steht).
- Greift an ZWEI Stellen (beide „History-Archiv"):
  a) **History-Fenster** (`loadLeague`, `viewHistoryOffset` ≤50 Sim-Saisons) — nur Gesamt-Ansicht,
     nicht beim Spieltags-Blättern. Sim-Jahre ≥2025 → immer Register **e10**.
  b) **IDB-Archiv** (`_renderArchivedSeason`) — echte geseedete Jahre 1963+ (DDR 1949+) und
     ältere Sim-Saisons → hier arbeiten ALLE Register. Nord/Süd-Staffeln: kein Rückblick.
- **Leerer Pool → kein Text** (Feature ist additiv). Kategorie-Pool leer → Fallback auf
  `standard` derselben Ära — NIE auf eine andere Ära.

## 2. Struktur & Slots
```js
window.REPORTS_SEASON = {
  meister: { dominanz: {e63:[…],e71:[…],e83:[…],e95:[…],e10:[…]}, fotofinish: {…}, standard: {…} },
  abstieg: { e63:[…], e71:[…], e83:[…], e95:[…], e10:[…] }
};
```
| Slot | Inhalt | erlaubt in |
|---|---|---|
| `{meister}` | Meistername (era-echt) | meister.* (pflicht) |
| `{vize}` | Zweitplatzierter | meister.* |
| `{liga}` | Liganame, epochenecht (`_tierName`; DDR: „DDR-Oberliga") | überall |
| `{saison}` | Saison-String („1987/88") | überall |
| `{punkte}` | Meister-Punktzahl, nackte Zahl — nur als „{punkte} Punkte/Zähler" (immer plural-sicher) | meister.* |
| `{vspPhrase}` | Vorsprung als fertige **Dativ**-Phrase („einem Punkt"/„drei Punkten") — NUR nach „mit …"/„vor …" | meister.dominanz/fotofinish |
| `{absteiger}` | fertige Namensliste („X, Y und Z" — auch nur EIN Name!) | abstieg (pflicht) |

## 3. Kategorien (Klassifikator = Opus, steht)
- `dominanz` — Vorsprung ≥8 Punkte (2-Punkte-Ära vor 1995: ≥5)
- `fotofinish` — Vorsprung ≤2 (2-Punkte-Ära: ≤1); bei Vorsprung **0** filtert der Assembler
  `{vspPhrase}`-Zeilen selbst heraus — trotzdem sparsam einsetzen
- `standard` — alles dazwischen
- `abstieg` — feuert zusätzlich, wenn Absteiger bekannt sind (Folgesaison-Vergleich)

## 4. Fallstricke
- **Nur Abschluss-Wissen:** Der State kennt NUR die Endtabelle. Verboten sind Verlaufs-Behauptungen
  wie „führte von Beginn an", „vorzeitig gesichert", „erst am letzten Spieltag entschieden",
  „Herbstmeister". Fotofinish-Zeilen zielen auf den **knappen Abstand** („hauchdünn", „trennt fast
  nichts"), nicht auf einen Zeitpunkt. Saisonende-Metaphern („Endspurt", „Zielgerade") sind ok.
- **Liga-neutral:** Dieselben Pools bedienen 1. Bundesliga, DDR-Oberliga UND Kreisliga C (History-
  Fenster zeigt jede Sim-Liga!). Keine Liga-Realien hardcoden: kein „Bundesliga", keine
  „Meisterschale", kein „Deutscher Meister", keine „Zweitklassigkeit" — stattdessen `{liga}`,
  „Titel", „Meisterschaft", „eine Liga tiefer".
- **{absteiger} numerus-invariant (Regel 5!):** Die Liste kann 1..n Namen enthalten. `{absteiger}`
  NIE als Subjekt eines flektierten Verbs („{absteiger} müssen runter" ❌ bricht bei einem Team).
  Nur invariante Konstruktionen: „Für {absteiger} geht es runter" ✅, „Der Abstieg trifft
  {absteiger}" ✅, „Bittere Gewissheit: {absteiger} — …" ✅.
- **Namen nicht deklinieren** (Regel 5): kein „{meister}s Titel".
- **Ära-Ton strikt trennen** (Regel 3): e63 formell/Reporter-Pathos („Spielzeit", „Elf"),
  e71 sachlich, e83 TV-griffig, e95 technischer, e10 Broadcast/Social. Jahre **vor 1963**
  (DDR 1949–62) fallen auf e63 — e63-Zeilen also auch dafür stimmig halten.

## 5. Determinismus
Seed aus `y|lid` → gleicher Rückblick bei Re-Render/Reload (Regel 8). Meister- und
Absteiger-Satz nutzen versetzte Indizes desselben Seeds.

## 6. Mengen (Regel 6)
Pro Kategorie: **e10 ≥10** Zeilen (alle Sim-Zukunft läuft hier auf), **ältere Register ≥6**.
Macht ≥ 3×34 + 34 = ~136 Zeilen gesamt.

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check`, Test §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const App=global.App={};eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
const B=window.REPORTS_SEASON;let f=0;
const chk=(n,a,min,bad)=>{const b=a.some(l=>bad.test(l));if(a.length<min||b)f++;
  console.log(n.padEnd(24),a.length,b?"⚠ verbotener Slot":a.length<min?"⚠ zu wenig":"");};
for(const c in B.meister)for(const e in B.meister[c])chk("meister."+c+"."+e,B.meister[c][e],e==="e10"?10:6,/\{absteiger\}|\{score\}|\{sieger\}|\{heim\}|\{gast\}/);
for(const e in B.abstieg)chk("abstieg."+e,B.abstieg[e],e==="e10"?10:6,/\{meister\}|\{vize\}|\{punkte\}|\{vspPhrase\}|\{score\}/);
console.log("Bsp 1965:",App._seasonReview({y:"1964/65",lid:"1",liga:"1. Bundesliga",meister:"Werder Bremen",vize:"1. FC Köln",punkte:41,vsp:3,absteiger:["Karlsruher SC","Schalke 04"]}));
console.log("Bsp 2031:",App._seasonReview({y:"2031/32",lid:"1",liga:"1. Bundesliga",meister:"VfB Stuttgart",vize:"FC Bayern",punkte:82,vsp:12,absteiger:["Holstein Kiel"]}));
console.log(f?"FEHLER":"ok");'
```
Erwartung: alle Pools ≥ Mindestmenge, keine Fremd-Slots, beide Beispiele liefern 2 Sätze im Ära-Ton.
