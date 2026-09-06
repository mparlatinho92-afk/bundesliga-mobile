> ## Wozu diese Datei
>
> Sie hält das Teilprojekt **„Spiellogik gegen die Wirklichkeit kalibrieren"** fest: v0.8.144 bis
> v0.8.151, ausgelöst von einem einzigen Nutzerbefund über zu hohe Ergebnisse.
>
> Sie ist **kein Änderungsprotokoll** — das steht im Changelog. Hier steht, *warum* jede Entscheidung
> so ausfiel, **womit sie belegt ist**, und vor allem: **was nicht funktioniert hat**. Zehn Ansätze
> wurden gebaut, gemessen und wieder verworfen. Ohne diese Liste probiert sie jemand erneut — ich
> selbst eingeschlossen, in ein paar Wochen.
>
> Die Kurzfassung der Regeln steht in `CLAUDE.md`, die Modellbeschreibung im Code bei `_goalRates`.

# Spiellogik-Kalibrierung (v0.8.144 – v0.8.151)

## Der Anlass

> „es gibt ein bug bei hohen ergebnissen. bei oberligen ist ein 16:0 möglich. bei unteren ligen nur
> 8:0 oder 9:0 und meist nur im ersten sim-jahr"

Darin steckten **zwei voneinander unabhängige Fehler**, und der zweite hatte mit Toren nichts zu tun.

**(1) Das Tormodell** war zu torreich und hatte die falsche Verteilung. Das 16:0 landete in den
Oberligen nicht, weil dort die Rate höher wäre — sie steigt nach unten —, sondern weil dort mit
38.000 Spielen je Saison am häufigsten gewürfelt wird. Das Extrem sitzt, wo die meisten Würfe fallen.

**(2) „meist nur im ersten Sim-Jahr"** war ein eigener Bug: `_recordSeason` las die Spielrekorde aus
`snap.matchdayHistory`, und die filtert `_applyResult` im `fastMode` auf Ebene ≤ 4. `fastMode` läuft
bei „Restsaison simulieren" und im MegaSim — also überall außer beim Durchklicken. Ab der Oberliga
abwärts entstand nie ein Rekord, außer in durchgeklickten Saisons. Behoben in v0.8.144 durch Lesen
aus `Engine.seasonResults` (in beiden Modi vollständig, trägt IDs statt Namen, undo-fest).

---

## Die Messgrundlage

Ohne echte Zahlen wäre das Ganze Geschmackssache geblieben. Alle Werte stammen aus zwei Quellen:

| Quelle | Umfang | Was daraus kommt |
|---|---|---|
| **FuPa-API** | 1421 deutsche Herrenligen, Ebene 1–11, Saison 2025/26 | Torschnitt (195 Abschlusstabellen), Einzelergebnisse (188 Ligen, 40.500 Spiele), Remis-/Heimsiegquote |
| **openfootball** | Ebene 1–4, bis 16 Saisons | Langfristwerte für Torschnitt, Verteilung und Balance |
| **Spielstand des Nutzers** | 214 gespielte Saisons | Drift-Verteilung und Durchlässigkeit der Pyramide |

**Die Einzelergebnis-Route der FuPa-API ist nicht zu erraten** und kostete eine Runde Suchen im
Lazy-Chunk des Frontends:

```
v1/competitions/<slug>/seasons/<2025-26|current>/matches?sort=desc&limit=100&offset=N
```
Felder `homeGoal`/`awayGoal`, max 100 je Seite. `?competition=<slug>` gibt es **nur** für
`/standings`; auf `/matches` antwortet jede Query-Form mit `No profile for the specified request
found`. Gefunden über den Webpack-Chunk-Katalog im `runtime.*.js` (119 Hashes, alle laden, nach
Pfad-Literalen greppen) — die im HTML verlinkten sieben Chunks enthalten die Route nicht.

### Vier Quellenfallen

1. **Auslandsligen.** FuPa führt Luxemburg und Zürich auf denselben Ebenen. Ohne Regionsfilter sprang
   Ebene 3 von 3,21 auf 3,57 Tore.
2. **Einzelsaison ≠ Langfrist.** Für Ebene 1–4 gilt immer der Langfristsatz. FuPa 2025/26 meldet für
   die Regionalliga 40,8 % Heimsiege — niedriger als jede andere Ebene inklusive Bundesliga.
   Langfristig sind es 42,1 %. Eine Prüfung gegen die Einzelsaison jagt Rauschen.
3. **Wikipedia-Infoboxen** sind bequem und teilweise falsch (eine Liga meldete 1215 Tore in 220
   Spielen). Unterhalb Ebene 6 gibt es dort nichts.
4. **Gesperrte Quellen:** weltfussball.de, kicker.de, fussballdaten.de, football-data.co.uk und
   transfermarkt liefern 403/503/302. Nicht erneut probieren.

### Die Werkzeuge

| Skript | Zweck |
|---|---|
| `tools/torschnitt_fupa.mjs` | Torschnitt je Ebene aus Abschlusstabellen (Ebene 1–11) |
| `tools/torverteilung_fupa.mjs` | Verteilung + Remis/Heimsieg aus Einzelergebnissen (Ebene 1–11) |
| `tools/torverteilung_real.mjs` | dasselbe aus openfootball (Ebene 1–4, Langfrist) |
| `tools/tor_hist.cjs` | Verteilung aus der Engine, spaltengleich |
| `tools/tor_kalib.cjs` | alles nebeneinander, Parameter per `KEY=VALUE` |
| **`tools/tor_pruefung.cjs`** | **Prüfung mit Exit-Code**: Torschnitt, 0:0, Schwanz, Balance |
| **`tools/sensation_check.cjs`** | **Prüfung mit Exit-Code**: nichts strukturell unmöglich, kein Deckel |
| `tools/liga_realismus.cjs` | Punkte, Titel, Drift, Durchlässigkeit der Pyramide |
| `tools/serien_check.mjs` | Sieg-/Sieglos-Serien gegen echte Bundesligaspiele |
| `tools/staerke_effekt.cjs` | schlagen die Stärkewerte durch? |
| `tools/pokal_effekt.cjs` | dasselbe für Pokal und Testspiele nach Ebenen-Abstand |
| `tools/rek_check.cjs` | Rekord-Gegenprobe `fast` gegen `slow` |

Beide Prüfungen haben ein `--selbsttest`, das absichtlich durchfällt.

---

## Chronologie

### v0.8.144 — Niveau kalibriert, Rekord-Bug behoben

**Befund.** Torschnitt lag ab der 3. Liga 0,6–1,0 Tore zu hoch (Ebene 8: 5,07 statt 4,34). Die alte
Formel `2,8 + 0,028 je Stärkepunkt` lief von Ebene 1 an linear hoch.

**Änderung.** Niveaukurve mit Knick an der Amateurgrenze (`GOAL_KNEE`, `GOAL_STEP`, `GOAL_LEVEL`).
Ermüdungsbremse `_torZiehung`: jedes Tor ab dem 5. überlebt nur mit `GOAL_FADE`. Kein Deckel — der
alte Cap 9 war eine Wand, hinter der sich alles auf einer Zahl stapelte.

**Rekorde:** `_recordSeason` liest aus `seasonResults`. Gegenprobe: `rek_check.cjs fast 3` meldete
vorher nur Ebene 1–4, danach alle acht.

### v0.8.145 — der Schwanz kippt mit der Ebene das Vorzeichen

**Befund.** Die feste Bremse aus v0.8.144 machte die unteren Ligen **um Faktor 25 zu brav**. Real
fiel 2025/26 ein **16:0 in der Verbandsliga**, ein 17:0 in der Kreisliga A, ein **21:0 in der
Kreisliga B**. Poisson ist oben zu fett und unten zu dünn.

**Änderung.** `GOAL_FADE_LVL`: Bremse voll oberhalb der Amateurgrenze, ab Ebene 6 gar keine mehr.

> **Merksatz:** nie nur die Bundesliga messen. Derselbe Fehler kann mit der Ebene das Vorzeichen
> wechseln.

### v0.8.146 — Aufteilung, Einbruch, und zwei stille Nachbarn

**Befund.** Zu viele Spiele mit 6–7 Toren, zu wenige mit 10+. Die 0:0-Quote stimmte dagegen auf allen
Ebenen — normale Spiele waren also richtig, es fehlten nur die Zusammenbrüche.

**Änderung.** `GOAL_SPLIT` ebenenabhängig (oben eng, unten breiter) und der **Einbruch-Würfel**
`GOAL_CRASH`: unterhalb der Grenze bricht selten eine Mannschaft ganz weg.

**Der Selbstschaden.** `GOAL_SPLIT` verschob still den Heimvorteil (43 → 40 %) und die Remisquote
(vier Punkte zu hoch). Beides erst durch die Balance-Gegenprobe aufgefallen. `GOAL_HOME` ist seitdem
eine benannte Konstante statt einer hartkodierten 3.

### v0.8.147 — U-Kurve, schwächere Seite, „nie 0 %"

**Befund 1.** Die Niveaukurve ist **U-förmig**: Bundesliga 3,04, 3. Liga 2,73 als tiefster Punkt,
dann aufwärts bis 4,34. Ein Knick allein ließ die Bundesliga 0,2 zu tief liegen.
→ dritter Abschnitt `GOAL_TOP` / `GOAL_TOP_LVL`.

**Befund 2.** Bremse und Einbruch hingen am **Schnitt** beider Stärken. Ein Bundesligist gegen einen
Sechstligisten hat Schnitt 74 — über der Amateurgrenze. Ausgerechnet die Paarung, in der real ein 8:0
fällt, bekam die volle Profi-Bremse: **der DFB-Pokal kam über 12 Saisons nie über 7 Tore hinaus.**
→ beides hängt jetzt an der **schwächeren Seite**. Tore fallen gegen eine Abwehr, nicht gegen einen
Mittelwert.

**Befund 3 (Nutzer).** „nie 0%. alles ist möglich." Die gemeldeten 0,0 % Sensationen waren eine
**Stichproben-Null** (28 Partien bei ~3 % Quote). Direkt gemessen: 0,9 %, und selbst Ebene 1 gegen
Ebene 8 in später Runde 0,154 %.
→ `sensation_check.cjs` prüft seitdem mit Exit-Code, dass der Außenseiter überall gewinnen kann
**und** dass nirgends ein Deckel sitzt. Ein Deckel ist am Höchstwert nicht zu erkennen, nur daran,
dass sich Ergebnisse auf einer Zahl stapeln.

### v0.8.148 — aus der Messung wird eine Prüfung

**Befund.** Die Kalibrierung war vier Versionen lang eine Messung, die jemand einmal gemacht hatte.
Zweimal war dabei etwas durchgerutscht und erst eine Version später aufgefallen.

**Änderung.** `tor_pruefung.cjs` mit Exit-Code und Selbsttest. Sie fand beim ersten Lauf sofort vier
Sachen — darunter zu viele torlose Remis (Ebene 1: 7,2 % gegen real 5,7 %) und **falsche Zielwerte
von mir** (Balance aus einer Einzelsaison statt Langfrist).
→ `GOAL_DRAW_UP`: die Remis-Korrektur zieht zu 70 % nach oben (1:0 → 1:1) statt 50:50.
→ `GOAL_STEP_W`: der Sprung an der Amateurgrenze wird über fünf Stärkepunkte eingeblendet, weil die
Regionalliga *auf* der Grenze liegt und sonst zweigipflig wird.

> **Toleranzen für Quoten müssen statistisch sein.** Der Zielwert hat selbst eine Unsicherheit:
> „1,57 % Spiele mit 6+ Toren" in der Regionalliga sind 23 Fälle aus 1464 Spielen, ±20 % allein im
> Ziel. Eine pauschale 45-%-Grenze meldete daraus einen Befund, wo 1,5 σ lagen.

### v0.8.149 — Vereinsgröße

**Befund.** `calculateStrengths` hatte für Ligavereine **keinen vereinseigenen Anteil**. Im Spielstand
des Nutzers standen nach 214 Saisons 13 von 18 Bundesligisten auf **Stärke 98** — Bayern auf Rang 11,
gleichauf mit einem Verein aus einem 2.500-Plätze-Stadion. Folge: 28 verschiedene Meister in 100
Saisons (real 8 in 30), längste Titelserie 2 (real 11), Tabelle gestaucht.

**Änderung.** `_vereinsGroesse()` aus `venues[].kapazitaet` (1228 von 1262 Vereinen).

**Ergebnis:** Meister 62,6 → 68,2 Punkte, Letzter 29,3 → 23,6, Abstand 33,4 → 44,6 (real ~51),
Rekordmeister 85 Titel in 214 Saisons.

### v0.8.150 — Form

**Befund.** Nach der Vereinsgröße fehlten noch die langen Siegserien: ab 6 Spielen 8,3 % gegen real
12,5 %. Zu viele kurze, zu wenige lange — die Signatur fehlender Persistenz.

**Änderung.** `_form()` als **zustandslose** Funktion aus `(teamId, seasonSeed, Spieltag)`, geglättetes
Wertrauschen. Kein Save-Format-Wechsel, undo-fest, kein Speicherzuwachs im MegaSim. Gemessene
Persistenz: Korrelation 0,94 über einen Spieltag, 0,27 über fünf, 0,05 über zehn.

**Die Sicherung:** Form wird aus der bestehenden Tagesform **herausgeschnitten**, nicht addiert.
`STR_FORM_SLOW = 0` reproduziert exakt den Stand davor. Gilt in Liga, beiden Pokalen und Testspielen;
im Pokal aus dem rundeneigenen Rauschen, damit die Sensationsquote nicht mitwandert.

**Ergebnis:** Siegserien ab 6 Spielen 8,3 → 12,4 % (real 12,5).

### v0.8.151 — Remis je Ebene, und ein verworfener Schritt

**Befund.** Real fällt die Remisquote steil von 24,4 % (Bundesliga) auf 16,7 % (Bezirksliga), im
Modell blieb sie mit festem `GOAL_DRAW` zu flach (23,6 → 19,8).

**Änderung.** `GOAL_DRAW_LVL` für die **Menge** und `GOAL_DRAW_UP_LVL` für die **Richtung**.

> **Zwei Beobachtungen brauchen zwei Regler.** Remisquote (*wie viele*) und 0:0-Quote (*welche Art*)
> hängen am selben Mechanismus. Mit nur einem Knopf wanderte der Befund zwischen beiden hin und her.
> Wenn ein Befund beim Nachjustieren nur den Platz wechselt statt zu verschwinden, fehlt ein
> Freiheitsgrad — dann ist Weiterdrehen am selben Knopf verlorene Zeit.

---

## Verworfene Wege — mit Zahlen, damit sie niemand erneut probiert

| Ansatz | Warum verworfen |
|---|---|
| **Gerade über alle acht Ebenen** (2,74 + 0,0193/Punkt) | Traf Ebene 1 und 5–8 auf ±0,1, lag in der Halbprofi-Delle aber **0,67 daneben** (3. Liga 3,40 statt 2,73) |
| **Knick ohne oberen Ast** | 3. Liga passte, dafür lag die Bundesliga 0,2 zu tief und brachte über 25 Saisons **kein einziges 8:0** mehr zustande |
| **Feste Ermüdungsbremse** über alle Ebenen | Machte die unteren Ligen **Faktor 25 zu brav** (Ebene 6: 0,016 % Spiele mit 10+ Toren statt real 0,407 %) |
| **Breiterer Streufaktor** statt Einbruch-Würfel | Hätte *alle* Spiele wilder gemacht und die 0:0-Quote zerstört, die auf allen Ebenen bereits stimmte |
| **Vereinsgröße gegen die STARTebene** gerechnet | **Förderband:** Ebene 4/5/6 erreichten die Bundesliga 14/10/5-mal statt 1/0/0. Ein Verein mit 10.500 Plätzen ist groß für die Oberliga und schleppte den Bonus mit nach oben |
| **Symmetrische Kappung der Größe** | 500-Plätze-Vereine wurden Dauerkeller; Aufstieg Ebene 4 → 3 fiel von 61 auf 23 |
| **Größe bis in die Regionalliga** (`STR_IDENT_LVL` 0,34) | Kostete den Reiz: Ebene 6 → 2. Liga fiel von 2 auf 0. Die Großen belegten die Aufstiegsplätze |
| **`STR_IDENT` 13 → 20** | Kleiner Gewinn bei Siegserien, **größerer Verlust** bei sieglosen (ab 10 Spielen 20,3 % statt 16,3 %, längste 30 statt 22). Die frühe Messung dafür stammte von *vor* der Remis-Korrektur |
| **Tagesform senken**, um die Titel-Lotterie zu beheben | `STR_FORM` von 20 auf 9 ändert den Meister um **0,1 Punkte**. Die Poisson-Ziehung selbst dominiert |
| **`GOAL_SPLIT` 19/22** gegen den Regionalliga-Ausreißer | Bewegt ihn nicht |

---

## Harte Nebenbedingungen des Nutzers

Beide sind gemessen, nicht geschätzt, und beide haben eine Version verändert.

**1. „nie 0 %. alles ist möglich."**
Ein strukturell unmögliches Ergebnis entscheidet den Wettbewerb, bevor er gespielt wird — derselbe
Fehler wie der alte Cap 9, eine Ebene höher. `sensation_check.cjs` prüft es mit Exit-Code.

**2. „dass nach 100, 200 jahren ein oberligist auf einmal in der bundesliga spielt, dieser reiz
sollte weiterhin seine aktuelle häufigkeit behalten."**
Referenz ist der Spielstand des Nutzers nach 214 Saisons. Die Drift-Verteilung muss sich decken:

```
        -4    -3    -2    -1     0    +1    +2    +3    +4   ligalos
real     2    10    46   168   373   136    52    12     4     196
jetzt    2    12    48   160   364   159    59     5     2     188
```

> **Der echte Spielstand ist die beste Messlatte.** Er hat in einem Zug zwei Dinge entschieden, die
> sonst falsch gebaut worden wären: die Datenfalle der geteilten Stadien und die richtige Reichweite
> der Vereinsgröße.

### Datenfalle: 55 geteilte Stadien

Das Fritz-Walter-Stadion (49.327 Plätze) ist **vier Vereinen** zugeordnet: 1. FC Kaiserslautern
(Ebene 2), dessen Reserve, VfR Kaiserslautern (Ebene 6) und TSG Kaiserslautern (Ebene 8). Insgesamt
55 Spielstätten, 29 betroffene Nicht-Reserven. Ohne Gegenmaßnahme wäre ein Achtligist der größte
Verein der Republik. **Regel:** die Kapazität zählt nur für den Verein, der dort zu Spielbeginn am
höchsten spielt. Dieselbe Falle wie in der Stadion-Pipeline: *gleicher Ort ist nicht gleicher Verein.*

---

## Bekannte Modellgrenzen

Sie stehen als `AUSNAHMEN` in `tor_pruefung.cjs` **beim Namen** und werden gemeldet, ohne die Prüfung
rot zu färben. Das ist bewusst so herum: die Toleranz dafür aufzuweichen würde auch echte
Verschiebungen durchlassen.

| Grenze | Grund |
|---|---|
| **Ebene 1–3 als Band** | Im Modell ein flaches Band, real liegt die Bundesliga über ihren Nachbarn (3,04 gegen 2,79/2,73). Das U fängt kein Knick |
| **Ebene 8** | Unterste Ebene, kein Zufluss von weiter unten; Stärkespanne enger als real |
| **Ebene 4 (Regionalliga)** | Liegt *auf* der Amateurgrenze, ihre Paarungen straddeln den Torsprung. Drei Ursachen ausgeschlossen (Aufteilung, Vereinsgröße, Übergangsbreite); der Zielwert steht auf 23 Fällen |

---

## Erreichter Stand

```
Ebene | Tore/Spiel   (real) |    0:0  (real) |   Remis  (real) |  Heim  (real)
    1 |   3,13 (3,04) |   5,7 (5,7) |   24,7 (24,4) |  45,3 (44,7)
    2 |   2,92 (2,79) |   7,3 (7,1) |   27,5 (27,7) |  42,6 (42,6)
    3 |   2,81 (2,73) |   7,4 (7,7) |   28,1 (27,0) |  43,1 (42,6)
    4 |   3,04 (3,04) |   6,2 (6,1) |   26,1 (24,2) |  43,3 (42,1)
    5 |   3,67 (3,66) |   3,2 (3,7) |   20,1 (19,4) |  47,3 (45,7)
    6 |   3,89 (3,87) |   2,8 (2,9) |   19,6 (18,6) |  47,2 (46,2)
    7 |   4,10 (4,04) |   2,3 (2,6) |   18,1 (17,6) |  48,7 (47,2)
    8 |   4,32 (4,34) |   1,8 (2,2) |   17,3 (16,7) |  48,7 (47,6)

Meister Ø 68,5 Punkte (real ~72) · Letzter 23,1 (real ~21) · Abstand 45,4 (real ~51)
12 verschiedene Meister in 214 Saisons · Rekordmeister 76 Titel · längste Titelserie 5
Siegserien ab 6 Spielen 12,4 % (real 12,5) · DFB-Pokal erreicht 8–9 Tore bei großem Abstand
```

---

## Offene Schritte

**1. Zu viele kurze Siegserien.** Ab 3 Spielen 67 % gegen real 55 % — der letzte klare Ausreißer.
Mit und ohne Form gleich, also keine Frage der Persistenz. Die Spur zeigt auf **fehlende richtig
schwache Mannschaften**: eine Liga mit wenigen sehr starken und mehreren sehr schwachen hat *weniger*
Dreierserien (die Schwachen schaffen sie nie) und *mehr* lange. `STR_IDENT` ist dafür **nicht** der
Hebel (siehe verworfene Wege) — es müsste etwas sein, das nur das untere Ende der Liga spreizt.

**2. Sieglose Serien 2,7 Punkte zu lang.** Preis der Form: sie wirkt symmetrisch, defizitär war nur
eine Richtung. Eine asymmetrische Form wäre denkbar, aber ad hoc — erst messen, ob sich Punkt 1 und 2
gemeinsam lösen lassen.

**3. Längste Titelserie 5 statt 11.** Bayerns Elferserie ist auch real ein historischer Ausreißer.
Vor einer Änderung prüfen, ob 5 nicht schon richtig ist — die Zahl der verschiedenen Meister (12 in
214 Saisons) passt bereits zur Bundesliga-Ära (12 in 62).

**4. Amateurpokal als Zufluss für die Bodenligen.** Vom Nutzer ausdrücklich vertagt („tiefer
Einschnitt, ich weiß nicht ob ich es überhaupt will"). Als Feature entscheiden, nicht als Bugfix.
Hängt mit der Modellgrenze „Ebene 8" zusammen.

**5. Verbandspokal.** Wird nicht ausgespielt (`_simulateVerbandCup` erzeugt nur Sieger). Sobald er
Runden bekommt, erbt er das Tormodell ohne eine Zeile Extra.

---

## Wie man weitermacht

Nach **jeder** Änderung an `GOAL_*` oder `STR_*`:

```bash
node tools/tor_pruefung.cjs 14           # Torschnitt, 0:0, Schwanz, Balance   (Exit 1 = Befund)
node tools/sensation_check.cjs           # nichts unmöglich, kein Deckel        (Exit 1 = Befund)
node tools/liga_realismus.cjs 214        # Titel, Drift, Durchlässigkeit
node tools/serien_check.mjs 40           # Sieg-/Sieglos-Serien
```

Bei `STR_*` **immer beides**: `liga_realismus` (Durchlässigkeit ist die harte Nebenbedingung) *und*
`tor_pruefung` (die Stärkespreizung ist die Grundlage der Torkalibrierung). Bei `GOAL_SPLIT`
zusätzlich an Heimvorteil und Remisquote denken — die wandern still mit.

Die Gegenproben nicht vergessen: `--selbsttest` bei beiden Prüfungen muss **Exit 1** melden.

---

## Die wiederkehrenden Lehren

1. **Ein stimmender Mittelwert sagt nichts über die Verteilung.** Dreimal in diesem Teilprojekt
   aufgetreten — bei Toren, bei Serien, bei Remis.
2. **Der Fehler kann mit der Ebene das Vorzeichen kippen.** Nie nur die Bundesliga messen.
3. **Ein Modellknopf zieht stille Nachbarn mit.** `GOAL_SPLIT` verschob Heimvorteil und Remisquote.
4. **Eine gemeldete Null ist oft eine Stichproben-Null.** Vor jedem „das passiert nie": wie viele
   Fälle wären überhaupt zu erwarten? Unter drei ist die Zahl keine Aussage.
5. **Eine einmalige Messung hält nicht.** Erst die Prüfung mit Exit-Code fand die vier Sachen, die
   vier Versionen lang durchgerutscht waren.
6. **Wenn ein Befund beim Nachjustieren den Platz wechselt statt zu verschwinden, fehlt ein
   Freiheitsgrad.**
7. **Bekannte Grenzen benennen, nicht wegtolerieren.** Sonst lässt die Prüfung auch echte
   Verschiebungen durch.
