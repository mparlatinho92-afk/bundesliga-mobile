# P3 – Bericht zu `P3_stadien.json` (Browser-Sitzung 28.09.2026)

**Stand:** 15 von 25 Vereinen belegt, 10 offen. Die offenen Vereine stehen bewusst nicht in der JSON-Datei.
Eine Spielstätte, die ich nicht belegen konnte, bleibt leer und wird nicht geraten.

## Die drei auffälligen Fälle (Zuordnungsfehler-Verdacht)
Alle drei Stadien existieren und sind eindeutig dem jeweiligen Verein zugeordnet. Die Daten fehlen also nicht,
sondern der Abgleich ist gescheitert. Das bestätigt den Verdacht.

| Verein | Stadion | Kapazität | Belege |
|---|---|---|---|
| Altona 93 | Adolf-Jäger-Kampfbahn, Griegstraße 62, Hamburg | 8000 (davon 1500 Sitzplätze) | en.wikipedia Altona_93; hamburg-tourism.de (Veranstaltungsort, 8.000 Zuschauer) |
| VFC Plauen | Vogtlandstadion, Plauen | **10500 laut Wikipedia, 5000 laut weltfussball (Oberliga NOFV-Süd 2019/20)** | en.wikipedia VFC_Plauen; weltfussball.de/spielorte/oberliga-nofv-sued-2019-2020 |
| ETB SW Essen | Stadion Uhlenkrug, Essen | 9950 | en.wikipedia Uhlenkrugstadion (verweist auf Vereinsseite); sofascore gibt ebenfalls 9950 an |

**Kapazitätskonflikt Plauen:** In der JSON steht 10500. Wenn die Stärke aus der Kapazität abgeleitet werden soll,
bitte am PC entscheiden, welche Zahl gilt: die bauliche Kapazität oder die aktuell zugelassene.

## Belegt, aber mit Einschränkung
- **Altona 93 II:** Einziger Beleg ist footballgroundmap.com, eine Liste, die „Altona 93 and Altona 93 II“ für die
  AJK führt. Das ist eine schwache Quelle. Bei strenger Auslegung lieber weglassen.
- **Hausbruch-Neugrabener TS:** Der Beleg (Neuer RUF, KW 22/26) nennt den Sportplatz Opferberg als Anlage der
  HNT-Fußballabteilung, allerdings im Zusammenhang mit einem Jugendturnier. Dass die Herren dort spielen, ist
  nicht ausdrücklich belegt.
- **SVGO Bremen** (= SV Grambke-Oslebshausen): Der Beleg ist ein Weser-Kurier-Vorbericht von 2014 zu einem
  Landesliga-Heimspiel, Anstoß an der Sperberstraße. Der Beleg ist alt. Eine zweite Anlage „Im Föhrenbrok“ in
  Grambke wird für Handball-Turniere genannt.
- **SV Wermelskirchen:** Der Beleg (RGA) nennt ein Pokal-Heimspiel des **SV 09/35 Wermelskirchen** im
  Dönges-Eifgen-Stadion. Bitte prüfen, ob die Spiel-ID wirklich diesen Verein meint. Nach Lehre 3 gilt: gleicher Ort
  heißt nicht gleicher Verein.
- **Sportfreunde Hamborn 07:** Die Kapazität ist widersprüchlich. Wikipedia nennt 5000, livesoccertv 6000.
  In der JSON steht 5000.
- **SG Heidelberg-Kirchheim:** Die Infobox mit „Sportzentrum Süd, 6.000“ stammt aus dem Stand 2015/16.
  globalsportsarchive nennt die Anlage aktuell „Sportzentrum Heidelberg Süd“.
- **RSV Eintracht 1949:** Die Kapazität 1000 stammt von fotmob. Der Tagesspiegel bestätigt den Sportplatz
  Heinrich-Zille-Straße als Heimspielort, nennt aber keine Kapazität.

## Offen (kein belastbarer Beleg gefunden)
sveintrachtirschsaar_191, svvesaliaoberwesel_215, wiedbachtalersportfreunde_229, scgresaubach_269,
sgperlbesch_288, sv1930rotweissseebach_381, svnanzdietschweiler_410, 1fckportugiese_415,
ffvsportfreunde1904_1059, fsvwolfshagen_1068.
Das sind fast ausschließlich Vereine ab Ebene 6 oder ligalose Vereine. Die Suchmaschine liefert dazu kaum etwas.
Als nächster Weg bieten sich die fussball.de-Spielstätten direkt an, also die Spielberichte eines Heimspiels.
Das geht am PC oder per Scraper besser.

## Nebenbefunde (nur gemeldet, nicht bearbeitet, Regel 6)
Beim Belegen fiel auf, dass der Ligastand im Handout von den Quellen abweicht. Das liegt außerhalb von P3,
kann für die PC-Sitzung aber relevant sein:
- **CFC Hertha 06:** laut en.wikipedia **2024 aufgelöst**.
- **FSV „Wolfshagen“:** In den Quellen heißt der Verein **FSV Wolfhagen** (Wolfhagen, Landkreis Kassel), Verbandsliga
  Nord 2026/27 (hessenschau). Der Vereinsname im Spiel hat vermutlich einen Tippfehler. Das kann auch erklären,
  warum der Stadion-Abgleich durchgefallen ist.
- **Sportfreunde Eisbachtal:** Oberliga RLP/Saar 2025/26 (im Handout: Rheinlandliga).
- **VFC Plauen:** NOFV-Oberliga Süd 2025/26, Platz 3 (im Handout: Regionalliga Nordost).
- **Hamborn 07:** Landesliga Niederrhein 2, Platz 3 in 2025/26 (im Handout: Oberliga Niederrhein).
- **Ratingen 04/19:** Oberliga Niederrhein (im Handout: Regionalliga West).
- **ETSV Hamburg:** Oberliga-Meister 2025/26 ohne Lizenzantrag für die Regionalliga (im Handout: Landesliga Hansa).
Möglicherweise bildet das Spiel bewusst einen älteren Stand ab. Das entscheidet die PC-Sitzung.
