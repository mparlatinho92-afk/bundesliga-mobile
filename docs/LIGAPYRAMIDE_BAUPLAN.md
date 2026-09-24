# Ligapyramide – Bauplan

Stand 24.09.2026. Gewähltes Konzept: **D „Ligasystem“** (Bilder: `docs/pyramide-konzept/Konzept_D_Ligasystem.png`).
Die Konzepte A–C liegen daneben und sind verworfen.

## Was die Ansicht zeigt (Nutzerentscheidungen)

- **Die Ligen, nicht den Inhalt.** Die Vereine stehen als Wappen nebeneinander und sind nur Beiwerk. Unter 45 % Zoom
  fallen sie weg.
- **Aufbau wie die Tabelle im Wikipedia-Artikel „Fußball-Ligasystem in Deutschland“:** jede Ebene eine Zeile, jede Liga
  so breit wie die Ligen, aus denen man in sie aufsteigt. Die oberen Ligen sind die breitesten.
- **Pseudo-Nachbarn trennen**, doppelt:
  - **Graben:** Zwischen zwei Ligen läuft ein dunkler Graben. Er beginnt unter der Liga, in der sich beide treffen, und
    ist umso breiter, je höher das ist.
  - **Farbton:** Geschwister (gleiche Oberliga) teilen einen Farbton, an jeder Familiengrenze wechselt er innerhalb der
    Ebenenfarbe.
- **Seitenleiste je Liga:** Teamzahl, ▲ Auf, ⇄ Relegation, ▼ Ab. Unter den Wappen stehen die Zonenfarben.
- **Kürzel** für schmale Ligen: `App._ligaShort` und `App._histKurzName`. Die `LEAGUE_SHORT`-Liste wurde am 24.09.2026
  auf 48 Einträge ergänzt.
- **Ligen, die es nicht gibt:** kleines gestricheltes Kästchen ohne Namen.
- **Jedes Jahr zeigt Struktur UND Inhalt seiner Zeit.** BRD und DDR sind getrennte Blöcke mit der breitesten Trennung.
- **Nichts wird vorgefertigt oder gespeichert.** Die Ansicht rechnet beim Öffnen aus vorhandenen Daten. Im Speicher liegt
  nur die gerade sichtbare Pyramide, und zwar im DOM, nicht im Spielstand.

## Datenquellen – alles vorhanden

| Baustein | Quelle | Anmerkung |
|---|---|---|
| Ligen + Vereine einer Saison | `IDBStore.getSeasonAll(y)` | mischt IndexedDB und `HistExt` bereits; `{lid: {rows:[{id,rank,g?}]}}` |
| Laufende Saison | `Engine.teams[].leagueId` + `Engine.calcZones()` | steht noch nicht in IndexedDB |
| Übergeordnete Liga | `App._archUpOf(lid, jahr)` | kennt `hoch1994`/`hoch2008`; Spielligen über `Engine.UP_MAP` |
| Auf-/Abstiege vergangener Saisons | Vergleich mit `getSeasonAll(Folgesaison)` | derselbe Weg wie in `_renderArchivedSeason` (Zonenfarben im Archiv) |
| Saisonfolge | `App._prevSeasonStr` / `_nextSeasonStr` | kennt den DDR-Sonderkalender 1955–1961 |
| Ligennamen, Ebene, Gebiet | `Engine.leagues`, `App._histLeague`, `App._histGebiet`, `App._archLevelOf` | |
| Vereinsname der Zeit | `App._histClubName(id, y)` | |

**Neu zu bauen ist nur die Staffel-Ebene.** `_archUpOf` hängt eine Liga an die GANZE Liga darüber. Die Pyramide braucht
die einzelne Staffel:
- **2. BL Nord/Süd (1974–81):** über die Region der Unterliga (`HIST_EXT.ligen[lid].region`: Nord/West/Berlin → Nord,
  Süd/Südwest → Süd).
- **DDR-Liga-Staffeln:** aus den Vereinswechseln zwischen Saison y und y+1 (Aufsteiger aus der Bezirksliga landen in
  Staffel g, Absteiger aus Staffel g landen in der Bezirksliga). Für 1975/76 geprüft, das Ergebnis ist geografisch
  schlüssig. Ohne Wechsel greift die Zuordnung der Nachbarsaison, sonst wird die Liga mit `*` als unsicher markiert.

## Aufbau im Code

Neues Modul **`app/pyramide.js`** (über 150 Zeilen, also eigenes Modul laut CLAUDE.md): in `template.html` einbinden,
`$JsFiles` in `manage-v.ps1` ergänzen, alle Funktionen ins Schema eintragen.

| Funktion | Aufgabe |
|---|---|
| `showPyramide()` | Einstieg, `activeLeague = '__pyramide__'`, `ba_lastLeague` merken (wie `showAufstieg`) |
| `_pyrDaten(y)` → Promise | Knoten `{lid, name, kurz, level, parent, size, up, rel, down, reld, teams[], ghost, unsicher}` aus den Quellen oben; Staffeln aufteilen |
| `_pyrStaffelVon(lid, y, jetzt, danach)` | Staffel-Zuordnung (2. BL Nord/Süd, DDR-Liga A–E) |
| `_pyrGeister(y, knoten)` | Platzhalter: Ebene fehlt unter einem Verband, oder die Liga gab es in der Saison davor/danach, aber nicht jetzt |
| `_pyrLayout(knoten, zoom)` | Breiten von unten nach oben, Grabenbreite je Höhe der gemeinsamen Liga, Farbton je Familie |
| `_pyrRender(layout)` | Karten, Gräben, Ebenen-Lineal, Übersichtskarte |
| `_pyrKleben()` | beim Scrollen: Inhalt breiter Karten in den sichtbaren Ausschnitt schieben |

Der Konzept-Renderer (Scratchpad `konzept2.html`) ist die Vorlage für Layout und Rendern, etwa 200 Zeilen, die sich
weitgehend übernehmen lassen.

**Einstieg:** eigener Eintrag in der Seitenleiste neben Amateurpokal und Aufstiegsrunden (`renderSidebar`,
app/core.js ~Z. 380), Wiederherstellung beim Neuladen in app/core.js Z. 91.

## Mobil (Pflicht)

- **Eigene Schiebeleisten** rechts und unten: Android blendet die Scrollbalken aus.
- **Pinch-Zoom** zusätzlich zu den −/+-Knöpfen, wie in einem Bildprogramm.
- **Pull-to-Refresh ausnehmen** (`app/pulltorefresh.js`): Wer die Karte oben nach unten zieht, würde sonst die Seite neu
  laden.
- **Zeitleiste unten** am Daumen, das Lineal nur mit der Ziffer.

## Prüfung (mit Gegenprobe)

- **`tools/pyramide_check.cjs`**, headless mit Exit-Code:
  - jede Tabelle der Saison erscheint genau einmal als Knoten;
  - die Summe aller `size` ist gleich der Zahl der Tabellenzeilen;
  - jeder Elternknoten existiert in derselben Saison oder ist als Wurzel erlaubt (1, ddr1);
  - ▲ einer Liga = ▼-Zuflüsse darüber, soweit beide Saisons vorliegen;
  - Stichjahre 1955, 1963, 1975, 1991, 1994, 2008, 2025 und eine gespielte Saison.
  - `--selbsttest` hängt eine Liga falsch an und muss durchfallen.
- **Browser (run-Skill, gegen `template.html`):** Desktop und 412 px Touch, Jahr blättern, Klebe-Verhalten,
  Pull-to-Refresh bleibt aus, keine JS-Fehler.
- **Gewachsener Spielstand:** IndexedDB voll, nicht nur ein frischer Stand, wo der Fallback greift (Lehre aus der
  Relegations-Chronik).

## Offene Fragen an den Nutzer

1. **Einstieg:** Eintrag in der Seitenleiste (Vorschlag), oder ein Knopf in der Liga-Navigation?
2. **Klick auf eine Liga:** die Abschlusstabelle dieser Saison öffnen (Vorschlag)?
3. **Vor 1963:** Es gibt nur DDR-Tabellen (ab 1949). Soll die Zeitleiste dort beginnen, mit der BRD-Seite als einem
   Platzhalter „keine Daten“, oder erst 1963?
4. **Platzhalter-Regel in der Historie:** „gab es in der Saison davor oder danach“ (Vorschlag, eng) oder „gab es in
   derselben Epoche“ (Konzeptbild, weiter)?
