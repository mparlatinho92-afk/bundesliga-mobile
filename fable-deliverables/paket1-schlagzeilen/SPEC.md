# Paket 1 — Integrations-Spec: Spieltags-Schlagzeilen

> ⚠️ **Kern-Verbote (voll in `FABLE-GRUNDREGELN.md`):**
> 1. **Keine realen Fakten** — keine echten Meistertitel/Pokalsiege/Auf-Abstiege. Nur
>    Stadt/Region/Charakter/Tradition. Die Sim-Historie ist fiktiv.
> 2. **`{score}` ist vormontiert** — bei Sieg IMMER aus Siegersicht („5:0"), nie selbst bauen.
> 3. **Passiv** — die Bank beschreibt nur ein Ergebnis, das die Engine erzeugt hat.

**Deliverable:** erweiterte/aufgewertete `data_reports.js` (`window.REPORTS`). Reine Phrasen-Bank,
kein Runtime-LLM. Assembler + Auswahl stehen bereits (`app/reports.js`) — diese Spec ist der
Sprach-Auftrag. `manage-v` inliniert `data_reports.js` automatisch (Regel 4).

## 1. Einbau-Ort
- Nur `data_reports.js` editieren (`window.REPORTS = { kategorie: [ …zeilen… ] }`). Kein Code.
- Struktur/Slot-Vertrag steht im Dateikopf — nicht verletzen.
- Keine Änderung an `app/reports.js`/`app/league.js` nötig.

## 2. Slots (vom Assembler `_matchHeadline` gefüllt)
| Slot | Inhalt | Verfügbarkeit |
|---|---|---|
| `{heim}` `{gast}` | Vereinsnamen (Nominativ, nicht deklinieren) | immer |
| `{sieger}` `{verlierer}` | Vereinsnamen | **nur in Sieg-Kategorien** |
| `{score}` | bei Sieg aus Siegersicht („3:1"), bei Remis Heimsicht („2:2") | immer |

Artikel-Falle (Regel 5): der FC / die Eintracht / Bayern → **artikellose** Formulierungen
bevorzugen („Sieg für {sieger}", „{sieger} setzt sich durch") statt „{sieger}s Auftritt".

## 3. Kategorien (Klassifikator `_reportCategory`, Referenz — NICHT ändern)
| Key | Wann | Sieger-Slots? |
|---|---|---|
| `kantersieg` | Tordiff ≥ 4 | ja |
| `deutlich` | Tordiff 2–3 | ja |
| `knapp` | Tordiff 1 | ja |
| `remis_torreich` | Unentschieden, ≥1 Tor je Team | **nein** (nur `{heim}/{gast}/{score}`) |
| `remis_torlos` | 0:0 | **nein** |
| `ueberraschung` | klarer Favorit verliert (Δstärke ≥10) | ja |
| `spitzenspiel` | beide Rang ≤3 (Remis möglich!) | **gemischt** – s. §4 |
| `kellerduell` | beide unter den letzten 3 (Remis möglich!) | **gemischt** – s. §4 |

Priorität: `ueberraschung > spitzenspiel/kellerduell > kanter > deutlich > knapp > remis_*`.

## 4. Filter-Vertrag (der Assembler wählt vor)
- **Remis** → nur Zeilen **ohne** `{sieger}/{verlierer}`.
- **`spitzenspiel`/`kellerduell`**: brauchen **beide** Sorten — Sieg-Zeilen MIT `{sieger}` und
  Remis-Zeilen OHNE. Bei einem Sieg zieht der Assembler nur Sieger-Zeilen, bei Remis nur die
  anderen. Also je ~Hälfte pro Sorte liefern.
- Reine Sieg-Kategorien (kanter/deutlich/knapp/ueberraschung): jede Zeile MUSS `{sieger}` +
  `{verlierer}` (oder `{score}`) tragen — nie ein nacktes Remis-Framing.

## 5. Determinismus
`_reportSeed` = Hash aus `home|away|score` → Zeilenwahl ist über Reloads stabil (Regel 8).
Konsequenz: mehr Zeilen ⇒ weniger Wiederholung; Pool-Änderung verschiebt die Wahl auch
rückwirkend (akzeptiert).

## 6. Mengen (Regel 6)
Aktuell **20 Zeilen/Kategorie** (Opus-Seed). Ziel: **≥50/Kategorie**, für `spitzenspiel`/
`kellerduell` je ~25 Sieg + ~25 Remis. Ton mischen: Boulevard, nüchterner Lokalsport,
Konferenz-Pathos — nicht ein Register durchziehen. Ein paar Zeilen dürfen ohne Vereinsnamen
auskommen (funktionieren, solange direkt unter der Paarung angezeigt) — aber die Mehrheit MIT.

## 7. Fallstricke
- **Kein „Tore satt" bei 1:1** — `remis_torreich` feuert auch für 1:1. Zeilen so halten, dass
  sie für 1:1 *und* 4:4 passen (Regel 7), oder Torfülle nicht behaupten.
- **Keine realen Fakten** (Regel 2): „Traditionsklub"/„Rivale" ok, „Rekordmeister"/„Absteiger
  der Vorsaison" NICHT (letzteres ist State — kommt ggf. später via Paket 2, nicht hier raten).
- **`{score}` nie umdrehen** — steht schon siegerrichtig; „siegt 0:5" ist ein Bug in der Zeile.
- Kein Bezug auf Torschützen/Minuten/Karten — die Engine liefert nur das Ergebnis.

## 8. Opus-Nacharbeiten
- Reiner Corpus-Ausbau = **keine** Schema-/Code-Änderung. Nur `node --check data_reports.js`,
  Changelog, `manage-v` (Hotfix-Stufe, additiv).
- Neue Kategorie/neuer Slot → dann DOCH Opus (Klassifikator + Assembler + Schema).

## 9. Schnelltest (Node)
```bash
node -e 'global.window={};const A={};eval(require("fs").readFileSync("data_reports.js","utf8"));
for(const k in window.REPORTS){const a=window.REPORTS[k];
  const badRemis=/remis/.test(k)&&a.some(l=>/\{sieger\}|\{verlierer\}/.test(l));
  const dup=a.length!==new Set(a).size;
  console.log(k.padEnd(15),a.length,badRemis?"⚠ Sieger-Slot in Remis":"",dup?"⚠ Duplikate":"");}'
```
Erwartung: jede Kategorie ≥50, keine `{sieger}`-Slots in `remis_*`, keine Duplikate.
