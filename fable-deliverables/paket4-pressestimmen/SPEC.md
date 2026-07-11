# Paket 4 — Integrations-Spec: Pressestimmen / Trainer-Zitate („Stimmen zum Spiel")

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — und keine erfundenen Personen/Namen (Trainer bleiben namenlos).
> 2. **Keine Spielverlaufs-Details** — der State kennt NUR das Ergebnis (kein Elfmeter, keine
>    Karte, kein Halbzeitstand, keine Chancenzahl, keine Verletzung).
> 3. **Ich-Perspektive strikt einhalten** (§2) — der Sprecher wird vom Assembler bestimmt.

**Deliverable:** gefülltes `window.REPORTS_PRESS` in `data_reports.js`. Hängt unter das
**Spiel des Tages** der gespielten Ergebnisse zwei Trainer-Zitate („💬 Trainer von {team}: …").
Assembler (`_pressVoices`) + Verdrahtung stehen bereits.

## 1. Einbau-Ort & Wirkung
- Nur `data_reports.js` → `window.REPORTS_PRESS` (Gerüst mit allen Keys steht, Arrays leer).
- Greift nur beim **Spiel des Tages** im Ergebnis-Feed (`res-item-feat`), direkt unter der
  Kontext-Schlagzeile (Paket 2). Ein Zitat pro Seite: Sieger + Verlierer (Remis: Heim + Gast).
- **Leerer Pool → Zitat entfällt** ersatzlos (additiv, teilweises Füllen sicher).
- Nur Gegenwarts-Ton (Spieltage laufen ausschließlich in Sim-Jahren ≥2025) — **kein Ära-Register**.

## 2. Struktur & Slots
```js
window.REPORTS_PRESS = {
  kantersieg:     { sieger: […], verlierer: […] },
  deutlich:       { sieger: […], verlierer: […] },
  knapp:          { sieger: […], verlierer: […] },
  ueberraschung:  { sieger: […], verlierer: […] },
  remis_torlos:   { beide: […] },
  remis_torreich: { beide: […] }
};
```
- Jede Zeile ist ein Zitat in **Ich-/Wir-Form** (der Trainer spricht), OHNE Anführungszeichen
  (setzt der Renderer). Einziger Slot: **`{gegner}`** (Name des anderen Teams, optional,
  nicht deklinieren). **KEIN** `{score}`, kein `{sieger}`, keine Zahlen-Slots.
- Der Assembler wählt Sprecher + Zeile matchId-geseedet (Reload-stabil); bei `beide` bekommen
  Heim und Gast garantiert verschiedene Zeilen.

## 3. Kategorien (Klassifikator = Opus, steht)
Score-basiert wie Paket 1 (`ueberraschung` > Tordifferenz), Tabellen-Kategorien
(spitzenspiel/kellerduell) werden auf die Score-Kategorie zurückgemappt:
- `kantersieg` (Diff ≥4) — sieger: Gala-Stimmung ohne Übermut · verlierer: bedient, Entschuldigung Richtung Fans
- `deutlich` (Diff 2–3) — sieger: zufrieden, kontrollierter Auftritt · verlierer: enttäuscht, klare Ansage
- `knapp` (Diff 1) — sieger: erleichtert, Arbeitssieg · verlierer: geknickt, „da war mehr drin"
- `ueberraschung` — Klassifikator garantiert: **sieger = Außenseiter** (darf stolz auf die
  Sensation sein), **verlierer = Favorit** (darf sich die Blöße eingestehen)
- `remis_torlos` (0:0) — beide: Defensivarbeit loben / Offensivflaute einräumen
- `remis_torreich` (1:1 **bis** 4:4!) — beide: Punkt einordnen — Zeilen müssen für ein müdes
  1:1 UND ein wildes 4:4 funktionieren (kein „Torfestival", kein „hinten dicht")

## 4. Fallstricke
- **Nur Meinung, keine Ereignisse:** Trainer dürfen werten („wir waren griffiger", „das war zu
  wenig"), aber nichts behaupten, was die Sim nicht erzeugt hat: keine Elfmeter, Platzverweise,
  Latten, Halbzeitstände, Wechsel, Verletzten, Schiedsrichter- oder Zuschauerdetails.
- **Keine Namen, keine Personen:** kein „mein Stürmer", kein Spieler-/Trainername, kein
  Vereinsumfeld („der Präsident"). „die Mannschaft", „die Jungs", „wir" sind das Vokabular.
- **Perspektive nicht verrutschen:** sieger-Zeilen dürfen NUR aus Siegersicht funktionieren,
  verlierer-Zeilen nur aus Verlierersicht; `beide`-Zeilen müssen für beide Remis-Seiten passen.
- **Liga-neutral:** Zitate laufen in der 1. Bundesliga UND der Kreisliga („Champions League",
  „Millionen-Kader", „Profis" verboten; „drei Punkte", „Tabelle", „Wochenende" sind sicher).
- **Tabellen-/Saisonlage nicht behaupten** („Abstiegskampf", „Titelrennen") — die Kategorie
  weiß nichts über den Tabellenplatz.
- `{gegner}` artikellos einsetzbar halten: „Kompliment an {gegner}" ✅, „gegen den {gegner}" ❌.

## 5. Determinismus
Seed = `_reportSeed(r)` (home|away|score) → gleiche Zitate bei Re-Render/Reload; Sieger- und
Verlierer-Zitat nutzen versetzte Indizes.

## 6. Mengen (Regel 6)
Feuert bei JEDEM Spieltag (höchster Wiederholungsdruck nach Paket 1): pro Pool **≥12** Zeilen
(10 Pools → ≥120 Zitate). Pool-Länge **nicht exakt 13** wählen (Offset-Kollision, s. Assembler).

## 7. Opus-Nacharbeiten
Reiner Bank-Ausbau = **keine** Code-/Schema-Änderung. `node --check`, Test §8, Changelog, `manage-v`.

## 8. Schnelltest (Node)
```bash
node -e 'global.window={};const App=global.App={};eval(require("fs").readFileSync("data_reports.js","utf8"));
eval(require("fs").readFileSync("app/reports.js","utf8").replace(/Object\.assign\(App,/,"Object.assign(global.App,"));
const B=window.REPORTS_PRESS;let f=0;const bad=/\{score\}|\{sieger\}|\{verlierer\}|\{heim\}|\{gast\}|"/;
for(const c in B)for(const s in B[c]){const a=B[c][s];const b=a.some(l=>bad.test(l));
  if(a.length<12||a.length===13||b)f++;console.log((c+"."+s).padEnd(26),a.length,b?"⚠ Slot/Anführungszeichen":a.length<12?"⚠ zu wenig":a.length===13?"⚠ Länge 13":"");}
const byName={A:{rank:4,strength:60},B:{rank:11,strength:44}};
console.log(App._pressVoices({home:"A",away:"B",score1:5,score2:0},byName));
console.log(App._pressVoices({home:"A",away:"B",score1:1,score2:1},byName));
console.log(f?"FEHLER":"ok");'
```
Erwartung: alle Pools ≥12 (≠13), keine Fremd-Slots/Anführungszeichen, beide Aufrufe liefern
je 2 Sprecher-Zitate mit verschiedenen Zeilen.
