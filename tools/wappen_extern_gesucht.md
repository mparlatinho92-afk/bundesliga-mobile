# Wappen: was noch fehlt

Vereine mit effektiv unter 90 px, die noch kein HD-Wappen haben. Gemessen mit
`wappen_quality.py` (entlarvt hochskalierte Bilder), Stand nach v0.8.99.

Gesamt: **164 Vereine**.

* 67 &ndash; keine FM-Zuordnung
* 38 &ndash; FM-Logo vorhanden, aber noch nicht geprueft
* 30 &ndash; bereits geprueft: keine brauchbare Quelle
* 29 &ndash; geprueft: FM zeigt einen fremden Verein, unseres ist richtig

Quelle-Vorschlag: sortitoutsi (nach Liga suchen) oder die Vereinsseite.
Neue Datei einfach in `Wappen/<Verband>/<id>.png` legen, dann `python tools/wappen_intake.py --apply`
(schneidet zu, deckelt auf 240 px, quantisiert) und `python tools/wappen_familie.py --apply`.


## 1. Bundesliga (4)
   64 px  FC Bayern München                  bereits geprueft: keine brauchbare Quelle
   62 px  Hamburger SV                       bereits geprueft: keine brauchbare Quelle
   63 px  SSV Jahn Regensburg                bereits geprueft: keine brauchbare Quelle
   64 px  VfL Wolfsburg                      bereits geprueft: keine brauchbare Quelle

## 2. Bundesliga (7)
   64 px  1. FC Heidenheim 1846              bereits geprueft: keine brauchbare Quelle
   64 px  1. FC Kaiserslautern               bereits geprueft: keine brauchbare Quelle
   64 px  1. FC Magdeburg                    bereits geprueft: keine brauchbare Quelle
   64 px  1. FC Nürnberg                     bereits geprueft: keine brauchbare Quelle
   64 px  1. FC Union Berlin                 bereits geprueft: keine brauchbare Quelle
   64 px  Karlsruher SC                      bereits geprueft: keine brauchbare Quelle
   64 px  SV Darmstadt 98                    bereits geprueft: keine brauchbare Quelle

## 3. Liga (5)
   64 px  Holstein Kiel                      bereits geprueft: keine brauchbare Quelle
   64 px  KSV Hessen Kassel                  bereits geprueft: keine brauchbare Quelle
   64 px  SSVg Velbert 02                    bereits geprueft: keine brauchbare Quelle
   64 px  VSG Altglienicke                   bereits geprueft: keine brauchbare Quelle
   64 px  Wuppertaler SV                     bereits geprueft: keine brauchbare Quelle

## Regionalliga Bayern (1)
   64 px  Würzburger Kickers                 bereits geprueft: keine brauchbare Quelle

## Regionalliga Nord (4)
   60 px  Arminia Hannover                   geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   62 px  Hamburger SV II                    keine FM-Zuordnung
   64 px  SV Curslack-Neuengamme             geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  USC Paloma Hamburg                 keine FM-Zuordnung

## Regionalliga Nordost (2)
   62 px  FC Erzgebirge Aue                  keine FM-Zuordnung
   64 px  VFC Plauen                         FM-Logo vorhanden, aber noch nicht geprueft

## Regionalliga Südwest (3)
   64 px  FC-Astoria Walldorf                keine FM-Zuordnung
   64 px  TSV Steinbach Haiger               FM-Logo vorhanden, aber noch nicht geprueft
   72 px  VfR Wormatia Worms                 FM-Logo vorhanden, aber noch nicht geprueft

## Regionalliga West (4)
   64 px  1. FC Düren                        FM-Logo vorhanden, aber noch nicht geprueft
   64 px  Rot-Weiss Essen                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  SC Wiedenbrück                     keine FM-Zuordnung
   64 px  SV Bergisch Gladbach 09            FM-Logo vorhanden, aber noch nicht geprueft

## Bayernliga Nord (1)
   64 px  Würzburger FV 04                   bereits geprueft: keine brauchbare Quelle

## Bayernliga Süd (3)
   64 px  DJK Gebenbach                      bereits geprueft: keine brauchbare Quelle
   64 px  TSV 1860 Rosenheim                 geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  TSV Schwaben Augsburg              geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Bremen-Liga (2)
   64 px  Bremer SV                          geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  ESC Geestemünde                    FM-Logo vorhanden, aber noch nicht geprueft

## Hessenliga (1)
   64 px  1. Hanauer FC 93                   keine FM-Zuordnung

## Mittelrheinliga (1)
   68 px  Bonner SC                          keine FM-Zuordnung

## NOFV-Oberliga Nord (5)
   67 px  Brandenburger SC Süd               geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  FC Anker Wismar                    FM-Logo vorhanden, aber noch nicht geprueft
   64 px  FC Hertha 03 Zehlendorf            FM-Logo vorhanden, aber noch nicht geprueft
   64 px  SV Lichtenberg 47                  FM-Logo vorhanden, aber noch nicht geprueft
   64 px  Tennis Borussia Berlin             keine FM-Zuordnung

## NOFV-Oberliga Süd (1)
   69 px  FC Viktoria 1889 Berlin            FM-Logo vorhanden, aber noch nicht geprueft

## Oberliga Hamburg (3)
   62 px  Eimsbütteler TV                    FM-Logo vorhanden, aber noch nicht geprueft
   64 px  SC Victoria Hamburg                keine FM-Zuordnung
   64 px  Wandsbeker TSV Concordia Hamburg   FM-Logo vorhanden, aber noch nicht geprueft

## Oberliga Niederrhein (1)
   64 px  ETB Schwarz-Weiß Essen             keine FM-Zuordnung

## Oberliga Niedersachsen (3)
   64 px  Lüneburger SK Hansa                keine FM-Zuordnung
   64 px  SSV Jeddeloh II                    keine FM-Zuordnung
   64 px  SV Wilhelmshaven                   bereits geprueft: keine brauchbare Quelle

## Oberliga Rheinland-Pfalz/Saar (2)
   64 px  FC Hertha Wiesbach                 FM-Logo vorhanden, aber noch nicht geprueft
   64 px  FC Rot-Weiß Koblenz                geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Berlin-Liga (2)
   64 px  BFC Preussen                       geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   63 px  Steglitzer SC Südwest 1947         keine FM-Zuordnung

## Brandenburgliga (1)
   64 px  Grün-Weiß Ahrensfelde              FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Bayern Nordost (1)
   70 px  SC 04 Schwabach                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Bayern Südost (2)
   64 px  SB Chiemgau Traunstein             keine FM-Zuordnung
   64 px  VfB Hallbergmoos-Goldach           FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Bayern Südwest (1)
   64 px  TSV Schwabmünchen                  FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Braunschweig (1)
   64 px  FT Braunschweig                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Bremen (3)
   62 px  ATS Buntentor Bremen               geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   62 px  SC Borgfeld                        FM-Logo vorhanden, aber noch nicht geprueft
   64 px  TSV Osterholz-Tenever              FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Hamburg Staffel Hammonia (3)
   62 px  Hamburger SV III                   keine FM-Zuordnung
   64 px  SSG Nikola Tesla Hamburg           keine FM-Zuordnung
   60 px  Türk-Birlikspor Pinneberg          FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Hamburg Staffel Hansa (2)
   64 px  Hamburger Turnerschaft von 1816    keine FM-Zuordnung
   70 px  SV Altengamme                      geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Hannover (2)
   64 px  1. FC Wunstorf                     FM-Logo vorhanden, aber noch nicht geprueft
   64 px  TSV Wetschen                       geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Lüneburg (3)
   64 px  MTV Treubund Lüneburg              FM-Logo vorhanden, aber noch nicht geprueft
   64 px  TSV Etelsen                        geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  TuS Harsefeld                      geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Mittelrhein Staffel 1 (2)
   64 px  FV Bonn-Endenich 08                FM-Logo vorhanden, aber noch nicht geprueft
   64 px  FV Wiehl                           bereits geprueft: keine brauchbare Quelle

## Landesliga Mittelrhein Staffel 2 (3)
   64 px  FC Pesch                           bereits geprueft: keine brauchbare Quelle
   64 px  SV Eintracht Verlautenheide        geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  Sportfreunde Düren                 geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Landesliga Niederrhein Gruppe 1 (1)
   64 px  VSF Amern                          FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Niederrhein Gruppe 2 (1)
   64 px  SV Scherpenberg                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Saarlandliga (2)
   64 px  SV Auersmacher                     FM-Logo vorhanden, aber noch nicht geprueft
   64 px  SpVgg Quierschied                  FM-Logo vorhanden, aber noch nicht geprueft

## Thüringenliga (1)
   64 px  BSG Wismut Gera                    FM-Logo vorhanden, aber noch nicht geprueft

## Verbandsliga Baden (3)
   64 px  FC Zuzenhausen                     bereits geprueft: keine brauchbare Quelle
   64 px  FC-Astoria Walldorf II             keine FM-Zuordnung
   64 px  SG Heidelberg-Kirchheim            FM-Logo vorhanden, aber noch nicht geprueft

## Verbandsliga Hessen Mitte (1)
   64 px  SV Zeilsheim                       geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Verbandsliga Hessen Nord (2)
   64 px  Lichtenauer FV                     keine FM-Zuordnung
   64 px  SSV Sand                           geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Verbandsliga Hessen Süd (3)
   64 px  SC Dortelweil                      bereits geprueft: keine brauchbare Quelle
   62 px  SV Hummetroth                      keine FM-Zuordnung
   64 px  SV Unter-Flockenbach               geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## Verbandsliga Sachsen-Anhalt (1)
   64 px  Einheit Wernigerode                FM-Logo vorhanden, aber noch nicht geprueft

## Verbandsliga Südbaden (1)
   64 px  Türkischer SV Singen               keine FM-Zuordnung

## Verbandsliga Südwest (3)
   64 px  SV Alemannia Waldalgesheim         geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   63 px  TB Jahn Zeiskam                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  VfR Kaiserslautern                 bereits geprueft: keine brauchbare Quelle

## Verbandsliga Württemberg (1)
   64 px  Sportfreunde Schwäbisch Hall       bereits geprueft: keine brauchbare Quelle

## Bezirksliga Rheinland Mitte (1)
   64 px  SV Oberzissen                      keine FM-Zuordnung

## Bezirksliga Rheinland Ost (3)
   60 px  SG Müschenbach/Hachenburg          keine FM-Zuordnung
   64 px  TuS Weitefeld-Langenbach           keine FM-Zuordnung
   64 px  TuS Westerburg                     keine FM-Zuordnung

## Bezirksliga Rheinland West (1)
   77 px  SG Wallenborn                      keine FM-Zuordnung

## Landesliga Berlin Staffel 2 (4)
   64 px  FC Internationale 1980             keine FM-Zuordnung
   64 px  FC Internationale 1980 II          keine FM-Zuordnung
   64 px  Friedenauer TSC 1886               keine FM-Zuordnung
   64 px  VSG Altglienicke II                keine FM-Zuordnung

## Landesliga Südwest Ost (7)
   62 px  FSV Schifferstadt                  bereits geprueft: keine brauchbare Quelle
   60 px  SV 1920 Geinsheim                  geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   62 px  SV Büchelberg                      FM-Logo vorhanden, aber noch nicht geprueft
   70 px  TSG 1846 Bretzenheim               geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  TuS Knittelsheim                   keine FM-Zuordnung
   63 px  VTG Queichhambach                  keine FM-Zuordnung
   64 px  VfB Bodenheim                      FM-Logo vorhanden, aber noch nicht geprueft

## Landesliga Südwest West (3)
   64 px  SV Hinterweidenthal                keine FM-Zuordnung
   64 px  SV Kirchheimbolanden               keine FM-Zuordnung
   64 px  TSC Zweibrücken                    keine FM-Zuordnung

## Verbandsliga Saarland Nord-Ost (4)
   64 px  FSG Ottweiler-Steinbach            keine FM-Zuordnung
   64 px  FSG Schiffweiler                   bereits geprueft: keine brauchbare Quelle
   61 px  SV Furpach                         keine FM-Zuordnung
   64 px  SV Schwarzenbach                   keine FM-Zuordnung

## Verbandsliga Saarland Süd-West (1)
   64 px  SG Perl-Besch                      keine FM-Zuordnung

## Bezirksliga Nahe (6)
   62 px  FC Brücken                         keine FM-Zuordnung
   64 px  SG Weinsheim                       keine FM-Zuordnung
   62 px  SV Winterbach                      FM-Logo vorhanden, aber noch nicht geprueft
   64 px  TSG Planig                         keine FM-Zuordnung
   64 px  TSV Langenlonsheim                 FM-Logo vorhanden, aber noch nicht geprueft
   61 px  TuS Hoppstädten                    keine FM-Zuordnung

## Bezirksliga Rheinhessen (8)
   62 px  FSV Nieder-Olm                     keine FM-Zuordnung
   63 px  SV 1921 Guntersblum                keine FM-Zuordnung
   61 px  SV Gimbsheim                       FM-Logo vorhanden, aber noch nicht geprueft
   60 px  SV Horchheim                       geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   63 px  SV Klein-Winternheim               keine FM-Zuordnung
   64 px  TuS Neuhausen                      keine FM-Zuordnung
   64 px  VfL Gundersheim                    FM-Logo vorhanden, aber noch nicht geprueft
   72 px  Wormatia Worms II                  keine FM-Zuordnung

## Bezirksliga Vorderpfalz (4)
   64 px  FG 08 Mutterstadt                  keine FM-Zuordnung
   62 px  Phönix Schifferstadt               keine FM-Zuordnung
   64 px  VfB Hassloch                       keine FM-Zuordnung
   70 px  VfR Frankenthal                    keine FM-Zuordnung

## Bezirksliga Westpfalz (5)
   64 px  FC Fehrbach                        keine FM-Zuordnung
   61 px  FC Oberarnbach                     keine FM-Zuordnung
   64 px  TSG 1904 Trippstadt                keine FM-Zuordnung
   64 px  VB Zweibrücken                     FM-Logo vorhanden, aber noch nicht geprueft
   64 px  VfB Reichenbach                    geprueft: FM zeigt einen fremden Verein, unseres ist richtig

## ohne Liga (18)
   64 px  BCF Wolfratshausen                 FM-Logo vorhanden, aber noch nicht geprueft
   64 px  Concordia Wiemelhausen             geprueft: FM zeigt einen fremden Verein, unseres ist richtig
   64 px  FC Hertha Wiesbach II              keine FM-Zuordnung
   64 px  FC International Leipzig           keine FM-Zuordnung
   69 px  FC Liria 1985 Berlin               keine FM-Zuordnung
   62 px  FC Phönix 21 Bellheim              keine FM-Zuordnung
   64 px  Fortuna Babelsberg                 bereits geprueft: keine brauchbare Quelle
   64 px  Oppenheim                          keine FM-Zuordnung
   64 px  SC Victoria Hamburg II             keine FM-Zuordnung
   64 px  SV Blau-Weiß St. Wendel            keine FM-Zuordnung
   64 px  SV Obersülzen                      FM-Logo vorhanden, aber noch nicht geprueft
   64 px  SV Viktoria Weitersburg            keine FM-Zuordnung
   64 px  SpVgg Nahbollenbach                keine FM-Zuordnung
   64 px  Sportfreunde Kladow                keine FM-Zuordnung
   64 px  TuS Holzkirchen                    bereits geprueft: keine brauchbare Quelle
   63 px  TuS Niederkirchen                  keine FM-Zuordnung
   64 px  TuS Nohfelden                      keine FM-Zuordnung
   64 px  Wiedbachtaler Sportfreunde         FM-Logo vorhanden, aber noch nicht geprueft
