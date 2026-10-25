# Ebene 4 vor 1994: Probelauf und Einbau (12.10.2026)

## Eingebaut (v0.8.210)

Nutzerentscheidungen: geschätzte S/U/N ja (kursiv, `e:1`); A-Klassen zu tief; Nachfolger ja, **mit Hinweis über der Ewigen
Tabelle** (`App._vorgaengerHinweis`, Klasse `.vorg-hinweis`); die Linie der obersten Verbandsliga bis 1963 durchgezogen; die
zweiten Ligen bis 1974 (Hamburg, Schleswig-Holstein, Niedersachsen: damals „Verbandsliga“) eigene ID `-bis1974` ohne Nachfolger;
gleiche Namen (Landesliga Hamburg/Bremen 1963–78 = heute Oberliga Hamburg/Bremen-Liga) zeigen im Vermerk Zeitraum + heutigen Namen.

```bash
node tools/wiki_tabellen.mjs     # Ebene-4-Artikel (S/U/N) + Niederrhein 1985/86, Berlin 1991–93
node tools/farchiv_ebenen.mjs ~/Downloads/farchiv_output/alle_tabellen_final.csv tools/wiki_ergaenzung.csv tools/farchiv_korrektur.csv
node tools/farchiv_vereine.mjs && node tools/historie_dryrun.mjs && node tools/wiki_ebene45.mjs && node tools/fbde_ebene58.mjs
node tools/historie_einbau.mjs && node tools/einzelspiele_dryrun.cjs && node tools/einzelspiele_einbau.cjs
node tools/historie_einbau_test.cjs   # + --selbsttest; Browser: .claude/skills/run/hist_check.mjs (4q–4s)
```

- `app/history_ext.js`: 2.362 → 2.798 Liga-Saisons, 41.727 → 56.318 Vereinssaisons (11.653 geschätzt), 911 → 1.211 KB.
- Liga darüber (Navigation, Ligaverlauf, Pyramide): aus den Vereinswechseln abgeleitet (`HOCH_ALT` in `historie_einbau.mjs`,
  ausgegeben unter `hoch1994`), 1.449 Wechsel bestätigen, 16 widersprechen.
- Nachfolger: 41 historische Ligen unter 21 heutigen, belegt in den Wikipedia-Artikeln der heutigen Ligen (Abschnitt Geschichte).
  Oberliga Berlin 1974–91 bewusst NICHT (ging 1991 in die Oberliga Nordost, Wikipedia „Vertragsliga Berlin“).
- Unterwegs korrigiert: `hist_alias.json` „1.FC Rheinfelden“ = „VfR Rheinfelden“ war falsch – beide spielten 1968–77
  gleichzeitig in der 2. Amateurliga Südbaden Mitte (erst Ebene 4 zeigt das). `hist_fusion.json` FC Verden 04: Vorgänger TSV Verden
  jetzt `hist_fa_tsvverden` (fussball.de findet ihn in der Verbandsliga Niedersachsen). Germania Oberroden → Spielverein
  (`farchiv_vereine_korrektur.json`), Hallescher FC II/A → `hist_wk_hallescherfcii` (Schreibweise/Alias).

## Probelauf

Vor dem Einbau lief die Kette hinter einem Schalter `HIST_E4=1` (inzwischen entfernt); ohne ihn kam byte-gleich der alte Stand
heraus (geprüft: `farchiv_ebene23.json` und `seed_erweiterung.json`).

Ergebnisse: `tools/_dryrun/e4/` (Läufe, `ligen.txt`, Seed, Prüfliste, S/U/N-Protokoll). Vorabgleich f-archiv ↔ Wikipedia:
`python tools/ebene4_wiki_abgleich.py`.

## Umfang

35 Ligen, 436 Liga-Saisons, 14.591 Vereinssaisons (`tools/_dryrun/e4/ligen.txt`).

| | ohne Ebene 4 | mit Ebene 4 |
|---|---|---|
| historische Liga-IDs (Seitenleiste) | 62 | 97 |
| gzip+base64 | 0,34 MB | 0,59 MB |
| Archiv im localStorage (Probelauf-Maß) | +466 KB | +791 KB |
| IndexedDB | +1,54 MB | +2,74 MB |
| Start | +248 ms | +558 ms |
| Doppelbelegung aufgelöst | 57 | 76 |
| geschätzte S/U/N | 645 | 11.652 |

## Hauptbefund: S/U/N fehlen für drei Viertel

11.007 der 14.591 Ebene-4-Zeilen hätten **geschätzte** Siege/Remis/Niederlagen (Modell MAE 0,87 Punkte je Zeile). f-archiv führt
vor ~1990 nur Punkte und Tore, Wikipedia hat für diese Ligen keine Saisonartikel. Vollständig echt sind nur Westfalen, Niederrhein,
Mittelrhein (je Verbandsliga ab 1978), Hamburg, Bremen, Württemberg, Landesliga Niedersachsen/Schleswig-Holstein 1974–78, Berlin,
Sachsen, Mecklenburg-Vorpommern. Ganz geschätzt: Landesliga Bayern (1.652), Landesliga Hessen (1.485), Landesliga Westfalen
1963–77 (1.195), 2. Amateurliga Nordbaden (1.048), Niederrhein-Landesliga, Südbaden, Südwest, Saarland, Amateurliga Nordbaden
1978–93, Thüringen, Sachsen-Anhalt, Brandenburg.

## Vereine

Neu durch Ebene 4: 1.825 Namen. Spielverein sicher (A/B/K) 3.131 Zeilen, unsicher (C, wird nicht angewendet → eigene hist-ID)
2.330 Zeilen / 329 Namen, ohne Kandidat (H) 9.130 Zeilen / 1.343 Namen. Die C-Namen stehen in
`tools/_dryrun/e4/farchiv_zuordnung_pruefliste.csv`.

## Namensfallen (in den Regeln gelöst)

- Bremen: oberste Bremer Liga heißt bei f-archiv 1974–78 „Landesliga“, ab 1978 „Verbandsliga“ (gemessen über Wikipedia) → eine Liga.
- Hamburg: Ordner `landesliga/` 1963–73 = Ebene 4 („Verbandsliga Hamburg“), 1978–81 = Ebene 5 unter demselben Namen.
- Hessen: „Landesliga Nord/Mitte/Süd“ ohne Verbandsnamen → Regel über den Ordner `/hessen/`.
- Rheinland 1978–94: f-archiv „Amateurliga“, Wikipedia „Verbandsliga“ → Spielname Verbandsliga Rheinland.
- „2. Amateurliga“ brauchte einen eigenen Ligatyp (`ligaTyp` in `historie_dryrun.mjs`), sonst „Liga Nordbaden“.
- Wikipedia-Abgleich unterscheidet Ebene-3- und Ebene-4-Artikel desselben Verbands (`e4Artikel`), die Verbandsligen
  Westfalen/Niederrhein/Mittelrhein waren bis 1978 selbst Ebene 3.

## Lücken (keine Quelle, weder f-archiv noch Laufwerk G: noch Wikipedia)

Berlin 1963–91, Württemberg und Schwarzwald-Bodensee 1963–78, Rheinland 1963–78, Bremen 1963–74, Hessen 1963–65,
Nordbaden 1977/78, Saarland 1965/66 und 1967–69, Brandenburg-S/U/N 1991–94. DDR-Bezirksklassen gibt es nicht. A-Klassen
(Württemberg) bleiben bewusst draußen (Nutzer: „zu tief“).

## Nachfolger-Vorschlag (Nutzer: ja, mit Hinweis in der Ewigen Tabelle)

Nur eindeutige Fälle, wie bei Ebene 3:

| historische Liga | heutige Liga |
|---|---|
| Verbandsliga Niederrhein 1978–94 | 5-11 Oberliga Niederrhein |
| Verbandsliga Mittelrhein 1978–94 | 5-12 Mittelrheinliga |
| Verbandsliga Hamburg | 5-5 Oberliga Hamburg |
| Verbandsliga Bremen | 5-7 Bremen-Liga |
| Verbandsliga Schleswig-Holstein | 5-4 Oberliga Schleswig-Holstein |
| Verbandsliga Niedersachsen | 5-6 Oberliga Niedersachsen |
| Verbandsliga Rheinland | 6-2 Rheinlandliga |
| Verbandsliga Südwest | 6-1 Verbandsliga Südwest |
| Amateurliga (Verbandsliga) Nordbaden | 6-4 Verbandsliga Baden |
| Verbandsliga Südbaden | 6-5 Verbandsliga Südbaden |
| Verbandsliga Württemberg | 6-6 Verbandsliga Württemberg |
| Verbandsliga Berlin 1991–94 | 6-21 Berlin-Liga |
| Landesliga Sachsen / Thüringen, Verbandsliga Sachsen-Anhalt / Brandenburg / M-V 1991–94 | 6-24 / 6-23 / 6-22 / 6-20 / 6-19 |

Nicht eindeutig: Verbandsliga Westfalen (heute zwei Westfalenliga-Staffeln), Landesliga Hessen (drei Verbandsligen), Landesliga
Bayern (fünf Landesligen), Verbandsliga Saarland (bei Ebene 5–8 bewusst ausgelassen), alle Ligen 1963–78.
> Nachtrag 25.10.2026 (Nutzer „a“): Amateurliga Saarland 1963–78 + Verbandsliga Saar 1978–94 → 6-3 Saarlandliga und Amateurliga
> Hessen 1963–78 → 5-3 Hessenliga verbunden (Wikipedia Saarlandliga / Fußball-Hessenliga: eine Linie über alle Umbenennungen).
> Die gleichnamige „Verbandsliga Saar“ 2009–12 eine Ebene tiefer bleibt draußen. Prüfung `.claude/skills/run/saar_hessen_vorgaenger.mjs`.
Offen vor dem Einbau: Die IDs Hamburg/Schleswig-Holstein/Niedersachsen-Verbandsliga enthalten auch die Saisons vor 1974/78
(dort andere Ligastruktur) – trennen oder mitnehmen?
