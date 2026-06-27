// Historische Abschlusstabellen (Statistik-Seed) – fließen über Engine._seedHistory in die
// ewige Tabelle/Titel ein. Gespeichert werden FAKTEN: rank (hist. Platz, Original 2-Punkte-Ära),
// s/u/n (Siege/Remis/Niederlagen), gf/ga (Tore). Punkte werden 3-Punkte-normalisiert (3*s+u) beim Seeden.
// Quellen: de.wikipedia.org (primär) + rsssf.org (Cross-Check). PoC: 1. Bundesliga 1963/64.

// Historische Vereinsnamen je Zeitraum (Era-Namen) – in der ARCHIV-Saisonansicht statt des heutigen Namens.
// teamId → Liste {from?, to?, name}: from/to sind SAISONEN ("1994/95"); gilt inkl., fehlend = offen.
// Verglichen wird über das Saison-Startjahr. Beispiele: Meidericher SV → 1967 zu MSV Duisburg;
// Bayer 05 Uerdingen → 1995 zu KFC Uerdingen 05; SV Waldhof hieß 1983–85 "SV Chio Waldhof".
var HISTORIC_NAMES = {
    "msvduisburg_1126":     [{ to: "1965/66", name: "Meidericher SV" }],
    "kfcuerdingen05_1140":  [{ to: "1994/95", name: "Bayer 05 Uerdingen" }],
    "svtasmaniaberlin_718": [{ from: "1965/66", to: "1965/66", name: "SC Tasmania 1900 Berlin" }],
    "svwaldhofmannheim_905":[{ from: "1972/73", to: "1977/78", name: "SV Chio Waldhof" }]   // relevant ab 2.BL-Daten
};

// Aufgelöste/„tote" Vereine ohne game_data-Eintrag (nur historisch, nicht spielbar): id (hist_*) → Anzeigename.
// Genutzt in Archiv-Saisonansicht + ewiger Tabelle als Namens-Fallback.
var HISTORIC_CLUBS = {
    "hist_bv08luettringhausen": "BV 08 Lüttringhausen",
    "hist_sgunionsolingen":     "SG Union Solingen",
    "hist_tusschlossneuhaus":   "TuS Schloß Neuhaus",
    "hist_vfrbuerstadt":        "VfR Bürstadt"
};

var HISTORY_SEED = {
    format: "ba-history-seed/1",
    version: 2, // hochzählen, wenn historische Tabellen geändert/ergänzt werden → erzwingt IDB-Re-Push (histTablesSeeded)
    seasons: [
        {
            y: "1963/64", lid: "1",
            table: [
                { rank: 1,  id: "1fckoeln_1070",            s: 17, u: 11, n: 2,  gf: 78, ga: 40 },
                { rank: 2,  id: "msvduisburg_1126",          s: 13, u: 13, n: 4,  gf: 60, ga: 36 },
                { rank: 3,  id: "eintrachtfrankfurt_987",    s: 16, u: 7,  n: 7,  gf: 65, ga: 41 },
                { rank: 4,  id: "borussiadortmund_1195",     s: 14, u: 5,  n: 11, gf: 73, ga: 57 },
                { rank: 5,  id: "vfbstuttgart_898",          s: 13, u: 7,  n: 10, gf: 48, ga: 40 },
                { rank: 6,  id: "hamburgersv_475",           s: 11, u: 10, n: 9,  gf: 69, ga: 60 },
                { rank: 7,  id: "tsv1860muenchen_6",         s: 11, u: 9,  n: 10, gf: 66, ga: 50 },
                { rank: 8,  id: "fcschalke04_1197",          s: 12, u: 5,  n: 13, gf: 51, ga: 53 },
                { rank: 9,  id: "1fcnuernberg_2",            s: 11, u: 7,  n: 12, gf: 45, ga: 56 },
                { rank: 10, id: "svwerderbremen_440",        s: 10, u: 8,  n: 12, gf: 53, ga: 62 },
                { rank: 11, id: "eintrachtbraunschweig_537", s: 11, u: 6,  n: 13, gf: 36, ga: 49 },
                { rank: 12, id: "1fckaiserslautern_296",     s: 10, u: 6,  n: 14, gf: 48, ga: 69 },
                { rank: 13, id: "karlsruhersc_902",          s: 8,  u: 8,  n: 14, gf: 42, ga: 55 },
                { rank: 14, id: "herthabsc_695",             s: 9,  u: 6,  n: 15, gf: 45, ga: 65 },
                { rank: 15, id: "scpreussenmuenster_1202",   s: 7,  u: 9,  n: 14, gf: 34, ga: 52 },
                { rank: 16, id: "1fcsaarbruecken_238",       s: 6,  u: 5,  n: 19, gf: 44, ga: 72 }
            ]
        },
        {
            y: "1964/65", lid: "1",
            table: [
                { rank: 1, id: "svwerderbremen_440", s: 15, u: 11, n: 4, gf: 54, ga: 29 },
                { rank: 2, id: "1fckoeln_1070", s: 14, u: 10, n: 6, gf: 66, ga: 45 },
                { rank: 3, id: "borussiadortmund_1195", s: 15, u: 6, n: 9, gf: 67, ga: 48 },
                { rank: 4, id: "tsv1860muenchen_6", s: 14, u: 7, n: 9, gf: 70, ga: 50 },
                { rank: 5, id: "hannover96_536", s: 13, u: 7, n: 10, gf: 48, ga: 42 },
                { rank: 6, id: "1fcnuernberg_2", s: 11, u: 10, n: 9, gf: 44, ga: 38 },
                { rank: 7, id: "msvduisburg_1126", s: 12, u: 8, n: 10, gf: 46, ga: 48 },
                { rank: 8, id: "eintrachtfrankfurt_987", s: 11, u: 7, n: 12, gf: 50, ga: 58 },
                { rank: 9, id: "eintrachtbraunschweig_537", s: 10, u: 8, n: 12, gf: 42, ga: 47 },
                { rank: 10, id: "borussianeunkirchen_249", s: 9, u: 9, n: 12, gf: 44, ga: 48 },
                { rank: 11, id: "hamburgersv_475", s: 11, u: 5, n: 14, gf: 46, ga: 56 },
                { rank: 12, id: "vfbstuttgart_898", s: 9, u: 8, n: 13, gf: 46, ga: 50 },
                { rank: 13, id: "1fckaiserslautern_296", s: 11, u: 3, n: 16, gf: 41, ga: 53 },
                { rank: 14, id: "herthabsc_695", s: 7, u: 11, n: 12, gf: 40, ga: 62 },
                { rank: 15, id: "karlsruhersc_902", s: 9, u: 6, n: 15, gf: 47, ga: 62 },
                { rank: 16, id: "fcschalke04_1197", s: 7, u: 8, n: 15, gf: 45, ga: 60 }
            ]
        },
        {
            y: "1965/66", lid: "1",
            table: [
                { rank: 1, id: "tsv1860muenchen_6", s: 20, u: 10, n: 4, gf: 80, ga: 40 },
                { rank: 2, id: "borussiadortmund_1195", s: 19, u: 9, n: 6, gf: 70, ga: 36 },
                { rank: 3, id: "fcbayernmuenchen_0", s: 20, u: 7, n: 7, gf: 71, ga: 38 },
                { rank: 4, id: "svwerderbremen_440", s: 21, u: 3, n: 10, gf: 76, ga: 40 },
                { rank: 5, id: "1fckoeln_1070", s: 19, u: 6, n: 9, gf: 74, ga: 41 },
                { rank: 6, id: "1fcnuernberg_2", s: 14, u: 11, n: 9, gf: 54, ga: 43 },
                { rank: 7, id: "eintrachtfrankfurt_987", s: 16, u: 6, n: 12, gf: 64, ga: 46 },
                { rank: 8, id: "msvduisburg_1126", s: 14, u: 8, n: 12, gf: 70, ga: 48 },
                { rank: 9, id: "hamburgersv_475", s: 13, u: 8, n: 13, gf: 64, ga: 52 },
                { rank: 10, id: "eintrachtbraunschweig_537", s: 11, u: 12, n: 11, gf: 49, ga: 49 },
                { rank: 11, id: "vfbstuttgart_898", s: 13, u: 6, n: 15, gf: 42, ga: 48 },
                { rank: 12, id: "hannover96_536", s: 11, u: 8, n: 15, gf: 59, ga: 57 },
                { rank: 13, id: "borussiamoenchengladbach_1124", s: 9, u: 11, n: 14, gf: 57, ga: 68 },
                { rank: 14, id: "fcschalke04_1197", s: 10, u: 7, n: 17, gf: 33, ga: 55 },
                { rank: 15, id: "1fckaiserslautern_296", s: 8, u: 10, n: 16, gf: 42, ga: 65 },
                { rank: 16, id: "karlsruhersc_902", s: 9, u: 6, n: 19, gf: 35, ga: 71 },
                { rank: 17, id: "borussianeunkirchen_249", s: 9, u: 4, n: 21, gf: 32, ga: 82 },
                { rank: 18, id: "svtasmaniaberlin_718", s: 2, u: 4, n: 28, gf: 15, ga: 108 }
            ]
        },
        {
            y: "1966/67", lid: "1",
            table: [
                { rank: 1, id: "eintrachtbraunschweig_537", s: 17, u: 9, n: 8, gf: 49, ga: 27 },
                { rank: 2, id: "tsv1860muenchen_6", s: 17, u: 7, n: 10, gf: 60, ga: 47 },
                { rank: 3, id: "borussiadortmund_1195", s: 15, u: 9, n: 10, gf: 70, ga: 41 },
                { rank: 4, id: "eintrachtfrankfurt_987", s: 15, u: 9, n: 10, gf: 66, ga: 49 },
                { rank: 5, id: "1fckaiserslautern_296", s: 13, u: 12, n: 9, gf: 43, ga: 42 },
                { rank: 6, id: "fcbayernmuenchen_0", s: 16, u: 5, n: 13, gf: 62, ga: 47 },
                { rank: 7, id: "1fckoeln_1070", s: 14, u: 9, n: 11, gf: 48, ga: 48 },
                { rank: 8, id: "borussiamoenchengladbach_1124", s: 12, u: 10, n: 12, gf: 70, ga: 49 },
                { rank: 9, id: "hannover96_536", s: 13, u: 8, n: 13, gf: 40, ga: 46 },
                { rank: 10, id: "1fcnuernberg_2", s: 12, u: 10, n: 12, gf: 43, ga: 50 },
                { rank: 11, id: "msvduisburg_1126", s: 10, u: 13, n: 11, gf: 40, ga: 42 },
                { rank: 12, id: "vfbstuttgart_898", s: 10, u: 13, n: 11, gf: 48, ga: 54 },
                { rank: 13, id: "karlsruhersc_902", s: 11, u: 9, n: 14, gf: 54, ga: 62 },
                { rank: 14, id: "hamburgersv_475", s: 10, u: 10, n: 14, gf: 37, ga: 53 },
                { rank: 15, id: "fcschalke04_1197", s: 12, u: 6, n: 16, gf: 37, ga: 63 },
                { rank: 16, id: "svwerderbremen_440", s: 10, u: 9, n: 15, gf: 49, ga: 56 },
                { rank: 17, id: "fortunaduesseldorf_1125", s: 9, u: 7, n: 18, gf: 44, ga: 66 },
                { rank: 18, id: "rotweissessen_1127", s: 6, u: 13, n: 15, gf: 35, ga: 53 }
            ]
        },
        {
            y: "1967/68", lid: "1",
            table: [
                { rank: 1, id: "1fcnuernberg_2", s: 19, u: 9, n: 6, gf: 71, ga: 37 },
                { rank: 2, id: "svwerderbremen_440", s: 18, u: 8, n: 8, gf: 68, ga: 51 },
                { rank: 3, id: "borussiamoenchengladbach_1124", s: 15, u: 12, n: 7, gf: 77, ga: 45 },
                { rank: 4, id: "1fckoeln_1070", s: 17, u: 4, n: 13, gf: 68, ga: 52 },
                { rank: 5, id: "fcbayernmuenchen_0", s: 16, u: 6, n: 12, gf: 68, ga: 58 },
                { rank: 6, id: "eintrachtfrankfurt_987", s: 15, u: 8, n: 11, gf: 58, ga: 51 },
                { rank: 7, id: "msvduisburg_1126", s: 13, u: 10, n: 11, gf: 69, ga: 58 },
                { rank: 8, id: "vfbstuttgart_898", s: 14, u: 7, n: 13, gf: 65, ga: 54 },
                { rank: 9, id: "eintrachtbraunschweig_537", s: 15, u: 5, n: 14, gf: 37, ga: 39 },
                { rank: 10, id: "hannover96_536", s: 12, u: 10, n: 12, gf: 48, ga: 52 },
                { rank: 11, id: "alemanniaaachen_1073", s: 13, u: 8, n: 13, gf: 52, ga: 66 },
                { rank: 12, id: "tsv1860muenchen_6", s: 11, u: 11, n: 12, gf: 55, ga: 39 },
                { rank: 13, id: "hamburgersv_475", s: 11, u: 11, n: 12, gf: 51, ga: 54 },
                { rank: 14, id: "borussiadortmund_1195", s: 12, u: 7, n: 15, gf: 60, ga: 59 },
                { rank: 15, id: "fcschalke04_1197", s: 11, u: 8, n: 15, gf: 42, ga: 48 },
                { rank: 16, id: "1fckaiserslautern_296", s: 8, u: 12, n: 14, gf: 39, ga: 67 },
                { rank: 17, id: "borussianeunkirchen_249", s: 7, u: 5, n: 22, gf: 33, ga: 93 },
                { rank: 18, id: "karlsruhersc_902", s: 6, u: 5, n: 23, gf: 32, ga: 70 }
            ]
        },
        {
            y: "1968/69", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 18, u: 10, n: 6, gf: 61, ga: 31 },
                { rank: 2, id: "alemanniaaachen_1073", s: 16, u: 6, n: 12, gf: 57, ga: 51 },
                { rank: 3, id: "borussiamoenchengladbach_1124", s: 13, u: 11, n: 10, gf: 61, ga: 46 },
                { rank: 4, id: "eintrachtbraunschweig_537", s: 13, u: 11, n: 10, gf: 46, ga: 43 },
                { rank: 5, id: "vfbstuttgart_898", s: 14, u: 8, n: 12, gf: 60, ga: 54 },
                { rank: 6, id: "hamburgersv_475", s: 13, u: 10, n: 11, gf: 55, ga: 55 },
                { rank: 7, id: "fcschalke04_1197", s: 14, u: 7, n: 13, gf: 45, ga: 40 },
                { rank: 8, id: "eintrachtfrankfurt_987", s: 13, u: 8, n: 13, gf: 46, ga: 43 },
                { rank: 9, id: "svwerderbremen_440", s: 14, u: 6, n: 14, gf: 59, ga: 59 },
                { rank: 10, id: "tsv1860muenchen_6", s: 15, u: 4, n: 15, gf: 44, ga: 59 },
                { rank: 11, id: "hannover96_536", s: 9, u: 14, n: 11, gf: 47, ga: 45 },
                { rank: 12, id: "msvduisburg_1126", s: 8, u: 16, n: 10, gf: 33, ga: 37 },
                { rank: 13, id: "1fckoeln_1070", s: 13, u: 6, n: 15, gf: 47, ga: 56 },
                { rank: 14, id: "herthabsc_695", s: 12, u: 8, n: 14, gf: 31, ga: 39 },
                { rank: 15, id: "1fckaiserslautern_296", s: 12, u: 6, n: 16, gf: 45, ga: 47 },
                { rank: 16, id: "borussiadortmund_1195", s: 11, u: 8, n: 15, gf: 49, ga: 54 },
                { rank: 17, id: "1fcnuernberg_2", s: 9, u: 11, n: 14, gf: 45, ga: 55 },
                { rank: 18, id: "kickersoffenbach_991", s: 10, u: 8, n: 16, gf: 42, ga: 59 }
            ]
        },
        {
            y: "1969/70", lid: "1",
            table: [
                { rank: 1, id: "borussiamoenchengladbach_1124", s: 23, u: 5, n: 6, gf: 71, ga: 29 },
                { rank: 2, id: "fcbayernmuenchen_0", s: 21, u: 5, n: 8, gf: 88, ga: 37 },
                { rank: 3, id: "herthabsc_695", s: 20, u: 5, n: 9, gf: 67, ga: 41 },
                { rank: 4, id: "1fckoeln_1070", s: 20, u: 3, n: 11, gf: 83, ga: 38 },
                { rank: 5, id: "borussiadortmund_1195", s: 14, u: 8, n: 12, gf: 60, ga: 67 },
                { rank: 6, id: "hamburgersv_475", s: 12, u: 11, n: 11, gf: 57, ga: 54 },
                { rank: 7, id: "vfbstuttgart_898", s: 14, u: 7, n: 13, gf: 59, ga: 62 },
                { rank: 8, id: "eintrachtfrankfurt_987", s: 12, u: 10, n: 12, gf: 54, ga: 54 },
                { rank: 9, id: "fcschalke04_1197", s: 11, u: 12, n: 11, gf: 43, ga: 54 },
                { rank: 10, id: "1fckaiserslautern_296", s: 10, u: 12, n: 12, gf: 44, ga: 55 },
                { rank: 11, id: "svwerderbremen_440", s: 10, u: 11, n: 13, gf: 38, ga: 47 },
                { rank: 12, id: "rotweissessen_1127", s: 8, u: 15, n: 11, gf: 41, ga: 54 },
                { rank: 13, id: "hannover96_536", s: 11, u: 8, n: 15, gf: 49, ga: 61 },
                { rank: 14, id: "rotweissoberhausen_1130", s: 11, u: 7, n: 16, gf: 50, ga: 62 },
                { rank: 15, id: "msvduisburg_1126", s: 9, u: 11, n: 14, gf: 35, ga: 48 },
                { rank: 16, id: "eintrachtbraunschweig_537", s: 9, u: 10, n: 15, gf: 40, ga: 49 },
                { rank: 17, id: "tsv1860muenchen_6", s: 9, u: 7, n: 18, gf: 41, ga: 56 },
                { rank: 18, id: "alemanniaaachen_1073", s: 5, u: 7, n: 22, gf: 31, ga: 83 }
            ]
        },
        {
            y: "1970/71", lid: "1",
            table: [
                { rank: 1, id: "borussiamoenchengladbach_1124", s: 20, u: 10, n: 4, gf: 77, ga: 35 },
                { rank: 2, id: "fcbayernmuenchen_0", s: 19, u: 10, n: 5, gf: 74, ga: 36 },
                { rank: 3, id: "herthabsc_695", s: 16, u: 9, n: 9, gf: 61, ga: 43 },
                { rank: 4, id: "eintrachtbraunschweig_537", s: 16, u: 7, n: 11, gf: 52, ga: 40 },
                { rank: 5, id: "hamburgersv_475", s: 13, u: 11, n: 10, gf: 54, ga: 63 },
                { rank: 6, id: "fcschalke04_1197", s: 15, u: 6, n: 13, gf: 44, ga: 40 },
                { rank: 7, id: "msvduisburg_1126", s: 12, u: 11, n: 11, gf: 43, ga: 47 },
                { rank: 8, id: "1fckaiserslautern_296", s: 15, u: 4, n: 15, gf: 54, ga: 57 },
                { rank: 9, id: "hannover96_536", s: 12, u: 9, n: 13, gf: 53, ga: 49 },
                { rank: 10, id: "svwerderbremen_440", s: 11, u: 11, n: 12, gf: 41, ga: 40 },
                { rank: 11, id: "1fckoeln_1070", s: 11, u: 11, n: 12, gf: 46, ga: 56 },
                { rank: 12, id: "vfbstuttgart_898", s: 11, u: 8, n: 15, gf: 49, ga: 49 },
                { rank: 13, id: "borussiadortmund_1195", s: 10, u: 9, n: 15, gf: 54, ga: 60 },
                { rank: 14, id: "arminiabielefeld_1200", s: 12, u: 5, n: 17, gf: 34, ga: 53 },
                { rank: 15, id: "eintrachtfrankfurt_987", s: 11, u: 6, n: 17, gf: 39, ga: 56 },
                { rank: 16, id: "rotweissoberhausen_1130", s: 9, u: 9, n: 16, gf: 54, ga: 69 },
                { rank: 17, id: "kickersoffenbach_991", s: 9, u: 9, n: 16, gf: 49, ga: 65 },
                { rank: 18, id: "rotweissessen_1127", s: 7, u: 9, n: 18, gf: 48, ga: 68 }
            ]
        },
        {
            y: "1971/72", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 24, u: 7, n: 3, gf: 101, ga: 38 },
                { rank: 2, id: "fcschalke04_1197", s: 24, u: 4, n: 6, gf: 76, ga: 35 },
                { rank: 3, id: "borussiamoenchengladbach_1124", s: 18, u: 7, n: 9, gf: 82, ga: 40 },
                { rank: 4, id: "1fckoeln_1070", s: 15, u: 13, n: 6, gf: 64, ga: 44 },
                { rank: 5, id: "eintrachtfrankfurt_987", s: 16, u: 7, n: 11, gf: 71, ga: 61 },
                { rank: 6, id: "herthabsc_695", s: 14, u: 9, n: 11, gf: 46, ga: 55 },
                { rank: 7, id: "1fckaiserslautern_296", s: 14, u: 7, n: 13, gf: 59, ga: 53 },
                { rank: 8, id: "vfbstuttgart_898", s: 13, u: 9, n: 12, gf: 52, ga: 56 },
                { rank: 9, id: "vflbochum_1196", s: 14, u: 6, n: 14, gf: 59, ga: 69 },
                { rank: 10, id: "hamburgersv_475", s: 13, u: 7, n: 14, gf: 52, ga: 52 },
                { rank: 11, id: "svwerderbremen_440", s: 11, u: 9, n: 14, gf: 63, ga: 58 },
                { rank: 12, id: "eintrachtbraunschweig_537", s: 8, u: 15, n: 11, gf: 43, ga: 48 },
                { rank: 13, id: "fortunaduesseldorf_1125", s: 10, u: 10, n: 14, gf: 40, ga: 53 },
                { rank: 14, id: "msvduisburg_1126", s: 10, u: 7, n: 17, gf: 36, ga: 51 },
                { rank: 15, id: "rotweissoberhausen_1130", s: 7, u: 11, n: 16, gf: 33, ga: 66 },
                { rank: 16, id: "hannover96_536", s: 10, u: 3, n: 21, gf: 54, ga: 69 },
                { rank: 17, id: "borussiadortmund_1195", s: 6, u: 8, n: 20, gf: 34, ga: 83 },
                { rank: 18, id: "arminiabielefeld_1200", s: 6, u: 7, n: 21, gf: 41, ga: 75 }
            ]
        },
        {
            y: "1972/73", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 25, u: 4, n: 5, gf: 93, ga: 29 },
                { rank: 2, id: "1fckoeln_1070", s: 16, u: 11, n: 7, gf: 66, ga: 51 },
                { rank: 3, id: "fortunaduesseldorf_1125", s: 15, u: 12, n: 7, gf: 62, ga: 45 },
                { rank: 4, id: "wuppertalersv_1129", s: 15, u: 10, n: 9, gf: 62, ga: 49 },
                { rank: 5, id: "borussiamoenchengladbach_1124", s: 17, u: 5, n: 12, gf: 82, ga: 61 },
                { rank: 6, id: "vfbstuttgart_898", s: 17, u: 3, n: 14, gf: 71, ga: 65 },
                { rank: 7, id: "kickersoffenbach_991", s: 14, u: 7, n: 13, gf: 61, ga: 60 },
                { rank: 8, id: "eintrachtfrankfurt_987", s: 15, u: 4, n: 15, gf: 58, ga: 54 },
                { rank: 9, id: "1fckaiserslautern_296", s: 12, u: 10, n: 12, gf: 58, ga: 68 },
                { rank: 10, id: "msvduisburg_1126", s: 12, u: 9, n: 13, gf: 53, ga: 54 },
                { rank: 11, id: "svwerderbremen_440", s: 12, u: 7, n: 15, gf: 50, ga: 52 },
                { rank: 12, id: "vflbochum_1196", s: 11, u: 9, n: 14, gf: 50, ga: 68 },
                { rank: 13, id: "herthabsc_695", s: 11, u: 8, n: 15, gf: 53, ga: 64 },
                { rank: 14, id: "hamburgersv_475", s: 10, u: 8, n: 16, gf: 53, ga: 59 },
                { rank: 15, id: "fcschalke04_1197", s: 10, u: 8, n: 16, gf: 46, ga: 61 },
                { rank: 16, id: "hannover96_536", s: 9, u: 8, n: 17, gf: 49, ga: 65 },
                { rank: 17, id: "eintrachtbraunschweig_537", s: 9, u: 7, n: 18, gf: 33, ga: 56 },
                { rank: 18, id: "rotweissoberhausen_1130", s: 9, u: 4, n: 21, gf: 45, ga: 84 }
            ]
        },
        {
            y: "1973/74", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 20, u: 9, n: 5, gf: 95, ga: 53 },
                { rank: 2, id: "borussiamoenchengladbach_1124", s: 21, u: 6, n: 7, gf: 93, ga: 52 },
                { rank: 3, id: "fortunaduesseldorf_1125", s: 16, u: 9, n: 9, gf: 61, ga: 47 },
                { rank: 4, id: "eintrachtfrankfurt_987", s: 15, u: 11, n: 8, gf: 63, ga: 50 },
                { rank: 5, id: "1fckoeln_1070", s: 16, u: 7, n: 11, gf: 69, ga: 56 },
                { rank: 6, id: "1fckaiserslautern_296", s: 15, u: 8, n: 11, gf: 80, ga: 69 },
                { rank: 7, id: "fcschalke04_1197", s: 16, u: 5, n: 13, gf: 72, ga: 68 },
                { rank: 8, id: "herthabsc_695", s: 11, u: 11, n: 12, gf: 56, ga: 60 },
                { rank: 9, id: "vfbstuttgart_898", s: 12, u: 7, n: 15, gf: 58, ga: 57 },
                { rank: 10, id: "kickersoffenbach_991", s: 11, u: 9, n: 14, gf: 56, ga: 62 },
                { rank: 11, id: "svwerderbremen_440", s: 9, u: 13, n: 12, gf: 48, ga: 56 },
                { rank: 12, id: "hamburgersv_475", s: 13, u: 5, n: 16, gf: 53, ga: 62 },
                { rank: 13, id: "rotweissessen_1127", s: 10, u: 11, n: 13, gf: 56, ga: 70 },
                { rank: 14, id: "vflbochum_1196", s: 9, u: 12, n: 13, gf: 45, ga: 57 },
                { rank: 15, id: "msvduisburg_1126", s: 11, u: 7, n: 16, gf: 42, ga: 56 },
                { rank: 16, id: "wuppertalersv_1129", s: 8, u: 9, n: 17, gf: 42, ga: 65 },
                { rank: 17, id: "scfortunakoeln_1074", s: 8, u: 9, n: 17, gf: 46, ga: 79 },
                { rank: 18, id: "hannover96_536", s: 6, u: 10, n: 18, gf: 50, ga: 66 }
            ]
        },
        {
            y: "1974/75", lid: "1",
            table: [
                { rank: 1, id: "borussiamoenchengladbach_1124", s: 21, u: 8, n: 5, gf: 86, ga: 40 },
                { rank: 2, id: "herthabsc_695", s: 19, u: 6, n: 9, gf: 61, ga: 43 },
                { rank: 3, id: "eintrachtfrankfurt_987", s: 18, u: 7, n: 9, gf: 89, ga: 49 },
                { rank: 4, id: "hamburgersv_475", s: 18, u: 7, n: 9, gf: 55, ga: 38 },
                { rank: 5, id: "1fckoeln_1070", s: 17, u: 7, n: 10, gf: 77, ga: 51 },
                { rank: 6, id: "fortunaduesseldorf_1125", s: 16, u: 9, n: 9, gf: 66, ga: 55 },
                { rank: 7, id: "fcschalke04_1197", s: 16, u: 7, n: 11, gf: 52, ga: 37 },
                { rank: 8, id: "kickersoffenbach_991", s: 17, u: 4, n: 13, gf: 72, ga: 62 },
                { rank: 9, id: "eintrachtbraunschweig_537", s: 14, u: 8, n: 12, gf: 52, ga: 42 },
                { rank: 10, id: "fcbayernmuenchen_0", s: 14, u: 6, n: 14, gf: 57, ga: 63 },
                { rank: 11, id: "vflbochum_1196", s: 14, u: 5, n: 15, gf: 53, ga: 53 },
                { rank: 12, id: "rotweissessen_1127", s: 10, u: 12, n: 12, gf: 56, ga: 68 },
                { rank: 13, id: "1fckaiserslautern_296", s: 13, u: 5, n: 16, gf: 56, ga: 55 },
                { rank: 14, id: "msvduisburg_1126", s: 12, u: 6, n: 16, gf: 59, ga: 77 },
                { rank: 15, id: "svwerderbremen_440", s: 9, u: 7, n: 18, gf: 45, ga: 69 },
                { rank: 16, id: "vfbstuttgart_898", s: 8, u: 8, n: 18, gf: 50, ga: 79 },
                { rank: 17, id: "tennisborussiaberlin_708", s: 5, u: 6, n: 23, gf: 38, ga: 89 },
                { rank: 18, id: "wuppertalersv_1129", s: 2, u: 8, n: 24, gf: 32, ga: 86 }
            ]
        },
        {
            y: "1975/76", lid: "1",
            table: [
                { rank: 1, id: "borussiamoenchengladbach_1124", s: 16, u: 13, n: 5, gf: 66, ga: 37 },
                { rank: 2, id: "hamburgersv_475", s: 17, u: 7, n: 10, gf: 59, ga: 32 },
                { rank: 3, id: "fcbayernmuenchen_0", s: 15, u: 10, n: 9, gf: 72, ga: 50 },
                { rank: 4, id: "1fckoeln_1070", s: 14, u: 11, n: 9, gf: 62, ga: 45 },
                { rank: 5, id: "eintrachtbraunschweig_537", s: 14, u: 11, n: 9, gf: 52, ga: 48 },
                { rank: 6, id: "fcschalke04_1197", s: 13, u: 11, n: 10, gf: 76, ga: 55 },
                { rank: 7, id: "1fckaiserslautern_296", s: 15, u: 7, n: 12, gf: 66, ga: 60 },
                { rank: 8, id: "rotweissessen_1127", s: 13, u: 11, n: 10, gf: 61, ga: 67 },
                { rank: 9, id: "eintrachtfrankfurt_987", s: 13, u: 10, n: 11, gf: 79, ga: 58 },
                { rank: 10, id: "msvduisburg_1126", s: 13, u: 7, n: 14, gf: 55, ga: 62 },
                { rank: 11, id: "herthabsc_695", s: 11, u: 10, n: 13, gf: 59, ga: 61 },
                { rank: 12, id: "fortunaduesseldorf_1125", s: 10, u: 10, n: 14, gf: 47, ga: 57 },
                { rank: 13, id: "svwerderbremen_440", s: 11, u: 8, n: 15, gf: 44, ga: 55 },
                { rank: 14, id: "vflbochum_1196", s: 12, u: 6, n: 16, gf: 49, ga: 62 },
                { rank: 15, id: "karlsruhersc_902", s: 12, u: 6, n: 16, gf: 46, ga: 59 },
                { rank: 16, id: "hannover96_536", s: 9, u: 9, n: 16, gf: 48, ga: 60 },
                { rank: 17, id: "kickersoffenbach_991", s: 9, u: 9, n: 16, gf: 40, ga: 72 },
                { rank: 18, id: "kfcuerdingen05_1140", s: 6, u: 10, n: 18, gf: 28, ga: 69 }
            ]
        },
        {
            y: "1976/77", lid: "1",
            table: [
                { rank: 1, id: "borussiamoenchengladbach_1124", s: 17, u: 10, n: 7, gf: 58, ga: 34 },
                { rank: 2, id: "fcschalke04_1197", s: 17, u: 9, n: 8, gf: 77, ga: 52 },
                { rank: 3, id: "eintrachtbraunschweig_537", s: 15, u: 13, n: 6, gf: 56, ga: 38 },
                { rank: 4, id: "eintrachtfrankfurt_987", s: 17, u: 8, n: 9, gf: 86, ga: 57 },
                { rank: 5, id: "1fckoeln_1070", s: 17, u: 6, n: 11, gf: 83, ga: 61 },
                { rank: 6, id: "hamburgersv_475", s: 14, u: 10, n: 10, gf: 67, ga: 56 },
                { rank: 7, id: "fcbayernmuenchen_0", s: 14, u: 9, n: 11, gf: 74, ga: 65 },
                { rank: 8, id: "borussiadortmund_1195", s: 12, u: 10, n: 12, gf: 73, ga: 64 },
                { rank: 9, id: "msvduisburg_1126", s: 11, u: 12, n: 11, gf: 60, ga: 51 },
                { rank: 10, id: "herthabsc_695", s: 13, u: 8, n: 13, gf: 55, ga: 54 },
                { rank: 11, id: "svwerderbremen_440", s: 13, u: 7, n: 14, gf: 51, ga: 59 },
                { rank: 12, id: "fortunaduesseldorf_1125", s: 11, u: 9, n: 14, gf: 52, ga: 54 },
                { rank: 13, id: "1fckaiserslautern_296", s: 12, u: 5, n: 17, gf: 53, ga: 59 },
                { rank: 14, id: "1fcsaarbruecken_238", s: 9, u: 11, n: 14, gf: 43, ga: 55 },
                { rank: 15, id: "vflbochum_1196", s: 11, u: 7, n: 16, gf: 47, ga: 62 },
                { rank: 16, id: "karlsruhersc_902", s: 9, u: 10, n: 15, gf: 53, ga: 75 },
                { rank: 17, id: "tennisborussiaberlin_708", s: 6, u: 10, n: 18, gf: 47, ga: 85 },
                { rank: 18, id: "rotweissessen_1127", s: 7, u: 8, n: 19, gf: 49, ga: 103 }
            ]
        },
        {
            y: "1977/78", lid: "1",
            table: [
                { rank: 1, id: "1fckoeln_1070", s: 22, u: 4, n: 8, gf: 86, ga: 41 },
                { rank: 2, id: "borussiamoenchengladbach_1124", s: 20, u: 8, n: 6, gf: 86, ga: 44 },
                { rank: 3, id: "herthabsc_695", s: 15, u: 10, n: 9, gf: 59, ga: 48 },
                { rank: 4, id: "vfbstuttgart_898", s: 17, u: 5, n: 12, gf: 58, ga: 40 },
                { rank: 5, id: "fortunaduesseldorf_1125", s: 15, u: 9, n: 10, gf: 49, ga: 36 },
                { rank: 6, id: "msvduisburg_1126", s: 15, u: 7, n: 12, gf: 62, ga: 59 },
                { rank: 7, id: "eintrachtfrankfurt_987", s: 16, u: 4, n: 14, gf: 59, ga: 52 },
                { rank: 8, id: "1fckaiserslautern_296", s: 16, u: 4, n: 14, gf: 64, ga: 63 },
                { rank: 9, id: "fcschalke04_1197", s: 14, u: 6, n: 14, gf: 47, ga: 52 },
                { rank: 10, id: "hamburgersv_475", s: 14, u: 6, n: 14, gf: 61, ga: 67 },
                { rank: 11, id: "borussiadortmund_1195", s: 14, u: 5, n: 15, gf: 57, ga: 71 },
                { rank: 12, id: "fcbayernmuenchen_0", s: 11, u: 10, n: 13, gf: 62, ga: 64 },
                { rank: 13, id: "eintrachtbraunschweig_537", s: 14, u: 4, n: 16, gf: 43, ga: 53 },
                { rank: 14, id: "vflbochum_1196", s: 11, u: 9, n: 14, gf: 49, ga: 51 },
                { rank: 15, id: "svwerderbremen_440", s: 13, u: 5, n: 16, gf: 48, ga: 57 },
                { rank: 16, id: "tsv1860muenchen_6", s: 7, u: 8, n: 19, gf: 41, ga: 60 },
                { rank: 17, id: "1fcsaarbruecken_238", s: 6, u: 10, n: 18, gf: 39, ga: 70 },
                { rank: 18, id: "fcstpauli_476", s: 6, u: 6, n: 22, gf: 44, ga: 86 }
            ]
        },
        {
            y: "1978/79", lid: "1",
            table: [
                { rank: 1, id: "hamburgersv_475", s: 21, u: 7, n: 6, gf: 78, ga: 32 },
                { rank: 2, id: "vfbstuttgart_898", s: 20, u: 8, n: 6, gf: 73, ga: 34 },
                { rank: 3, id: "1fckaiserslautern_296", s: 16, u: 11, n: 7, gf: 62, ga: 47 },
                { rank: 4, id: "fcbayernmuenchen_0", s: 16, u: 8, n: 10, gf: 69, ga: 46 },
                { rank: 5, id: "eintrachtfrankfurt_987", s: 16, u: 7, n: 11, gf: 50, ga: 49 },
                { rank: 6, id: "1fckoeln_1070", s: 13, u: 12, n: 9, gf: 55, ga: 47 },
                { rank: 7, id: "fortunaduesseldorf_1125", s: 13, u: 11, n: 10, gf: 70, ga: 59 },
                { rank: 8, id: "vflbochum_1196", s: 10, u: 13, n: 11, gf: 47, ga: 46 },
                { rank: 9, id: "eintrachtbraunschweig_537", s: 10, u: 13, n: 11, gf: 50, ga: 55 },
                { rank: 10, id: "borussiamoenchengladbach_1124", s: 12, u: 8, n: 14, gf: 50, ga: 53 },
                { rank: 11, id: "svwerderbremen_440", s: 10, u: 11, n: 13, gf: 48, ga: 60 },
                { rank: 12, id: "borussiadortmund_1195", s: 10, u: 11, n: 13, gf: 54, ga: 70 },
                { rank: 13, id: "msvduisburg_1126", s: 12, u: 6, n: 16, gf: 43, ga: 56 },
                { rank: 14, id: "herthabsc_695", s: 9, u: 11, n: 14, gf: 40, ga: 50 },
                { rank: 15, id: "fcschalke04_1197", s: 9, u: 10, n: 15, gf: 55, ga: 61 },
                { rank: 16, id: "arminiabielefeld_1200", s: 9, u: 8, n: 17, gf: 43, ga: 56 },
                { rank: 17, id: "1fcnuernberg_2", s: 8, u: 8, n: 18, gf: 36, ga: 67 },
                { rank: 18, id: "svdarmstadt98_988", s: 7, u: 7, n: 20, gf: 40, ga: 75 }
            ]
        },
        {
            y: "1979/80", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 22, u: 6, n: 6, gf: 84, ga: 33 },
                { rank: 2, id: "hamburgersv_475", s: 20, u: 8, n: 6, gf: 86, ga: 35 },
                { rank: 3, id: "1fckaiserslautern_296", s: 18, u: 5, n: 11, gf: 75, ga: 53 },
                { rank: 4, id: "vfbstuttgart_898", s: 17, u: 7, n: 10, gf: 75, ga: 53 },
                { rank: 5, id: "1fckoeln_1070", s: 14, u: 9, n: 11, gf: 72, ga: 55 },
                { rank: 6, id: "borussiadortmund_1195", s: 14, u: 8, n: 12, gf: 64, ga: 56 },
                { rank: 7, id: "borussiamoenchengladbach_1124", s: 12, u: 12, n: 10, gf: 61, ga: 60 },
                { rank: 8, id: "fcschalke04_1197", s: 12, u: 9, n: 13, gf: 40, ga: 51 },
                { rank: 9, id: "eintrachtfrankfurt_987", s: 15, u: 2, n: 17, gf: 65, ga: 61 },
                { rank: 10, id: "vflbochum_1196", s: 13, u: 6, n: 15, gf: 41, ga: 44 },
                { rank: 11, id: "fortunaduesseldorf_1125", s: 13, u: 6, n: 15, gf: 62, ga: 72 },
                { rank: 12, id: "bayer04leverkusen_1069", s: 12, u: 8, n: 14, gf: 45, ga: 61 },
                { rank: 13, id: "tsv1860muenchen_6", s: 10, u: 10, n: 14, gf: 42, ga: 53 },
                { rank: 14, id: "msvduisburg_1126", s: 11, u: 7, n: 16, gf: 43, ga: 57 },
                { rank: 15, id: "kfcuerdingen05_1140", s: 12, u: 5, n: 17, gf: 43, ga: 61 },
                { rank: 16, id: "herthabsc_695", s: 11, u: 7, n: 16, gf: 41, ga: 61 },
                { rank: 17, id: "svwerderbremen_440", s: 11, u: 3, n: 20, gf: 52, ga: 93 },
                { rank: 18, id: "eintrachtbraunschweig_537", s: 6, u: 8, n: 20, gf: 32, ga: 64 }
            ]
        },
        {
            y: "1980/81", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 22, u: 9, n: 3, gf: 89, ga: 41 },
                { rank: 2, id: "hamburgersv_475", s: 21, u: 7, n: 6, gf: 73, ga: 43 },
                { rank: 3, id: "vfbstuttgart_898", s: 19, u: 8, n: 7, gf: 70, ga: 44 },
                { rank: 4, id: "1fckaiserslautern_296", s: 17, u: 10, n: 7, gf: 60, ga: 37 },
                { rank: 5, id: "eintrachtfrankfurt_987", s: 13, u: 12, n: 9, gf: 61, ga: 57 },
                { rank: 6, id: "borussiamoenchengladbach_1124", s: 15, u: 7, n: 12, gf: 68, ga: 64 },
                { rank: 7, id: "borussiadortmund_1195", s: 13, u: 9, n: 12, gf: 69, ga: 59 },
                { rank: 8, id: "1fckoeln_1070", s: 12, u: 10, n: 12, gf: 54, ga: 55 },
                { rank: 9, id: "vflbochum_1196", s: 9, u: 15, n: 10, gf: 53, ga: 45 },
                { rank: 10, id: "karlsruhersc_902", s: 9, u: 14, n: 11, gf: 56, ga: 63 },
                { rank: 11, id: "bayer04leverkusen_1069", s: 10, u: 10, n: 14, gf: 52, ga: 53 },
                { rank: 12, id: "msvduisburg_1126", s: 10, u: 9, n: 15, gf: 45, ga: 58 },
                { rank: 13, id: "fortunaduesseldorf_1125", s: 10, u: 8, n: 16, gf: 57, ga: 64 },
                { rank: 14, id: "1fcnuernberg_2", s: 11, u: 6, n: 17, gf: 47, ga: 57 },
                { rank: 15, id: "arminiabielefeld_1200", s: 10, u: 6, n: 18, gf: 46, ga: 65 },
                { rank: 16, id: "tsv1860muenchen_6", s: 9, u: 7, n: 18, gf: 49, ga: 67 },
                { rank: 17, id: "fcschalke04_1197", s: 8, u: 7, n: 19, gf: 43, ga: 88 },
                { rank: 18, id: "kfcuerdingen05_1140", s: 8, u: 6, n: 20, gf: 47, ga: 79 }
            ]
        },
        {
            y: "1981/82", lid: "1",
            table: [
                { rank: 1, id: "hamburgersv_475", s: 18, u: 12, n: 4, gf: 95, ga: 45 },
                { rank: 2, id: "1fckoeln_1070", s: 18, u: 9, n: 7, gf: 72, ga: 38 },
                { rank: 3, id: "fcbayernmuenchen_0", s: 20, u: 3, n: 11, gf: 77, ga: 56 },
                { rank: 4, id: "1fckaiserslautern_296", s: 16, u: 10, n: 8, gf: 70, ga: 61 },
                { rank: 5, id: "svwerderbremen_440", s: 17, u: 8, n: 9, gf: 61, ga: 52 },
                { rank: 6, id: "borussiadortmund_1195", s: 18, u: 5, n: 11, gf: 59, ga: 40 },
                { rank: 7, id: "borussiamoenchengladbach_1124", s: 15, u: 10, n: 9, gf: 61, ga: 51 },
                { rank: 8, id: "eintrachtfrankfurt_987", s: 17, u: 3, n: 14, gf: 83, ga: 72 },
                { rank: 9, id: "vfbstuttgart_898", s: 13, u: 9, n: 12, gf: 62, ga: 55 },
                { rank: 10, id: "vflbochum_1196", s: 12, u: 8, n: 14, gf: 52, ga: 51 },
                { rank: 11, id: "eintrachtbraunschweig_537", s: 14, u: 4, n: 16, gf: 61, ga: 66 },
                { rank: 12, id: "arminiabielefeld_1200", s: 12, u: 6, n: 16, gf: 46, ga: 50 },
                { rank: 13, id: "1fcnuernberg_2", s: 11, u: 6, n: 17, gf: 53, ga: 72 },
                { rank: 14, id: "karlsruhersc_902", s: 9, u: 9, n: 16, gf: 50, ga: 68 },
                { rank: 15, id: "fortunaduesseldorf_1125", s: 6, u: 13, n: 15, gf: 48, ga: 73 },
                { rank: 16, id: "bayer04leverkusen_1069", s: 9, u: 7, n: 18, gf: 45, ga: 72 },
                { rank: 17, id: "svdarmstadt98_988", s: 5, u: 11, n: 18, gf: 46, ga: 82 },
                { rank: 18, id: "msvduisburg_1126", s: 8, u: 3, n: 23, gf: 40, ga: 77 }
            ]
        },
        {
            y: "1982/83", lid: "1",
            table: [
                { rank: 1, id: "hamburgersv_475", s: 20, u: 12, n: 2, gf: 79, ga: 33 },
                { rank: 2, id: "svwerderbremen_440", s: 23, u: 6, n: 5, gf: 76, ga: 38 },
                { rank: 3, id: "vfbstuttgart_898", s: 20, u: 8, n: 6, gf: 80, ga: 47 },
                { rank: 4, id: "fcbayernmuenchen_0", s: 17, u: 10, n: 7, gf: 74, ga: 33 },
                { rank: 5, id: "1fckoeln_1070", s: 17, u: 9, n: 8, gf: 69, ga: 42 },
                { rank: 6, id: "1fckaiserslautern_296", s: 14, u: 13, n: 7, gf: 57, ga: 44 },
                { rank: 7, id: "borussiadortmund_1195", s: 16, u: 7, n: 11, gf: 78, ga: 62 },
                { rank: 8, id: "arminiabielefeld_1200", s: 12, u: 7, n: 15, gf: 46, ga: 71 },
                { rank: 9, id: "fortunaduesseldorf_1125", s: 11, u: 8, n: 15, gf: 63, ga: 75 },
                { rank: 10, id: "eintrachtfrankfurt_987", s: 12, u: 5, n: 17, gf: 48, ga: 57 },
                { rank: 11, id: "bayer04leverkusen_1069", s: 10, u: 9, n: 15, gf: 43, ga: 66 },
                { rank: 12, id: "borussiamoenchengladbach_1124", s: 12, u: 4, n: 18, gf: 64, ga: 63 },
                { rank: 13, id: "vflbochum_1196", s: 8, u: 12, n: 14, gf: 43, ga: 49 },
                { rank: 14, id: "1fcnuernberg_2", s: 11, u: 6, n: 17, gf: 44, ga: 70 },
                { rank: 15, id: "eintrachtbraunschweig_537", s: 8, u: 11, n: 15, gf: 42, ga: 65 },
                { rank: 16, id: "fcschalke04_1197", s: 8, u: 6, n: 20, gf: 48, ga: 68 },
                { rank: 17, id: "karlsruhersc_902", s: 7, u: 7, n: 20, gf: 39, ga: 86 },
                { rank: 18, id: "herthabsc_695", s: 5, u: 10, n: 19, gf: 43, ga: 67 }
            ]
        },
        {
            y: "1983/84", lid: "1",
            table: [
                { rank: 1, id: "vfbstuttgart_898", s: 19, u: 10, n: 5, gf: 79, ga: 33 },
                { rank: 2, id: "hamburgersv_475", s: 21, u: 6, n: 7, gf: 75, ga: 36 },
                { rank: 3, id: "borussiamoenchengladbach_1124", s: 21, u: 6, n: 7, gf: 81, ga: 48 },
                { rank: 4, id: "fcbayernmuenchen_0", s: 20, u: 7, n: 7, gf: 84, ga: 41 },
                { rank: 5, id: "svwerderbremen_440", s: 19, u: 7, n: 8, gf: 79, ga: 46 },
                { rank: 6, id: "1fckoeln_1070", s: 16, u: 6, n: 12, gf: 70, ga: 57 },
                { rank: 7, id: "bayer04leverkusen_1069", s: 13, u: 8, n: 13, gf: 50, ga: 50 },
                { rank: 8, id: "arminiabielefeld_1200", s: 12, u: 9, n: 13, gf: 40, ga: 49 },
                { rank: 9, id: "eintrachtbraunschweig_537", s: 13, u: 6, n: 15, gf: 54, ga: 69 },
                { rank: 10, id: "kfcuerdingen05_1140", s: 12, u: 7, n: 15, gf: 66, ga: 79 },
                { rank: 11, id: "svwaldhofmannheim_905", s: 10, u: 11, n: 13, gf: 45, ga: 58 },
                { rank: 12, id: "1fckaiserslautern_296", s: 12, u: 6, n: 16, gf: 68, ga: 69 },
                { rank: 13, id: "borussiadortmund_1195", s: 11, u: 8, n: 15, gf: 54, ga: 65 },
                { rank: 14, id: "fortunaduesseldorf_1125", s: 11, u: 7, n: 16, gf: 63, ga: 75 },
                { rank: 15, id: "vflbochum_1196", s: 10, u: 8, n: 16, gf: 58, ga: 70 },
                { rank: 16, id: "eintrachtfrankfurt_987", s: 7, u: 13, n: 14, gf: 45, ga: 61 },
                { rank: 17, id: "kickersoffenbach_991", s: 7, u: 5, n: 22, gf: 48, ga: 106 },
                { rank: 18, id: "1fcnuernberg_2", s: 6, u: 2, n: 26, gf: 38, ga: 85 }
            ]
        },
        {
            y: "1984/85", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 21, u: 8, n: 5, gf: 79, ga: 38 },
                { rank: 2, id: "svwerderbremen_440", s: 18, u: 10, n: 6, gf: 87, ga: 51 },
                { rank: 3, id: "1fckoeln_1070", s: 18, u: 4, n: 12, gf: 69, ga: 66 },
                { rank: 4, id: "borussiamoenchengladbach_1124", s: 15, u: 9, n: 10, gf: 77, ga: 53 },
                { rank: 5, id: "hamburgersv_475", s: 14, u: 9, n: 11, gf: 58, ga: 49 },
                { rank: 6, id: "svwaldhofmannheim_905", s: 13, u: 11, n: 10, gf: 47, ga: 50 },
                { rank: 7, id: "kfcuerdingen05_1140", s: 14, u: 8, n: 12, gf: 57, ga: 52 },
                { rank: 8, id: "fcschalke04_1197", s: 13, u: 8, n: 13, gf: 63, ga: 62 },
                { rank: 9, id: "vflbochum_1196", s: 12, u: 10, n: 12, gf: 52, ga: 54 },
                { rank: 10, id: "vfbstuttgart_898", s: 14, u: 5, n: 15, gf: 79, ga: 59 },
                { rank: 11, id: "1fckaiserslautern_296", s: 11, u: 11, n: 12, gf: 56, ga: 60 },
                { rank: 12, id: "eintrachtfrankfurt_987", s: 10, u: 12, n: 12, gf: 62, ga: 67 },
                { rank: 13, id: "bayer04leverkusen_1069", s: 9, u: 13, n: 12, gf: 52, ga: 54 },
                { rank: 14, id: "borussiadortmund_1195", s: 13, u: 4, n: 17, gf: 51, ga: 65 },
                { rank: 15, id: "fortunaduesseldorf_1125", s: 10, u: 9, n: 15, gf: 53, ga: 66 },
                { rank: 16, id: "arminiabielefeld_1200", s: 8, u: 13, n: 13, gf: 46, ga: 61 },
                { rank: 17, id: "karlsruhersc_902", s: 5, u: 12, n: 17, gf: 47, ga: 88 },
                { rank: 18, id: "eintrachtbraunschweig_537", s: 9, u: 2, n: 23, gf: 39, ga: 79 }
            ]
        },
        {
            y: "1985/86", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 21, u: 7, n: 6, gf: 82, ga: 31 },
                { rank: 2, id: "svwerderbremen_440", s: 20, u: 9, n: 5, gf: 83, ga: 41 },
                { rank: 3, id: "kfcuerdingen05_1140", s: 19, u: 7, n: 8, gf: 63, ga: 60 },
                { rank: 4, id: "borussiamoenchengladbach_1124", s: 15, u: 12, n: 7, gf: 65, ga: 51 },
                { rank: 5, id: "vfbstuttgart_898", s: 17, u: 7, n: 10, gf: 69, ga: 45 },
                { rank: 6, id: "bayer04leverkusen_1069", s: 15, u: 10, n: 9, gf: 63, ga: 51 },
                { rank: 7, id: "hamburgersv_475", s: 17, u: 5, n: 12, gf: 52, ga: 35 },
                { rank: 8, id: "svwaldhofmannheim_905", s: 11, u: 11, n: 12, gf: 41, ga: 44 },
                { rank: 9, id: "vflbochum_1196", s: 14, u: 4, n: 16, gf: 55, ga: 57 },
                { rank: 10, id: "fcschalke04_1197", s: 11, u: 8, n: 15, gf: 53, ga: 58 },
                { rank: 11, id: "1fckaiserslautern_296", s: 10, u: 10, n: 14, gf: 49, ga: 54 },
                { rank: 12, id: "1fcnuernberg_2", s: 12, u: 5, n: 17, gf: 51, ga: 54 },
                { rank: 13, id: "1fckoeln_1070", s: 9, u: 11, n: 14, gf: 46, ga: 59 },
                { rank: 14, id: "fortunaduesseldorf_1125", s: 11, u: 7, n: 16, gf: 54, ga: 78 },
                { rank: 15, id: "eintrachtfrankfurt_987", s: 7, u: 14, n: 13, gf: 35, ga: 49 },
                { rank: 16, id: "borussiadortmund_1195", s: 10, u: 8, n: 16, gf: 49, ga: 65 },
                { rank: 17, id: "1fcsaarbruecken_238", s: 6, u: 9, n: 19, gf: 39, ga: 68 },
                { rank: 18, id: "hannover96_536", s: 5, u: 8, n: 21, gf: 43, ga: 92 }
            ]
        },
        {
            y: "1986/87", lid: "1",
            table: [
                { rank: 1, id: "fcbayernmuenchen_0", s: 20, u: 13, n: 1, gf: 67, ga: 31 },
                { rank: 2, id: "hamburgersv_475", s: 19, u: 9, n: 6, gf: 69, ga: 37 },
                { rank: 3, id: "borussiamoenchengladbach_1124", s: 18, u: 7, n: 9, gf: 74, ga: 44 },
                { rank: 4, id: "borussiadortmund_1195", s: 15, u: 10, n: 9, gf: 70, ga: 50 },
                { rank: 5, id: "svwerderbremen_440", s: 17, u: 6, n: 11, gf: 65, ga: 54 },
                { rank: 6, id: "bayer04leverkusen_1069", s: 16, u: 7, n: 11, gf: 56, ga: 38 },
                { rank: 7, id: "1fckaiserslautern_296", s: 15, u: 7, n: 12, gf: 64, ga: 51 },
                { rank: 8, id: "kfcuerdingen05_1140", s: 12, u: 11, n: 11, gf: 51, ga: 49 },
                { rank: 9, id: "1fcnuernberg_2", s: 12, u: 11, n: 11, gf: 62, ga: 62 },
                { rank: 10, id: "1fckoeln_1070", s: 13, u: 9, n: 12, gf: 50, ga: 53 },
                { rank: 11, id: "vflbochum_1196", s: 9, u: 14, n: 11, gf: 52, ga: 44 },
                { rank: 12, id: "vfbstuttgart_898", s: 13, u: 6, n: 15, gf: 55, ga: 49 },
                { rank: 13, id: "fcschalke04_1197", s: 12, u: 8, n: 14, gf: 50, ga: 58 },
                { rank: 14, id: "svwaldhofmannheim_905", s: 10, u: 8, n: 16, gf: 52, ga: 71 },
                { rank: 15, id: "eintrachtfrankfurt_987", s: 8, u: 9, n: 17, gf: 42, ga: 53 },
                { rank: 16, id: "fc08homburg_239", s: 6, u: 9, n: 19, gf: 33, ga: 79 },
                { rank: 17, id: "fortunaduesseldorf_1125", s: 7, u: 6, n: 21, gf: 42, ga: 91 },
                { rank: 18, id: "blauweiss90berlin_757", s: 3, u: 12, n: 19, gf: 36, ga: 76 }
            ]
        }
    ]
};
