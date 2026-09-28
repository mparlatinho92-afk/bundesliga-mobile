# P3 – Spielstätten für 25 Vereine ohne Stadion (klein, eine Sitzung)

**Anhängen:** `00_KONTEXT.md` + diese Datei.
**Ergebnis:** `P3_stadien.json`

Im Spiel haben 1237 von 1262 Vereinen eine Spielstätte (Quelle europlan-online.de). Diese 25 fehlen:

- Sportfreunde Eisbachtal (sportfreundeeisbachtal_169), Rheinlandliga
- SV Eintracht Irsch/Saar (sveintrachtirschsaar_191), ligalos, Rheinland West
- SG Viertäler Oberwesel (svvesaliaoberwesel_215), Bezirksliga Rheinland Mitte
- Wiedbachtaler Sportfreunde (wiedbachtalersportfreunde_229), ligalos, Rheinland Ost
- SC Gresaubach (scgresaubach_269), Verbandsliga Saarland Nord-Ost
- SG Perl-Besch (sgperlbesch_288), Verbandsliga Saarland Süd-West
- SV 1930 Rot-Weiss Seebach (sv1930rotweissseebach_381), Bezirksliga Vorderpfalz
- SV Nanzdietschweiler (svnanzdietschweiler_410), Bezirksliga Westpfalz
- 1. FCK-Portugiese (1fckportugiese_415), ligalos, Westpfalz
- SVGO Bremen (svgobremen_473), ligalos, Bremen
- Altona 93 (altona93_484), Regionalliga Nord
- HEBC Hamburg (hebchamburg_489), Oberliga Hamburg
- ETSV Hamburg (etsvhamburg_496), Landesliga Hamburg Hansa
- Altona 93 II (altona93ii_503), ligalos
- Hausbruch-Neugrabener TS (hausbruchneugrabenerts_506), ligalos, Hamburg
- RSV Eintracht 1949 (rsveintracht1949_712), NOFV-Oberliga Nord, Brandenburg
- CFC Hertha 06 (cfchertha06_713), ligalos, Berlin
- VFC Plauen (vfcplauen_837), Regionalliga Nordost
- SG Heidelberg-Kirchheim (sgheidelbergkirchheim_986), Verbandsliga Baden
- FFV Sportfreunde 1904 (ffvsportfreunde1904_1059), ligalos, Hessen Süd (Frankfurt)
- FSV Wolfshagen (fsvwolfshagen_1068), Verbandsliga Hessen Nord
- Germania Ratingen 04/19 (germaniaratingen0419_1138), Regionalliga West
- ETB Schwarz-Weiß Essen (etbschwarzweissessen_1139), Oberliga Niederrhein
- Sportfreunde Hamborn 07 (sportfreundehamborn07_1144), Oberliga Niederrhein
- SV Wermelskirchen (svwermelskirchen_1166), ligalos, Niederrhein

**Auffällig:** Altona 93 (Adolf-Jäger-Kampfbahn), VFC Plauen (Vogtlandstadion) und ETB SW Essen (Uhlenkrug) sind
bekannte Stadien. Dass sie fehlen, spricht für einen **Zuordnungsfehler** beim Abgleich, nicht für fehlende Daten.
Bitte bei diesen dreien besonders sauber belegen. Die Erklärung, warum sie durchgefallen sind, liefert die PC-Sitzung.

## Format (dasselbe Feldschema wie im Spiel)
```json
{ "altona93_484": [ { "stadName": "Adolf-Jäger-Kampfbahn", "ort": "Hamburg-Altona",
   "kapazitaet": 8000, "beleg": "https://…" } ] }
```
- Mehrere Plätze → Hauptplatz zuerst.
- Die Reserve (II) spielt oft auf einem Nebenplatz. Nur mit Beleg eintragen, sonst weglassen.
- Kapazität unbekannt → `null`. Nicht schätzen.
- Bevorzugte Quellen: europlan-online.de, Vereinsseite, Wikipedia, fussball.de-Spielstätten.
