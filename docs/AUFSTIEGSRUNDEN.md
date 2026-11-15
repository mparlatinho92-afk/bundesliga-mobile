# Aufstiegsrunden sind KEINE Liga-Saison

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Aufstiegsrunden, Entscheidungsspiele und Relegation stehen in `app/aufstieg_data.js` und bekommen einen
**eigenen Einstieg** neben den Pokalen (`App.showAufstieg`, `activeLeague '__aufstieg__'`).

> **Nutzerentscheidung 20.09.2026: nichts davon fliesst in eine Ewige Tabelle.** In den Gruppen stehen Vereine
> aus verschiedenen Ligen nebeneinander, und wer dort scheiterte, bekaeme fuer sein Scheitern einen Tabelleneintrag.
> Stattdessen eine eigene Sparte je Verein (`archive.aufstieg[id] = {t, s}`, Teilnahmen/Erfolge), sichtbar im
> Steckbrief und im Bilanz-Reiter. Wer das je aendert, wiederholt genau den Fehler.

**Gruppenspiel ist kein Duell.** 269 Spiele einer Gruppenphase stehen 72 K.-o.-Duellen gegenueber. Nur die Duelle
laufen in die Relegations-Chronik und in `relStats` – sonst staende ein Teilnehmer von 1965 mit sechs
„Relegationen“ neben einem heutigen mit einer. Die Trennung steckt im Datenformat (`du` gegen `gs`), nicht erst
in der Anzeige; `tools/aufstieg_test.cjs --selbsttest` hebelt sie aus und muss durchfallen.

```bash
node tools/wiki_aufstiegsrunden.mjs      # drei Wikipedia-Sammelartikel -> tools/wiki_aufstiegsrunden.json
node tools/wiki_aufstieg_zuordnung.mjs   # Vereins-IDs -> tools/wiki_aufstiegsrunden_ids.json  (--offen zeigt Ungeloeste)
node tools/aufstieg_einbau.mjs           # -> app/aufstieg_data.js
node tools/aufstieg_test.cjs             # Pruefung, Exit 1 bei Befund (--selbsttest muss durchfallen)
```

**Die Zuordnung hat einen Beleg, den die anderen Wiki-Werkzeuge nicht haben:** wer in einer Aufstiegsrunde steht,
stand in derselben Saison in seiner Liga oben – und diese Tabellen liegen vor. 1260 von 1395 Nennungen sind so
belegt. Zwei Aehnlichkeitstreffer waren dadurch nachweislich falsch („SC Union 06 Berlin“ ist nicht der 1. FC Union
Berlin, der spielte zeitgleich in der DDR-Liga). Entscheidungen mit Beleg: `tools/wiki_aufstieg_korrektur.json`.

**Die laufende Simulation speist dieselbe Ansicht.** `processSeasonTransition` spielt drei Entscheidungen
(1.BL/2.BL, 2.BL/3.Liga, Aufstieg zur 3. Liga); `_archiveSeason` schreibt sie in `archive.aufstieg`, also in
dieselbe Sparte wie die Historie, und `_unarchiveSeason` dreht sie beim Loeschen einer Saison zurueck.
In der Chronik stehen gespielte Saisons vor den historischen, mit gruener Kennzeichnung.

> **Die Neufaltung des Seeds darf die gespielten Teilnahmen nicht loeschen.** Deshalb merkt sich
> `archive.aufSeedAnteil`, wie viel aus dem Seed kam; bei neuer Datenversion wird nur dieser Anteil abgezogen.
> Die erste Fassung leerte die ganze Sparte – das haette einen 200-Saison-Stand entkernt.

**Aufstiegsplan der Regionalligen** (`_renderAufstiegPlan`, Reiter „3. Liga"): wer direkt aufsteigt und wer
Relegation spielt, drei Saisons zurueck bis fuenf voraus. Gerechnet wird mit `Engine.getPromotionInfo(offset)` –
**derselben Funktion, die die Simulation benutzt**. Die Regel ein zweites Mal aufzuschreiben, waere der sichere
Weg, dass Plan und Spiel irgendwann Verschiedenes sagen.

**Rekorde der Ligen vor dem Sim-Start** (Nutzerbefund 20.09.2026: „3. Liga / Regionalliga: noch keine Rekorde
erfasst"). Ursache war nicht der Backfill, sondern seine Quelle: `IDBStore.scanSeasonTables` las nur IndexedDB,
und die Vor-Sim-Start-Tabellen der Spiel-Ligen stehen ausschliesslich in HistExt. Gemessen: der Scan lieferte
155 Tabellen aus 3 Ligen, HistExt hielt **289 weitere Liga-Saisons in 20 Spiel-Ligen** bereit. Jetzt mischt
`scanSeasonTables` sie dazu – aber **nur fuer Spiel-Ligen**: rein historische Ligen (h2-*, h3d-*) haben keine
Rekord-Ansicht und wuerden den Spielstand nur vergroessern. Ergebnis: 3 → **23 Ligen mit Rekorden**.

> Bestehende Staende haben den Guard `records.bf` laengst gesetzt und wuerden nie nachziehen – deshalb der
> zweite Guard **`bfx`**, genau wie damals `bfg` fuer die Staffelwertung.

**Was wurde aus dem Meister?** Die Siegerliste zeigt jetzt „▲ aufgestiegen", „▲ ueber die Relegation" oder
„✖ kein Aufstieg" (`_aufstiegAusgang`). Der letzte Fall braucht eine **Begruendung**, sonst steht dort eine
unerklaerte Luecke: die Wikipedia-Artikel tragen sie als Fussnote (`{{FNZ|…}}`), und die werden mitgeerntet –
5 Meister der erfassten Ligen sind nie in ihrer Aufstiegsrunde angetreten (Verzicht, fehlende Lizenz, Reserve).

> **Die Fussnote nennt ihren Verein als SUBJEKT hinter der Rolle** („Der Meister X …", „Die Amateure des X …").
> Den laengsten vorkommenden Namen zu nehmen griff daneben: in „Die Amateure des VfB Stuttgart waren nicht
> aufstiegsberechtigt, dafuer stieg der 1. FC Schweinfurt 05 auf" gewann Schweinfurt. Und „FC Bayern Muenchen"
> ist ein Teilstring von „FC Bayern Muenchen II" – eine Regel „genau ein Treffer" verwirft dann beide.

**Die abgebende Liga muss ihr eigenes Duell sehen.** Nutzerbefund: „die relegation der 3. liga und den
regionalligen zaehlt bloss ab 25/26“. Ursache: die gefalteten Duelle trugen nur die ZIEL-Liga (`lW`), und
`_renderRelegation` / `_leagueHasRelegation` filtern auf `lH`/`lA`/`lW` – also erschien ein Aufstiegsduell nur
bei der Liga darueber, nie bei der Regionalliga, aus der die beiden kamen. Gemessen: 3. Liga 25 Eintraege,
Regionalligen **0**. Die Herkunft steht nicht in der Quelle, laesst sich aber aus den Abschlusstabellen
derselben Saison bestimmen (`herkunft()` in `tools/aufstieg_einbau.mjs`, 335 von 341 vollstaendig) – derselbe
Beleg, der schon die Vereinszuordnung trug. Danach: Suedwest 12, Nord 11, Nordost 10, West 7, Bayern 9.
Nebeneffekt: die Chronik zeigt jetzt das Herkunftskuerzel („Lok Leipzig `RL Nordost` vs SC Verl `RL West`“).

**Die Chronik liest IndexedDB, die Bilanz das localStorage-Archiv.** Das ist der zweite Teil desselben
Nutzerbefunds – und die Falle, in die meine Pruefung lief. `_fillRelegationChronik` holt die Liste ueber
`IDBStore.getRelegation()`; die gefalteten Aufstiegsduelle standen aber nur in `archive.relegation`. Folge in
einem GEWACHSENEN Stand: die Bilanz rechts war voll (sie kommt aus `relStats`), die Liste links zeigte
„1 Saison mit Relegation“. **In einem frischen Stand faellt das nicht auf** – dort ist die Datenbank leer,
der Fallback aufs Archiv greift, und alles sieht richtig aus. Genau deshalb prueft `hist_check.mjs` diese
Stelle jetzt ueber `IDBStore.getRelegation()`, nicht ueber das Archiv.

> Beim Push gilt: je Saison den GESAMTEN Stand aus `archive.relegation` schreiben. Der Schluessel des Stores
> ist die Saison – ein `put` mit nur den Aufstiegsduellen wuerde die Relegation aus dem `RELEGATION_SEED`
> verdraengen. Eigener Guard `archive.aufIdb`, sonst zieht kein bestehender Stand nach.

**Zwei Fallen, beide gemessen:**
- Die Quelle enthaelt die **laufende Saison** (2025/26). Der Einbau laesst alles ab dem Jahr nach der letzten
  `HISTORY_SEED`-Saison weg – sonst staende beim Spielstart schon das echte Relegationsergebnis dieser Saison da.
- Die 27 Saisons des `RELEGATION_SEED` stehen in beiden Quellen. Gegenprobe: **27 von 27 identisch**, keine
  Abweichung. Sie tragen `rs:1` und werden beim Falten uebersprungen, sonst zaehlt die Bilanz sie doppelt.

## Relegation als Teil der Saison (v0.8.233, Nutzer 15.11.2026)

„Relegationsspiele müssten generell schon Teil der Simulation der Saison sein und im Kalender erscheinen … der Relegation fehlt
übrigens das Rückspiel.“ Vorher: EIN Spiel im Saisonwechsel, Unentschieden = Höherklassiger bleibt.
- **Termine** (Kalender v2, `kalV = 2`, `_releTermine`): nach dem späteren Ende der beiden Ligen, Wochentage wie in echt – Bundesliga
  Do/Mo, 2./3. Liga Fr/Di, Regionalliga-Aufstiegsspiele Mi/So. Laufende Altstände (v1) spielen ohne Termine zu Ende; ihr Saisonwechsel
  spielt Hin und Rück nach (`_releErgebnis`).
- **Spiele** (`_releTag`, aus `playNextMatchday`): Paarung beim Hinspiel – dann sind alle Ligen fertig; Zwangsabsteiger/Rückzieher
  (`sonderMeldungen`) sind ausgeschlossen wie im Saisonwechsel (`_zwangJetzt`), sonst spielte die Saison ein anderes Duell (gemessen).
  Heimrecht im Hinspiel: Erstligist (bl), Drittligist (zl), gelost (rl). Gleichstand nach beiden Spielen → Verlängerung + Elfmeter im
  Rückspiel, keine Auswärtstorregel. Archiv wie `RELEGATION_SEED`: „Gesamt (Hin, Rück)[ n.V.| i.E. x:y]“.
- **Anzeige**: Block im Spiel-Feed nur der beteiligten Ligen (ab den letzten drei Spieltagen, vorher „Stand jetzt“), Kalenderzeile
  „Relegation“ (H/R) – die Paarung zeigt der Klick nur, wenn die gewählte Liga beteiligt ist (Nutzer).
- **Rückgängig**: `rollbackReleToMatchday`; dabei behoben: an einem Termin ohne Ligaspiele löschte „Spieltag rückgängig“ die Ergebnisse
  des Spieltags davor.
- **Siegquoten (v0.8.235, Nutzer: „Mischung aus Statistik und Plausibilität“):** echt BL-Relegation Erstligist bleibt 21/27 = 78 %
  (`RELEGATION_SEED`), 2./3. Liga Zweitligist bleibt 6/18 = 33 % (de.wikipedia „Aufstieg zur 2. Fußball-Bundesliga“ 2009–2026); im Spiel
  ohne Zuschlag 55 % / 45 % (der BL-16. ist im Spiel sogar schwächer als der 2.-Liga-Dritte, Ø −2,2). Ziel = echte Quote zur Teamstärke
  gezogen, Gewicht n/(n+10): **72 % / 37 %**, Aufstiegsspiel (gleichklassig, keine Daten) 50 %. Umsetzung `RELE_KLASSE`: Stärkezuschlag nur
  in Relegationsspielen (bl Erstligist, zl Drittligist), geeicht IN der Saison. Falle: Wiederholen am Saisonende unterschätzt die Wirkung.
Prüfung `node tools/relegation_saison_check.cjs 25` (`--kaputt`), Quoten `node tools/relegation_quote_check.cjs 150` (`--kaputt` ohne Zuschlag), Browser `.claude/skills/run/relegation_ui_check.mjs` (`--selbsttest`).
