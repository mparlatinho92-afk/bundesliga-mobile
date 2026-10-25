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
