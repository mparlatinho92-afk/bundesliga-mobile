# Offene Fixes & Features

Erste Fassung aus Claudes Projektgedächtnis (offene Punkte der Memory-Dateien, 14.10.2026) – es gab noch keine
Notizen des Nutzers. Die alte Sammelliste `docs/fixes-sync/Bundesliga Mobile Fixes.odt` (Stand 16.06.) ist **nicht** importiert.

**Abgeglichen gegen:** v0.8.215, Prüfdatum **2026-10-14** (vorher 2026-10-14 @ v0.8.214).
**Methode:** Gedächtnis gegen Code und `CHANGELOG.md` gehalten. „Erledigt" heißt: im Code oder Changelog nachweisbar — **nicht** im Browser getestet.

**Diese Datei ist die Quelle.** Sie wird bei jeder Änderung in ein Google Sheet gespiegelt
(Ordner „Bundesliga HTML", Titel „Bundesliga Fixes – Ist-Stand", Blätter „Fixes" und „Konzepte").
Das Sheet wird in place überschrieben, **der Link bleibt gleich**; ihn nennt
`node tools/spiegel-fixes.cjs`. Zeilen, die im Sheet von Hand angelegt oder geändert werden, markiert
Spalte „Prüfen"; sie landen vor dem nächsten Überschreiben im Abschnitt „✚ Aus dem Sheet – ungeprüft".

Status: ✅ erledigt · ◐ teilweise · ❌ offen · ❔ unklar / Entscheidung offen

---

## ❌ Offen

### Historische Vereine
- DDR: 14 offene Paare auf der Dubletten-Seite (`tools/hist_dubletten.html`, Haken „nur DDR"): Sonneberg (3×), Doberan, Pasewalk, Müncheberg, Chemie Döbern/„Böbern", Eumaco/Eumako Weißensee, Sömtron/Soemtron Sömmerda
- fussball-ddr.de: 63 Vermerke nicht aufgelöst (`tools/_dryrun/fddr_umbenennungen.txt`), darunter die Fusionen Lok/Armaturen Prenzlau, Motor WEMA/Aufbau Plauen, Blau-Weiß Reichenbach, Mansfelder SV Eisleben, Dynamo Fürstenwalde, Rotes Banner Trinwillershagen
- „Stahl Hennigsdorf" steht unter zwei IDs mit genau gleichem Namen
- Getrennt wegen gemeinsamer Saison (meist Zweitmannschaft in der Bezirksliga): Turbine Halle neben dem HFC, Turbine Neubrandenburg, Lok Stendal, TSC Oberschöneweide, SC Einheit Dresden/Lok Dresden – prüfen, ob es Reserven sind
- FC Mecklenburg Schwerin und SG Dynamo Schwerin landen über die Ewigen Tabellen in einer Linie (zwei Spielvereine) – getrennt gelassen
- BRD, offen ohne Beleg: Sachsenhausen, Güldenstern (Fusion laut Wikipedia 2016, VfL-Zeilen schon 2008), Lebach, Helmstedt/FC, Korbach, Morbach

### Ligagrößen
- Drift der Bodenligen (Stand 08/2026, vor jeder Änderung neu messen mit `tools/sim_headless.cjs`): Landesliga Lüneburg 51 % zu groß, Bayern Mitte 40 %, Verbandsliga Hessen Süd 38 %, Bayern Nordost 38 % zu klein, Bezirksliga Rheinhessen 34 % zu klein

### Karte
- Rest-Inseln (Geretsried, Heiligenstedten, Lam, Buchholz, Rastpfuhl); nach 40 Saisons entstehen etwa 2 neue, weil `_heimatBalance` keine Nachbarschaft kennt
- Fußballkreise aus den Kreisliga-Daten bauen
  - Grenzen aus der realen europlan-Verteilung, auch mit Vereinen, die nicht im Spiel sind (Eisenberg, Stetten, Mauchenheim)
  - Karte braucht nur zwei Stände: erste und aktuelle Saison
- Toter Hüllen-Code in `tools/gen_map.cjs` (~200 Zeilen), hängt noch an `dividers` / `MAP_SIBLING_MAP`

### Spielstärke
- Vereinsgröße ohne Stadion: der Nutzer will das Stadion als Maß später ganz ablösen
  - Tempo und Muster der Vereinswege an den fussball.de-Saisons und den historischen Saisons kalibrieren
  - nach ~40 Saisons ist die echte Historie vergessen, dann bleibt nur das Stadion als dauerhafter Unterschied

### Spieltags-Schlagzeilen
- Ausbaustufen derselben Pipeline: Pressestimmen/Trainer-Zitate, Saison-Rückblick im Archiv, Serien-Erkennung (Sieges-/Krisenserie)

### Ligapyramide
- Ligenstrukturen vereinfachen (DDR-Bezirke, BRD 1963–77) – daran scheitern die Kürzel

### Historische Daten
- Amateurligen 1963–78 ohne Tabelle: keine Einzelspiel-Rekorde (Grenze der Quelle)
- Ligaverlauf: die „ungespült"-Prüfung kann mit 12 Saisons nicht durchfallen, echte Gegenprobe braucht mehr als 50 Saisons

---

## ❔ Unklar / Entscheidung offen

- Amateurpokal als Zufluss für die Bodenligen – Nutzer zögert („tiefer Einschnitt, ich weiß nicht, ob ich es überhaupt will"), als Feature entscheiden
- 2020/21 (annulliert) ist probeweise übernommen (`ANNULLIERT_UEBERNEHMEN = true` in `tools/fbde_ebene58.mjs`, Nutzer: „schwierige Frage")
- Saisonkalender: Sammelzeilen zu oder offen starten? Brauchen Ebene 5–8 Länderspielpausen?
- Build in der Cloud: zurückgestellt am 04.10.2026 („es eilt nicht"), Abwägung in `docs/BUILD_IN_DER_CLOUD.md`
- Ligaverlauf: 6 DDR-Namen mit Seed-ID oder beim heutigen Nachfolger laut Wikipedia (Bischofswerda, Weißenfels, Lichtenberg 47, Rotation Babelsberg, Vorwärts Stralsund) – nach v0.8.213 neu prüfen
- Spielstand-Isolation Stufe 2 (Stempellauf über ~43.000 IndexedDB-Zeilen) nur bei Befund: doppelte `champions`-Einträge je Liga und Saison
- Mobil-Check Historie (Badges M/P am Vereinsnamen in der `.ltab`-Tabelle) – vermutlich längst erledigt, im Spiel prüfen
- Browser-Handouts P3: Stadien für 7 Vereine (Hamborn 07, HEBC, ETSV, HNT, SVGO, CFC Hertha, Wermelskirchen) und 4 Entscheidungen – Stand unklar

---

## ✅ Erledigt

| Punkt | Beleg |
|---|---|
| Browserprüfung nach v0.8.213 (`hist_check.mjs`, `fusion_check.mjs`) | grün; `fusion_check` prüft seit v0.8.215 auch Greifswald, Arnstadt, Ilmenau und „undefined" im Steckbrief |
| Chemie Glas Ilmenau nicht mit Chemie IW Ilmenau verbunden (bei der Browserprüfung gefunden) | v0.8.215 – fussball-ddr Suhl 1976/77 „Umbenennung der BSG Chemie Glas Ilmenau in BSG Chemie IW Ilmenau", eine Linie 1963–2011 |
| Steckbrief historischer Vereine zeigte „KOORDINATEN undefined, undefined" | v0.8.215 – Zeile nur bei vorhandenen Koordinaten |
| 1860 München: Wappenänderung zurücksetzen, altes und neues Wappen als Backup behalten (aus dem Sheet) | v0.8.214 – Löwe (Stand v0.8.111) für Erste und Reserve; beide Fassungen in `tools/wappen_backup/tsv1860muenchen_6_*` |
| Einheit Greifswald: Wikipedia und fussball-ddr widersprachen sich | v0.8.213 – Anschluss an KKW Nord 1968, jetzt Fusions-Vorgänger |
| DDR-Vereine über Ewige Tabellen und fussball-ddr.de verbinden | v0.8.213 |
| 2. Bundesliga 17 / 3. Liga 21 gekoppelt | v0.8.87 `_aufstiegsKandidaten` |
| Bayern-Dynastie fehlte | v0.8.209 |
| Einzelspiel-Rekorde Bundesliga 2003–10 und DDR-Oberliga | v0.8.195, Lieferung 10.10.2026 |
| Scraper-Lücken 2009/10–2011/12 | v0.8.203 |
| Klartext-Pokalsieger als hist_-Vereine | `hist_rapidwien` in `app/history_data.js` |
