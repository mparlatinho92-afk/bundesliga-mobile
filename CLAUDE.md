# Bundesliga Architect – Claude Regeln

## Projektkontext
Modular aufgeteiltes HTML-Projekt (seit v0.3.43). `manage-v` inliniert alle Module → GitHub Pages Monolith bleibt standalone.

| Pfad | Inhalt |
|---|---|
| `template.html` | HTML-Gerüst + CSS (kein JS) – Quelldatei für manage-v |
| `index.html` | Monolith (GitHub Pages + Handy) – von manage-v generiert, nie manuell editieren |
| `app/` | App-UI-Module – thematisch aufgeteilt, `manage-v` inliniert alle |
| `game_engine.js` | Spiellogik (`Engine`-Objekt) |
| `game_data.js` | Statische Ligadaten (Ligen mit `min`/`max`/`target`, Teams, Wappen-Pfade) |
| `app/history_data.js` | `HISTORY_SEED` + `RELEGATION_SEED` – historische Abschlusstabellen |
| `data_reports.js` | Textkorpus für Spieltags-Schlagzeilen (von Fable geschrieben) |
| `Wappen/` | Vereins- und Liga-Logos |
| `schemas/` | Navigations-Schemata (functions.schema.json) |
| ~~`archive/`~~ | **entfällt seit v0.8.96** – siehe unten |
| `tools/` | Analyse-/Crawl-Skripte, nicht Teil der App |

> `data_live.js` / `data_logic.js` gibt es **nicht mehr** (gelöscht in `0de9abe`, „Toten Code entfernt").
> Die Engine braucht genau drei Dateien: `game_data.js`, `app/history_data.js`, `game_engine.js`.

Spiellogik-Priorität: plausibel vor perfekt, emergent vor gescriptet.
Ziel: Maximale Token-Effizienz durch chirurgische Code-Eingriffe.

---

## Arbeitsweise & Schema-Pflicht (Höchste Priorität)

**Funktions-Index-Disziplin:** Jede neue/geänderte Funktion muss sofort in `schemas/functions.schema.json` eingetragen werden (Name, Datei, Zeile, kurze Beschreibung).

**Daten-Integrität:** Vor Zugriffen auf `Engine`-State oder `App`-State zwingend das Schema lesen. Rückschlüsse aus dem Code sind untersagt.

**Navigation & Token-Save:** Nutze `functions.schema.json` für Zeilennummern. Bei Abweichungen (>10 Zeilen) sofort `grep -n` nutzen und Schema danach aktualisieren.

### Ein „behobener" Fehler, der wiederkommt, ist meist alter Datenbestand

Meldet der Nutzer, ein bereits behobener Fehler sei zurück – besonders in einem **neu angelegten**
Spielstand –, dann **zuerst die Daten prüfen, nicht die Logik.**

Der Reflex, den Code erneut zu lesen, ist fast immer falsch. Häufiger ist: der Speicher enthält noch
Datensätze aus einem früheren Durchlauf, und die Anzeige serviert sie weiterhin. Der Fix greift, er
kommt nur nicht zum Zug.

**Wie man das in Minuten statt in Tagen feststellt:** Tragen die erzeugten Kennungen einen
Zeitstempel (viele Generatoren bauen `Date.now()` ein), dann verrät ein Blick auf die Kennungen eines
Datensatzes, **welcher Durchlauf ihn geschrieben hat**. Liegen in einem Spielstand mehrere
Zeitstempel-Generationen nebeneinander, ist die Sache entschieden, bevor man eine einzige Zeile Logik
gelesen hat.

**Nie ohne Beleg entwarnen.** „Sollte jetzt gehen" ist keine Aussage. Entweder man kann zeigen, aus
welchem Durchlauf ein Datensatz stammt, oder man weiß es nicht.

**Alte Spielstände heilt ein Quell-Fix nicht.** Wer an der Quelle repariert, repariert neue Daten.
Für bestehende Stände braucht es entweder eine Auflösung bei der Anzeige oder die klare Ansage an den
Nutzer, dass dieser Stand betroffen bleibt.

> Konkret hier: dauerhaft gespeichert wird in `localStorage` (`ba_save_v66`, `ba_arch_v66`) **und** in
> IndexedDB (`ba_archive_v1`: champions/relegation/season_tables). Die IDB-Stores tragen KEINE
> Spielstand-Kennung, ihre Schlüssel sind reine Fachgrößen (`"y|lid"`, `y`). Nur `App.reset()`
> (app/modal.js) leert beide Ebenen – Import und der Neues-Spiel-Zweig in `Engine.init()` nicht.

### Eine Prüfung, die nicht durchfallen kann, prüft nichts

Vor jeder Entwarnung: die Prüfung einmal gegen einen Zustand laufen lassen, in dem sie
**fehlschlagen MUSS**. Ist sie auch dort grün, misst sie etwas anderes als gedacht. Diese eine
Gegenprobe hat mehr Fehler gefunden als jedes erneute Lesen des Codes.

Drei Fehlmessungen, die alle **Entwarnung meldeten, wo keine war** – oder umgekehrt:

- **Eine Funktion nachbauen statt aufrufen.** Wer eine Löschung von Hand nachstellt, überspringt
  leicht genau den Schritt, um den es geht. Immer die echte Funktion rufen, auch wenn der Aufbau
  umständlicher ist.
- **Eine Funktion isoliert lesen.** Räumt eine Funktion nur die Hälfte auf, kann der **Aufrufer**
  den Rest erledigen. Ist Aufräumarbeit auf mehrere Ebenen verteilt, genügt die unterste nicht.
- **Gegen das Falsche prüfen.** Ein Testlauf, der versehentlich gegen den aktuellen statt den alten
  Stand lief, meldete alles grün. Ein grüner Test gegen den falschen Zustand ist schlimmer als
  keiner.
- **Die Stichproben-Null für eine strukturelle halten.** Ein Bericht meldete „0,0 % Sensationen"
  bei einem Ebenen-Abstand von 5 — dahinter standen 28 Partien bei einer echten Quote von ~3 %,
  also 0,8 erwartete Fälle. Die direkte Messung (200.000 Ziehungen) ergab **0,9 %, nie null**.
  Vor jeder Aussage „das passiert nie": *wie viele Fälle wären überhaupt zu erwarten?* Unter drei
  ist die Zahl keine Aussage. Deshalb zeigt `tools/pokal_effekt.cjs` jetzt die absolute Anzahl und
  markiert dünne Zeilen mit `?`.

> Herkunft und ausführliche Fassung: `docs/PRUEFKATALOG_SPIELSTAND_VERMISCHUNG.md` – dort steht auch
> der Fragenkatalog für alles, was dauerhaft gespeichert wird.

### Minimalismus & Sicherheit
- Arbeite immer im Diff-Modus: Zeige nur Änderungen, nie die ganze Datei.
- Lies nur die im Schema identifizierten Blöcke (~200–300 Zeilen).
- Erkläre kurz das Warum einer Änderung, nicht nur das Was.
- Frage nach, bevor du mehr als 3 Stellen gleichzeitig änderst.
- Bei Unklarheiten: kurz nachfragen, nicht blind handeln.

### Mobil-Pflicht (bei JEDER UI-Änderung)
Zielgerät ist primär **Android als Startbildschirm-Tab (PWA, standalone)**. Bei **jeder** UI-relevanten Änderung die **Mobilansicht mitanpassen/prüfen**, nicht nur Desktop.
- Responsive CSS in `template.html` (Media-Queries, u.a. `@media (max-width:768px), (pointer:coarse)`) mitpflegen; Touch-Geräte bekommen via `(pointer:coarse)` immer das Mobil-Layout.
- Stolperfallen: Tabelle darf die **Pkt-Spalte** mobil nicht abschneiden (Standings-Tabelle hat Klasse `.ltab`, dort Spalten scopen); Flex-Zeilen mit `flex-shrink:0` am Namen brechen auf schmalen Spalten → Name schrumpfbar + Ellipsis. Pull-to-Refresh in `app/pulltorefresh.js` (Schwelle + Halten).

---

## Spiellogik testen: headless in Node (ohne Browser)

Die Engine ist **DOM-frei** bis auf wenige `localStorage`/`document`-Zugriffe. Für alles, was nur
Spiellogik über viele Saisons prüft (Ligagrößen, Auf-/Abstiegsbilanzen, Balancierung), ist Node
der richtige Weg: **~0,5 s pro Saison**, kein Server, kein Playwright.

```bash
node tools/sim_headless.cjs drift  60 4            # alle Ligen gegen ihr min/max-Band
node tools/sim_headless.cjs trend  120 3 6-6       # wächst die Liga oder pendelt sie?
node tools/sim_headless.cjs bands  60 4 6-6 7-8    # Größenverteilung + Band-Varianten
```

Eigene Analyse aufsetzen – die Shims sind das ganze Geheimnis:
```js
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16:s=>s, decompressFromUTF16:s=>s };
['game_data.js','app/history_data.js','game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
Engine.init();
for (…) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
```
> `const` → `var` ist nötig, sonst erzeugt `eval` im globalen Scope keine globalen Bindings.

**Grenze:** Sobald `App.*`, Layout oder Mobilansicht im Spiel sind, reicht das nicht – dann die
**run-Skill** (Playwright) benutzen, und zwar gegen **`template.html`**. `index.html` ist der von
`manage-v` gebaute Monolith und enthält Modul-Änderungen erst nach dem nächsten Build.

### Ligagrößen-Bänder ändern (Reihenfolge einhalten)
1. `trend` über **≥100 Saisons** – eine breite Verteilung kann bloß die Einlaufphase sein (Liga
   springt einmalig vom Startwert auf ihr Niveau). Steht dort „WÄCHST WEITER", ist ein breiteres
   Band nur eine Vertagung; dann Ursache suchen, nicht die Zahl anheben.
2. Erst bei „stabil, pendelt" die Verteilung aus `bands` als Grundlage nehmen – **Modus, nicht Ø**.
3. `min` ist der SCHRUMPF-Schutz (cancelt Abstiege). Ihn anzuheben *drückt die Liga aktiv nach
   oben*, statt sie nur zu deckeln – im Zweifel niedrig lassen und nur `max`/`target` bewegen.
4. Nachher `drift` gegenrechnen. Die **Gesamtzahl** driftender Ligen schwankt stark je Zufallsseed
   – vergleichbar sind nur die Einzelliga-Werte.

---

## Torzahlen gegen die Wirklichkeit prüfen (Recherche-Werkzeuge)

Neun Skripte, die zusammen eine Frage beantworten: **stimmt, was die Engine an Toren produziert?**
Sie sind die Grundlage für weitere Recherchen (z.B. wie es in den unteren Ligen wirklich aussieht) –
deshalb versioniert, nicht Wegwerf-Code.

| Skript | Was es holt/misst |
|---|---|
| `tools/torschnitt_fupa.mjs` | **Torschnitt je Ebene** aus echten Abschlusstabellen (FuPa-API, Ebene 1–11, nur deutsche Herrenligen). Ausgabe `tools/torschnitt_fupa.json` |
| `tools/torverteilung_real.mjs` | **Verteilung** aus echten Einzelergebnissen (openfootball, Ebene 1–4, bis 16 Saisons zurück). Ausgabe `tools/torverteilung_real.json` |
| `tools/torverteilung_fupa.mjs` | dieselbe Verteilung **bis Ebene 11** (FuPa, eine Saison). Ausgabe `tools/torverteilung_fupa.json` |
| `tools/tor_hist.cjs` | dieselbe Verteilung aus der **Engine** – spaltengleich zum echten Gegenstück |
| `tools/tor_kalib.cjs` | alles **nebeneinander** inkl. Pokal und Balance; `node tools/tor_kalib.cjs 25 GOAL_SPLIT=16 …` |
| `tools/staerke_effekt.cjs` | schlagen die **Stärkewerte** durch? Buckets nach Paarungs-Differenz und nach Abweichung vom Ligamedian |
| `tools/pokal_effekt.cjs` | dasselbe für **Pokal und Testspiele** nach Ebenen-Abstand – dort prallen Ebene 1 und 8 aufeinander |
| `tools/tor_pruefung.cjs` | **DIE Prüfung** (Exit 1): Torschnitt, 0:0, Schwanz und Balance auf allen acht Ebenen gegen echte Werte, mit `--selbsttest` |
| `tools/sensation_check.cjs` | **Prüfung** (Exit 1): kann der Außenseiter überall gewinnen, und ist nirgends ein Deckel? Auch mit `--selbsttest` |

```bash
node tools/tor_kalib.cjs 25                              # Engine wie eingebaut gegen die Zielwerte
node tools/tor_kalib.cjs 25 2.63 0.56 0.0224 5 0.5       # BASE STEP LEVEL SAT FADE durchprobieren
node tools/torschnitt_fupa.mjs                           # Zielwerte neu holen (dauert, viele Requests)
```

**Der Torschnitt allein beweist nichts.** Bei praktisch gleichem Schnitt (Ebene 1: real 3,04 /
Engine 3,16) fiel ein 6er-Ergebnis 2,3-mal so oft wie in Wirklichkeit – der Fehler saß in der
VERTEILUNG, nicht im Mittelwert. Immer beides messen.

**Nach jeder Änderung am Tormodell zwei Befehle, beide mit Exit-Code:**
```bash
node tools/tor_pruefung.cjs 14      # Torschnitt, 0:0, Schwanz, Balance je Ebene
node tools/sensation_check.cjs      # nichts strukturell unmöglich, kein Deckel
```
Beide haben ein `--selbsttest`, das absichtlich durchfällt — eine Prüfung, die nicht
durchfallen kann, prüft nichts. Die Toleranzen für Quoten sind **statistisch**, nicht
pauschal: der Zielwert hat selbst eine Unsicherheit (Regionalliga „1,57 % mit 6+ Toren“ sind 23 Fälle aus 1464 Spielen — ±20 % allein im Ziel). Zwei bekannte Strukturgrenzen
stehen im Skript als `AUSNAHMEN` beim Namen, statt die Toleranz aufzuweichen.

**Drei Kennzahlen gehoeren immer zusammen gemessen**, sonst verschiebt man den Fehler nur:
Torschnitt, Verteilung (0:0 / ≥6 / ≥8 / ≥10 / ≥12 / Hoechstwert) und Balance (Remis-/Heimsiegquote).
`tools/tor_kalib.cjs` gibt alle drei je Ebene neben den echten Werten aus. Zwei Kopplungen, die
dabei aufgefallen sind: `GOAL_SPLIT` verschiebt still den **Heimvorteil** (dieselben Staerkepunkte
wiegen in einer breiteren Aufteilung weniger – die Heimsiegquote fiel von 43 auf 40 %), und es
verschiebt die **Remisquote**, weshalb `GOAL_DRAW` mit angepasst werden muss.

**Welche Stärke wo zählt, ist der häufigste Denkfehler.** Niveau und Abstand nehmen den
**Schnitt** beider Stärken – ein Spiel zweier Landesligisten ist ein Landesliga-Spiel. Bremse
und Einbruch nehmen die **schwächere Seite**, denn Tore fallen gegen eine Abwehr, nicht gegen
einen Mittelwert. Am Schnitt gemessen bekam ausgerechnet die Pokalpaarung Bundesligist gegen
Sechstligisten (Schnitt 74, also „bezahlter Fußball") die volle Profi-Bremse und gar keinen
Einbruch – der DFB-Pokal kam über 12 Saisons nie über 7 Tore hinaus.

**Nie 0 %.** Sobald ein Ergebnis strukturell unmöglich ist, ist der Wettbewerb an dieser Stelle
entschieden, bevor er gespielt wird — derselbe Fehler wie der alte Cap 9 im Pokal, nur eine Ebene
tiefer. `tools/sensation_check.cjs` prüft das mit Exit-Code: selbst Ebene 1 gegen Ebene 8 in einer
späten Runde ergibt 0,154 % (308 von 200.000). Nach jeder Änderung am Tormodell mitlaufen lassen.

**Pokal und Testspiele haben KEINE eigenen Wahrscheinlichkeiten** und sollen auch keine
bekommen: sie fallen aus denselben Stärkewerten heraus. Genau deshalb sind sie der schärfste
Test – im Ligabetrieb treffen fast nur Gleichstarke aufeinander. `tools/pokal_effekt.cjs`
nach jeder Änderung am Tormodell mitlaufen lassen.

**Und der Schwanz kippt mit der Ebene das Vorzeichen.** Poisson ist in der Bundesliga zu fett
(63 Saisons, ein einziges Spiel mit 12 Toren einer Mannschaft) und in der Verbandsliga zu dünn
(EINE Saison, echtes 16:0; Kreisliga B: 21:0). Eine feste Bremse machte die unteren Ligen um
Faktor 25 zu brav – deshalb hängt `GOAL_FADE_LVL` an derselben Amateurgrenze wie das Niveau.
Wer hier etwas dreht: **immer alle acht Ebenen ansehen**, nie nur die Bundesliga.

**Die Einzelergebnis-Route ist nicht zu raten** (kostete eine Runde Suchen im Lazy-Chunk):
```
v1/competitions/<slug>/seasons/<2025-26|current>/matches?sort=desc&limit=100&offset=N
```
Felder `homeGoal`/`awayGoal`, max 100 je Seite, weiter über `offset` (Link-Header nennt die
nächste Seite). `?competition=<slug>` gibt es NUR für `/standings`; auf `/matches` antwortet
jede Query-Form mit `No profile for the specified request found`.

**Zwei Fallen bei den Quellen:**
- FuPa liefert auch Luxemburg und Zürich auf denselben Ebenen. Ohne Regionsfilter verschiebt das
  den Schnitt sichtbar (Ebene 3 sprang von 3,21 auf 3,57).
- Wikipedia-Infoboxen (`|Spiele=`, `|geschossene Tore=`) sind bequem, aber für Ebene 6 nur für die
  letzte Saison vorhanden und stellenweise falsch (eine Liga meldete 1215 Tore in 220 Spielen).
  Unterhalb Ebene 6 gibt es dort gar nichts – dafür ist FuPa die einzige Quelle.

## Rekorde: gemessen wird aus `seasonResults`

Wer Spielrekorde aus `matchdayHistory` liest, misst im `fastMode` nur die Ebenen 1–4 –
`_applyResult` filtert dort. `fastMode` läuft bei „Restsaison simulieren“ und im MegaSim, also in
genau den Saisons, die niemand durchklickt. `Engine.seasonResults` ist in beiden Modi vollständig.
Gegenprobe: `node tools/rek_check.cjs fast 3` gegen `node tools/rek_check.cjs slow 3` – beide
müssen alle acht Ebenen melden.

---

## Karte: Mini-Polygone („Narben") beseitigen

Splitter, die nichts abdecken, aber einen Haarstrich in eine Fläche zeichnen. Routine:

```bash
python -m http.server 3334          # zweite Konsole
node tools/karte_narben.mjs         # meldet Narben mit Region; Exit 1 = Befund
python tools/gen_regions.py         # nach einer Korrektur neu erzeugen
node tools/karte_narben.mjs         # muss 0 melden
```

**Erkannt wird an der BREITE, nicht an der Fläche.** Ein 5 km langes, 5 m schmales Band hat
0,025 km² und überlebt jede Flächenschwelle:

```
breite = 2 · Fläche / Umfang      metrisch (cos-Breitengrad), Schwelle 166 m
```

Die Schwelle entspricht der Vereinfachungstoleranz `SIMPLIFY` — was schmaler ist als sie, besteht
nur aus ihrem Fehler. Echte Kleininseln (Fehmarn, Rügen, Bremerhaven) sind kompakt und damit um
Größenordnungen breiter; sie bleiben.

> **Die Regionen-Ebene hat DREI Erzeuger.** Wer nur einen filtert, sieht den Fehler weiterhin:
> 1. Waben (Voronoi je Verein) — `tools/gen_regions.py`, `waben_export`
> 2. statische Regionsflächen — `tools/gen_regions.py`, Ausgabe-Schleife
> 3. Laufzeit-Vereinigung — `app/map_saison.js`, `_wabenUnion`
>
> Alle drei müssen dieselbe Schwelle benutzen (`MINI_BREITE_M`, beide Dateien), sonst verwirft der
> Generator Splitter, die die Laufzeit gleich wieder erzeugt. **Und metrisch messen** — in Grad
> hinge die Schwelle von der Ausrichtung des Splitters ab (0,0015° sind nord-süd 166 m, ost-west
> auf 53° Breite nur ~100 m).

**Nicht raten, welche Ebene schuld ist** — `tools/karte_narben.mjs` misst, was der Browser
tatsächlich zeichnet, und nennt über das Tooltip-Label die Region. Ein Blick in die Dateien auf
der Platte übersieht Erzeuger 3 zwangsläufig.

---

## Bestätigungs-Dialog (Git, Push, manage-v)
Vor Schritten mit Wirkung auf **Remote**, **Archiv** oder **Versions-Script** immer zuerst nachfragen:
- **„1"** = ja ausführen, **„2"** = nein, oder **y** / **n**

Betrifft mindestens: **`./manage-v`**, **`git push`**, manuelle Commits.
**Nicht** eigenmächtig pushen oder `manage-v` starten – erst Rückmeldung abwarten.
**Ausnahme:** Nutzer formuliert eindeutig (z.B. „push ausführen") – das zählt als Bestätigung.

---

## Eingriffe außerhalb des Projektordners

Alles, was den Projektordner verlässt, wird **vorher in einem Satz angesagt** – auch wenn die
Berechtigung es zulässt und keine Rückfrage kommt. Betrifft unter anderem:
- eine Datei im Standardprogramm öffnen (`Start-Process`, `open`, `xdg-open`)
- außerhalb des Projekts schreiben (Desktop, Home, Downloads, Systempfade)
- ein Programm starten, das ein Fenster aufmacht
- etwas an einen externen Dienst schicken

Grund: Ein Fenster, das von selbst aufgeht, ist ein Schreck, kein Komfort. Nicht der Vorgang
stört, sondern dass er unangekündigt kommt.

**Ergebnisse liefern statt erwähnen.** Bilder, die Claude selbst betrachtet, sieht der Nutzer
nicht, und Dateien im Scratchpad findet er nicht. Ein Ergebnis ist erst geliefert, wenn es an
einem Ort liegt, den der Nutzer kennt, und der Pfad genannt ist.

**Bei Fragen zu Zugriffsrechten:** die tatsächliche Konfiguration lesen und Fakten nennen
(welche Datei, welcher Eintrag, was folgt daraus) – nicht allgemein beruhigen.

> Seit `81e0bfc` steht in `.claude/settings.json` `permissions.allow: []`. Die feingranularen
> Regeln liegen in `.claude/settings.local.json`. Wenn das Nachfragen zu viel wird, ist die
> Antwort **nicht** wieder ein nackter Tool-Name (`"Bash"`, `"PowerShell"`), sondern eine
> gezielte Regel wie `Bash(git status*)`.

---

## Patch-Skripte: `\\` ueberlebt die Bash-Tool-Zeile NICHT

**Gemessen, nicht vermutet.** Ein doppelter Backslash im Kommando des Bash-Tools kommt als
einfacher an — schon *vor* der Shell, also unabhaengig von Quoting und Heredoc-Form:

```python
a = "X\\nY"        # erwartet: Backslash + n  (Laenge 4)
```
| Weg | Ergebnis |
|---|---|
| `python - <<'PY'` | `'X\nY'`, Laenge 3 ❌ |
| `cat > datei.py <<'PY'` + `python datei.py` | `'X\nY'`, Laenge 3 ❌ |
| **Write-Tool** + `python datei.py` | `'X\\nY'`, Laenge 4 ✅ |

`cat > datei` hilft also NICHT — das war eine Fehldiagnose. Ein einzelner Backslash (`\n`, `\t`)
kommt unveraendert durch, nur die Verdopplung geht verloren. Betroffen ist damit alles, was einen
LITERALEN Backslash in eine Datei schreiben soll: Python-/JS-Strings mit `\n`, Regexe (`\d`,
`\s`), `sed`-Ausdruecke.

**Regel:** Patch-Skript mit dem **Write-Tool** anlegen, dann per Bash aufrufen. Nur wenn es
unbedingt inline sein muss: Backslash als `chr(92)` (Python) bzw. `String.fromCharCode(92)` (JS)
bauen und mit `+` zusammensetzen — dann kommt kein `\\` in der Kommandozeile vor.

**Zwei Begleitfallen aus derselben Sitzung:**
- **Erst pruefen, dann schreiben.** Schlaegt ein `assert` in der Mitte fehl, ist ohne
  Sammel-Schreibvorgang am Ende gar nichts gespeichert — und die bereits geglueckten Ersetzungen
  sind weg. Also alle `replace` auf einer Variablen sammeln und EINMAL am Schluss schreiben.
- **`game_engine.js` enthaelt Umlaute.** Ein Suchanker in Transliteration ("haelt" statt "hält")
  findet den Block nicht. Anker immer aus der Datei kopieren, nicht aus dem Gedaechtnis tippen.
- **Windows-Python kann `/c/Users/...` nicht oeffnen.** Git-Bash-Pfade vorher durch
  `cygpath -w` schicken oder gleich den Windows-Pfad verwenden.

---

## Schema-Inventur nach jedem Coding-Task (PFLICHT)
Nach jedem Task der neue Funktionen hinzufügt:
1. `python tools/schema_check.py` – prüft in einem Lauf: **Lücke** (Funktion im Code, nicht im Schema), **Karteileiche** (Eintrag ohne Definition), **Drift** (Zeilennummer >10 daneben). Exit 1 = Befund
2. Bei Befund: Nutzer **unaufgefordert** darauf hinweisen. Neue Funktionen von Hand eintragen (`"file"` + `"line"` + `"desc"`); reine Zeilennummern-Drift erledigt `python tools/schema_check.py --fix` (ändert NUR Zeilennummern, Formatierung + Beschreibungen bleiben)
3. Erst danach `./manage-v`-Befehl vorschlagen
4. **`manage-v` zieht die Zeilennummern seit v0.8.88 selbst nach** – der Build schreibt den
   Changelog in `app/modal.js` und verschiebt dadurch jede Funktion darunter (zuletzt 27 Einträge
   auf einen Schlag). Diese Drift entsteht *durch den Build*, die Prüfung davor sieht sie nie;
   deshalb läuft `--fix` jetzt im Script direkt vor dem Commit und staged Schema + `CHANGELOG.md`
   mit. Fehlt Python, wird der Block still übersprungen – dann von Hand nachziehen.
> Warum: Zeilennummern verschieben sich bei jedem Edit still. Im Juli 2026 waren 130 von 234 Einträgen falsch – das Schema navigierte in die Irre, statt Token zu sparen.

---

## Automatisierter Versions-Workflow
Sobald ein Task abgeschlossen ist, `./manage-v` vorschlagen. Ausführung erst nach Bestätigung.

```bash
./manage-v -NewVersion "0.1.1" -CommitMsg "Fix: Beschreibung" -ChangelogPoints "NEU: Feature;FIX: Bug"
```

**Wrapper:** `manage-v` (ohne Extension) ruft `manage-v.ps1` via PowerShell auf – direkt aus Git Bash nutzbar.
Das Script patcht VERSION, Titel, Changelog in index.html → erstellt `bundesliga-vX.X.X.html` → archiviert alte Version → git commit + push.
> ⚠️ Versionsnummer nie wiederverwenden (Korrektur → nächste Nummer).

### Kein Archiv, aber die DREI aktuellsten Stände bleiben liegen (ab v0.8.96)
Es gibt kein `archive/` mehr. `manage-v` behält die **drei neuesten** `bundesliga-vX.Y.Z.html`
(den gerade gebauten mitgezählt) und löscht alles ältere — `$KeepVersions = 3` in `manage-v.ps1`.

**Warum nicht mehr:** Jeder Monolith ist ~44 MB, weil alle Wappen als Base64 eingebettet sind.
251 Snapshots waren zuletzt **7 GB** lokal. Die Git-Historie hält jede je gebaute Version ohnehin
vor — das Archiv war eine zweite, unkomprimierte Kopie desselben.

**Warum nicht nur einer:** Wenn die frisch gebaute Version Probleme macht, braucht es sofort einen
lauffähigen Stand zum Zurückgreifen, ohne erst in der Historie zu graben. Dazu der konkrete
Auslöser: am 30.08.2026 vergaben zwei Sitzungen parallel dieselbe Versionsnummer, der zweite Lauf
löschte den Snapshot des ersten als „alte Version“ — danach lag GAR KEINE lauffähige Datei mehr im
Projekt, und der nächste Build wäre an „Keine bundesliga-v*.html gefunden!“ abgebrochen.
Drei Stände ≈ 130 MB, gegen 7 GB beim alten Archiv.

> Sortiert wird nach der **Versionsnummer**, nicht nach Dateidatum oder Name: v0.8.9 stünde sonst
> hinter v0.8.129, und ein aus der Historie zurückgeholter Stand hat ein frisches Datum.

**Eine alte Version zurückholen:**
```bash
git log --oneline --diff-filter=A -- "bundesliga-v0.8.42.html"   # Commit finden
git show <commit>:bundesliga-v0.8.42.html > /tmp/alt.html        # herausschreiben
```

### Vereinswappen (ab v0.3.46)
- Wappen als Dateien in `Wappen/Vereinswappen/{teamId}.png` (oder `.svg`)
- `game_data.js` referenziert nur den Pfad: `"thumb": "Wappen/Vereinswappen/{teamId}.png"`
- `manage-v` bettet alle `Wappen/...`-Pfade beim Bauen automatisch als Base64 ein → Monolith bleibt standalone
- **Neue Wappen hinzufügen:** Datei in `Wappen/Vereinswappen/` ablegen, `thumb`-Feld in `game_data.js` setzen – fertig

---

## Versionierung
- **Hotfix** (3. Stelle, z.B. 0.1.0 → 0.1.1): Bugfix oder kleine UI-Änderung
- **Patch** (2. Stelle, z.B. 0.1.x → 0.2.x): Abgeschlossene Feature-Gruppe
- **Minor** (1. Stelle, z.B. 0.x → 1.x): Mehrere Feature-Gruppen abgeschlossen
- **v1.0**: Alle Kernfeatures fertig (Ligabetrieb, Transfers, Saison-Archiv, Mobile-UI)

Versionsnummer steht im `<title>`-Tag und in der `VERSION`-Konstante in `index.html`.

---

## Changelog pflegen (PFLICHT bei jeder Versionsänderung)
- Changelog befindet sich im Einstellungen-Bereich der HTML (grep: `<!-- CHANGELOG -->`)
- Format: `v0.1.1 (aktuell)` in grün, darunter `• NEU:` / `• FIX:`-Punkte
- manage-v erledigt das automatisch über `-ChangelogPoints`

---

## Neues App-Modul hinzufügen
1. `app/xxx.js` erstellen: `Object.assign(App, { method: function() {...} });`
2. `index.html`: `<script src="app/xxx.js"></script>` einfügen
3. `manage-v.ps1`: `"app/xxx.js"` zur `$JsFiles`-Liste hinzufügen
4. `schemas/functions.schema.json` aktualisieren
> Faustregel: logisch zusammenhängende Gruppe >150 Zeilen → eigenes Modul.

---

## Schemas (Navigations-Zentrale)

| Datei | Inhalt |
|---|---|
| `schemas/functions.schema.json` | Index aller Funktionen mit Datei, Zeilennummer + Zweck (Pflicht!) |

Schemas bei Strukturänderungen oder größeren Edits mitpflegen.
Zeilennummern verschieben sich – nach signifikanten Edits aktualisieren.

---

## Nach PC-Neustart
1. Git Bash im Projektordner öffnen
2. Weiterarbeiten – kein Server nötig, index.html direkt im Browser öffnen
