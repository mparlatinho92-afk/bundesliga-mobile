# Ebene 2–3 vor dem Sim-Start: Dry-Run (13.09.2026) und Einbau (16.09.2026)

## Eingebaut (16.09.2026)

```bash
node tools/historie_dryrun.mjs          # Dry-Run wie unten, schreibt tools/_dryrun/seed_erweiterung.json (mit Quellnamen)
node tools/historie_einbau.mjs          # -> app/history_ext.js (erzeugt, nie von Hand ändern)
node tools/historie_einbau_test.cjs     # Prüfung headless, Exit 1 bei Befund; --selbsttest muss durchfallen
node .claude/skills/run/hist_check.mjs  # Browser gegen template.html: Desktop, Handy, hell (Server auf 3334)
```

| Teil | Umsetzung |
|---|---|
| Daten | `app/history_ext.js`: 928 Liga-Saisons, 16.996 Zeilen (1.065 mit geschätzten S/U/N, `e:1`), 54 Ligen, 2.110 hist-Vereine, 46 Vereine mit Era-Namen. Tabellen gzip+base64 (299 KB), Datei 409 KB |
| Laden | `app/hist_ext.js` (`HistExt`): Namen sofort, Tabellen erst bei Bedarf entpackt (DecompressionStream), **keine IndexedDB-Kopie**. `IDBStore`-Leser mischen sie dazu (Datenbank hat Vorrang) |
| Ewige Tabellen | `Engine._seedHistoryExt` faltet asynchron einmal je Datenversion (`archive.histExtSeeded`); neue Version faltet sauber neu (3. Liga über `archive.histExtSum`). Archiv im localStorage ≈ +40 KB (LZ) |
| DDR-Nachfolger | `HIST_EXT.remap`: Lichtenberg 47, Bischofswerda, Weißenfels, Rotation Babelsberg → heutiger Verein (Seed v11, alte Stände per `_remapArchiveIds`). **Vorwärts Stralsund bleibt eigen**: spielte 1978/79 neben Motor Stralsund (= TSV 1860) – Koexistenz schlägt Wikipedia. Damaliger Name über `HISTORIC_NAMES` je Saison |
| Nachschärfung im Einbau | Westfalen: zwei Staffeln unter demselben Namen getrennt (Neubeginn bei Platz 1); Staffelnamen ergänzt (Nordost Mitte, Niedersachsen Ost); Era-Namen → Spielverein (DJK Gütersloh → FC Gütersloh, 12 Zeilen); VfB Stuttgart 2010/11 → II; SV Babelsberg → SV Babelsberg 03 u. a. (ab 1991 eindeutiges Namenspräfix) |
| Oberfläche | Seitenleiste: eine Gruppe „Historische Ligen“ → Epochen (BRD 1963–78, 1974–94, 1994–2008, DDR) → Ebene → Region. Archivansicht: Staffeln, amtliche Punkte (`p2`/`p`), geschätzte S/U/N kursiv, Navigation über die Ligen derselben Saison und desselben Gebiets, „▼ tiefere Liga“ unter Ebene 3 vor dem Sim-Start. Ligaverlauf mit historischen Ligen. 3. Liga zeigt 2008/09–2024/25 |

**Ganze Staffeln aus ifosta/Wikipedia (16.09.2026, Dry-Run 3c):** 1963/64 weichen f-archiv und die anderen Quellen auch in
Toren, Punkten und Plätzen ab (SV Schlebusch f-archiv 68:32 / 44:16, ifosta 70:33 / 42:18) – der Abgleich über Platz und Tore
fand dort nichts. Jetzt gilt: lässt sich jeder Verein einer Staffel über den Namen genau einem Verein einer ifosta-Staffel oder
eines Wikipedia-Artikels derselben Liga-Saison zuordnen (gleiche Spielzahl, Reserve = Reserve), wird deren Tabelle ganz übernommen.
Namensmaß: Vereinsform-Kürzel zählen kaum, Traditions-/BSG-Wörter („Motor“, „Germania“) halb und nie allein, Ortsadjektive =
Ort („Würzburger“), Gründungsjahr „1889“ = „89“, Tippfehler nur bei gleichem Anfangsbuchstaben (sonst „Singen“ = „Wangen“),
Zusätze „(N)“/„(A)“ weg; Gleichstand → keine Übernahme. **Gegenprobe** mit derselben Funktion an 111 vollständigen Staffeln:
1.888 Paare mit gleichen S/U/N, 32 abweichend – bei allen stimmt der Verein, die Quellen unterscheiden sich um einen Sieg.
Ergebnis: 691 Staffeln / 10.861 Zeilen übernommen, geschätzt 1.528 → **1.065**, davon 1963/64 **156 → 32** (Rest: Namensformen,
die in der anderen Quelle nicht vorkommen, z. B. „Motor Netschkau“, „Preußen Frankfurt“). Der Großteil der Schätzungen sind
jetzt die DDR-Bezirksligen 1985–1991 (≈ 900 Zeilen, keine Quelle mit S/U/N). ifosta dafür mit `--alle` geholt (370 Liga-Saisons).

**Ebene 4–5 seit 2008 aus Wikipedia (17.09.2026, `tools/wiki_ebene45.mjs`):** Regionalligen (Ebene 4) und Oberligen (Ebene 5),
2008/09–2024/25, jeweils nur ab dem Jahr, in dem die Liga schon auf ihrer heutigen Ebene spielte. 299 Liga-Saisons / 5.206 Zeilen,
Saisons unter den heutigen IDs 4-x/5-x; nicht mehr bestehende Ligen historisch: Regionalliga Süd, Bayernliga, NRW-Liga (2008–12,
Seitenleisten-Epoche „BRD 2008–2012“). Bayern 2019–21 zählt als 2019/20. Oberliga Westfalen 2021/22 kam erst mit dem Covid-Modus dazu (s. unten), Mittelrheinliga/Oberliga Niederrhein/Westfalen vor 2012 (damals Ebene 6 bzw. NRW-Liga).
Vereine: nur bei gleichem Namenskern (Vereinsform, Jahr, Füllwörter weg, Ortsadjektiv = Ort, Farben zusammengezogen) und
verträglicher Vereinsform („1. FC Frankfurt“ ≠ „FSV Frankfurt“); Ähnlichkeitstreffer werden nur als Vorschlag ausgegeben
(`tools/_dryrun/wiki_ebene45_vorschlaege.txt`), eindeutige von Hand in `tools/wiki_ebene45_korrektur.json` (37 Namen). Die erste,
lockere Fassung hätte „Fortuna Düsseldorf II (Q N)“ dem Profiverein und „Eintracht Wetzlar“ dem RSV Eintracht 1949 gegeben.
Ergebnis: 4.210 exakt, 220 per Korrektur, 233 neue hist_wk-Vereine. Gegenprobe 2024/25: 312 Zuordnungen spielen heute auf
Ebene 3–6, 11 sind heute ligalos (plausibel), 9 Namen ohne Spielverein. Navigation 2008–2012 über `HIST_EXT.hoch2008`
(Oberliga Südwest unter Regionalliga West, Hessenliga unter Regionalliga Süd, NOFV unter Regionalliga Nord).
Einbau prüft jetzt je Saison über ALLE Ligen auf Doppelbelegung (1 Fall: Hallescher FC Chemie 1985/86, eigene ID).
Archiv im localStorage danach ≈ 103 k Zeichen (vorher 70 k), `app/history_ext.js` 515 KB.

**Covid-Modus 2021/22 (17.09.2026):** Neun Liga-Saisons mit Vorrunde und anschließender Meister-/Aufstiegs- und
Abstiegsrunde (Oberligen Hamburg, Schleswig-Holstein, Niedersachsen, Niederrhein, Westfalen, Rheinland-Pfalz/Saar 2021/22 und
2022/23, Hessenliga, Regionalliga Nord). Nutzerentscheidung: Vorrunde wie eine vorgeschaltete Pokalrunde getrennt anzeigen, die
beiden Runden als Staffeln; Platz durchzählen (Abstiegsrunde nach der Meisterrunde), Platz in der Runde in Klammern – in Tabelle,
Saison-Historie („Pl. 11 (1)“, Liganame mit Runde) und Ligaverlauf („Platz 11 (1) von 21“).
Die Artikel zählen verschieden, erkannt am komponentenweisen Vergleich Endrunde ≥ Vorrunde (Vereine ohne Endrundenspiel
ausgenommen): Niederrhein und Rheinland-Pfalz/Saar enthalten die ganze Saison, Westfalen S/U/N nur aus der Runde, aber Tore und
Punkte (Bonus) mit Vorrunde, die übrigen nur die Runde. Die Ewige Tabelle zählt jeweils genau einmal.
Vorher hatte das Werkzeug bei sieben davon die erste Vorrundenstaffel als Abschlusstabelle übernommen (v0.8.159). Die Prüfung
„Platz lückenlos durchgezählt“ fand einen zweiten Fehler: manche Artikel zählen die Abstiegsrunde schon ab 11.

**Covid-Jahre geprüft (17.09.2026):** Alle 19 heutigen Regional- und Oberligen haben 2019/20–2022/23 ihre Saison
(Regionalliga Bayern und Bayernliga 2020/21 nicht: Doppelsaison 2019–21, Tabelle unter 2019/20). Dabei gefunden und behoben:
- **Nullen fehlten:** `{{Fußballtabelle/Zeile}}` lässt S/U/N/Tore weg, wenn sie 0 sind („Rang=21 |N=8“). Beide Werkzeuge
  verwarfen solche Zeilen – in den Abbruchsaisons betraf das viele Vereine (Westfalen 2020/21 10 statt 21 Zeilen). Der
  Dry-Run las Wikipedia genauso: dort sind dadurch 82 Zeilen mehr belegt (geschätzt 1.065 → 983).
- **Parallele Staffeln:** 2020/21 spielten Regionalliga Nord, Rheinland-Pfalz/Saar, Schleswig-Holstein und Niedersachsen in
  zwei Gruppen; übernommen war nur eine. Jetzt beide als Staffeln der Saison.
- **Zwischentabellen:** „zum Zeitpunkt der Unterbrechung“ weicht der späteren Tabelle (Regionalliga Bayern 2019–21).
- **Kennzeichen:** `abbruch` (2019/20 überall; 2020/21 und Doppelsaison nur bei Abbruchstand oder ungleicher Spielzahl –
  Regionalliga Südwest und West liefen 2020/21 zu Ende) und `doppel`. Die Ansicht zeigt den Vermerk und die Punkte je Spiel;
  eine Wertung nach Quotient behauptet sie NICHT (die Tabellen sind nach Punkten sortiert, die Wertung entschied der Verband).
  Für 2020/21 zeigt die Bayern-Ansicht einen Hinweis auf die Doppelsaison.
Geprüft wird das dauerhaft in `tools/historie_einbau_test.cjs` (Vollständigkeit, Kennzeichen, ungleiche Spielzahl nur mit
Abbruch-Kennung; Gegenprobe durch Entfernen einer Saison) und im Browser (`hist_check.mjs`).

**Dubletten und Umbenennungen (17.09.2026, Nutzerbefund „BV Cloppenburg gibt es zweimal“):** Derselbe Verein stand je nach
Quelle unter mehreren IDs. `node tools/hist_dubletten.mjs` meldet Verdachtsfälle (gleicher Namenskern oder aufgelöste
Abkürzung – „Leher TS“ = „Leher Turnerschaft“) und trennt sie nach KOEXISTENZ: zwei Vereine, die in derselben Saison
spielen, bleiben getrennt. Der Einbau (1d) legt automatisch nur zusammen, wenn ein Name ganz im anderen steckt (Vereinsform,
Jahreszahl, Schreibweise, „1FC“ = „1. FC“, „F.C.“ = „FC“) UND es keine gemeinsame Saison gibt: 184 IDs. Echte Umbenennungen
ohne gemeinsamen Namensteil stehen von Hand in `tools/hist_alias.json` (Name → ID oder Name → anderer Name), u. a.
Heidenheimer SB → 1. FC Heidenheim 1846, Türk Gücü München, Torgelower SV Greif. Dort werden auch falsche Zuordnungen
getrennt (Preußen Hameln stand beim HSC/BW Tündern, FC Kronach beim SV Friesen). Der damalige Name erscheint über
HISTORIC_NAMES in der Tabelle der Saison (58 Vereine, 76 Zeiträume) – Kurzformen des heutigen Namens („1. FC Heidenheim“
für „1. FC Heidenheim 1846“) zählen NICHT als alter Name. Verdachtsfälle ohne Koexistenz: 289 → 40 (Rest sind meist echte
Unterscheidungen wie „TuS Celle“/„FC Celle“ oder brauchen Recherche). Für diese Reste erzeugt der Lauf
**`tools/hist_dubletten.html`**: eine Seite zum Durchklicken (Daten eingebettet, läuft per Doppelklick), je Paar Ligen,
Saisons, Abstand und Koexistenz-Hinweis; Auswahl „gleicher Verein → A/B“ oder „verschiedene Vereine“, Entscheidungen im
Browser gespeichert, Export als JSON mit den Blöcken `alias` (→ `tools/hist_alias.json`) und `getrennt`
(→ `tools/hist_alias_getrennt.json`); danach `node tools/historie_einbau.mjs`. Geprüft wird dauerhaft, dass kein Vereinsname zweimal
vorkommt (außer bewusst getrennten Namensvettern mit Zusatz an der ID).

**Vermerk für weitere Ergänzungen (Nutzerwunsch 17.09.2026):** Wer Ligen unterhalb der Oberliga (oder andere Jahre)
nachträgt, nimmt den Rundenmodus mit und prüft ihn mit – Oberfläche, Zählweise und Ewige Tabelle. Der Modus ist nicht auf
2021/22 und nicht auf Covid beschränkt (Rheinland-Pfalz/Saar 2022/23 schon gefunden; tiefere Ligen spielen ihn teils regulär).
Erkennung am Artikelaufbau, nicht am Jahr. Je Fund vermerken: Anlass Covid oder regulärer Modus. Bisher: alle 2021/22-Fälle
Covid (Wiederaufnahme nach dem Abbruch 2020/21 mit geteilten Staffeln); Rheinland-Pfalz/Saar 2022/23 = Covid-Nachwirkung: der Artikel
belegt „Oberliga Rheinland-Pfalz/Saar behält alternativen Modus bei“ (kicker) und die Einteilung „analog zur Vorsaison“ – die
Liga war nach den Abbruchjahren mit 22 Vereinen noch übergroß. Ab 2023/24 wieder eingleisig ohne Runden.

Offen: VfL Bochum A u. ä. (keine eindeutige II-Mannschaft).

---

**Stand 13.09.2026 – Dry-Run, nichts eingebaut.** Der Seed wurde nur im Speicher ersetzt und die Engine headless gestartet.
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
| S/U/N | f-archiv 2.783 · Wikipedia 10.227 · **ifosta.de 2.456** · **geschätzt 1.527 (9 %, `est:1`)** · nicht schätzbar 3 (0 Spiele) – je Saison: `docs/HISTORIE_SUN_PROTOKOLL.md` (Stand 16.09.2026) |
| Doppelbelegung (ID zweimal in einer Saison) | **0** nach Auflösung (39 Zeilen abgespalten, siehe unten) |
| Ebenensprünge > 1 in Folgesaisons | 2, beide echt: Dresden 1994/95 → 1995/96 (Lizenzentzug), Stahl Eisenhüttenstadt 1969/70 → 1970/71 (f-archiv: Absteiger in der Bezirksliga) |
| Gepackt (gzip+base64) | **0,29 MB** (Schätzung vorher 0,24 MB) |
| Engine-Start | +85–96 ms (Seed wird synchron eingefaltet) |
| Archiv im localStorage | **+245 KB** (Schätzung 0,04–0,17 MB – höher wegen 2.154 neuer Vereine in der Ewigen Tabelle) |
| IndexedDB | +1,39 MB |
| Ligaverlauf | **348 Spielvereine** bekommen Saisons vor 2025 dazu (bisher 120). Größter Zugewinn: Werder Bremen II 0→50, VfB Stuttgart II 0→45, Bayern II 0→44, Holstein Kiel 11→54, Preußen Münster 11→54 |

Die Engine lief in allen drei Varianten (Original, +Ebene 2–3, nur Zeilen mit S/U/N) ohne Fehler durch, auch der Rekord-Backfill.

## Sackgassen (mit Vorschlag)

### 1. S/U/N fehlen – ✅ gelöst (16.09.2026): ifosta.de + Schätzung

Nutzerentscheidung 14.09.2026: schätzen, 2–3 Punkte Fehler sind akzeptabel – **vorher** ifosta.de abgleichen.

**ifosta.de** (`tools/ifosta_tabellen.mjs`, Zwischenspeicher `%TEMP%/ifosta_cache`, 1 Abruf/s): Excel-Web-Exporte,
Blätter über ihre Namen gesucht (`Tabellenstand`, `Kreuztabelle` – die DDR-Liga-Seiten haben davor ein Blatt je Spieltag).
214 Liga-Saisons der Gruppe 2, 280 Staffelseiten, **4.434 Zeilen, alle mit S/U/N**. Die Kreuztabelle war nie nötig; sie
dient als Gegenprobe: 4.369 von 4.434 gleich, der Rest paarweise (am Grünen Tisch gewertete Spiele) – die Abschlusstabelle gilt.
DDR-Bezirksligen hat ifosta **nicht**.

Abgleich im Dry-Run (3a): gleicher Platz + gleiches Torverhältnis (1.951), sonst Platz + Spiele + Punkte gleich bei
tippfehlerartigen Toren (480); bei mehreren Staffeln immer mit gemeinsamem Namenswort (ohne das griff Lichterfelde die Zeile
des Halleschen FC aus einer anderen Staffel). **Gegenprobe** gegen schon bekannte S/U/N: 1.572 gleich, 8 anders (meist ±1 Sieg,
bei 2-Punkte-Wertung gleichwertig; Homburg/Pirmasens 1982/83 bei ifosta vertauscht), 49 nicht gefunden.

**Schätzung** für den Rest (4a): bei Spielen und 2-Punkte-Wertung ist nur ein Wert frei (U = P − 2S, N = Sp − P + S).
Geschätzt wird die Remisquote: `a + b·(P/Sp − 1)² + c·Tore/Sp` (Kleinste Quadrate je Gebiet aus 14.243 belegten Zeilen)
plus Liga-Aufschlag (mittlere Abweichung derselben Liga ±3 Saisons). **Gegenprobe** an allen belegten Zeilen (eigene Saison
ausgeblendet), Fehler in der 3-Punkte-Wertung = |ΔS|:

| Verfahren | mittlerer Fehler | ≤ 2 Punkte | ≤ 3 Punkte |
|---|---|---|---|
| **Modell** | **0,86** | **97,4 %** | 99,8 % |
| nur Gebietsmittel | 1,00 | 95,2 % | |
| Selbsttest „Remisquote 0“ (muss durchfallen) | 3,35 | 28,4 % | |

Geschätzte Zeilen tragen `est:1`. Verbleibend geschätzt: **1.527 Zeilen**, davon rund 1.200 DDR-Bezirksligen (keine Quelle
mit S/U/N), gut 300 BRD-Zeilen, bei denen ifosta die Liga hat, die Zeile aber nicht sicher zuzuordnen war.
Gruppenzählung: Gruppe 1 **639** Liga-Saisons (vorher 527), Gruppe 2 **289** (vorher 401), davon 231 nur in einzelnen Zeilen geschätzt.

**Für den Einbau bleibt:** Seed-Zeile mit `sp`, `p2`/`p` und `est`; `_seedHistory` darf Zeilen ohne S/U/N nicht mehr still
überspringen (heute `s+u+n = 0` → wie zurückgezogen) – mit der Schätzung gibt es davon nur noch 3 echte (0 Spiele).
Die Anzeige sollte geschätzte S/U/N kenntlich machen.

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
