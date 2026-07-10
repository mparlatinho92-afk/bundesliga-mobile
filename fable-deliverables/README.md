# Fable-Deliverables — Master-Index (Bundesliga Architect)

**Fable-Session-Start (Ritual):**
> „Fable-Session: Lies `FABLE-GRUNDREGELN.md` und `paketN-*/SPEC.md`, dann liefere das Deliverable."

Jede SPEC beginnt mit einem ⚠️-Block, der die 3 Kern-Verbote wiederholt – aber die
vollständigen Regeln stehen nur in **`FABLE-GRUNDREGELN.md`** (immer zuerst lesen).

## Grundlage
- **`FABLE-GRUNDREGELN.md`** — 8 verbindliche Regeln für ALLE Text-Pakete. Gilt über jedem Delta.

## Die Erzähl-Pakete

| # | Paket | Spec | Status / Voraussetzung |
|---|-------|------|------------------------|
| 1 | Spieltags-Schlagzeilen | `paket1-schlagzeilen/SPEC.md` | ✅ **GELIEFERT** (v0.8.50, 2026-07-10) — 414 Zeilen (52/Kat., Spitzen-/Kellerduell 26 Sieg + 25 Remis), QA §9 bestanden |
| 2 | Kontext-Schlagzeilen (anlassbezogen) | `paket2-kontext/SPEC.md` | ✅ **GELIEFERT** (v0.8.51, 2026-07-10) — `REPORTS_CONTEXT` 113 win + 72 draw über 9 reasonKeys, QA §8 bestanden |
| 3 | Vorschau-Anrisse | `paket3-vorschau/SPEC.md` | ✅ **GELIEFERT** (v0.8.51, 2026-07-10) — `REPORTS_PREVIEW` 91 Zeilen (≥10/Key), QA §8 bestanden |
| 4 | Pressestimmen / Trainer-Zitate | `paket4-pressestimmen/SPEC.md` | Spec folgt; neuer additiver Block nach Spieltag |
| 5 | Saison-Rückblick (History-Archiv) | `paket5-rueckblick/SPEC.md` | Spec folgt; Erzähltext aus Meister/Absteiger, **Ära-Register (Regel 3) pflichtig** |
| 6 | Serien-Texte (Sieges-/Krisenserie) | `paket6-serien/SPEC.md` | Spec folgt; Erkennung über `matchdayHistory` (Opus) |
| 7 | Vereins-/Spieler-Lore | `paket7-lore/SPEC.md` | Spec folgt; fiktive Vereinsgeschichten/Rivalitäten – **Regel 2 besonders heikel** |

**Reihenfolge:** 1 zuerst (System steht, größter Sofort-Effekt) → 2/3 (setzen direkt auf 1 auf)
→ 4/5/6 (je eigener Einbau-Ort) → 7 (reine Content-Masse).

## Faustregel
Fable schreibt, was der Spieler *liest*; Opus baut, was er *bedient*. Alles hier ist Lese-Content.

## Bereits gebautes System (Referenz für Paket 1)
- `data_reports.js` — `window.REPORTS` (8 Kategorien Schlagzeilen)
- `app/reports.js` — Assembler `_matchHeadline` + Spiel-des-Tages-Scoring (`_matchInterest`,
  `_spielDesTages`, `_spielDesTagesPrev`, Gewichte `_REPORT_W`)
- Render: `app/league.js` (dayResults + Vorschau), CSS `.res-line`/`.res-item-feat` in `template.html`
- Schema: `schemas/functions.schema.json` (alle `_report*`/`_sdt*`-Funktionen)
