# Offene Fixes & Features

Erste Fassung aus Claudes Projektgedächtnis (offene Punkte der Memory-Dateien, 14.10.2026) – es gab noch keine
Notizen des Nutzers. Die alte Sammelliste `docs/fixes-sync/Bundesliga Mobile Fixes.odt` (Stand 16.06.) ist **nicht** importiert.

**Abgeglichen gegen:** v0.8.219, Prüfdatum **2026-10-15** (vorher 2026-10-14 @ v0.8.218).
**Methode:** Gedächtnis gegen Code und `CHANGELOG.md` gehalten. „Erledigt" heißt: im Code oder Changelog nachweisbar — **nicht** im Browser getestet.

**Diese Datei ist die Quelle.** Sie wird bei jeder Änderung in ein Google Sheet gespiegelt
(Ordner „Bundesliga HTML", Titel „Bundesliga Fixes – Ist-Stand", Blätter „Fixes" und „Konzepte").
Das Sheet wird in place überschrieben, **der Link bleibt gleich**; ihn nennt
`node tools/spiegel-fixes.cjs`. Zeilen, die im Sheet von Hand angelegt oder geändert werden, markiert
Spalte „Prüfen"; sie landen vor dem nächsten Überschreiben im Abschnitt „✚ Aus dem Sheet – ungeprüft".

Status: ✅ erledigt · ◐ teilweise · ❌ offen · ❔ unklar / Entscheidung offen

---

## ◐ Teilweise

### Historische Vereine
- ◐ Generell Deutschlandweit, jede Ära prüfen. Nachfolger historischer Vereine, die nicht im Spiel vorkommen, im Steckbrief erwähnen (aus dem Sheet)
  - Gemessen 15.10.2026: 4.450 historische IDs enden vor 2024/25 ohne Anschluss (BRD 3.518; beste Ebene 1–2: 90, 3: 575, 4: 1.633, 5–8: 1.279). Die meisten bestehen weiter und sind nur aus den erfassten Ligen gefallen
  - ✅ Stufe 1 (BRD Ebene 1–2, Build ausstehend): `node tools/wiki_brd_nachfolger.mjs` (Gegenprobe an den bekannten Fällen 129/177) – 11 Fusionen in Spiel- oder hist-Vereine (u. a. BC Augsburg → FC Augsburg, Phönix/TuRa → Südwest Ludwigshafen), 3 Umbenennungen (TuS Neuendorf → TuS Koblenz, 1. FC Neukölln → Novi Pazar), 19 Nachfolger außerhalb des Spiels; Alias „1.FC Mülheim“ → Mülheimer FC 97 war falsch (MFC 97 gegründet 1997), jetzt beim 1. FC Mülheim-Styrum; ESV Ingolstadt unter einer ID
  - ❌ Stufe 2: Ebene 3 (575 Vereine), gleiches Skript mit `--ebene 3`
  - ❔ DDR-Seed 1949–55 (~15 IDs, z. B. Motor Dessau → SV Dessau 05, Motor Gera → Wismut Gera) – berührt `remap`, zusammen mit dem ❔-Punkt „Ligaverlauf: DDR-Namen mit Seed-ID“ entscheiden
  - ❔ Unklar: Polizei SV Bremen (Fusion 2025 mit ATSV Habenhausen, Name?), Duisburg 48/99 (Daten bis 2019, Fusion laut Wikipedia 1964), Preußen Berlin (SV Preußen oder BFC Preussen?)

---

## ❌ Offen

### Historische Vereine
- DDR-Dubletten ohne Beleg (Wikipedia, fussball-ddr.de, Websuche ergebnislos): SG Sachsenhausen (Bezirksliga Potsdam bis 1986/87) ↔ TuS 1896 Sachsenhausen (ab 2008/09); Lok Bad Doberan / Bad Doberaner SV 1990 ↔ Doberaner FC (2023/24)
- fussball-ddr.de: 63 Vermerke nicht aufgelöst (`tools/_dryrun/fddr_umbenennungen.txt`), darunter die Fusionen Lok/Armaturen Prenzlau, Motor WEMA/Aufbau Plauen, Blau-Weiß Reichenbach, Mansfelder SV Eisleben, Dynamo Fürstenwalde, Rotes Banner Trinwillershagen
- Verbindung unklar (Ewige Tabellen): Vorwärts Rostock → Vorwärts Stralsund (Delegierung 1967, Stralsund hat 2 IDs), SC Einheit Dresden → FSV Lok Dresden (gemeinsame Saison 1963), Stahl Eisleben (DDR-Liga: Nachfolger MSV Eisleben, II. DDR-Liga: Dynamo Eisleben)
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
| „Stahl Hennigsdorf" stand unter zwei IDs mit genau gleichem Namen | v0.8.219 – f-archiv nennt in der Bezirksliga Potsdam 1990/91 „Stahl Hennigsdorf", laut fussball-ddr.de war es Motor Hennigsdorf (Platz 2, 14-6-6 52:27), Stahl spielte zeitgleich in der DDR-Liga A. Einzelzeilen-Korrektur `tools/farchiv_zeilen_korrektur.json` (neu, mit WARNUNG bei totem Eintrag); Trennung in `hist_alias_getrennt.json` entfällt |
| FV Olympia Ramstein und FV Ramstein nicht verbunden (aus dem Sheet) | v0.8.218 – „FV Ramstein“ ist die fussball.de-Kurzform: Meister Bezirksliga Westpfalz 2022/23, dann Landesliga Südwest West, wo FV Olympia Ramstein 2025/26 steht; keine gemeinsame Saison, kein weiterer Ramsteiner Verein. Schreibweise, eine Linie 2011–2025. Neuladen hätte nicht geholfen – es war ein Datenbefund |
| Durststrecken-Ranking Vereine aktualisieren (aus dem Sheet) | 14.10.2026 neu gerechnet (`node tools/durststrecke.cjs 30 --speichern`): Innenlücken gesamt 7.102 → 14.153 Saisons, weil Ebene 4 vor 1994 frühe Saisons ergänzt (Randlücke wird Innenlücke); 263 Vereine kürzer (TuRa Bremen 58→16, ASV Cham 55→10); Spitze TuS Niederkirchen 59 (1964/65–2022/23) |
| Nachfolger historischer Vereine, die nicht im Spiel vorkommen, im Steckbrief erwähnen | v0.8.217 – 108 DDR-Vereine aus den Ewigen Tabellen (heute / seit / Nachfolger / aufgelöst), `tools/hist_nachfolger.json` |
| Hinweise „heutiger Verein hat eine ID“ verbinden | v0.8.217 – Turbine → Fortuna Magdeburg (Umbenennung 1990), Fusionen FC Eisenach 2011, SC Freital 2020, 1. FC Neubrandenburg 04 1999, Stahl Riesa 1998 (alle Wikipedia); Reserven Zwickau/Prenzlau, FSV Kali Tiefenort |
| DDR-Dubletten: 14 offene Paare auf der Entscheidungsseite | v0.8.216 – mit Beleg entschieden: Sonneberg eine Linie EIO → 1. SC → 1. FC Sonneberg 2004 (Wikipedia), Weißensee Einheit → Eumako → Weißenseer FC (Wikipedia), VfB IMO Merseburg 1997–2019 (Wikipedia), Güstrower SC 09 Fusion 2010 (Wikipedia), Pasewalker FV Fusion 1993 (Wikipedia), Doberaner SV = Lok Bad Doberan (fussball-ddr), SG Müncheberg (Wikipedia 1991/92); Schreibweisen Schöneiche, Ammendorf, Döbern, WEMA Plauen; getrennt Schönberg (SH/MV), SV Pasewalk |
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
