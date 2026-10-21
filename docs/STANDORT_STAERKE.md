# Gemeinde + Einwohner je Spielstätte (v0.8.205)

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Jede Spielstätte in `team.venues[]` trägt `gem` (Gemeinde), `ags` (Amtlicher Gemeindeschlüssel), `ew` (Einwohner).
Quelle **BKG VG250-EW** (amtliche Gemeindegrenzen, Gebietsstand + Einwohner 31.12.2024), Punkt-in-Polygon in UTM32.
Rohdaten in `tools/_vg250/` (gitignored, Download-Adresse im Kopf von `tools/stadion_gemeinden.py`).

```bash
python tools/stadion_gemeinden.py          # -> tools/stadion_gemeinden.json (+ Bericht: Rand-/Ortsnamen-Fälle)
node tools/stadion_gemeinden_einbau.cjs    # -> gem/ags/ew in game_data.js
node tools/stadion_gemeinden_test.cjs      # Exit 1 (--selbsttest muss durchfallen); Browser: .claude/skills/run/gemeinde_check.mjs
```

- **Nach jeder Koordinaten-/Stadion-Korrektur** die drei Befehle wiederholen – sonst stimmt `gem` nicht mehr.
- Liegt die Koordinate bis 300 m hinter der Grenze und nennt europlans `ort` die Nachbargemeinde, gilt die genannte
  (Werner-Kalle-Arena → Zeltingen-Rachtig, Rugenbergen → Bönningstedt, Sportplatz Stahlberg).
- Die Testprüfung hat zwei Gegenproben, die von der Zuordnung unabhängig sind: Landesziffer des AGS gegen den
  Landesverband, und Stadion höchstens 40 km vom Vereinspunkt. Sie fanden **drei europlan-Namensvettern** (63–135 km
  vom Verein), korrigiert in v0.8.205: SV 1920 Geinsheim → Sportanlage Am Wäldchen (statt Trebur), SC Birkenfeld →
  Stadion am Berg (statt Erlachstadion/Enzkreis), VfB Reichenbach → Sportanlage Schulstraße (statt Waldbronn,
  5000 → 1500 Plätze). Feste Zuordnung in `tools/stadium_zuordnung.json`. **Die Hand-Zuordnung schlägt seitdem auch
  den Koordinaten-Anker** in `match_stadiums.cjs` – vorher hätte der Anker (alte falsche venues[0]) sie überstimmt.
- `match_stadiums.cjs --write` schreibt ALLE Vereine neu (volle Nachkommastellen statt 5) – für Einzelkorrekturen
  nur die betroffenen venues setzen.

### Standort wirkt auf die Stärke (v0.8.206, `Engine._standort`, `STR_ORT`)

Nutzerwunsch: kleine Orte schwerer, Konkurrenz bremst. **Erst gemessen, dann gebaut** (`python tools/standort_analyse.py`,
echte Liga 2025/26, Ebene 1–6 – 7/8 sind nur in RLP/Saar + Berlin modelliert und erzeugten eine Scheinkorrelation 0,40):
- Gemeindegröße sagt die Liga voraus, auch ohne Stadion (t ≈ 7). **Berlin** spielt 0,75 Ebenen unter seiner Größe,
  Hamburg 0,37 – dort teilen sich ~30 Vereine EINE Gemeinde. **Ruhrgebiet: kein Bremseffekt** (+0,03), jede Stadt hat
  eigene Einwohner. Umkreis-Konkurrenz erklärt nichts darüber hinaus → nicht gebaut.
- Maß: log10(Einwohner / erste Mannschaften bis Ebene 6 derselben Gemeinde), gegen den Median der AKTUELLEN Ebene,
  auf allen Ebenen, je Ebene zentriert.
- Kalibriert mit `node tools/standort_sim.cjs 214 [STR_ORT=x]`: echt 0,70 Ebenen je Zehnerpotenz, ohne Standort
  zerfließt es auf 0,48, **sehr empfindlich** (1 → 0,86, 4 → 1,42). `STR_ORT 0.7` → 0,75–0,83.
- **Hertha** (Nutzer: „durch das Stadion zu stark“): Stadion-Term war gleich Bayerns, 32–35 Titel/214 Saisons. Fix:
  `STR_IDENT_MAX 20 → 6` – alle großen Stadien zählen gleich, Hertha 10–19. Siegserien in 2×150 Saisons für 20/10/6
  nicht unterscheidbar (ein 60-Saisons-Lauf hatte einen Verlust vorgetäuscht). Stadion ganz raus = Titel-Lotterie
  (Freiburg/Union Rekordmeister), verworfen.
- Geprüft: `liga_realismus` (Drift/Durchlässigkeit im Rauschen), `tor_pruefung`, `sensation_check` grün.
- **Millionenstädte geglättet (v0.8.207, `STR_ORT_EW_MAX` = 1 Mio.):** Nutzerstand nach 75 Saisons zeigte Berlin im
  AUFstieg (5,33 → 5,10) – ein Berliner Amateurverein galt mit 123.000 Einwohnern je Verein als groß. Am echten Datensatz
  gefittet (Deckel/Exponent durchprobiert): Deckel 1 Mio. erklärt am besten (R² 0,103 → 0,110), Berlin −0,54 → −0,17,
  Hamburg +0,10, Köln unverändert. München bleibt +1,7 in jeder Variante (3 Vereine, Bayern) – nicht glättbar.
  Sim danach: Berlin 5,27–5,33 (stabil).

### Dynastien (v0.8.209, `STR_GED_TITEL` / `STR_GED_CL` / `STR_GED_MAX_L1`)

`node tools/dynastie_check.cjs 186 [KEY=VALUE]` misst je 62 Saisons gegen die echte Bundesliga 1963–2025 (Top-Verein 33,
13 verschiedene Meister, Serie 11). Vorher: Top 11–16, Serie 3–4 – Vielfalt stimmte, Konzentration fehlte, weil das
Gedächtnis linear nach Platz zählte (Meister 8,94 ≈ Vize 8,89). Jetzt: Meister +1,5 Stufen im Gedächtnis, Deckel in
Liga 1 auf 40 → Top 26–41, Serie 6–13, Meister 71–74 Punkte, Siegserien länger (längste 17–18 statt 12–13).
- **CL-Bonus 0:** schon 0,25–0,5 bildete ein Kartell der ersten vier (9–10 verschiedene Meister statt 13).
- **Deckel 40 nur in Liga 1:** in Liga 2 blockierten gefallene Riesen die Aufstiegsplätze (Sechstligisten → 2. Liga 2× statt 4–8×).
- **Sieglose Serien:** längste 26–30 mit UND ohne Dynastie (Gegenprobe gegen den eingebauten Stand) – die alte
  Vergleichszahl 22 kam aus kürzeren Läufen; ein Maximum wächst mit der Laufzeit. Nur gleich lange Läufe vergleichen.
- Läufe streuen stark (mal entsteht eine Dynastie, mal nicht): je Einstellung ≥ 4 Läufe.
- `tor_pruefung` Ebene 7 0:0 liegt auch im alten Stand bei ~2,1 % (real 2,6) und reißt gelegentlich die 3-Sigma-Grenze –
  Rauschen, vor Entwarnung wiederholen.

**Zeitgleiche Schlussspieltage (Live-Modus) sind GEMESSEN, keine Regel.** `node tools/schlussspieltage_fupa.mjs` (FuPa, je Liga die
letzten drei Spieltage zweier Saisons, Anteil am häufigsten Anstoß; nach zwei Volläufen sperrt FuPa mit 429 → `--nur <lid,…>` holt
einzelne nach) → `node tools/schlussspieltage_einbau.mjs` schreibt `Engine._ACTION_SCHLUSS` (Block SCHLUSS-START/END). Erste Fassung
nahm „33. + 34. Spieltag zeitgleich, Pauschalzeit je Ebene“ an – falsch: Bundesliga/2. Liga/3. Liga nur der letzte, viele untere Ligen
gar nicht (Nutzer: „prüfe jede echte liga“).

**Exportname** (`App._exportName`, v0.8.207): `bundesliga_SAISON_vVERSION_DATUM_HHMM.json`, Saison aus dem Feld `y` des
Inhalts. Anlass: zwei Exporte am selben Tag hießen gleich; der zweite („(1)“) enthielt ein frisch angelegtes Spiel
(saveId-Zeitstempel 18:52:37, 0 Saisons) – der Export schreibt, was in `ba_save_v66` steht, nicht was ein anderer Tab zeigt.
Browserprüfung `.claude/skills/run/export_check.mjs` (mit `--selbsttest`).
