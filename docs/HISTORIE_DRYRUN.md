# Dry-Run: Ebene 2–3 vor dem Sim-Start ins Spiel (13.09.2026)

**Nichts eingebaut.** Keine Spieldatei geändert. Der Seed wurde nur im Speicher ersetzt und die Engine headless gestartet.
Ergebnisse liegen in `tools/_dryrun/` (gitignored): `seed_erweiterung.json`, `ergebnis.json`, `protokoll.txt`.

```bash
node tools/wiki_tabellen.mjs                                                   # Lücken aus Wikipedia (einmal)
node tools/farchiv_ebenen.mjs ~/Downloads/farchiv_output/alle_tabellen_final.csv tools/wiki_ergaenzung.csv
node tools/farchiv_vereine.mjs                                                 # Prüfliste docs/farchiv_zuordnung_pruefliste.csv
node tools/historie_dryrun.mjs
```

## Ergebnis in Zahlen

| | |
|---|---|
| Staffeln / Vereinssaisons Ebene 2–3 | **1.068 / 16.996** (BRD 2: 55/926 · BRD 3: 450/7.699 · DDR 2: 95/1.277 · DDR 3: 468/7.094) |
| Seed-Erweiterung | 928 Saison-Tabellen, **54 neue historische Liga-IDs** + bestehende `3` (3. Liga ab 2008) |
| Vereins-IDs je Zeile | A 4.410 · B 784 · K 4 · C 3.561 · H 8.237 → **2.097 neue `hist_fa_`-Vereine** (C und H bekommen im Dry-Run eine eigene ID) |
| S/U/N | f-archiv 2.783 · **aus Wikipedia aufgefüllt 10.363** (9.541 exakt, 639 Rest-Abgleich, 159 Punkte weichen ab, 24 Spielzahl weicht ab) · verworfen 14 · mehrdeutig 8 · **fehlt weiter 3.850 (23 %)** – je Saison: `docs/HISTORIE_SUN_PROTOKOLL.md` |
| Doppelbelegung (ID zweimal in einer Saison) | **0** nach Auflösung (39 Zeilen abgespalten, siehe unten) |
| Ebenensprünge > 1 in Folgesaisons | 2, beide echt: Dresden 1994/95 → 1995/96 (Lizenzentzug), Stahl Eisenhüttenstadt 1969/70 → 1970/71 (f-archiv: Absteiger in der Bezirksliga) |
| Gepackt (gzip+base64) | **0,29 MB** (Schätzung vorher 0,24 MB) |
| Engine-Start | +85–96 ms (Seed wird synchron eingefaltet) |
| Archiv im localStorage | **+245 KB** (Schätzung 0,04–0,17 MB – höher wegen 2.154 neuer Vereine in der Ewigen Tabelle) |
| IndexedDB | +1,39 MB |
| Ligaverlauf | **348 Spielvereine** bekommen Saisons vor 2025 dazu (bisher 120). Größter Zugewinn: Werder Bremen II 0→50, VfB Stuttgart II 0→45, Bayern II 0→44, Holstein Kiel 11→54, Preußen Münster 11→54 |

Die Engine lief in allen drei Varianten (Original, +Ebene 2–3, nur Zeilen mit S/U/N) ohne Fehler durch, auch der Rekord-Backfill.

## Sackgassen (mit Vorschlag)

### 1. S/U/N fehlen in 3.850 Zeilen – und die Engine verliert sie STILL
Dort gibt es nur Punkte im 2-Punkte-System (`49:11`) und Tore; S/U/N lassen sich daraus nicht eindeutig zurückrechnen.
Die Ewige Tabelle rechnet immer auf 3 Punkte je Sieg um (3·S+U) – ohne S/U/N geht das nicht.

**Welche Saisons betroffen sind:** `docs/HISTORIE_SUN_PROTOKOLL.md` teilt jede Liga-Saison in zwei Gruppen –
**Gruppe 1 (mit S/U/N): 527 Liga-Saisons / 9.311 Vereinssaisons**, **Gruppe 2 (ohne): 401 / 7.685**, davon 196 nur
teilweise ohne. Maschinenlesbar in `tools/_dryrun/sun_protokoll.csv`.

**Wo:** fast vollständig die BRD-Amateurligen 1963–77 (Südwest 261/261, Saarland 252/252, Nordwürttemberg 245/245,
Niederrhein 244/244, Nordbaden 240/240, Hessen 238/269, Südbaden 232/232, Schwarzwald-Bodensee 210/243, Berlin 175/253,
Mittelrhein 140/235, Westfalen 137/492, Landesliga Schleswig-Holstein 96/96), dazu je rund ein Viertel der
DDR-Bezirksligen und Oberliga Baden-Württemberg 1983–93 (100/291).

**Wikipedia ist dafür keine Quelle:** die Artikel dieser Amateurligen haben handgebaute Tabellen nur mit
Pl. / Verein / Sp. / Tore / Punkte (Stichprobe Verbandsliga Niederrhein 1968/69, 1. Amateurliga Nordwürttemberg 1966/67).
Die Lücke ist damit eine Einbau-Entscheidung, keine Datenfrage mehr.

**Gemessen, nicht vermutet:** `_seedHistory` rechnet `r.s + r.u + r.n` → `null+null+null = 0` Spiele → die Zeile wird
**wie ein zurückgezogener Verein übersprungen**. Kein NaN, kein Fehler – die Ewige Tabelle hat mit und ohne diese Zeilen
exakt gleich viele Einträge (2.956). Die Archiv-Tabelle würde sie zeigen, Karriere und Ewige Tabelle nicht.

**Vorschlag:** Seed-Zeile um `sp` (Spiele) und `p2: [plus, minus]` bzw. `p` erweitern (liegt im Dry-Run schon so vor).
`_seedHistory` nutzt `r.sp`, wenn S/U/N fehlen: Spiele, Tore, Jahre zählen; S/U/N-Spalten bleiben leer; Punkte der
Ewigen Tabelle für diese Saisons aus `p2` (2-Punkte) umgerechnet – das braucht eine Entscheidung, wie 2-Punkte-Saisons in
die 3-Punkte-Ewige-Tabelle eingehen (heute: 3·S+U, bei fehlendem S/U/N nicht möglich).

### 2. Seitenleiste: 54 neue Einträge
Jeder Eintrag in `HIST_ARCHIVE_LEAGUES` (`app/league.js`) wird in `renderSidebar` (`app/core.js:337`) ein eigener
Seitenleisten-Punkt. **Vorschlag:** eine aufklappbare Gruppe „📜 Historische Ligen“ (nach Ebene/Gebiet) oder Einstieg nur
über Saison-Archiv, Steckbrief und Ligaverlauf.

### 3. DDR-Bezirksligen Cottbus, Dresden, Gera 1990/91
Weder in f-archiv noch als Wikipedia-Artikel. Bleibt vorerst Lücke (Nutzerentscheidung).

## Unterwegs gefunden und in den Werkzeugen behoben

| Befund | Wirkung | Lösung |
|---|---|---|
| Reserve „III“ nicht erkannt | „FC Carl Zeiß Jena III“ = Stammverein, Doppelbelegung mit DDR-Oberliga | III im Reserve-Muster |
| „stuttgarter“ fälschlich als Nicht-Ort | „Stuttgarter SC“ → VfB Stuttgart (A), dreifache Doppelbelegung | aus der Liste entfernt → C |
| Anker-Namensform ohne Zeitbezug | „Turbine Halle“ (Bezirksliga 1965–83) = Hallescher FC, weil die HFC-Vorgänger um 1950 so hießen | zweistufig, siehe unten |
| Zeitfenster ±2 Saisons (erster Versuch) | **zu streng**: 1.402 Zeilen verloren ihre ID (Stahl Eisenhüttenstadt 20 Jahre DDR-Liga) | verworfen |
| Kontinuität (zweiter Versuch) | **zu streng**: SV Sandhausen, Jahn Regensburg, VfB Lübeck, SC Freiburg … – dazwischen lag Ebene 4, die in den Daten fehlt | verworfen |
| **Endgültig:** Doppelbelegung + (fehlender Anschluss UND Ebenensprung) | ist die ID in der Saison schon belegt, verliert die tiefere Zeile (39); zusätzlich 3 Zeilen mit Sprung abgespalten (Turbine Halle 1964/65 und 1973/74, Aktivist Brieske Ost 1963/64) | 0 Doppelbelegungen, nur 2 echte Sprünge |
| Gleicher Name, verschiedene Regionen teilen eine hist-ID | „VfL Neustadt“ Pfalz + Oberfranken kollidierten | hist-ID je Name + Landesverband-Verbund (3 Namen getrennt) |
| Regionalliga Berlin 1964/65 und 1972/73: zwei Tabellen | als Staffeln gezählt, Spandauer SV/TeBe erschienen als „2. Mannschaft“ | es sind **Runden** (Hauptrunde + Gesamttabelle): ≥ 80 % gleiche Vereine → nur Tabelle mit den meisten Spielen |
| Fußnotenziffern in der f-archiv-3.-Liga 2016/17 („VfR Aalen1“) | Vereine nicht zuordenbar | saubere Wikipedia-Fassung ersetzt sie (spätere Datei gewinnt, Tabellen-Abgleich über Platz + Torverhältnis) |
| S/U/N-Auffüllung ohne Liga-Abgleich | Saison + Platz + Torverhältnis trafen 95-mal eine **fremde** Liga (Bezirksliga Dresden 1989 ↔ Oberliga Hessen); **5 Zeilen waren falsch aufgefüllt**, weil Spiele und Punkte zufällig passten | nur Wikipedia-Artikel derselben Liga (Titelabgleich mit Wortgrenzen – „Nord“ trifft nicht „Nordrhein“, BRD-„Berlin“ nicht die DDR-Bezirksliga); Kontrolle: jede Liga bekommt nur Artikel ihrer eigenen Liga |
| Punkte weichen ab bei gleicher Spielzahl (159) | vorher verworfen | übernommen: Punktabzug/Umwertung, S/U/N = Ergebnisse auf dem Platz, amtliche f-archiv-Punkte bleiben (Abweichung ±1…±6, fast nur DDR-Bezirksligen) |
| Spielzahl weicht ab bei gleichen Punkten (24) | vorher verworfen | übernommen, S/U/N passen zu Punkten und Toren (Bezirksliga Gera 1977/78: f-archiv 30, Wikipedia 28 Spiele) |
| Mehrdeutige Wikipedia-Treffer (195) | nicht aufgefüllt | 187 über den Liga-Abgleich eindeutig; 8 bleiben (gleicher Platz + gleiches Torverhältnis in zwei Staffeln derselben Saison) |
| Punkte ohne Doppelpunkt in der Quelle („2321“) | Hansa Rostock II 1974/75 u. a. unbrauchbar | repariert, wenn genau eine Aufteilung 2 × Spiele ergibt (6 Zeilen). **Prüfen:** Wismut Gera 1969/70 „357“ → 3:57 ist die einzige rechnerische Lösung, aber ungewöhnlich |
| Teilweise gefüllte Saisons (308): 1–2 Zeilen fehlten, obwohl der Wikipedia-Artikel da war | Tippfehler im Torverhältnis einer Quelle brach den Schlüssel Saison + Platz + Tore | **Rest-Abgleich** im selben Artikel: gleicher Platz, gleiche Spiele, gleiche Punkte, Tore nur tippfehlerartig anders, **gemeinsames Namenswort** → 639 Zeilen. Gegenprobe (exakte Treffer mit Toren +10, dieselbe Funktion): zuerst 55 falsch (0,6 % – gleiche Plätze anderer Staffeln im selben Artikel), mit Namenswort **9.476 richtig / 2 falsch / 63 nicht gefunden** |
| Unsichere Zuordnungen (C) nur über Namensähnlichkeit | 4.930 Vereinssaisons ohne Beleg | **Nachfolge-/Koexistenz-Test** über alle Ebenen der f-archiv-Datei bis 2020/21: stehen unsicherer Name und Spielverein in derselben Saison in Tabellen → zwei Vereine (133 → H, z. B. „Motor Hermsdorf“ neben „VfB Hermsdorf“); endet der alte Name und der Spielverein folgt nach ≤ 3 Saisons → Nachfolge (37 → B, z. B. „Motor Rathenow“ bis 1989 → „FSV Optik Rathenow“ ab 1990). Schutz: Nachfolge beim Einzelkandidaten nur, wenn am Ort genau ein Spielverein existiert (sonst „FC Berlin“ → Berliner SC); mehrere mögliche Vorgänger derselben ID → C (Fusionen wie 1. FC + VfR → 1. CfR Pforzheim), Schreibvarianten zählen als einer; Ortskern-Namen („1. FC Neubrandenburg 04“) werden mit Vereinsform verglichen. Gegenprobe B: 13 richtig / 1 falsch (DDR-Gründungswelle 1949/50, außerhalb Ebene 2–3) → C 3.745 Vereinssaisons |
| DDR-Vereinsnamen ohne Beleg | Namensähnlichkeit hilft bei Betriebssportnamen kaum („Motor Gotha“ ↔ FSV Wacker 03 Gotha) | **Wikipedia-Abgleich** `tools/wiki_ddr_vorgaenger.mjs`: Artikel der 195 NOFV-Spielvereine (147 gefunden), ein DDR-Tabellenname zählt nur, wenn er **mit DDR-Präfix** (BSG, SG, ASG …) **im selben Satz** wie ein starkes Umbenennungswort steht und den Ort des Vereins enthält; Gegner-Sätze und Überschriften-Verschmelzungen ausgeschlossen. Erster Versuch mit ±200-Zeichen-Fenster: zu locker („im Schatten des SV Stahl Thale“, Rivale Vorwärts Dessau, „neu gegründete BSG Chemie Jena“). Gegenprobe (DDR-Namen mit bekannter ID): **6 richtig / 0 falsch** / 19 ohne Beleg. Wirkung: 20 Namen → B (12 bestätigen den C-Vorschlag, 8 neu) → **C jetzt 3.561 Vereinssaisons**. Nachgewiesene Koexistenz und sichere Zuordnungen schlägt Wikipedia nicht |

## Offen / zu prüfen

1. **Prüfliste** `docs/farchiv_zuordnung_pruefliste.csv`: 3.561 C-Vereinssaisons (vorher 4.930; der Nachfolge-/Koexistenz-Test
   hat 133 Namen als eigene Vereine belegt und 37 als Nachfolger, Wikipedia 20 DDR-Namen) bekommen im Dry-Run eine eigene hist-ID statt des
   Vorschlags. Jede bestätigte Zuordnung (Spalte „Korrektur-ID“) verschiebt Saisons von einem hist-Verein zum Spielverein.
2. **Wikipedia-Widersprüche – von 290 auf 14 abgebaut** (Details in `tools/_dryrun/wikipedia_widersprueche.json`).
   95 waren fremde Ligen, 159 Punktabzüge/Umwertungen, 24 abweichende Spielzahlen, 5 Wikipedia-Fehler (z. B. Energie
   Cottbus II 1976/77 mit 25 statt 30 Spielen), dazu Liga-Abgleich für mehrdeutige Treffer. **Übrig: 14 Zeilen** mit
   gleicher Spielzahl, aber Punkten, die um genau 8, 10 oder 20 abweichen – Tippfehler an einer Ziffer in einer der Quellen
   (Stahl Riesa II 1971/72: f-archiv 29:11, Wikipedia 20-9-1 = 49:11; Motor Hennigsdorf 1973/74 45:15 vs. 55:5; VfB Wissen
   1972/73, TuS Ahlen und BV Selm 1966/67 je −10). Welche Quelle recht hat, ist ohne dritte Quelle nicht entscheidbar;
   sie bleiben ohne S/U/N.
3. **735 Zeilen** mit Anker-Namensform ohne Anschluss an die Seed-Jahre sind nur markiert; die meisten sind korrekt
   (Ebene 4 fehlt in den Daten), einzelne Namensvettern ohne Ebenensprung könnten durchgerutscht sein.
4a. **Seed-ID oder heutiger Nachfolger? (6 Fälle, Entscheidung)** Wikipedia nennt für DDR-Namen mit sicherer Seed-Zuordnung
   einen anderen Spielverein als Nachfolger: SC/SG Lichtenberg 47 → SV Lichtenberg 47 (Seed: SG Lichtenberg 47),
   Fortschritt Bischofswerda → Bischofswerdaer FV 08, Fortschritt Weißenfels → SSC Weißenfels, Rotation Babelsberg →
   Fortuna Babelsberg, Vorwärts Stralsund → TSV 1860 Stralsund. Unverändert gelassen; die Frage ist, ob DDR-Vereine im Ligaverlauf
   beim heutigen Nachfolger stehen sollen oder bei ihrer eigenen ID.
4. **Aktivist Brieske Ost 1963/64** abgespalten (E3 zwischen SC Aktivist Brieske-Senftenberg auf E1/E2) – plausibel, nicht belegt.
5. **Ligaverlauf mit historischen Liga-IDs:** `_sbVerlaufRender` holt Bandgrößen über `UP_MAP` – historische IDs haben
   keinen Aufstiegsweg; die Bänder darüber würden über `sizeAt`-Fallback geschätzt (schraffiert). Im Browser nicht geprüft.

## Was ein echter Einbau berühren würde (nur festgestellt)

- `app/history_data.js`: Seed-Erweiterung (gepackt, nur bei Bedarf entpacken) + 2.154 `HISTORIC_CLUBS`
- `app/league.js`: 54 `HIST_ARCHIVE_LEAGUES` (name, level, firstYear, lastYear) – Level ist Pflicht, sonst kennt
  `_archLevelOf` die Ebene nicht
- `game_engine.js`: `_seedHistory` (S/U/N-Fallback, Entpacken), evtl. `SEED_VER` hochzählen (sonst schreibt ein
  bestehender Spielstand die neuen Tabellen nicht nach IndexedDB – `histTablesSeeded`)
- `app/core.js`: Seitenleiste gruppieren
- `app/history_data.js` `HISTORIC_NAMES`: aus den f-archiv-Namen ließen sich Ära-Namen ableiten („Motor Zwickau“ bis 1968)
