# Historische Vereine: Zuordnung, Fusionen, Nachfolger

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

> Die historischen Ligen Ebene 2–3 sind optional (`typeof HistExt`-Guard): headless-Werkzeuge ohne sie laufen
> unverändert. Wer sie mitprüfen will, lädt zusätzlich `app/history_ext.js` + `app/hist_ext.js` und wartet auf
> `Engine._seedHistoryExt()` – so macht es `node tools/historie_einbau_test.cjs` (mit `--selbsttest`).
> Neu erzeugen: `node tools/historie_dryrun.mjs && node tools/wiki_ebene45.mjs && node tools/historie_einbau.mjs` (Details `docs/HISTORIE_DRYRUN.md`).
> Dubletten/Umbenennungen prüfen: `node tools/hist_dubletten.mjs` → Bericht + `tools/hist_dubletten.html` (Seite zum
> Entscheiden, JSON-Export; zweiter Bereich „Zuordnung nur über den Ort“ = Quellnamen, die nur per Ort an einem
> Spielverein hängen, Export nach `tools/farchiv_vereine_korrektur.json`; Wikipedia-Recherche dazu `node tools/hist_ort_recherche.mjs`,
> Regeln in `docs/HISTORIE_DRYRUN.md`); gepflegt werden `tools/hist_alias.json` (Umbenennung), `tools/hist_schreibweise.json`
> (gleiche ID, kein damaliger Name), `tools/hist_fusion.json` (Vorgänger behalten eigene IDs, Steckbrief + Ligaverlauf
> verbinden sie, Ewige Tabelle bleibt getrennt) und `tools/hist_alias_getrennt.json`. **Ausgründung** (Fußballabteilung wird eigener
> Verein: SC → FC 1965/66, Heidenheimer SB → 1. FC Heidenheim 2007) ist technisch Umbenennung (eine ID), wird aber benannt:
> `tools/hist_ausgruendung.json` → „Ausgründung JAHR aus VON“ unter VEREINSNAMEN (Nutzer 18.10.2026), Prüfung
> `.claude/skills/run/ausgruendung_check.mjs`. Ein Alias-Schlüssel `"Name|Jahr"` gilt nur für diese Saison (Lok Dresden 1963/64 = BSG Lok,
> ab 1965/66 = FSV Lok), `"Name|Jahr|Liga"` nur für diese Tabelle (Lok Stendal 1988/89: Reserve in der Bezirksliga, die Erste in der
> DDR-Liga heißt in der Quelle genauso). Export einarbeiten:
> `node tools/hist_dubletten.mjs --uebernehmen <export.json>`, danach `historie_einbau.mjs`. **Reserve-Zusätze (seit
> v0.8.197):** A / Am. / Amat. werden zu „Amateure“ ausgeschrieben und stehen als **damaliger Name**, solange die Quelle sie
> so nennt; danach gilt der heutige Name mit II (Nutzer: „amateure heißen amateure wenn es damals so war. sonst wurden sie zu
> II umbenannt“). Eine Quellschreibung aus `hist_schreibweise.json` („Hertha Berlin A“ 1999/2000) bekommt den heutigen
> Grundnamen („Hertha BSC Amateure“), keinen eigenen damaligen Namen. Mobil kürzt `_fitTeamNames` zuerst nur „Amateure“ → „Am.“ (`.claude/skills/run/amateure_check.mjs`).
> **SSV Jeddeloh II ist die erste Mannschaft** (Ortsteil Jeddeloh II), keine Reserve; FC Internationale 1980 II spielt
> seit 2023/24 wirklich auf derselben Ebene wie die Erste (immer andere Staffel) – Sonderregel `nachbarStaffel:true`
> (Nutzer: „nie eine ebene drüber, nie selbe staffel“): `_darfAufsteigen` + `_nachbarStaffelRegel` (nach `rebalanceBerlin`),
> Prüfung `node tools/nachbarstaffel_test.cjs` (mit `--selbsttest`).
> **Seed-IDs (HISTORY_SEED, DDR-Oberliga) erreicht `hist_alias` nicht.** Sie kommen nur über `REMAP` in `tools/historie_einbau.mjs` zum
> heutigen Verein, und zwar vollständig nur so: IDs in den Seed-Tabellen von `app/history_data.js` tauschen + `HISTORY_SEED.version`
> erhöhen (v11/v13/v14/v15) – sonst sehen Steckbrief und Ligaverlauf die Saisons nicht. Hat das Ziel eigene Seed-Zeilen oder mehrere
> Quell-IDs (Seed v14: Anker 1949 + Motor Wismar 1951), kommt die ID in `REMAP_HN` und der damalige Name saisongenau in
> `HISTORIC_NAMES` – sonst hieße Dynamo Dresden bis 1963 „SV Deutsche Volkspolizei“. Prüfung `.claude/skills/run/ddr_seed_check.mjs`.
> `historie_einbau.mjs` meldet **WARNUNG**, wenn ein Eintrag in `hist_alias`/`hist_schreibweise` keinen Quellnamen mehr
> trifft (neue Scraper-Lieferung schreibt anders) oder auf eine fehlende ID zeigt – nach jeder Lieferung lesen.
> Browserprüfung: `.claude/skills/run/fusion_check.mjs`.
> **DDR-Vereine (seit 14.10.2026):** `node tools/wiki_ddr_ewig.mjs` verbindet IDs über die Ewigen Tabellen (DDR-Oberliga, DDR-Liga,
> II. DDR-Liga, Bezirksliga Neubrandenburg; Zeile = ein Verein, inkl. Fußnoten und „Empor/MR/TSG“-Formen) plus die Umbenennungen
> 1990 von fussball-ddr.de (`tools/ddr_umbenennungen_1990.json`) → Vorschlag `tools/_dryrun/wiki_ddr_ewig_export.json` für
> `--uebernehmen`. Nur gleiche Namen, gesperrt bei gemeinsamer Saison/Fusion/`_nv`. Endet eine Linie nur über den Artikel bei einem
> Fusionsverein, wird es Fusion (`ARTIKEL_FUSION`, Arnstadt 2009, Bitterfeld-Wolfen 1991). Den Rest: Entscheidungsseite, Haken „nur DDR“.
> Zweite Quelle: `node tools/fddr_saisons.mjs` (472 Saisonseiten fussball-ddr.de: Oberliga, DDR-Liga, 15 Bezirksligen 1963–91, Cache
> `%TEMP%/fddr_cache`) → `node tools/fddr_umbenennungen.mjs` liest die Vermerke unter den Tabellen (Umbenennung, Ausgründung = Umbenennung,
> Anschluss/Eingliederung/Fusion = Fusion). Zeilen über S/U/N/Tore an unsere IDs, Namen nur eindeutig, alter Name ohne Ort („BSG Motor“) bekommt
> den Ort des neuen. Steht einer der beiden Namen in keiner Tabelle, kommt er **vorsorglich** nach `tools/hist_alias_vorsorge.json` (wirkt wie
> hist_alias, keine WARNUNG „tot“; Nutzer: „die umbenennung ist schonmal in der ID gespeichert, falls doch“).
> **Nachfolger außerhalb des Spiels (seit v0.8.217):** `tools/hist_nachfolger.json` (ID → art heute/umbenannt/Nachfolger/aufgegangen/Fusion,
> name, jahr, aufgeloest, beleg) → `HIST_EXT.nachfolgerExtern` → Schlusszeile unter VEREINSNAMEN „(nicht im Spiel)“ (Nutzer: „nicht genutzte
> nachfolger werden trotzdem in der historie im steckbrief erwähnt“). Vorschläge aus der letzten Spalte der Ewigen Tabellen: `wiki_ddr_ewig.mjs`
> → `tools/_dryrun/hist_nachfolger_vorschlag.txt`; hat der heutige Verein eine ID, steht er dort unter „Verbindung prüfen“ und gehört in
> hist_alias/hist_fusion, nicht in die Nachfolger-Datei. Fusions-Vorgänger überspringt der Einbau (sie zeigen „AUFGEGANGEN IN“).
> BRD/alle Ären: `node tools/wiki_brd_nachfolger.mjs --ebene N` (`--gegenprobe` an den bekannten Fällen) sortiert IDs ohne Anschluss
> über Wikipedia in VERBINDUNG/EXTERN/BESTEHT → `tools/_dryrun/brd_nachfolger.txt`. Nur Vorschläge: Satz-Treffer nennen oft einen
> Spielverein bloß nebenbei, jede Zeile am Artikel prüfen (`--ebene 2` erledigt am 16.10.2026, Ebene 3 in v0.8.222, Ebene 4 in v0.8.225,
> Ebene 5–8 am 17.10.2026; übrig sind IDs ohne Artikel). Saisons in den heutigen Spiel-Ligen tragen das Gebiet „heute“, nicht „BRD“ – ohne sie
> fand `--ebene 8` nur 3 statt 1.303 Vereine. Bei Ebene 5–8 sind die meisten Treffer frühere Namen heutiger Spielvereine: je Paar erst auf
> gemeinsame Saisons prüfen (gemeinsame Saison = Fusion, nicht Umbenennung).
> **Mehrere Fusionen je Nachfolger:** `hist_fusion.json` kennt seit 17.10.2026 `jahrJe: {Vorgänger-ID: Jahr}` (Viktoria Köln: SC Brück 1994,
> FC Junkersdorf 2011); `jahr` gilt für alle übrigen. Vorher erst prüfen, ob es nicht eine Kette ist: „Marathon → FC Remscheid 1971“ war in
> Wahrheit Marathon → VfB Remscheid 1971 → FC Remscheid 1990. Ein Lauf mit `--ebene N` nimmt alle Ebenen ≤ N mit – die Reste der höheren stehen dann wieder drin. Vor einem Alias auf
> einen Spielverein dessen Saisons ansehen: FSV Union Fürstenwalde trägt zu DDR-Zeiten Dynamo, „FSV Fürstenwalde“ war der ANDERE Fusionspartner.
> **Unscharfe Schreibweisen** (seit v0.8.194, Suchwort „unscharf“ auf der Seite): fussball.de kürzt ab und verschreibt
> („Hohenstein-E.“, „Lu-hafen“, „G/W Görlitz“, „Rene“/„René“). Gepaart wird nur ohne gemeinsame Saison, `_nv`-IDs nie;
> Spielvereine ohne Saison vor dem Sim-Start sind dabei (ihr Vorgänger steht sonst unerkannt in der Historie). Voreinstellung
> „nur Schreibweise“. Warum ein Paar (nicht) kommt: `--probe "A" "B"`. Danach immer auch `einzelspiele_dryrun/einbau`.
> Regeln in `tools/hist_unscharf.mjs`, auch `historie_einbau.mjs` nutzt sie: **eine Abkürzung des heutigen Namens wird nie
> damaliger Name** (Nutzer: „rechtschreibvarianten kürzel gehören generell getilgt“), außer bei gleicher Vereinsform nicht –
> SG → SC Lichtenberg 47 bleibt eine Umbenennung. `hist_alias_getrennt.json` sperrt seit v0.8.194 auch die automatische
> Zusammenlegung. `--uebernehmen` hält Einträge zurück, die einem Fusions-Vorgänger widersprechen, und gibt die
> **Kommentarzeile** der Seite aus (von Hand umsetzen). „Beide falsch“ / Kürzung ohne ausgeschriebenes Gegenstück: in
> `hist_schreibweise.json` auf einen Namen zeigen, den es als Verein nicht gibt („SV Landsweiler-Leb.“ → „SV Landsweiler-Lebach“) –
> dann bleibt die ID und nur der Anzeigename wird ersetzt (seit v0.8.196).
> **Zusatzwort (seit 13.10.2026, `zusatz()` in `hist_unscharf.mjs`):** „SG Neitersen“ ↔ „SG Neitersen/Altenkirchen“, „Rantzau“ ↔
> „SSV Rantzau Barmstedt“ – der kürzere Name ganz im längeren. Nur auf der Entscheidungsseite, nicht im Einbau (ein SG-Partner mehr ist
> oft ein echter damaliger Name). Begrenzt auf fussball.de-IDs (gegen Spielvereine/untereinander), Vereinsform passend, ≤ 75 km
> (hist-ID = Schwerpunkt ihrer Ligen). `_nv`-IDs dürfen hier mit, aber nur wenn JEDE ihrer Ligen nahe liegt. Anlass: 32 Spielvereine
> hatten eine zweite ID, die Saison für Saison mit der Spiel-ID wechselte. Initialen („HT 16“, „TBS“, „HD-Kirchheim“) fängt die Regel nicht.
> **Gleicher Name ≠ gleicher Verein über Regionen:** fbde nahm bei Namensgleichheit die erste hist-ID – „VfL Neustadt“ war
> Bayern + Brandenburg + Pfalz in einer ID. Korrektur je Verband in `fbde_ebene58_korrektur.json` („verband|Name“).
> **`historie_dryrun.mjs` NIE ohne die Zwischenspeicher laufen lassen:** `%TEMP%/ifosta_cache`, `wiki_tabellen_cache`,
> `staffeln_ebene23_cache` verschwinden mit der Temp-Bereinigung; ohne sie wurden 983 → 14.339 Zeilen geschätzt. Vorher
> prüfen (`ifosta: N Liga-Saisons im Zwischenspeicher` muss > 0 sein), sonst `ifosta_tabellen.mjs --alle`,
> `wiki_tabellen.mjs`, `staffeln_ebene23.mjs` (danach `tools/staffeln_ebene23.json` per git zurück). `farchiv_vereine.mjs`
> schreibt Korrekturen zurück in `docs/farchiv_zuordnung_pruefliste.csv` und liest sie beim nächsten Lauf wieder – eine
> Korrektur entfernt man in BEIDEN Dateien.
> **Weitere Ligen ergänzen (z. B. unterhalb der Oberliga): Rundenmodus immer mitnehmen und mitprüfen.** Saisons mit
> Vorrunde und anschließenden Meister-/Aufstiegs- und Abstiegsrunden gibt es nicht nur 2021/22 und nicht nur wegen Covid
> (Rheinland-Pfalz/Saar spielte den Modus auch 2022/23; tiefere Ligen haben ihn teils regulär). Erkannt wird am
> Artikelaufbau, nicht am Jahr (`platzierungsrunden()` in `tools/wiki_ebene45.mjs`). Je Fund festhalten, ob Covid der Anlass
> war oder der reguläre Modus, und die Zählweise (kumS/kumT/Bonus) prüfen. Die Oberfläche dafür steht (Vorrunde als eigener
> Block, Runden als Staffeln, Platz durchgezählt mit Rundenplatz in Klammern) – sie muss für neue Ligen in
> `tools/historie_einbau_test.cjs` und `.claude/skills/run/hist_check.mjs` mitgeprüft werden.

## Neuaufbau reproduzierbar halten (21.10.2026)

Ein vollständiger Neuaufbau (`farchiv_ebenen` → `farchiv_vereine` → `historie_dryrun` → `wiki_ebene45` → `fbde_ebene58` →
`historie_einbau` → `einzelspiele_dryrun/einbau`) verschob 60 Zeilen auf andere Vereine, auch ohne neue Eingaben. Ursache war
zweimal dasselbe: **Einträge, die nach einem Einbau von Hand in `app/history_data.js` kamen, wirkten beim nächsten Lauf auf die
Zuordnung zurück.**

- **Schönebeck (49 Zeilen):** `hist_fa_motorschoenebeck`/`…chemieschoenebeck` stehen seit v0.8.228.8 in `HISTORIC_CLUBS`.
  `historie_dryrun.mjs` hielt sie für vergeben und erzeugte `…2`. Jetzt gilt eine `hist_fa_`-ID in `HISTORIC_CLUBS` als frühere
  Ausgabe desselben Werkzeugs, nicht als vergeben (Seed-IDs ohne `fa` bleiben geschützt).
- **Dresden (7 Zeilen):** v0.8.228.4 benannte `hist_einheitdresden` in `HISTORIC_CLUBS` in „FSV Lokomotive Dresden“ um. Danach traf
  „Lokomotive Dresden“ (BSG Lok, Bezirksliga 1964–67) über den Namenskern diese ID, und „Einheit Dresden“ (DDR-Liga) verlor sie.
  Festgehalten in `tools/farchiv_vereine_korrektur.json` („Lokomotive Dresden“: eigene ID, „Einheit Dresden“: `hist_einheitdresden`).
- **Zwischenspeicher:** `%TEMP%/wiki_tabellen_cache` hatte nur 153 von 277 Seiten – die Oberliga Nord 1994–2001 verlor dadurch alle
  S/U/N. Vor dem Lauf auch `node tools/wiki_tabellen.mjs` (füllt den Speicher, schreibt `wiki_ergaenzung.csv` neu).

**Nachtrag 25.10.2026:** Neue Quelldaten (Verbandsligen 1994–2001) verschoben 422 bestehende Zeilen über den Namensabgleich –
seitdem der **ID-Anker** `tools/hist_id_anker.json` am Eingang von `historie_einbau.mjs` (Ablauf in `docs/EBENE5_1994.md`).
Und: der Wikipedia-Zwischenspeicher war wieder halb leer (124/277) – `node tools/wiki_tabellen.mjs` gehört vor JEDEN Neuaufbau.

**Regel:** Wer einen Namen oder eine ID in `HISTORIC_CLUBS`/`HISTORIC_NAMES` ändert, prüft beim nächsten Neuaufbau mit
`node tools/historie_neuaufbau_vergleich.cjs`, ob sich Zeilen verschieben. **Quellfehler** (doppelte oder fehlende Zeilen bei
f-archiv) gehören nach `tools/farchiv_korrektur.csv` – versioniert, `farchiv_ebenen.mjs` nimmt sie immer als letzte Datei.

## Grossschreibung aus der Quelle (22.10.2026)

fussball.de schreibt vor allem am Niederrhein 2003–13 Vereinsnamen ganz gross und schneidet sie nach 20 Zeichen ab
(„TUS 1911 GREVENBROIC“). `tools/hist_grossschrift.json` (Quellname → richtige Schreibweise) wirkt in `historie_einbau.mjs`
**ganz am Anfang**: alles Weitere sieht den richtigen Namen. Ist er gleich dem Namen eines vorhandenen Vereins ohne gemeinsame
Saison, verbindet die Zusammenlegung (1d) von selbst – das Ziel muss dann genau so heissen wie dessen Zeilen in der Quelle
(„Sportfreunde Baumberg“, nicht „SF Baumberg“). Echte Kürzel bleiben (ATSV, ETSV, HEBC, SVGO, DEFA, ESDA, WEMA, NARVA …).
`tools/historie_einbau_test.cjs` prüft, dass kein Name mehr in Grossbuchstaben steht (Liste `KUERZEL` dort pflegen).

## Spielgemeinschaften: eine Linie, Namen je Saison (22.10.2026)

Nutzer: „so wie sie antreten, so wie sie pro Saison gemeldet sind.“ Eine SG, deren Partner wechseln, ist **eine Linie** mit
damaligem Namen je Saison (`hist_alias.json`, Ziel ist der heutige Spielverein). Das Muster in den Daten ist ein Indiz, Belege sind:
nie dieselbe Saison (nicht gegeneinander), Ligaplatz lückenlos weitergegeben, dieselben Stadien (SGs haben mindestens zwei),
Ortsnamen passen. Übersicht Rheinland: `docs/sg-rheinland/gruppen.txt`.
- Alias-Ketten folgen nur NAMEN: zeigt ein alter Eintrag auf eine hist-ID („SG Hundsangen“ → `hist_fb_svhundsangen`), den alten
  Eintrag direkt aufs neue Ziel setzen.
- Namenszeiträume (`historie_einbau.mjs`, `gespielt`): bei Spielgemeinschaften (Name mit SG/FSG/SpG oder „/“) ab 2001/02 endet ein
  Zeitraum, wenn dazwischen eine Saison unter dem HEUTIGEN Namen liegt (SG Westerburg 2011–22, 2022/23 schon mit Gemünden/Wilmenrod,
  2023–25 wieder SG Westerburg). Bei anderen Vereinen wird weiter geglättet – dort sind solche Lücken nur verschiedene Quellschreibungen.

## Verschwundene Meister als Spur (25.10.2026)

- `node tools/meister_verschwunden.cjs` → `docs/meister-verschwunden/liste.txt`: Meister, die danach in keiner Tabelle mehr stehen und
  keinen Verbleib haben (keine Fusion, kein Nachfolger, kein Spielverein). Ein Meister verschwindet selten wirklich – 34 von 53 waren
  fehlende Verbindungen (Abkürzungen der Quelle wie „E. Braunsch. II“, Umbenennungen der Wendezeit), der Rest Rückzug oder Datenlücke.
- Die Abschlusstabelle im Archiv zeigt den Fall jetzt selbst: „⇢ Fusion“, „↘ Rückzug“ (schlechter Platzierter bleibt drin) oder
  „▼ tiefere Liga“ – „Amateurpokal“ nur in Sim-Saisons (`.claude/skills/run/rueckzug_check.mjs`).
- Beim Umhängen einer ID, die selbst Fusions-Nachfolger ist (Eintracht Heessen 1970), den Schlüssel in `hist_fusion.json` mitziehen –
  sonst bricht `historie_einbau.mjs` mit „gibt es nicht“ ab.

## Weggelassener Namensteil – das Metternich-Muster (28.10.2026)

Nutzer: „mannschaft a und b wohl identisch, weil eines der beiden teile des namens weglässt“ (FC Metternich = FC Germania Metternich).
`hist_dubletten.mjs` meldete solche Paare als „unscharf: Zusatzwort“, entschied sie aber nicht. `node tools/zusatzwort_pruefung.mjs`
(nach `hist_dubletten.mjs`, das `tools/_dryrun/hist_dubletten_paare.json` schreibt) hält jedes offene Paar ohne gemeinsame Saison, in dem
ein Name alle Kernwörter des anderen plus mehr trägt (oder nur die Vereinsform weglässt), gegen die Saisonfolge:
**stark** = jeder Namenswechsel in der Folgesaison UND in derselben Liga / Auf- oder Abstieg / Nachbarstaffel (Ligenbaum + `ligaNachfolger`,
sonst fiel Metternichs Abstieg Oberliga Südwest → Rheinlandliga 2000/01 durch), Zusatzwort kein Gemeindename, keine Spielgemeinschaft
(„SG Geisfeld“ ≠ „SG Rascheid/Geisfeld“). Erste Mannschaft und Reserve nie. Selbsttest (`--selbsttest`) mit Metternich vor der Zusammenlegung.

Erster Lauf: 13 stark → 11 Schreibweisen + 1 Umbenennung eingetragen (64 Saisons, `historie_neuaufbau_vergleich --erwartet=64`), mit Beleg wo
nötig: BSV Guben-Nord = Breesener SV (Stadt Guben), Kuckuck = Prignitzer Kuckuck Kickers 2000 e.V. (dewiki), BFC Alemannia 90 **Wacker** ist
eine echte Umbenennung (inoffiziell nach Wacker 04, 2013 zurück) → `hist_alias`, die abgeschnittene Schreibung „…90 Wac“ zeigt per
`hist_schreibweise` auf den NAMEN „BFC Alemannia 90 Wacker“ (damaliger Name dann durchgehend 2001/02–2011/12). `_nv`-Namen (SV Seebach,
TuS Schweich) nur mit „Name|Jahr|Liga“-Schlüsseln. Offen ohne Beleg: BSV Hürriyet / BSV Hürriyet-Burgund (2006/07). Ein Name mit drei
Schreibungen (Guben-Nord, BSV Guben-Nord, Breesener SV Guben Nord) braucht ALLE Varianten im Eintrag – sonst fällt eine auf eine eigene ID.
Zweiter Lauf, die 15 „mittleren“ (Lücke bis 2 Jahre, Ort/SG im Zusatz): 7 Schreibweisen (FV Hunsrückhöhe Morbach, MSV Börde Magdeburg,
USC Paloma Hamburg, SV Burgaltendorf, SV der Bosnier in Frankfurt, FC Viktoria 1889 Berlin II in drei Schreibungen, BSC Acosta =
„Braunschweiger SC (Acosta)“ – Soccerway/Stadt Braunschweig), 6 SG-Linien als Umbenennung nach der SG-Regel oben (SG Arzfeld ↔
Daleiden/Arzfeld, SG Geisfeld ↔ Rascheid/Geisfeld, Darscheid/Mehren, Sauertal Ralingen, Vettelschoß-St. Katharinen, TSV Lehnerz II wie die
Erste), FC Spandau 06 ≠ SC Schwarz-Weiß Spandau 1953 → `hist_alias_getrennt`. 38 Saisons. Offen ohne Beleg: VfB Solingen ↔ DV Solingen.

## Fremder Name, fremdes Spielrecht – Hinweis statt Zuordnung (31.10.2026)

Manchmal spielte eine Mannschaft unter dem Namen (und mit dem Spielrecht) eines anderen Vereins. Beispiel: **1989/90–1990/91 trat
die zweite Mannschaft von Dynamo Dresden als „TSG Meißen“ in der DDR-Liga an**, die eigene erste Mannschaft der TSG lief als
„TSG Meißen II“ in der Bezirksliga; 1991 ging der Platz an den FC Meißen (Oberliga Nordost), Dynamo II in die Landesliga Sachsen
(Wikipedia Meißner SV 08). Nutzer: „Meißen ist schwierig. Lass Meißen bei Meißen und schreibe bei Dresden II und Meißen selbst den
Hinweis in den Steckbrief.“

- **Die Saisons bleiben beim Namen/Platz** (bei dem Verein, an den der Platz danach ging) – keine Umbuchung, kein Alias.
- **Beide Seiten bekommen einen Hinweis:** `tools/hist_vermerk.json` (ID → `[{von, bis, text, beleg}]`) → `HIST_EXT.vermerk` →
  Abschnitt **HINWEIS** im Steckbrief unter VEREINSNAMEN (auch ohne Namenswechsel), Beleg im Tooltip. Den Zeitraum zeigt die Spalte
  links – der Text wiederholt ihn nicht.
- Erkennbar in den Daten: Ein Verein hat in denselben Saisons eine Lücke (Dynamo II 1989–90), der andere einen „Sprung“ samt einer
  eigenen „II“, die in Wahrheit die Erste ist (TSG Meißen II 1989/90 Bezirksliga). Solche Paare vor jeder Zusammenlegung am Artikel prüfen.
- Prüfung: `.claude/skills/run/liga_schicksal_check.mjs` (Hinweis in beiden Steckbriefen).

Dazu aus derselben Sitzung (DDR-Liga 1990/91): Ausgründung 1991 FSV Hoyerswerda ← Aktivist Schwarze Pumpe, Umbenennung Rotation
Berlin → BSV Spindlersfeld (14.10.1991) und Fusion 1994 in den BSC Marzahn, SV Thale 04 = Stahl-Thale-Linie (Abspaltung 1992–2001),
FC Meißen = TSG Meißen und Fusion 1995 zum Meißner SV 08. **Chemie Guben** qualifizierte sich für die Oberliga Nordost und trat nicht
an – die Archivtabelle zeigt das als roten „↘ Rückzug trotz Qualifikation“ (Regel in `_renderArchivedSeason`: letzte DDR-Saison ohne
Folgetabelle, ein schlechter Platzierter derselben Staffel wurde eingegliedert).

## Rückzug-Scan: zweite ID statt Rückzug, „umbenannt in“ (31.10.2026)

`node .claude/skills/run/rueckzug_scan.mjs` rendert alle 3203 Liga-Saisons der Historie mit der echten Archivanzeige und sammelt
jede „↘ Rückzug“-Zeile → `tools/_dryrun/rueckzug_scan.txt` (VERDÄCHTIG = ähnlicher neuer Name in derselben Liga oder übernächste
Saison wieder da) und alle „✎ umbenannt“-Zeilen → `tools/_dryrun/umbenannt_scan.txt`. Stand vorher 1486 Rückzüge, viele davon derselbe
Verein unter zweiter ID. Eingearbeitet (`tools/_dryrun/rueckzug_zuordnung.cjs`, 160 gewollte ID-Wechsel): 54 Paare der Stufen
„gleich“/„teil“ aus `tools/_dryrun/rueckzug_stufen.txt`.

- **Schreibweise** (`hist_schreibweise.json`, kein damaliger Name): Raspo/Rasensport Elmshorn, Walzwerk/Stahl Walzwerk Hettstedt (springen
  jede Saison), Lok/Lokomotive Pirna/Eberswalde/Güsten/Frankfurt (O), Texterkennungsfehler („Elektronik Neuruppin“, „Stahl Sangertiausen“ …).
- **Neu: Schreibweise auf einen NAMEN, der selbst Umbenennung ist** („Elektronik Neuruppin“ → „Electronic Neuruppin“ → MSV Neuruppin): der
  richtig geschriebene Name wird damaliger Name. Auch mit `|Jahr` („Motor Robur Zittau|1977“ → „Robur Zittau“). Schreibweise auf einen
  anderen Namen mit Jahr/Liga ohne Umbenennung zeigt keinen damaligen Namen (Tiefenort 1983/84 = Reserve). `historie_einbau.mjs` bei eraExtra.
- **Umbenennung** (`hist_alias.json`, Beleg RSSF „East Germany – Name Changes“): Robur Zittau 1976, Vorwärts/Motor → Motor Teltow 1977,
  Interflug/Luftfahrt Berlin, Traktor → SV 1919 Irxleben 1990, Lok → ESV Lok Zwickau 1990, SG Wittlich/L/N.
- **Nicht angefasst, frühere Entscheidung:** WEMA/Aufbau Plauen (Fusions-Nachfolger 1976), Lok Frankfurt/O (Fusions-Vorgänger IHB 1977 –
  Zuordnung umgedreht), Concordia/Wandsbeker TSV und FSG Schiffweiler (Fusion), Chemie/SC Velten (`_nv`), Hertha BSC/II, Gönnersdorf.

**Anzeige:** bleibt ein Verein und heißt in der Folgesaison anders, zeigt die Archivtabelle „✎ umbenannt in NEU“ (Handy „✎“, Klick in die
Folgesaison) – Nutzer: „außer bei ständigen Rechtschreibänderungen“. Keine Umbenennung (`_nurSchreibweise`): Groß/klein, Zeichen,
Jahreszahlen, Lok = Lokomotive, Wort-Teilmenge (Ortszusatz) – außer eine DDR-Sportvereinigung fällt weg/kommt dazu (Motor Robur → Robur).
Springt der Name in der Saison davor/danach zurück (Jahn Regensburg II/Amateure/II), auch nicht; gezählt werden dabei nur Saisons, in denen
der Verein spielt (`_archSpieltIn`). Stand: 263–290 Zeilen, Prüfung `.claude/skills/run/umbenannt_check.mjs` (mit `--selbsttest`).
**Ligawechsel + neuer Name** (Nutzer 31.10.2026 „AB“): ▲/▼/↘ bleibt die Anzeige, dazu hochgestellte Fußnote (fortlaufend über alle
Tabellen der Seite, Liste unter der jeweiligen Tabelle) und ein antippbares ✎ (`.imk`, Sprechblase `#inf-tip`; Handy hat kein Hover).
Stand: 77 Fälle, höchstens einer je Tabelle (`.claude/skills/run/fussnote_scan.mjs`); die Nummerierung prüft `umbenannt_check.mjs` künstlich.
**Runde 2** (`tools/_dryrun/rueckzug_zuordnung2.cjs`, 189 gewollte ID-Wechsel, Rückzüge 1420 → 1314): Stufe „anders“ maschinell vorsortiert –
RSSF-Liste geparst (Blöcke je Verein, „Merged“ dazwischen = Fusion, nur Ortsname zählt nicht), Name springt hin und her ohne gemeinsame
Saison (Schreibweise), Tippfehler (Editierabstand ≤ 2), Wende 1990 (nur 1989/90, ein Kandidat, neue ID erst ab 1990, gleicher Ort). Regel:
reine Schreibung → `hist_schreibweise`, anderer Trägername (BSG gewechselt, Spielgemeinschaft) → `hist_alias`, damit der Name sichtbar bleibt.
Frühere Entscheidung gilt: TSG/Post Ludwigslust ist Fusion 1979 (hist_fusion) – Einheit Ludwigslust darum je Jahr (1966–67 → TSG, 1984–86 → TSG/Post).
**Runde 3** (`tools/_dryrun/rueckzug_zuordnung3.cjs`, 68 ID-Wechsel + 5 Fusionen): von den 177 „rest“-Paaren die nahtlosen (alt endet Y, neu
beginnt Y+1 in derselben Liga, je ein Kandidat). **Lehre: nahtlos im Westen ist oft eine Fusion** – Rot-Weiß Lüdenscheid 1971 (RSV Höh +
Sportfreunde), TSG Bergedorf 1965, 1. FC Gladbeck 1968, FC Eilenburg 2001 (Mörtitz), FC Anhalt Dessau 1990 (Vorwärts) → `hist_fusion.json`,
Archiv zeigt „⇢ Fusion“. Fusionsjahr = Saisonbeginn, in der der Nachfolger in den Daten zuerst steht (Archiv prüft jahr === sy+1), auch
wenn Wikipedia ein Jahr später nennt (Bergedorf, Gladbeck). DDR-Kleinstädte (ein Verein am Ort) mit nahtlosem Trägerwechsel → `hist_alias`;
Großstädte nur mit RSSF-Beleg (SC/Energie Cottbus II, Ascota Karl-Marx-Stadt/Chemnitz). Frühere Fusionen gehen vor: SG Lörrach-Stetten
(→ FV Lörrach-Brombach 2011), Aktivist Zwickau (→ FSV Zwickau 1969) – der Einbau bricht ab, wenn ein Fusions-Vorgänger verschwindet.
**Runde 4** (`tools/_dryrun/rueckzug_zuordnung4.cjs`, 95 ID-Wechsel + 1 Fusion): die 139 Paare ohne Beleg. **Falle: ein älterer
Schreibweise-Eintrag auf eine ID umgeht jeden späteren Alias** – „Empor Geußen“ → `emporgreussen` hielt Zeilen fest, obwohl „Empor Greußen“
längst auf Blau-Weiß zeigte (ebenso Elsterwerda, Beeskow, Hüttigweiler, Pasewalk, Hildburghausen, Neuhaus-Schierschnitz, Meiderich).
Abhilfe: Tippfehler zeigen auf den RICHTIG GESCHRIEBENEN NAMEN, nicht auf eine ID – dann greift die Kette. Prüfen, ob eine Zuordnung
gegriffen hat: Name darf im Scan nicht mehr als „↘“ stehen (Ausnahme: letzte Saison der Ziel-ID). Neu zugeordnet nur ohne gemeinsame
Saison: eine Saison mitten in der Reihe des anderen Namens (Ib = II, SG Regensburg, RWO Alzey), Namen im Wechsel (Rheinzabern, Lauterecken,
Ferdinandshof, Oberfrohna), DDR-Trägerwechsel (Stahl → Mansfeldkombinat Helbra 1970 wie Sangerhausen, Semlow, Wesenberg, Pneumant/Chemie
Schmöckwitz), Wende mit Namenskern (Lok/ESV Dessau, Motor/TSV IFA Chemnitz, Empor/Blau-Weiß Wanzleben), WSV Borussia II, Rhodia → Solvay
Freiburg; Fusion LFC Berlin + BFC Viktoria 2013 auch für die II. `Name|Jahr` greift auf ALLE Zeilen dieses Namens im Jahr – 1966 gab es
zwei „SV Bockum-Hövel“, der Schlüssel zog beide (im Vergleich sichtbar, zurückgenommen). Bewusst NICHT: Oberstein → SC Idar-Oberstein
(Wikipedia: Fusion zweier IDARER Vereine 1971), SC Einheit Dresden II (Einheit-Linie in hist_fusion), Eintracht + Italia Köln, Tollense.
**Offen** (`tools/_dryrun/rueckzug_runde2_rest.txt`): rund 100 Paare ohne Beleg, vor allem Großstädte (Berlin, Leipzig, Rostock, Erfurt,
Frankfurt/O, Kassel, Köln) und die schon in Runde 3 ausgelassenen Orte, 59 mit gemeinsamer Saison (verschiedene Mannschaften),
dazu Plauen, Merxheim (SG), TSV/Türk. SV Oldenburg, Eschwege, Oberhausen, Motor Eisenach → FC Eisenach.
