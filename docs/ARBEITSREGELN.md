# Arbeitsregeln – Langfassung mit Herkunft

> Ausgelagert aus CLAUDE.md am 11.11.2026 (wörtlich). In CLAUDE.md stehen die Regeln als Kurzform.

## Ein „behobener" Fehler, der wiederkommt, ist meist alter Datenbestand

Meldet der Nutzer, ein bereits behobener Fehler sei zurück – besonders in einem **neu angelegten**
Spielstand –, dann **zuerst die Daten prüfen, nicht die Logik.**

Der Reflex, den Code erneut zu lesen, ist fast immer falsch. Häufiger ist: der Speicher enthält noch
Datensätze aus einem früheren Durchlauf, und die Anzeige serviert sie weiterhin. Der Fix greift, er
kommt nur nicht zum Zug.

**Wie man das in Minuten statt in Tagen feststellt:** Tragen die erzeugten Kennungen einen
Zeitstempel (viele Generatoren bauen `Date.now()` ein), dann verrät ein Blick auf die Kennungen eines
Datensatzes, **welcher Durchlauf ihn geschrieben hat**. Liegen in einem Spielstand mehrere
Zeitstempel-Generationen nebeneinander, ist die Sache entschieden, bevor man eine einzige Zeile Logik
gelesen hat.

**Nie ohne Beleg entwarnen.** „Sollte jetzt gehen" ist keine Aussage. Entweder man kann zeigen, aus
welchem Durchlauf ein Datensatz stammt, oder man weiß es nicht.

**Alte Spielstände heilt ein Quell-Fix nicht.** Wer an der Quelle repariert, repariert neue Daten.
Für bestehende Stände braucht es entweder eine Auflösung bei der Anzeige oder die klare Ansage an den
Nutzer, dass dieser Stand betroffen bleibt.

> Konkret hier: dauerhaft gespeichert wird in `localStorage` (`ba_save_v66`, `ba_arch_v66`, seit v0.8.228.39 `ba_res_v66` =
> Saisonergebnisse als Blockkette mit sid+Saison, Spieltag-Save nennt nur ihre Anzahl `rc`) **und** in
> IndexedDB (`ba_archive_v1`: champions/relegation/season_tables). Die IDB-Stores tragen KEINE
> Spielstand-Kennung, ihre Schlüssel sind reine Fachgrößen (`"y|lid"`, `y`). Nur `App.reset()`
> (app/modal.js) leert beide Ebenen – Import und der Neues-Spiel-Zweig in `Engine.init()` nicht.

## Mobil-Pflicht: Stolperfallen
Touch-Geräte bekommen via `(pointer:coarse)` immer das Mobil-Layout. Flex-Zeilen mit `flex-shrink:0` am Namen brechen auf
schmalen Spalten → Name schrumpfbar + Ellipsis. Pull-to-Refresh in `app/pulltorefresh.js` (Schwelle + Halten).

## Widerspricht der Befund dem Auftrag, ist der Auftrag zu Ende

**Eine erledigte Aufgabe wird nicht eigenhändig erweitert.**

Fast jeder Auftrag steht auf einer Annahme über den Ist-Zustand („X fehlt", „füge X hinzu",
„X ist kaputt"). Ergibt das Nachsehen, dass die Annahme nicht stimmt – es ist längst da, oder
es liegt anders –, dann ist der Auftrag damit **erledigt**: Befund melden, Werkzeuge hinlegen.

Nicht umdeuten. Ein Nebensatz des Prompts ist Kontext, keine Ersatz-Spezifikation, und je
knapper der Prompt, desto weniger trägt er eine Auslegung.

Die Falle dabei: gründliche Arbeit an der falschen Aufgabe sieht von innen aus wie gute Arbeit.
Saubere Messungen, grüne Prüfungen und bestandene Gegenproben bestätigen nur die eigene
Auslegung – gegen sie selbst prüft nichts davon.

> Herkunft (20.09.2026): „schau ob die alten Regionalligen eingebaut sind" – sie waren es. Statt das
> zu melden, wurden die fünf Ligen zu einer mit fünf Staffeln zusammengelegt und unter die
> 2. Bundesliga gehängt, was ihre eigenen Ewigen Tabellen gekostet hätte. Sieben Dateien, nichts
> davon bestellt, alles zurückgerollt. Die Regel „nachfragen ab 3 Stellen" hätte gereicht –
> sie greift nur nicht, solange man sich seiner Auslegung sicher fühlt.

## Eine Prüfung, die nicht durchfallen kann, prüft nichts

Vor jeder Entwarnung: die Prüfung einmal gegen einen Zustand laufen lassen, in dem sie
**fehlschlagen MUSS**. Ist sie auch dort grün, misst sie etwas anderes als gedacht. Diese eine
Gegenprobe hat mehr Fehler gefunden als jedes erneute Lesen des Codes.

Fehlmessungen, die alle **Entwarnung meldeten, wo keine war** – oder umgekehrt:

- **Eine Funktion nachbauen statt aufrufen.** Wer eine Löschung von Hand nachstellt, überspringt
  leicht genau den Schritt, um den es geht. Immer die echte Funktion rufen, auch wenn der Aufbau
  umständlicher ist.
- **Eine Funktion isoliert lesen.** Räumt eine Funktion nur die Hälfte auf, kann der **Aufrufer**
  den Rest erledigen. Ist Aufräumarbeit auf mehrere Ebenen verteilt, genügt die unterste nicht.
- **Gegen das Falsche prüfen.** Ein Testlauf, der versehentlich gegen den aktuellen statt den alten
  Stand lief, meldete alles grün. Ein grüner Test gegen den falschen Zustand ist schlimmer als
  keiner.
- **Die Stichproben-Null für eine strukturelle halten.** Ein Bericht meldete „0,0 % Sensationen"
  bei einem Ebenen-Abstand von 5 — dahinter standen 28 Partien bei einer echten Quote von ~3 %,
  also 0,8 erwartete Fälle. Die direkte Messung (200.000 Ziehungen) ergab **0,9 %, nie null**.
  Vor jeder Aussage „das passiert nie": *wie viele Fälle wären überhaupt zu erwarten?* Unter drei
  ist die Zahl keine Aussage. Deshalb zeigt `tools/pokal_effekt.cjs` jetzt die absolute Anzahl und
  markiert dünne Zeilen mit `?`.

> Ausführliche Fassung + Fragenkatalog für alles dauerhaft Gespeicherte: `docs/PRUEFKATALOG_SPIELSTAND_VERMISCHUNG.md`.

## Fakten selbst nachschlagen, nicht den Nutzer googeln lassen
Fragen zur Vereinsgeschichte (Fusion, Umbenennung, Spielgemeinschaft, Schreibweise) **selbst belegen**: zuerst
`tools/hist_verhaeltnis.json` und `tools/hist_fusion.json`, dann Wikipedia/Websuche. Dem Nutzer **Befund + Quelle +
Vorschlag** vorlegen („laut Wikipedia Fusion 1974 – dein Export sagt Umbenennung, ich lasse Fusion“). Nachfragen nur, wenn
Quellen sich widersprechen oder es Geschmackssache ist.
> Herkunft (11.10.2026): vier Dubletten-Punkte offen zurückgefragt, der Nutzer googelte alles selbst – der Beleg für
> FSG Schiffweiler stand wörtlich längst in `hist_verhaeltnis.json`.

## Eingriffe außerhalb des Projektordners
Grund für die Ansage-Pflicht: Ein Fenster, das von selbst aufgeht, ist ein Schreck, kein Komfort. Nicht der Vorgang
stört, sondern dass er unangekündigt kommt. Betrifft u. a. `Start-Process`/`open`, Schreiben auf Desktop/Home/Downloads/
Systempfade, Programme mit Fenster, externe Dienste.

**Ergebnisse liefern statt erwähnen.** Bilder, die Claude selbst betrachtet, sieht der Nutzer nicht, und Dateien im
Scratchpad findet er nicht. Ein Ergebnis ist erst geliefert, wenn es an einem Ort liegt, den der Nutzer kennt, und der
Pfad genannt ist.

**Bei Fragen zu Zugriffsrechten:** die tatsächliche Konfiguration lesen und Fakten nennen (welche Datei, welcher Eintrag,
was folgt daraus) – nicht allgemein beruhigen.
> Seit `81e0bfc` steht in `.claude/settings.json` `permissions.allow: []`. Die feingranularen Regeln liegen in
> `.claude/settings.local.json`. Wenn das Nachfragen zu viel wird, ist die Antwort **nicht** wieder ein nackter Tool-Name
> (`"Bash"`, `"PowerShell"`), sondern eine gezielte Regel wie `Bash(git status*)`.

## Schema-Inventur: warum
Zeilennummern verschieben sich bei jedem Edit still. Im Juli 2026 waren 130 von 234 Einträgen falsch – das Schema
navigierte in die Irre, statt Token zu sparen. **`manage-v` zieht die Zeilennummern seit v0.8.88 selbst nach** – der
Build schreibt den Changelog in `app/modal.js` und verschiebt dadurch jede Funktion darunter (zuletzt 27 Einträge auf
einen Schlag). Diese Drift entsteht *durch den Build*, die Prüfung davor sieht sie nie; deshalb läuft `--fix` im Script
direkt vor dem Commit und staged Schema + `CHANGELOG.md` mit. Fehlt Python, wird der Block still übersprungen – dann von
Hand nachziehen.
