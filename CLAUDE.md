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
| `app/history_ext.js` | **erzeugt** von `tools/historie_einbau.mjs`: Ebene 2–3 vor dem Sim-Start (BRD 1963–2024, DDR 1963–91), Ebene 4 vor 1994 (Landes-/Verbandsligen, 2. Amateurligen; s. `docs/EBENE4_PROBELAUF.md`), Oberligen 1994–2008 (Ebene 4), Verbandsligen Ebene 5 1994–~2001 und Vorläufer der Landes-/Bezirksligen ab 1978 (`docs/EBENE5_1994.md`), Spiel-Ligen Ebene 5–8 ab 2001 aus fussball.de (`fe`/`an`, s. unten), Tabellen gzip+base64 – nie von Hand ändern. `ligaNachfolger`: historische Liga → heutige Liga (nur eindeutige Fälle, s. `docs/HISTORIE_DRYRUN.md`; seit v0.8.228.29 88 Ligen unter 35, Hinweis über der Ewigen Tabelle) |
| `app/aufstieg_data.js` | **erzeugt** von `tools/aufstieg_einbau.mjs`: Aufstiegsrunden, Entscheidungsspiele und Relegation zu Bundesliga / 2. Bundesliga / 3. Liga (1963/64–2024/25) – nie von Hand ändern |
| `app/europa_data.js` | **erzeugt** von `tools/europa_einbau.mjs`: Europapokal-Startplätze der Bundesliga je Saison 1963/64–2024/25 – nie von Hand ändern |
| `app/einzelspiele_data.js` | **erzeugt** von `tools/einzelspiele_einbau.cjs`: Spielrekorde (höchster Sieg/Niederlage, torreichstes Spiel) aus ~200.000 historischen Einzelspielen, offline vorgerechnet – nie von Hand ändern |
| `app/aufstieg.js` | `App.showAufstieg`: eigener Wettbewerbs-Einstieg (`__aufstieg__`) mit Reitern je Ziel-Liga + Bilanz |
| `app/nav_stil.js` | **geschrieben vom Stil-Modus** (··· → 🎨 Stil-Modus → Speichern): drei Namen je Liga (mittel/kurz), Schrift/„…“/Pfeile je Geschwisterblock, Seitenleisten-Schrift – nie von Hand ändern. Der Nutzer stellt am echten Spiel ein, sagt „ok“, dann lesen, prüfen, bauen |
| `app/stil_modus.js` | Stil-Modus: `template.html?stil` = Editor, `?stilvorschau` = eingefrorenes Spiel im Rahmen (liest den Spielstand, schreibt nichts – Wächter im `<head>`, `idb_store.js` writeTx, `initTabLock`) |
| `app/hist_ext.js` | `HistExt`: entpackt `history_ext.js` erst bei Bedarf, mischt Vereins-/Era-Namen; Engine faltet daraus asynchron die Ewigen Tabellen |
| `data_reports.js` | Textkorpus für Spieltags-Schlagzeilen (von Fable geschrieben) |
| `Wappen/` | Vereins- und Liga-Logos |
| `schemas/` | Navigations-Schemata (functions.schema.json) |
| ~~`archive/`~~ | **entfällt seit v0.8.96** – siehe unten |
| `tools/` | Analyse-/Crawl-Skripte, nicht Teil der App |

> `data_live.js` / `data_logic.js` gibt es **nicht mehr** (gelöscht in `0de9abe`, „Toten Code entfernt").
> Die Engine braucht genau drei Dateien: `game_data.js`, `app/history_data.js`, `game_engine.js`.
> Die historischen Ligen sind optional (`typeof HistExt`-Guard); mitprüfen: `node tools/historie_einbau_test.cjs` (mit `--selbsttest`).
>
> **Historische Vereine** – Dubletten, Umbenennung/Fusion/Ausgründung, „Amateure“, Seed-IDs/REMAP, DDR-Vereine, Nachfolger
> außerhalb des Spiels, unscharfe Schreibweisen, Zwischenspeicher, Rundenmodus: **vor jeder Arbeit daran `docs/HISTORIE_VEREINE.md` lesen.**
> Die härtesten Regeln daraus:
> - `historie_dryrun.mjs` NIE ohne die Zwischenspeicher (`%TEMP%/ifosta_cache` u. a.) – sonst 983 → 14.339 geschätzte Zeilen.
> - Gemeinsame Saison = Fusion, nie Umbenennung. Eine Abkürzung des heutigen Namens wird nie damaliger Name.
> - Seed-IDs (HISTORY_SEED) erreicht `hist_alias` nicht – nur `REMAP` + `HISTORY_SEED.version` erhöhen.
> - SSV Jeddeloh II ist eine erste Mannschaft. FC Internationale 1980 II: `nachbarStaffel:true` (`node tools/nachbarstaffel_test.cjs`).
> - Nach jeder Scraper-Lieferung die WARNUNGen von `historie_einbau.mjs` lesen, danach `einzelspiele_dryrun/einbau`.
> - **Vor jedem Einspielen eines Neuaufbaus** `node tools/historie_neuaufbau_vergleich.cjs` (gegen git HEAD, Exit 1 bei ID-Wechseln oder
>   verlorenen S/U/N; gewollte Wechsel mit `--erwartet=N`). Am 21.10.2026 verschob ein Neuaufbau sonst 60 Zeilen auf andere Vereine.
> - **Neue Lieferung = ID-Anker** (`tools/hist_id_anker.json`, `docs/EBENE5_1994.md`): sonst verschieben neue Namen alte Zeilen
>   (25.10.2026: 422). Vorher `node tools/wiki_tabellen.mjs` – Windows leert den Wikipedia-Zwischenspeicher still.
>   Bei schon bestehender Ankerdatei NICHT `HIST_ANKER_ABLEITEN` (überschreibt sie), sondern `hist_anker_nachziehen.cjs`.

**Auf-/Abstiegsziel ist verlinkt – in JEDER Liga und auch in der laufenden Saison.** Ein Klick auf
„▲ 1. Bundesliga“ springt in die Zielliga der FOLGEsaison (dorthin ging der Verein). Platzhalter ohne echte
Liga („▼ tiefere Liga“, „⇄ Relegation“, Europaplätze) bleiben bewusst ohne Link.

> **Die laufende Saison rendert woanders** – `loadLeague`, nicht `_renderArchivedSeason`. Sie war deshalb
> zuerst vergessen, obwohl das Archiv schon verlinkt war. Wer hier etwas ändert, muss BEIDE Stellen anfassen.
> Und: `EUROPA_SEED` gilt nur fuer `lid === '1'` – eine Prüfung auf `level === 1` hängt der DDR-Oberliga die
> westdeutschen Startplätze an (gemessen, behoben).

Die Browserprüfung **klickt**, statt nur das Attribut zu suchen: ein `onclick`, das nichts bewirkt, fällt
sonst nicht auf.

---

## Fachthemen – Langfassung in docs/ (vor Arbeit am Thema dort lesen)

**Neues Fachwissen** (Herleitung, Messungen, Herkunft) kommt nach `docs/THEMA.md`, in CLAUDE.md nur eine Zeile in dieser
Tabelle mit der Kurzregel. Eine Themendatei wächst nur um neue Befunde. Ab 250 Zeilen bekommt sie oben eine `## Kurzfassung`
(geltende Regeln, höchstens 20 Zeilen), dann reicht beim Einlesen der Kopf. `manage-v` warnt bei CLAUDE.md über 450 Zeilen
und bei verlinkten docs über 250 Zeilen ohne Kurzfassung.

| Thema | Datei | Nie vergessen |
|---|---|---|
| Historische Vereine | `docs/HISTORIE_VEREINE.md` | s. Projektkontext oben |
| Europapokal-Startplätze | `docs/EUROPAPOKAL.md` | Daten je Saison (`app/europa_data.js`), keine feste Regel; gilt nur für `lid === '1'` |
| Einzelspiele → Rekorde | `docs/EINZELSPIELE.md` | Zuordnung über die Zahlen; ein Spiel zählt nur, wenn BEIDE Vereine die Gegenprobe bestehen; Saison heißt `1999/2000` |
| Ebene 5–8 aus fussball.de | `docs/FBDE_EBENE58.md` | `fe:1` = damals andere Ebene (Schalter, Standard an); unvollständige Saisons stellen keinen Zählrekord |
| Gemeinde/Einwohner, Standort, Dynastien | `docs/STANDORT_STAERKE.md` | nach jeder Koordinaten-/Stadionkorrektur die drei Gemeinde-Befehle wiederholen; je Einstellung ≥ 4 Läufe |
| Aufstiegsrunden, Relegation | `docs/AUFSTIEGSRUNDEN.md` | nie in eine Ewige Tabelle; Gruppenspiel ≠ Duell; Plan rechnet mit `getPromotionInfo` wie die Simulation |
| Tormodell gegen echte Daten | `docs/TORMODELL_PRUEFUNG.md` | nach jeder Änderung `node tools/tor_pruefung.cjs 14` + `node tools/sensation_check.cjs`; Schnitt, Verteilung UND Balance, alle acht Ebenen |
| Karte: Mini-Polygone | `docs/KARTE_NARBEN.md` | drei Erzeuger, überall `MINI_BREITE_M`, metrisch, Breite statt Fläche; `node tools/karte_narben.mjs` |
| Patch-Skripte | `docs/PATCHSKRIPTE.md` | s. Abschnitt unten |

---

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

### Widerspricht der Befund dem Auftrag, ist der Auftrag zu Ende

**Eine erledigte Aufgabe wird nicht eigenhändig erweitert.**

Fast jeder Auftrag steht auf einer Annahme über den Ist-Zustand („X fehlt", „füge X hinzu",
„X ist kaputt"). Ergibt das Nachsehen, dass die Annahme nicht stimmt – es ist längst da, oder
es liegt anders –, dann ist der Auftrag damit **erledigt**: Befund melden, Werkzeuge hinlegen.

Nicht umdeuten. Ein Nebensatz des Prompts ist Kontext, keine Ersatz-Spezifikation, und je
knapper der Prompt, desto weniger trägt er eine Auslegung.

Die Falle dabei: gründliche Arbeit an der falschen Aufgabe sieht von innen aus wie gute Arbeit.
Saubere Messungen, grüne Prüfungen und bestandene Gegenproben bestätigen nur die eigene
Auslegung – gegen sie selbst prüft nichts davon.

> Herkunft (20.09.2026): „schau ob die alten Regionalligen eingebaut sind" – sie waren es. Statt das
> zu melden, wurden die fünf Ligen zu einer mit fünf Staffeln zusammengelegt und unter die
> 2. Bundesliga gehängt, was ihre eigenen Ewigen Tabellen gekostet hätte. Sieben Dateien, nichts
> davon bestellt, alles zurückgerollt. Die Regel „nachfragen ab 3 Stellen" (unten) hätte gereicht –
> sie greift nur nicht, solange man sich seiner Auslegung sicher fühlt.

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

### Fakten selbst nachschlagen, nicht den Nutzer googeln lassen
Fragen zur Vereinsgeschichte (Fusion, Umbenennung, Spielgemeinschaft, Schreibweise) **selbst belegen**: zuerst
`tools/hist_verhaeltnis.json` und `tools/hist_fusion.json`, dann Wikipedia/Websuche. Dem Nutzer **Befund + Quelle +
Vorschlag** vorlegen („laut Wikipedia Fusion 1974 – dein Export sagt Umbenennung, ich lasse Fusion“). Nachfragen nur, wenn
Quellen sich widersprechen oder es Geschmackssache ist.
> Herkunft (11.10.2026): vier Dubletten-Punkte offen zurückgefragt, der Nutzer googelte alles selbst – der Beleg für
> FSG Schiffweiler stand wörtlich längst in `hist_verhaeltnis.json`.

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

## Spiellogik-Kalibrierung: die Langfassung steht in docs/

`docs/SPIELLOGIK_KALIBRIERUNG.md` hält das Teilprojekt v0.8.144–v0.8.151 fest: jeden Schritt mit
Befund und Beleg, **die zehn verworfenen Ansätze mit Zahlen**, die harten Nebenbedingungen des
Nutzers, die drei benannten Modellgrenzen und die offenen Schritte.

**Vor jeder Arbeit am Tormodell oder an den Stärken dort nachsehen** — die Tabelle der verworfenen
Wege spart den größten Teil der Arbeit. Zehn Ansätze wurden gebaut, gemessen und wieder verworfen;
ohne diese Liste probiert man sie erneut.

---

## Ligabetrieb prüfen: Stärke, Titel, Serien, Durchlässigkeit

Neben dem Tormodell gibt es zwei Werkzeuge für alles andere:

| Skript | Was es misst |
|---|---|
| `tools/liga_realismus.cjs` | Meisterpunkte, Titelverteilung, **Drift** und **Durchlässigkeit der Pyramide** – mit `KEY=VALUE` für alle `STR_*` |
| `tools/serien_check.mjs` | Sieg- und Sieglos-Serien gegen echte Bundesligaspiele (openfootball) |

**Zwei harte Nebenbedingungen des Nutzers**, beide gemessen, nicht geschätzt:
- *„nie 0 %. alles ist möglich."* – `sensation_check.cjs`
- *„dass nach 100, 200 Jahren ein Oberligist auf einmal in der Bundesliga spielt, dieser Reiz
  sollte weiterhin seine aktuelle Häufigkeit behalten"* – die Drift-Referenzwerte in
  `liga_realismus.cjs` stammen aus einem **echten Spielstand mit 214 Saisons**. Wer an `STR_*`
  dreht, läuft ihn mit 214 Saisons nach; kürzere Läufe driften weniger und sind nicht vergleichbar.

**Der echte Spielstand des Nutzers ist die beste Messlatte.** Er hat in einem Zug zwei Dinge
entschieden, die sonst falsch gebaut worden wären: die Datenfalle der 55 geteilten Stadien (das
Fritz-Walter-Stadion hängt an vier Vereinen bis hinunter zu einem Achtligisten) und die richtige
Reichweite der Vereinsgröße (nur Liga 1+2, sonst schnürt sie den Aufstiegsweg zu).

---

## Rekorde: gemessen wird aus `seasonResults`

Wer Spielrekorde aus `matchdayHistory` liest, misst im `fastMode` nur die Ebenen 1–4 –
`_applyResult` filtert dort. `fastMode` läuft bei „Restsaison simulieren“ und im MegaSim, also in
genau den Saisons, die niemand durchklickt. `Engine.seasonResults` ist in beiden Modi vollständig.
Gegenprobe: `node tools/rek_check.cjs fast 3` gegen `node tools/rek_check.cjs slow 3` – beide
müssen alle acht Ebenen melden.

---


## Fix-Liste mit Google-Sheet-Spiegel (seit 14.10.2026)

`FIXES_OFFEN.md` ist die Quelle, das Sheet [Bundesliga Fixes – Ist-Stand](https://docs.google.com/spreadsheets/d/1-HxK0Q9Q-qjm7o4RpbuFcUqxggs2JTJpsGyktR9YeYU/edit)
(Drive „Bundesliga HTML") ihr Spiegel, in dem der Nutzer auch vom Handy einträgt. Der Stop-Hook (`node tools/spiegel-fixes.cjs --hook`)
nennt die Schritte: **vor jedem Überschreiben** `Fixes!A:F` lesen und per `--uebernehmen` holen, ✚-Zeilen nie löschen oder umformulieren;
bei neuer Version Changelog gegen offene Punkte (`--seit`, `--geprueft`). Muster und Fallen (de_DE `;`, Apostroph vor jeder Zelle): `docs/fixes-sync/KONZEPT.md`.

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

## Patch-Skripte: `\\` überlebt die Bash-Tool-Zeile NICHT

Ein doppelter Backslash im Bash-Kommando kommt als einfacher an, auch per Heredoc oder `cat > datei`. Patch-Skripte mit dem
**Write-Tool** anlegen und dann aufrufen. Alle Ersetzungen sammeln und EINMAL am Schluss schreiben. Suchanker aus der Datei
kopieren (`game_engine.js` hat Umlaute). Windows-Python: Windows-Pfade statt `/c/...`. Messung: `docs/PATCHSKRIPTE.md`.
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
Das Script patcht VERSION, Titel, Changelog (`app/modal.js`) → baut `index.html` + `bundesliga-vX.X.X.html` → löscht ältere Stände (behält drei) → git commit + push.
> ⚠️ Versionsnummer nie wiederverwenden (Korrektur → nächste Nummer).

### Kein Archiv, aber die DREI aktuellsten Stände bleiben liegen (ab v0.8.96)
Es gibt kein `archive/` mehr. `manage-v` behält die **drei neuesten** `bundesliga-vX.Y.Z.html`
(den gerade gebauten mitgezählt) und löscht alles ältere — `$KeepVersions = 3` in `manage-v.ps1`.
Warum drei, Sortierung, alte Version aus Git zurückholen: `docs/MANAGE_V_ARCHIV.md`.

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
- Changelog steht in `app/modal.js` (grep: `<!-- CHANGELOG -->`), sichtbar in den Einstellungen
- Format: `v0.1.1 (aktuell)` in grün, darunter `• NEU:` / `• FIX:`-Punkte
- manage-v erledigt das automatisch über `-ChangelogPoints`

---

## Neues App-Modul hinzufügen
1. `app/xxx.js` erstellen: `Object.assign(App, { method: function() {...} });`
2. `template.html`: `<script src="app/xxx.js"></script>` einfügen (nie `index.html`, das baut manage-v)
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
