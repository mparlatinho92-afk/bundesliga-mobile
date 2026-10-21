# Torzahlen gegen die Wirklichkeit prüfen (Recherche-Werkzeuge)

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

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

**Zwei Beobachtungen brauchen zwei Regler.** Remisquote (*wie viele*) und 0:0-Quote (*welche
Art*) hängen am selben Mechanismus. Mit nur einem Regler wanderte der Befund zwischen beiden
hin und her – weniger Remis unten heißt automatisch auch weniger torlose. Erst ein zweiter
Regler für die *Richtung* der Korrektur (`GOAL_DRAW_UP_LVL`) löste beides gleichzeitig. Wenn
ein Befund beim Nachjustieren nur den Platz wechselt statt zu verschwinden, fehlt ein
Freiheitsgrad – dann ist Weiterdrehen am selben Knopf verlorene Zeit.

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
