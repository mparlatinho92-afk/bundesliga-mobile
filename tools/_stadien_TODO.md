# Stadien aus europlan (Name / Ort / Kapazität) → Steckbrief

**ERLEDIGT am 02.08.2026, ausgeliefert in v0.8.65.** Die IP-Sperre war am selben Tag
wieder weg. Endstand in `game_data.js`: 1117 von 1264 Vereinen haben `venues[]`,
1163 Spielstätten – 100 % mit Name, 97,1 % mit Kapazität, 96,5 % mit Ort, 36 Vereine
mit mehreren Plätzen. 147 ohne Spielstätte, davon 57 ligalos (stehen in keiner
europlan-Liga, bekommen also nie eine).

Was unten unter „Offen" stand, ist durchgelaufen. Der Abschnitt bleibt als Anleitung
stehen, falls die Daten neu gezogen werden müssen.

## Ziel
Jedes Team in `game_data.js` bekommt `venues[]` mit `stadName`, `ort`, `kapazitaet`.
Vereine mit mehreren Spielstätten (Spielgemeinschaften, getrennte Plätze für 1./2./3.
Mannschaft) bekommen alle Plätze, Hauptplatz zuerst. Anzeige im Steckbrief.

## Fertig
- `tools/europlan_stadiums.cjs` – Scraper.
  - Phase 0: Liga-Index von `index.php?s=land&id=1` (**ganze Seite** parsen – der alte
    Scrape in `europlan_coords.json` hatte nur die ersten 200k Zeichen gelesen und
    dadurch u.a. **ganz Bayern und die Regionalliga West verloren**; deshalb fanden
    Unterhaching, Illertissen, Schweinfurt & Co. nie ein Stadion).
  - Phase 1: Ligaseiten → Stadionname, **Kapazität**, Koordinaten, Stadion-URL je Team.
  - Phase 2: Stadion-Detailseiten → **Ort** (Anschrift), Kapazität, Untergrund, Eröffnung.
  - Cache/Resume: `tools/europlan_stadiums.json` (aktuell 247 Ligen + 100 Detailseiten).
  - Flags: `--skip-details` (nur Phase 0+1), `--no-index`.
  - Whitelist: existiert `tools/stadium_needed.json` (Array von Stadion-URLs), lädt
    Phase 2 nur diese – so reichen ~1.200 statt ~3.900 Detailseiten.
- `tools/match_stadiums.cjs` – EP-Verein → unser Team.
  - Sicherung: Mannschafts-Rang muss passen (`FC X` matcht nie `FC X II`), normalisierte
    Namens- oder Token-Set-Gleichheit, Distanz-Veto 25 km, Kontrolle gegen die
    vorhandene `venues[0]`-Koordinate (Anker). Mehrere Treffer werden gesammelt und
    nach Liga-Nähe sortiert (Hauptplatz vor B-Platz/Nebenplatz).
  - Dry-Run schreibt `tools/stadium_match.json`; `--write` setzt `venues[]` in
    `game_data.js` (Datei wird komplett neu serialisiert – Round-Trip ist verifiziert).
- Steckbrief-Anzeige: `App._stadionHtml` (app/modal.js) + Aufruf in `showSteckbrief`,
  Karten-Panel über `#sb-stadion` (template.html) und `app/map.js`. Optisch getestet.

## Konfliktregel (neu in v0.8.65, in `match_stadiums.cjs`)
Widersprechen sich Namenstreffer und Koordinaten-Anker, entscheidet der **Mannschaftsrang**
zusammen mit einer **Nebenplatz-Erkennung** (`NEBENPLATZ`, erkennt „B-Platz", „Nebenplatz 1",
„Platz 3", „Ostplatz", nachgestelltes „ B"):
* **Reserve** → Namenstreffer bleibt. Eine zweite Mannschaft spielt tatsächlich auf dem
  Nebenplatz (Werder II → „Amateurstadion Platz 11", nicht Weserstadion).
* **1. Mannschaft** → Anker gewinnt, **außer** der Namenstreffer ist der einzige Hauptplatz.
  Ohne diese Ausnahme kippt die Regel 15 Vereine ins Falsche, weil dort der ANKER auf den
  Nebenplatz zeigt (VfB Lübeck → „Lohmühle Nebenplatz 4" statt „Stadion an der Lohmühle").
  So repariert sie die 18 echten Fälle (Hannover 96, MSV Duisburg, FC Gießen …) und lässt
  den Rest in Ruhe.

⚠ **Der Anker liest `venues[0]` – also das Ergebnis des letzten `--write`.** Nach dem ersten
Schreiben fielen die Konflikte deshalb von 59 auf 18 (dieselben 18, das Verfahren ist auf
einem Fixpunkt). Wer aus einem frischen `game_data.js` neu matcht, sieht wieder alle 59 und
braucht die Nebenplatz-Erkennung.

## Erledigte Schritte (Ablauf zum Nachfahren)
1. **Warten bis europlan wieder erreichbar ist** (Test:
   `curl -s -o /dev/null -w "%{http_code}" https://www.europlan-online.de/index.php?s=land&id=1 --max-time 20`).
   Sperre kam nach ~350 Requests mit 3 Workern; Scraper läuft jetzt mit 1 Worker/900 ms.
2. `node tools/europlan_stadiums.cjs --skip-details` → vollständiger Liga-Index + fehlende
   Ligaseiten (Bayern, West …).
3. `node tools/match_stadiums.cjs` → Trefferquote prüfen, `conflicts` in
   `stadium_match.json` durchsehen (Name-Treffer vs. Koordinaten-Anker).
4. Aus den Treffern `tools/stadium_needed.json` schreiben (alle `venues[].url`), dann
   `node tools/europlan_stadiums.cjs --no-index` → nur die gebrauchten Detailseiten (Ort).
5. `node tools/match_stadiums.cjs --write`, Steckbrief prüfen, dann `./manage-v`.

## Letzter Messstand (halber Datenbestand, Liga-Index unvollständig)
1264 Teams → 686 gematcht (526 namensgleich, 66 Token-Set, 94 nur über Koordinaten-Anker),
522 vom Anker bestätigt, 39 Abweichungen, 25 Vereine mit mehreren Plätzen, 578 ohne Treffer
(davon 142 ligalos – die stehen in keiner europlan-Liga).
