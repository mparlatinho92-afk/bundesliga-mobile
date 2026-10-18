# Offene Fixes & Features

Erste Fassung aus Claudes Projektgedächtnis (offene Punkte der Memory-Dateien, 14.10.2026) – es gab noch keine
Notizen des Nutzers. Die alte Sammelliste `docs/fixes-sync/Bundesliga Mobile Fixes.odt` (Stand 16.06.) ist **nicht** importiert.

**Abgeglichen gegen:** v0.8.228.4, Prüfdatum **2026-10-18** (vorher 2026-10-17 @ v0.8.228.3).
**Methode:** Gedächtnis gegen Code und `CHANGELOG.md` gehalten. „Erledigt" heißt: im Code oder Changelog nachweisbar — **nicht** im Browser getestet.

**Diese Datei ist die Quelle.** Sie wird bei jeder Änderung in ein Google Sheet gespiegelt
(Ordner „Bundesliga HTML", Titel „Bundesliga Fixes – Ist-Stand", Blätter „Fixes" und „Konzepte").
Das Sheet wird in place überschrieben, **der Link bleibt gleich**; ihn nennt
`node tools/spiegel-fixes.cjs`. Zeilen, die im Sheet von Hand angelegt oder geändert werden, markiert
Spalte „Prüfen"; sie landen vor dem nächsten Überschreiben im Abschnitt „✚ Aus dem Sheet – ungeprüft".

Status: ✅ erledigt · ◐ teilweise · ❌ offen · ❔ unklar / Entscheidung offen

---

## ✚ Aus dem Sheet – ungeprüft

Im Sheet von Hand eingetragen, noch nicht eingeordnet. Beim nächsten Abgleich prüfen und einsortieren.


---

## ◐ Teilweise

### Historische Vereine
- ◐ Generell Deutschlandweit, jede Ära prüfen. Nachfolger historischer Vereine, die nicht im Spiel vorkommen, im Steckbrief erwähnen (aus dem Sheet)
  - Gemessen 15.10.2026: 4.450 historische IDs enden vor 2024/25 ohne Anschluss (BRD 3.518; beste Ebene 1–2: 90, 3: 575, 4: 1.633, 5–8: 1.279). Die meisten bestehen weiter und sind nur aus den erfassten Ligen gefallen
  - ✅ Stufe 1 (BRD Ebene 1–2, v0.8.220): `node tools/wiki_brd_nachfolger.mjs` (Gegenprobe an den bekannten Fällen 129/177) – 11 Fusionen in Spiel- oder hist-Vereine (u. a. BC Augsburg → FC Augsburg, Phönix/TuRa → Südwest Ludwigshafen), 3 Umbenennungen (TuS Neuendorf → TuS Koblenz, 1. FC Neukölln → Novi Pazar), 19 Nachfolger außerhalb des Spiels; Alias „1.FC Mülheim“ → Mülheimer FC 97 war falsch (MFC 97 gegründet 1997), jetzt beim 1. FC Mülheim-Styrum; ESV Ingolstadt unter einer ID
  - ✅ Stufe 2 (Ebene 3, v0.8.222): `--ebene 3` sortierte 630 IDs (VERBINDUNG 83, EXTERN 386, BESTEHT 89, ohne Artikel 72); jede Zeile am Artikel geprüft. 39 Fusions-Vorgänger (u. a. SpVgg Hof → Bayern Hof 2005, Vestenbergsgreuth → Greuther Fürth 1996, Marathon 02 → Novi Pazar 2022, SC Brück → Viktoria Köln 1994, Lüneburger SK → LSK Hansa 2008, 1. FC Paderborn → SC Paderborn 1985), 34 Umbenennungen/Schreibweisen (u. a. SV Schott Jena mit allen DDR-Namen, SSV Velbert → SSVg, 1. SC Norderstedt → Eintracht Norderstedt, BSV → Stahl Brandenburg, SCB Preußen → Viktoria Köln), 46 Nachfolger außerhalb des Spiels. Weggelassen: bloße Langform des eigenen Namens (TSG Augsburg 85, SV Eidelstedt …)
  - ✅ Stufe 3 (Ebene 4, v0.8.225): `--ebene 4` sortierte 1.616 IDs (VERBINDUNG 92, EXTERN 519, BESTEHT 156, ohne Artikel 849); VERBINDUNG Zeile für Zeile, EXTERN über die Sätze nach dem letzten Datenjahr geprüft. 65 Fusions-Vorgänger bei 59 Nachfolgern (u. a. Borussia Lippstadt → SV Lippstadt 08 1997, Mariendorfer SV → TSV Mariendorf 1897 2016, Borussia Wuppertal → Wuppertaler SV 2004, BC Berrenrath → FC Hürth 2007, FC Düren-Niederau + GFC Düren 09 → 1. FC Düren 2018, 1. FC Walldorf → FC-Astoria Walldorf 1995, FSV Fürstenwalde → FSV Union 2002, Ketten Rheine 1969/71, Langenhorn 1974/2002), 10 Umbenennungen und 19 Schreibweisen (u. a. TuS Arsten → TuS Komet Arsten, BAK 07 als Berlin Ankaraspor, Viktoria Frankfurt/Oder + 1. FC Frankfurt in einer Linie mit dem 1. FC Frankfurt (Oder) – die Schreibweise auf die eigene Viktoria-ID ist entfernt –, SC Aplerbeck → ASC 09 Dortmund, TB Berlin = Tennis Borussia, SW Essen = ETB), 74 Nachfolger außerhalb des Spiels. Ebene 5–8 (1.279 IDs) noch offen
  - ✅ Stufe 4 (Ebene 5–8, v0.8.226): `--ebene 8` – zuerst nur 3 Treffer, weil das Skript Saisons in den heutigen Spiel-Ligen (Gebiet „heute“, fussball.de 2001–2024) wegließ; jetzt eingeschlossen, 1.303 neue IDs (VERBINDUNG 72, EXTERN 261, BESTEHT 85, ohne Artikel 885). Die meisten Treffer sind fussball.de-Kurzformen oder frühere Namen heutiger Spielvereine, je Paar auf gemeinsame Saisons geprüft: 12 Umbenennungen (u. a. TSV Lehnerz → SG Barockstadt, TSV Steinbach → TSV Steinbach Haiger, RSV Göttingen 05 → 1. SC Göttingen 05, DJK Teutonia → SC St. Tönis 11/20, FV Gera Süd → Wismut Gera, JSK Rodgau → SKG Rodgau, FFC/Frankfurter FC Viktoria → 1. FC Frankfurt (Oder)), 16 Schreibweisen (u. a. FC Hertha 03 = Hertha 03 Zehlendorf, EFC Stahl, „Concordia“ = Concordia Hamburg), 13 Fusionen (u. a. SpVgg Hadamar → RW Hadamar 2012, Teutonia Watzenborn-Steinberg → FC Gießen 2018, TuRa Hennef → FC Hennef 05 2005, FC Pommern Stralsund → TSV 1860 2018, TuS Bösinghoven → TSV Meerbusch 2015), 10 Nachfolger außerhalb des Spiels. Zwei Nachfolger-Einträge aus Stufe 3 wurden Fusionen, weil der Nachfolger eine ID hat (Fortuna Sachsenross, TGM SV Jügesheim)
  - ✅ Restlisten Stufe 2–4 (v0.8.227), je Fall Saisons und Beleg geprüft: Wacker Siemensstadt = SC Siemensstadt (Zusammenschluss 1975, Fußball lief bis 1977 als Wacker), SC Blieskastel = TSC Blieskastel („der mittlerweile TSC Blieskastel heißende Verein“), STV Eintracht Gelsenkirchen = STV Horst-Emscher 1973–78 (danach wieder umbenannt), LSU + BraLi → VfB Lichterfelde/LFC 1988 und LFC → FC Viktoria 1889 Berlin 2013 (LFC Berlin 2010–12 neben dem LFC ist dessen zweite Mannschaft), Spandauer BC → FC Spandau 06 2003, 1. FSV Schwerin → FC Eintracht Schwerin 1997, VfL Schorndorf → SG Schorndorf 1992, 1. FC Idar + SpVgg Idar → SC Idar-Oberstein 1971 (engl. Wikipedia), ATSV Bremen 1860 → FC Union 60 Bremen 1998 (Fußballabteilung mit BBV Union, engl. Wikipedia), Stolberger SV → FC Stolberg 10 2010, FC Blau-Weiß St. Wendel = Spielverein SV Blau-Weiß St. Wendel, Sebaldsbrück = ATSV Sebaldsbrück (nicht SV Hemelingen). FC Fürth (Hessen) ist nicht Quelle Fürth (Bayern) – nichts zu tun
  - ✅ Mehrere Fusionen je Nachfolger (v0.8.228): neues Feld `jahrJe` in tools/hist_fusion.json, Steckbrief zeigt dann „VORGÄNGER · Fusionen“ und das Jahr je Zeile (fusion_check.mjs prüft es, Gegenprobe fällt durch). Eingetragen: FC Junkersdorf → Viktoria Köln 2011 (neben SC Brück 1994), FC Pommern Greifswald → Greifswalder FC 2015 (neben KKW 1990). Remscheid war falsch verbunden: 1971 VfB Marathon + BV 08 → VfB Remscheid, erst 1990 VfB Remscheid → FC Remscheid (Wikipedia FC Remscheid); vorher stand Marathon direkt beim FC
  - ✅ Flensburg und Jügesheim (v0.8.228.1): Die Spiel-ID SC Weiche Flensburg 08 trug 1963–2003 die Zeilen „Flensburg 08“ (Quelle nennt sie so; Landesmeister 1973/74 und Oberliga Nord 1974/75 laut Wikipedia Flensburg 08, ETSV Weiche spielte damals Bezirksoberliga). Jetzt: Flensburg 08 eine Linie 1963–2016 (hist_wk_flensburg08, Reserve 1966 eigene ID), Weiche ab 2007 mit „ETSV Weiche (Flensburg)“ als damaligem Namen; Fusionen 2017 Flensburg 08 und 1972 TSV Weiche-West (jahrJe). JSK Rodgau: Fußball ab 2014/15 als JSK (Wikipedia TGM SV Jügesheim), Verein eingetragen 2016 – Fusion 2014 TGM SV + TGS Jügesheim → SKG Rodgau 1888
  - ✅ Fünf der acht Fälle ohne Beleg (v0.8.228.1): „SC Castrop 02“ = SG Castrop-Rauxel (1962 aus SV Castrop 02 + SG Erin 11, Verbandsliga 1964/65–1968/69 und 1971/72 laut Wikipedia = genau die SC-Saisons), SV Lintfort = Spielvereinigung Lintfort (1971 TuS Lintfort + SV Hoerstgen, Fußball als SV Lintfort, 2013 aufgelöst, Wikipedia TuS Lintfort), Eintracht Cuxhaven → FC Cuxhaven 2023 (mit Grodener SV zum 01.07.2023, Nordsee-Zeitung/grodener-sv.de), Sömmerda eine Linie 1964–1994 (Schreibweise „Soemtrom“ zeigte noch auf eine eigene ID, „Sömtron“ dazu), SG Leipzig-Leutzsch → 2013 umbenannt in SG Sachsen Leipzig (dsc-archiv). Gut-Heil Lübeck 76 = Lübecker SV Gut Heil 1876, besteht – nichts zu tun
  - ❔ Rest: (a) VfR Konstanz 1964–73 (Quellen widersprechen: VfR-Mitglieder 1946 zum VfL Konstanz, seit 1953 „FC Konstanz 1900 VfR“ – wer spielte dann 1964–73 als VfR?), „Schönebeck“ 1990 und 2005–15 (Motor oder Chemie, beide enden 1989/90), SG Leipzig-Leutzsch ↔ FC Sachsen Leipzig (FC Sachsen steckt in der Spiel-ID BSG Chemie Leipzig); (b) Datenfrage: „Eintracht Duisburg“ 1964–66 (= Amateure), Amateure von MSV/Kickers/Arminia ohne II im Spiel
  - ✅ DDR-Seed 1949–55 (v0.8.228.2, Seed v14): 13 Seed-IDs beim heutigen Verein, je Fall Wikipedia, keine gemeinsame Saison – ZSG Anker 1949 + BSG Motor Wismar 1951 → FC Anker Wismar, SV Deutsche Volkspolizei Dresden → Dynamo Dresden, BSG Eintracht „Hans Wendler“ → Lok Stendal, Gera-Süd + Motor Gera → Wismut Gera, Motor Dessau → SV Dessau 05, Märkische Volksstimme → (Rotation/Fortuna) Babelsberg, ZSG Union Halle → Hallescher FC, Turbine Weimar → SC 1903 Weimar, ZSG Industrie → Chemie Leipzig, Franz Mehring Marga → Aktivist Brieske, ZSG Altenburg → Stahl Altenburg. IDs in den Seed-Tabellen getauscht (wie v11/v13), damaliger Name saisongenau in HISTORIC_NAMES, alte Stände über HIST_EXT.remap. Dazu Rotation Dresden → SC Einheit Dresden 1954 (Fußballsektion), Chemie Böhlen → FC Sachsen Leipzig 1990, Stahl Thale heute SV Stahl Thale, FSV Brieske-Senftenberg = Aktivist. Browserprüfung .claude/skills/run/ddr_seed_check.mjs (Selbsttest fällt durch)
  - ✅ Rest DDR-Seed (v0.8.228.3, Seed v15): BSG Chemie Karl-Marx-Stadt 1954/55 + 1955 = Chemnitzer FC (Hinweis des Nutzers; Wikipedia Chemnitzer FC: „am 3. März 1956 in den Sportclub Motor Karl-Marx-Stadt umgewandelt“). SV Vorwärts HVA Leipzig 1951/52 = 1. FC Frankfurt (Oder) (1951 in Leipzig gegründet, 1953 nach Berlin, 1971 Frankfurt) – die „Vorwärts Leipzig“-Zeilen 1963–74 sind die spätere Leipziger Armeemannschaft und haben jetzt eine eigene ID (hist_alias; die Koexistenz-Prüfung im Einbau übergeht per Alias umgeleitete Zeilen). SC Lokomotive Leipzig → 1963 mit SC Rotation zum SC Leipzig = 1. FC Lok Leipzig (Wikipedia BSG Chemie Leipzig (1950)). SC Einheit Dresden → Fußball 1966 als FSV Lokomotive Dresden selbständig → 1990 Dresdner SC 1898 (Wikipedia Dresdner SC). Motor Suhl heute 1. Suhler SV 06
  - ✅ Dresdner Lok-IDs (v0.8.228.4): „Lok Dresden“ war zwei Vereine – 1963/64 Bezirksliga = BSG Lok (SC Einheit spielte zeitgleich DDR-Liga), ab 1965/66 DDR-Liga = FSV Lok. Wikipedia FSV Lokomotive Dresden: am 6. Januar 1966 „mit den 16 Fußballmannschaften des SC Einheit Dresden“ gegründet, übernahm dessen DDR-Liga-Platz; die BSG Lok war eigenständig. Jetzt: SC Einheit 1954–65 + FSV Lok 1966–90 eine ID (Ausgründung statt Fusion, wie die anderen SC → FC 1965/66), 1990 Fusion Dresdner SC; BSG Lok Dresden 1963–67 eigene ID (Alias „Lok Dresden|1963“, neuer Saison-Schlüssel). Ausgründungen heißen im Steckbrief so: tools/hist_ausgruendung.json (16 Vereine inkl. Heidenheimer SB → 1. FC Heidenheim 2007), Prüfung .claude/skills/run/ausgruendung_check.mjs
  - ✅ Die drei unklaren Fälle (v0.8.221): Preußen Berlin 1970–2008 = BFC Preussen (Wikipedia-Ligaverlauf deckungsgleich, keine gemeinsame Saison; „SV Preußen Berlin“ 1994/95 bleibt getrennt, der BFC war 1993 abgestiegen); Polizei SV Bremen 2025 aufgegangen im ATSV Habenhausen (Wikipedia, neuer Name nicht auffindbar); Duisburg: 48/99 und Duisburger SpV 1964 → Fusion Eintracht Duisburg, „Duisburger SC“ 1963–71 = DSV 1900 (umbenannt 1969), fussball.de-Zeilen 2008–2020 waren der DSV 1900, nicht 48/99

---

## ❌ Offen

### Historische Vereine
- DDR-Dubletten ohne Beleg (Wikipedia, fussball-ddr.de, Websuche ergebnislos): SG Sachsenhausen (Bezirksliga Potsdam bis 1986/87) ↔ TuS 1896 Sachsenhausen (ab 2008/09); Lok Bad Doberan / Bad Doberaner SV 1990 ↔ Doberaner FC (2023/24)
- fussball-ddr.de: 63 Vermerke nicht aufgelöst (`tools/_dryrun/fddr_umbenennungen.txt`), darunter die Fusionen Lok/Armaturen Prenzlau, Motor WEMA/Aufbau Plauen, Blau-Weiß Reichenbach, Mansfelder SV Eisleben, Dynamo Fürstenwalde, Rotes Banner Trinwillershagen
- Verbindung unklar (Ewige Tabellen): Vorwärts Rostock → Vorwärts Stralsund (Delegierung 1967, Stralsund hat 2 IDs), Stahl Eisleben (DDR-Liga: Nachfolger MSV Eisleben, II. DDR-Liga: Dynamo Eisleben)
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
- Spielstand-Isolation Stufe 2 (Stempellauf über ~43.000 IndexedDB-Zeilen) nur bei Befund: doppelte `champions`-Einträge je Liga und Saison
- Mobil-Check Historie (Badges M/P am Vereinsnamen in der `.ltab`-Tabelle) – vermutlich längst erledigt, im Spiel prüfen
- Browser-Handouts P3: Stadien für 7 Vereine (Hamborn 07, HEBC, ETSV, HNT, SVGO, CFC Hertha, Wermelskirchen) und 4 Entscheidungen – Stand unklar

---

## ✅ Erledigt

| Punkt | Beleg |
|---|---|
| Getrennt wegen gemeinsamer Saison: Turbine Halle, Turbine Neubrandenburg, Lok Stendal, TSC Oberschöneweide – Reserven? | v0.8.228.5 – je Fall die Saisonseite von fussball-ddr.de: **Lok Stendal** 1988/89 Bezirksliga = „Lokomotive Stendal II“ → Reserve-ID (Alias mit Saison und Liga im Schlüssel, die DDR-Liga-Zeile der Ersten heißt in der Quelle gleich). **TSC Oberschöneweide** 1989/90 = „TSG Oberschöneweide (8.)“, Platz 8 von Union II 1988/89, keine gemeinsame Saison → bei Union II mit damaligem Namen (Rückzug nach Austritt von 14 Spielern). **Turbine Halle** 1964–86 und **Turbine Neubrandenburg** 1964–69 sind eigene BSG (spielten neben Erster UND Reserve), nur Namensvettern früherer Namen von HFC und Post Neubrandenburg – bleiben getrennt. Dabei gefunden: f-archiv legte „Turbine Halle“ auf den HFC (Anker 1951–53), 1985/86 stand Turbine deshalb als HFC in der Bezirksliga und der echte HFC unter einer Ersatz-ID in der DDR-Liga – Alias „Turbine Halle“, Doppelbelegung jetzt 0 |
| Steckbrief historischer Vereine zeigte „LIGA Amateurpokal“ und „REGIONEN –“ | v0.8.228.4 – LIGA/REGIONEN nur bei Spielvereinen (app/modal.js showSteckbrief), ausgruendung_check.mjs prüft beide Seiten |
| Ligaverlauf: 6 DDR-Namen mit Seed-ID oder beim heutigen Nachfolger laut Wikipedia (Bischofswerda, Weißenfels, Lichtenberg 47, Rotation Babelsberg, Vorwärts Stralsund) – nach v0.8.213 neu prüfen | Seed v11/v13/v14: Bischofswerda, Weißenfels, Lichtenberg 47, Rotation Babelsberg beim heutigen Nachfolger (HIST_EXT.remap); Vorwärts Stralsund bleibt eigen, weil sie 1978/79 neben Motor Stralsund (= TSV 1860) spielte – der Einbau verwirft die Umhängung selbst („entfaellt: beide spielen 1978/79“). 17.10.2026 nachgeprüft |
| 33. und 34. Spieltag sollten eigentlich nur Parallelspiele haben (aus dem Sheet) | v0.8.224 – nach Prüfung der echten Ligen (FuPa 2025/26 + 2024/25, tools/schlussspieltage_fupa.mjs): in der Realität läuft fast nur der LETZTE Spieltag zeitgleich (Bundesliga 33. Spieltag seit der TV-Periode 2021 normal verteilt). Im Live-Modus jetzt je Liga gemessen (_ACTION_SCHLUSS): 41 von 70 Ligen letzter Spieltag zeitgleich zur echten Zeit (BL Sa 15:30, 2. BL So 15:30, 3. Liga Sa 13:30, OL Hamburg Fr 19:00 …), Regionalliga Südwest + Verbandsliga Württemberg auch der vorletzte; Oberliga Westfalen/Niederrhein/Mittelrhein, Hessen-VL, Berlin, Hamburg-LL u. a. bleiben verteilt wie in echt |
| vor Spieltag 1 Ausschluss von Formulierungen die den Tabellenstand kommentieren. Wenn alle 0 haben, ist das sinnlos (aus dem Sheet) | v0.8.224 – Vorschau Spieltag 1 und Ergebnisse Liga-Spieltag 1: Spiel des Tages ohne Tabellen-Gründe (Spitzen-/Abstiegs-/Europa-/Rangduell, Überraschung), keine Kategorien Spitzenspiel/Kellerduell. Prüfung .claude/skills/run/spieltag1_check.mjs (70 Ligen, Selbsttest) |
| Kommentare berücksichtigen die vorhandene Historie der beiden Vereine (aus dem Sheet) | v0.8.223 – Paket 9 Historie-Schlagzeilen: Spiel des Tages kennt 7 Historien-Anlässe aus allen Abschlusstabellen (echte Historie + gespielte Saisons): Wiedersehen nach ≥ 10 Jahren, erstes Ligaduell seit {von}, Dauerduell ≥ 25 Saisons, Rückkehrer, Ex-Meister (Ebene 1–2), Rekordmeister, Revanche fürs Hinspiel. Wirkt auf die Auswahl (~24 % der Spieltage) und auf Schlagzeile/Vorschau-Anriss. Texte von Opus, nicht Fable. Keine direkte Bilanz (Nutzer: zu groß bei 500 Saisons) |
| Borussia Velbert 1963–76 (Landesliga Niederrhein) stand unter dem SC Velbert, der erst 2003 aus Borussia Velbert und TVG Langenhorst entstand | v0.8.222 – eigene ID `hist_fa_borussiavelbert`, Fusion 2003 in `hist_fusion.json` (Wikipedia SC Velbert). SC und SSVg Velbert waren schon getrennt; nur der fbde-Bericht stellte beim Wikipedia-Vergleich SC neben SSVg (sucht jetzt erst den gleichnamigen Verein, 16 Scheinabweichungen weniger) |
| fussball.de-Zuordnung: bei mehreren hist-IDs mit gleichem Namenskern gewann die alphabetisch erste („Duisburger SV 1900“ landete bei „Duisburg 48/99“) | v0.8.221 – `tools/fbde_ebene58.mjs` nimmt zuerst die gleichnamige ID, Liste aller mehrdeutigen Namen in `tools/_dryrun/fbde_mehrdeutig.json` (178). Echte Fehlgriffe behoben: FC Bremerhaven 2001–08 (lag bei Bremerhaven 93 Amateure), „FC Bremerhaven2“ = FC Bremerhaven II, RSV Göttingen 05 2008–11 (bei Göttingen 05 Amateure), DJK Flensburg 1964–66 (in der Linie Flensburg 08). Folgeeinträge, damit keine Linie reißt: Alias „1. Suhler SV“ → Motor Suhl, „SV Blau-Gelb Berlin“ → Tiefbau Berlin, Schreibweise „Concordia Schönkirchen“, Nachfolger-Eintrag Carl Zeiss Jena II unter neuer ID. Sonst nur andere ID für dieselbe Linie (Fichte Bielefeld, Oberrad, Piesteritz, Kamenz …) |
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
