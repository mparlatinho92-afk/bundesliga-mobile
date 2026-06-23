// Historische Abschlusstabellen (Statistik-Seed) – fließen über Engine._seedHistory in die
// ewige Tabelle/Titel ein. Gespeichert werden FAKTEN: rank (hist. Platz, Original 2-Punkte-Ära),
// s/u/n (Siege/Remis/Niederlagen), gf/ga (Tore). Punkte werden 3-Punkte-normalisiert (3*s+u) beim Seeden.
// Quellen: de.wikipedia.org (primär) + rsssf.org (Cross-Check). PoC: 1. Bundesliga 1963/64.
var HISTORY_SEED = {
    format: "ba-history-seed/1",
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
        }
    ]
};
