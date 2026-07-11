# Paket 7 — Integrations-Spec: Vereins-Chronik (erzählter Spielstand)

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md` + User-Vorgabe 2026-07-11):**
> 1. **NICHTS erfinden — die Erfindung kommt durch die Sim.** Der Spielstand erzählt die
>    Vereinsgeschichte; jede Aussage muss aus einem übergebenen Fakt folgen. Keine erfundene
>    Vergangenheit, keine realen Fakten, keine Gründungsjahre, keine Fankultur-Behauptungen.
> 2. **Rivalitäten sind emergent** (gemeinsame Sim-Saisons + Nähe) — keine erfundene
>    Vorgeschichte („seit Generationen verfeindet" ❌).
> 3. **Numerus-Disziplin bei {n}** (§4) — nur invariante Substantive („Titel", „Mal", „Saisons").

**Deliverable:** gefülltes `window.REPORTS_CHRONIK` in `data_reports.js`. Erzeugt im
Vereins-Steckbrief einen CHRONIK-Absatz (2–4 Sätze) aus reinen Spielstand-Fakten.
Fakten-Berechnung + Assembler (`_teamChronik`, `_chronikRivale`) + Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_CHRONIK` (Gerüst mit allen Keys steht, Arrays leer).
- Steckbrief (`showSteckbrief`), eigener Block CHRONIK zwischen KARRIERE und SAISON-HISTORIE.
- Aufbau: **1 Status-Satz + max. 2 Erfolgs-Sätze (Priorität Titel > Pokal > Aufstiege >
  Relegation) + ggf. 1 Rivalen-Satz.** Jeder Satz feuert nur, wenn der Fakt existiert.
- **Leerer Pool → Satz entfällt** ersatzlos (additiv). Kein Ära-Register (Steckbrief = Gegenwart).

## 2. Pools & Slots (jede Zeile = EIN Satz)
| Pool | feuert wenn | Slots |
|---|---|---|
| `status_neu_auf` | 1. Saison nach Aufstieg | `{liga}` |
| `status_neu_ab` | 1. Saison nach Abstieg | `{liga}` |
| `status_etabliert` | ≥2 Saisons in Folge in der aktuellen Liga | `{liga}`, `{n}` (Saisons) |
| `status_urgestein` | gesamtes History-Fenster (≥10 Saisons) nur diese Liga | `{liga}` — **keine Zahl!** („solange die Aufzeichnungen reichen") |
| `titel` | ≥1 Meistertitel/Staffelsieg (Archiv, alle Ligen) | `{n}`, optional `{letzte}` (Saison-String des letzten Titels; Zeilen mit {letzte} werden gefiltert, wenn unbekannt) |
| `pokal` | ≥1 DFB-Pokalsieg | `{n}` |
| `aufstiege` | ≥**2** Aufstiege (bei 1 wäre „Aufstiege" falscher Numerus) | `{n}` |
| `relegation` | ≥1 Relegationsteilnahme | `{p}` (Teilnahmen), `{relB}` (Bilanz „gewonnen:verloren", z.B. „2:1") |
| `rivale` | Team mit ≥5 gemeinsamen Saisons in <50 km | `{rivale}`, `{n}` (gemeinsame Saisons) |

## 3. Faktenquellen (nur Lesen, steht in Opus-Code)
`Engine.archive.ewige` (titles/promotions/years, überlebt 50er-Cap), Steckbrief-`rows`
(Saison-Historie mit M-Badges → `{letzte}`), `Engine.archive.relStats`, DFB-Pokalsiege aus
dem History-Fenster, Rivale aus `Engine.history`-Snapshots (gleiche Liga) + `_distKm`.

## 4. Fallstricke
- **„erste Saison in der {liga}" ist VERBOTEN** — der Verein kann früher schon dort gewesen
  sein. Richtig: „erste Saison **nach dem Aufstieg/Abstieg**" (das ist der belegte Fakt).
- **Numerus:** nach `{n}` nur invariante Substantive: „Titel", „Mal", „Saisons" (bei
  etabliert/rivale ist n≥2, „Aufstiege" nur im aufstiege-Pool mit n≥2 sicher). Kein
  „{n} Erfolge/Meisterschaften" in Pools, die auch bei n=1 feuern.
- **{letzte}** ist ein Saison-String („2031/32") — nur „zuletzt {letzte}"-Konstruktionen.
- **urgestein ohne Zahl:** das Fenster ist gekappt — „seit {n} Saisons" wäre zu niedrig.
  Formulierungen wie „solange die Aufzeichnungen reichen", „nie woanders gesehen".
- **rivale:** nur belegbare Gegenwart/Sim-Vergangenheit: „{n} gemeinsame Saisons", „ständiger
  Begleiter", „man kennt sich bestens" ✅ — keine erfundene Feindschafts-Historie, keine
  Fan-Behauptungen. Nicht festlegen, wer besser ist (kein Head-to-Head im State!).
- **Pokal:** „der Pokal" meint den DFB-Pokal — neutral halten („{n} Mal den Pokal geholt").
- **Vereinsname kommt nicht vor** (der Steckbrief zeigt ihn groß darüber) — Subjekt ist
  „der Verein/der Klub/die Mannschaft". `{rivale}` nicht deklinieren.
- **Keine Tabellen-Gegenwartswertung** („aktuell in Topform") — dafür sind Pakete 1–6 da.

## 5. Determinismus
Seed aus `teamId|Fakten-Signatur` → gleicher Text bei gleichem Spielstand; ändern sich die
Fakten (neuer Titel, Aufstieg), wechselt der Text mit (Regel 8: 0 Bytes gespeichert).

## 6. Mengen (Regel 6)
`status_etabliert`/`titel`/`rivale` **≥10** (häufigste Fälle), übrige Pools **≥8** → ~72 Sätze.

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check`, Test §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const App=global.App={};
global.GAME_DATA={leagues:{"1":{level:1},"2":{level:2}},teams:{}};global.Engine={history:[],teams:{},leagues:{"1":{name:"1. Bundesliga",level:1}}};
eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
App._leagueName=()=>"1. Bundesliga";
const B=window.REPORTS_CHRONIK;let f=0;const bad=/\{score\}|\{sieger\}|\{gegner\}|\{team\}|erste Saison in der|seit Generationen/;
const min={status_etabliert:10,titel:10,rivale:10};
for(const k in B){const a=B[k];const m=min[k]||8;const b=a.some(l=>bad.test(l));
  if(a.length<m||b)f++;console.log(k.padEnd(18),a.length,b?"⚠ verboten":a.length<m?"⚠ zu wenig":"");}
const rows=[{leagueId:"2",year:"2027/28",badges:[]},{leagueId:"1",year:"2028/29",badges:["M"]},{leagueId:"1",year:"2029/30",badges:[]},{leagueId:"1",year:"2030/31",badges:[]}];
console.log(App._teamChronik({teamId:"x",rows,leagueId:"1",meister:2,aufstiege:3,dfbSiege:1,relS:{played:2,won:1,lost:1}}));
console.log(f?"FEHLER":"ok");'
```
Erwartung: Mindestmengen erfüllt, keine verbotenen Muster, Beispiel liefert Status- +
2 Erfolgs-Sätze (Titel mit „zuletzt 2028/29" möglich + Pokal).
