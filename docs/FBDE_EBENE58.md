# Ebene 5–8 vor dem Sim-Start aus fussball.de (v0.8.192)

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Abschlusstabellen der Spiel-Ligen ab Ebene 5 aus dem Scraper-Projekt des Nutzers (`tabellen.csv` je Verband), 2001/02–2024/25,
826 Liga-Saisons. Vorher hatten die 48 Ligen der Ebenen 6–8 **keine einzige** Saison vor dem Sim-Start.

```bash
node tools/fbde_ebene58.mjs        # Zuordnung Staffel -> Liga, Gegenprobe, Vereine -> tools/fbde_ebene58.json + tools/_dryrun/fbde_bericht.txt
node tools/historie_einbau.mjs     # -> app/history_ext.js (nimmt fbde nach f-archiv und Wikipedia, nur fehlende Saisons)
node tools/fbde_einbau_test.cjs    # Pruefung, Exit 1 (--selbsttest muss durchfallen); Browser: .claude/skills/run/fbde_check.mjs
node tools/einzelspiele_dryrun.cjs && node tools/einzelspiele_einbau.cjs   # DANACH: IDs koennen sich verschoben haben
```

- **Zuordnung ueber den Staffelnamen** (Regeln je Liga und Zeitraum in `REGELN`), unbenannte Staffeln ueber die Vereine der
  Nachbarsaisons. **Staffel ohne Region im Namen** („Bezirksliga | Bezirksliga“): die Region steht in der Spalte `gebiet`
  („Bezirk Vorderpfalz“) – zweiter Namensweg seit v0.8.201, nur bei genau einer Staffel je Gebiet. Bei den Vereinen werden die Namen ohne Jahreszahl/Vereinsform verglichen und wiederholt, bis nichts mehr dazukommt (Ketten wie
  Vorderpfalz 2005–09, seit v0.8.200). **Rundenmodus mit eigener Phase** (fussball.de-Spalte `phase` = Vorrunde/Aufstiegsrunde/
  Qualifikationsrunde, z. B. Bayern Landesliga Nordwest/Nordost 2021/22) wird nur behalten, wenn die Saison ≥ 2 Vorrundengruppen hat. Vorgaenger nur bei eindeutigem Nachfolger (Bayernliga bis 2008, Verbandsliga Saar vor 2012 fehlen bewusst;
  die Saarlandliga gibt es seit 2009/10 unverändert und zählt ab dort).
- **`fe:1` = die Liga spielte damals auf einer anderen Ebene** (vor 2008 alles eine hoeher, Bayern/NRW-Umbau 2012). Nutzer-
  entscheidung: uebernehmen, ein **gemeinsamer Schalter** in Rekorden und Ewiger Tabelle blendet sie aus, **Standard ist
  dazuzaehlen** (`App._feZaehlen`, localStorage `ba_fe_zaehlen`). Ewige Tabelle: Anteil in `archive.histExtFe` (auch Vorgaenger
  anderer Ebene, z. B. Oberliga Westfalen bis 2008 unter 5-10), der Schalter zieht ihn ab. Rekorde: fe-Saisons stehen nie im
  Hauptspeicher, sondern in `records.fe` (`Engine._recordHistExtNachlauf`, Guard `records.bfH` = HistExt-Version), die Anzeige
  mischt sie ein (`App._recFeMisch`, Beleg „frühere Ebene“).
- **Wertung wie in echt:** 2019/20 Quotient (`abbruch`), zurueckgezogene Mannschaften fallen ganz heraus (§ 55a). **2020/21
  annulliert = `an:1`, nur probeweise drin** (Nutzer: „schwierige Frage“) – Schalter `ANNULLIERT_UEBERNEHMEN` im Kopf von
  `tools/fbde_ebene58.mjs`.
- **Unvollständige Saisons stellen keinen Zählrekord** (Nutzer: „mini-rekorde tilgen“): abgebrochen, annulliert und die
  Doppelsaison Bayern 2019–21 zählen bei Punkten/Siegen/Toren/Meisterpunkten nicht (sonst „wenigste Punkte eines Meisters:
  19 aus 7 Spielen“). Ihr Bestwert steht **je Spiel** als kleine Alternative darunter (Slot `q`, `App._recQ`), aber nur, wenn
  er den Rekord je Spiel schlägt. Platzierung und Meisterserien zählen weiter – die Quotientenwertung war amtlich. Bestehende
  Werte aus solchen Saisons entfernt `_recordHistExtNachlauf` und misst über ALLE Tabellen neu (ein Höchstwert lässt sich
  sonst nicht zurücknehmen).
- **Gegenprobe:** jede Tabelle aus ihren Einzelspielen nachgerechnet, 96 % der Zeilen gleich. Die amtliche Tabelle gewinnt
  (Sportgericht); repariert werden nur ganze Staffeln (Tabelle leer -> aus Spielen, U/N vertauscht -> tauschen).

> **Scraper-Lücken: erledigt (v0.8.203).** Die Lücken 2009/10–2011/12 lagen am Bestandsfilter des Scrapers (`schon_da()`,
> 4.365 Staffeln übersprungen) und sind seit den Lieferungen bis 11.10.2026 geschlossen (Briefing mit Abschluss:
> `G:\Meine Ablage\fussball.de\P6_scraper_luecken.md`). Was fussball.de nicht führt, schreibt der Scraper je Verband in
> `nicht_vorhanden.txt` – gegen das Spiel geprüft, einzige echte Lücke ist Verbandsliga Saarland Süd/West 2020/21. Vor 2003/04
> haben Hessen, Württemberg, Niederrhein, Hamburg und Südwest bei fussball.de kein Menü (Grenze der Quelle, nicht des Scrapers).
> Neue Lieferung -> die vier Befehle oben.

**Vereinsnamen von fussball.de** – fuenf Fallen, alle gemessen: Mannschaftsnummer am Ende („Paloma 1.“, „SV Tasmania I“,
„SV Werder 2“ = in Bremen **Werder III**), abgekuerzte Vornamen („Vikt.“, „Germ.“), Stadtstaaten ohne Ort („Concordia“),
Zweitvertretung ohne Zusatz („1.FC Union“ 2001/02 in der Verbandsliga, waehrend Union in der 2. Bundesliga spielte – erkannt
daran, dass der Spielverein in derselben Saison schon woanders steht), Schreibvarianten („Nieder-Roden“, „Türkgücü-Ataspor“ –
zweiter Schluessel ueber den zusammengezogenen Namen). Aehnliche Namen nur bei genau einem Kandidaten, passender Vereinsform und
ohne gleichzeitigen Spielbetrieb; **Fusions-Vorgaenger gesperrt** (`tools/fbde_ebene58_korrektur.json`, `null` = eigene ID).
Mehrere hist-IDs mit gleichem Namenskern („Duisburg 48/99“, „Duisburger SC“, „Duisburger SV 1900“ = Kern „duisburg“): seit v0.8.221
gewinnt die **gleichnamige**, vorher die alphabetisch erste – das legte Vereine in fremde Linien. Alle Fälle: `tools/_dryrun/fbde_mehrdeutig.json`.

## Platzierungsrunden 2021/22 mit „Hauptrunde“-Gruppen (26.10.2026)

Viele Verbaende fuehren die Vorrunden-Gruppen der Corona-Saison 2021/22 mit der Phase **Hauptrunde**, nicht Vorrunde (Sachsen-Anhalt,
Suedwest, Niedersachsen). Der Rundenmodus verlangte bisher zwei Gruppen mit Phase Vorrunde und warf die Meister-, Auf- und
Abstiegsrunden weg – uebrig blieben zwei Gruppen mit je einem Platz 1, und die Ewige Tabelle zaehlte **zwei Titel** (Verbandsliga
Sachsen-Anhalt: Vorrunden-Erster Elster statt Meister Westerhausen). Jetzt: Gruppe = alles, was keine Platzierungsrunde ist
(`istRundeO`: Phase ausser Haupt-/Vorrunde, oder „aufstieg/abstieg/meister“ im Namen; „Quali 1/2“ in Lueneburg sind Gruppen, nur die
Phase Qualifikationsrunde ist eine Runde). Rundentabellen ohne Region im Namen („Abstiegsrunde Landesliga“) ueber das Gebiet, aber
nur zu einer Liga-Saison mit mindestens zwei Gruppen. Rundennamen einheitlich Meister-/Aufstiegs-/Abstiegs-/Qualifikationsrunde wie
`wiki_ebene45.mjs` – der Neuaufbau behaelt nur Namen auf „runde“, sonst zaehlt er 1/2 durch.

Neu im Rundenmodus: 6-1, 6-14, 6-15, 6-22, 7-1, 7-2, 8-1, 8-3, 8-4 (2021/22) und 8-4 (2022/23); gleiche Vereine, Vorrunde Zahl fuer
Zahl wie vorher. Gegenprobe Wikipedia (Oberliga-Artikel 2022/23): Morlautern, Ahlerstedt/Ottendorf, Papenburg, Westerhausen.
Unveraendert: 2020/21 mit zwei Staffeln (abgebrochen/annulliert, keine Runden gespielt) – haengt an der offenen Frage 2020/21.
Pruefung `.claude/skills/run/hist_check.mjs` Punkt 4e3.
