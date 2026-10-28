# Historischer DFB-Pokal (Tschammerpokal 1935–43, DFB-Pokal 1952/53–2024/25)

Aufgebaut am 27./28.10.2026 (Nutzer: „dfb-pokal erhält komplette historische ewige tabelle“, Tschammerpokal ja – „offiziell ist es auch so“).

## Kette

```
node tools/wiki_pokal.mjs             # Saisonartikel de.wikipedia -> tools/wiki_pokal.json (Cache %TEMP%/pokal_wiki_cache)
node tools/wiki_pokal_zuordnung.mjs   # Namen -> IDs -> tools/wiki_pokal_ids.json, Bericht tools/_dryrun/wiki_pokal_zuordnung.txt
node tools/pokal_ewig_vergleich.mjs --ids   # Gegenprobe gegen die offizielle "Ewige Tabelle des DFB-Pokals"
node tools/pokal_hist_einbau.mjs      # -> app/pokal_hist_data.js (ERZEUGT, nie von Hand ändern)
node tools/pokal_hist_test.cjs        # Sieger = POKAL_SEED, Spielzahl = Quelle, Summen (mit --selbsttest)
node .claude/skills/run/pokal_hist_check.mjs   # Browser, Desktop + Handy (mit --selbsttest)
```

## Quelle und Formate

- Je Saison ein Artikel. 1956–1963 heißen die Artikel nach dem **Kalenderjahr** („DFB-Pokal 1956“), so auch die Schlüssel in
  `tools/pokal_seed.json`. Vorlagen: `OneLegResult` (Parameter benannt ODER positional), `TwoLegResult` 1971–73 (beide Ergebnisse
  aus Sicht des ersten Vereins), Finale als `Fußballspiel national` bzw. 1935–43 `Fußball Gruppenspiel`, 1935–43 und 1973 als
  eingebundene Seite `{{:DFB-Pokal-Finale 1973}}`.
- Der Link zeigt auf den **heutigen** Vereinsartikel, angezeigt wird der damalige Name – beides wird gespeichert.
- Reserve steht oft nur im angezeigten Namen: „(A)“, „Am.“, „Amat.“, „Amateure“ – der Link zeigt dann auf die Erste.

## Zählweise = offizielle Ewige Tabelle

- Nur Hauptrunden. **Qualifikations- und Ausscheidungsspiele zählen nicht** (Fußnoten der offiziellen Tabelle, z. B. Spandau–Bayern 1957,
  Tasmania–Osnabrück 1958, Qualifikation 1965/66 + 1966/67, NOFV-Qualifikation 1991/92) – Liste in `tools/wiki_pokal_runden.json` „ohne“.
- Wiederholungsspiele zählen. Elfmeterschießen = Unentschieden (Tore nach 120 Min. gleich).
- Am grünen Tisch gewertete Spiele zählen mit dem **gewerteten** Ergebnis; fast alle stehen im Artikel schon so, nur Schalke–Hertha
  1971/72 (Rückspiel) steht in `wiki_pokal_runden.json` „wertung“.
- Gemessen: Spielzahl je Saison = Infobox des Artikels (außer den ausgeschlossenen Qualifikationsspielen). Summe 5.134 Spiele / 19.766 Tore
  gegen offiziell 5.131 / 19.746 (Stand 2.9.2026; Rest = 2026/27, das nicht eingebaut wird). 677 von 892 Vereinen exakt gleich.

## Zuordnung (Stufen)

K Korrektur (`tools/wiki_pokal_korrektur.json`, mit Beleg) · A gepflegte Zuordnung (`hist_alias`, `hist_schreibweise`, `club_map`) ·
S/L Saisonkontext über Name/Link (Tabellen ab 1963/64 BRD, 1949 DDR) · U Kurzform in der Saison („Borussia M’gladbach“) · E Era-Name ·
G game_data · H historischer Verein · V gleicher Wikipedia-Artikel wie eine schon zugeordnete Nennung · N neu (`hist_pk_*`).

Gemessene Fallen der Stufe U (Kurzform): einseitig geprüft traf „Henger SV“ Mönchen-HENG-ladbach, „OSC Bremerhaven“ den Bremer SV,
„OT Bremen“ den VfL 07 Bremen (nur der Ortsname gleich). Deshalb beide Richtungen + mindestens ein wirklich gekürztes Wort.

**Abweichungen von der offiziellen Tabelle sind teils gewollt:** wo das Projekt Vorgänger und Nachfolger unter EINER ID führt
(TuS Schloß Neuhaus → SC Paderborn, Heidenheimer SB → 1. FC Heidenheim, Union Oberschöneweide → Union Berlin, Lok/VfB Leipzig,
Gütersloh, Viktoria Köln), folgt die Pokaltabelle dem Projekt, nicht Wikipedia – sonst widerspräche sie den Ligatabellen.

## In der App

`app/pokal_hist.js`: Summen für die Ewige Pokaltabelle (Historie + Sim-Saisons), Feld je Saison (Hervorhebung), Rundenansicht einer
historischen Saison (`App.pokalHistY`, Klick in der Siegerliste, ◀/▶, „Laufende Saison“). In einer historischen Saison zeigt die Ewige
Tabelle den Stand nach dieser Saison (nur Historie).

Offen/denkbar: Pokal-Rekorde (`Engine._recordPokalSeason`) und der Pokalweg im Steckbrief kennen die historischen Spiele noch nicht.
