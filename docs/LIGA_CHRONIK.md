# Ligen-Chronik (···-Menü → 📜 Ligen-Chronik)

Aufgebaut am 28.10.2026 (Sheet: „baue ins Spiel eine Liste der Ligen sortiert nach früheste Saison und recherchiere seit wann die
Ligen tatsächlich existieren“).

## Kette

```
node tools/liga_chronik.mjs              # -> tools/liga_chronik.json, app/liga_chronik_data.js (ERZEUGT), tools/_dryrun/liga_chronik.txt
node tools/liga_chronik.mjs --nur-daten  # ohne Wikipedia
node .claude/skills/run/liga_chronik_check.mjs   # Browser, Desktop + Handy (mit --selbsttest)
```
Nach jedem Neuaufbau der Historie (`historie_einbau.mjs`) neu laufen lassen – die Datenspanne kommt aus `HISTORY_SEED` + `HIST_EXT`.

## Datenspanne

Je Liga-ID (70 Spiel-Ligen, 147 historische) die erste/letzte Saison und Lücken aus den EIGENEN Tabellen. Eine Liga unter mehreren
Namen hat mehrere IDs: der **Vorlauf** (Gründung bis Datenbeginn) zählt deshalb ab der frühesten Saison aller Ligen mit demselben
Wikipedia-Artikel und ihrer Vorgänger aus `HIST_EXT.ligaNachfolger` (`abA`). Ohne das hatte die Bayernliga 2008–11 „63 Jahre“
Vorlauf, obwohl ihre Tabellen ab 1963 als Amateurliga Bayern da sind (richtig: 18).

## Gründungsjahr (de.wikipedia, Stand 28.10.2026: 135 von 217)

- Artikel: erst der genaue Titel `Fußball-<Name>`, dann `<Name>`, sonst die Suche – dort nur ein Titel, der ohne „Fußball-“ und
  Klammerzusatz GENAU der Name ist. Staffelzusatz wird abgeschnitten. Sonderfälle in `TITEL` (1./2. Bundesliga, 3. Liga), je Liga-ID in
  `tools/liga_chronik_korrektur.json` (Begriffsklärungen Berlin-Liga, Regionalliga Nordost 1994 vs. 2012).
- Gemessene Fehlgriffe der lockeren Suche: „Eishockey-Landesliga Bayern“, „Oberliga Nord“ → „Oberliga Nord**ost**“, Weiterleitung
  „Fußball-Landesliga Berlin“ → Berliner Fußball-Verband (1897). Deshalb: andere Sportarten raus, Ziel muss „liga/klasse“ heißen und
  darf kein Verband/keine Liste sein; `{{Begriffsklärung}}` (nicht der bloße Begriffsklärungs**hinweis**) wird übersprungen.
- Jahr: Infobox `Gründung/Gegründet/…`, sonst der erste Absatz („von 1950 bis“, „seit der Saison“, „… gegründet/eingeführt“), das
  früheste Jahr. Liegt es NACH der ersten Datensaison, beschreibt der Artikel eine spätere gleichnamige Liga → verworfen
  (Landesliga Niedersachsen 1974–78 vs. die heutige seit 2010, Regionalliga Südwest 1963–73 vs. 2012).
- Gleichnamige ältere Ligen haben oft einen Zeitraum im Titel („Fußball-Regionalliga Südwest (1963–1974)“, „… Niedersachsen (1964 bis
  1979)“). Passt der normale Artikel nicht, sucht das Werkzeug mit `intitle:` nach solchen Varianten (die freie Suche bringt sie nicht unter
  die ersten zehn); die Daten müssen im Zeitraum des Titels BEGINNEN. Ebenso ein Endjahr im Text („von 1949 bis 1964“): Daten ab dem
  Endjahr gehören zu einer anderen Liga.
- Gemessene Falle: der Verbandsfilter prüfte auf „Verband“ und warf damit jede „Fußball-**Verband**sliga …“ hinaus (113 statt 135).
- Anzeige ohne Gedankenstrich (Nutzer 28.10.2026): Jahr oder „?“; Vorlauf in Jahren, ✓ = Gründung = erste Datensaison, „?“ = unbelegt.
- Ohne Jahr bleiben vor allem Bezirks-/Landesligen ohne eigenen Artikel (66). Zwischenspeicher `%TEMP%/liga_wiki_cache`; Wikipedia
  drosselt mit HTTP 429 → Wiederholung mit wachsender Pause, 1 s zwischen Abrufen.
