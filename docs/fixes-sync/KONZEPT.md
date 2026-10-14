# Konzept: Fix-Liste mit Google-Sheet-Spiegel (Bundesliga Mobile)

Übertragung des Verfahrens aus dem F1-RPG (`tools/spiegel-fixes.js`, dort seit 11.10.2026 im Einsatz,
Prüfung je Version seit 14.10.2026). Stand: **Konzept, nichts davon ist hier gebaut.**

---

## 1. Ausgangslage

- Die Sammelliste ist heute `Bundesliga Mobile Fixes.odt` (Projektwurzel, zuletzt 16.06.): lose Stichpunkte,
  verschachtelt, mit eingestreuten Fragen an Claude („Frage an dich: sind das für die CPU nur gewöhnliche Texte?“).
- Claude kann die ODT nur entpackt lesen und nicht sauber zurückschreiben, und auf dem Handy lässt sie sich kaum pflegen.
- Es gibt keinen Abgleich: Was längst gebaut ist, steht weiter in der Liste, und was neu dazukommt, sieht niemand.

## 2. Zwei Dateien, eine Richtung pro Feld

| | Rolle | Wer schreibt |
|---|---|---|
| **`FIXES.md`** (Projektwurzel, im Repo) | **Quelle.** Status, Belege, Einordnung | Claude, über Skript |
| **Google Sheet** „Bundesliga Fixes – Ist-Stand“ (Drive-Ordner „Bundesliga HTML“) | **Spiegel** mit festem Link, auf dem Handy bearbeitbar | Claude überschreibt in place, **der Nutzer trägt direkt ein** |
| `Bundesliga Mobile Fixes.odt` | Original, wird einmal importiert und danach nicht mehr angefasst | – |

Warum ein Sheet und kein Doc: Jede Zeile ist ein Punkt. Nur so lässt sich je Zeile erkennen, was der Nutzer
neu angelegt oder geändert hat (Abschnitt 3, Kennung/Prüfen). Ein Doc hat dafür keine Struktur.

## 3. Was übernommen wird (Funktionsumfang F1-RPG)

**Spiegeln**
- Ein festes Sheet wird bei jeder Änderung in place überschrieben. Der Link ändert sich nie, die Sheet-ID steht in `tools/fixes-spiegel.json`.
- Blatt **„Fixes“**: Status · Bereich · Punkt · Beleg/Version · Kennung · Prüfen, eine Zeile je Punkt.
- Blatt **„Konzepte“**: Thema · Text. Hier landen Unterpunkte und lange Absätze, und der Hauptpunkt verweist mit „→ Details: Blatt Konzepte“ darauf.
  Das passt genau zur ODT-Gliederung (Testspiele → wann / wer / Datengröße).
- Das Skript sortiert nach Status (✚ ❌ ◐ ❔ – ✅). Eine Sortierung im Sheet würde die nächste Spiegelung nicht überleben.
- Statusfarben, Filter und Spaltenbreiten liegen fest im Sheet und werden nie neu geschrieben.

**Manuelle Notizen bleiben erhalten (der Kern)**
- In Spalte E steht je gespiegelter Zeile eine **Kennung** (Status + erste 30 Zeichen des Punkts).
- In Spalte F prüft eine ARRAYFORMULA in F2: fehlt die Kennung, steht dort **„neu“**, passt sie nicht mehr, steht **„geändert“**.
- **Vor jedem Überschreiben** liest Claude `Fixes!A:F`. Markierte Zeilen holt `--uebernehmen` in den Abschnitt
  **„✚ Aus dem Sheet – ungeprüft“** ganz oben in `FIXES.md`. Erst danach wird überschrieben.
- Einsortiert wird mit dem Nutzer. Claude löscht oder formuliert ✚-Zeilen nie eigenmächtig um.

**Automatik**
- Ein **Stop-Hook** (`--hook`) prüft am Ende jeder Antwort, ob sich der Hash von `FIXES.md` geändert hat, und erinnert Claude dann ans Spiegeln.
  Er scheitert immer still, damit kein Task am Hook hängen bleibt.
- **Prüfung je Version (neu):** Merker ist die Kopfzeile `**Abgeglichen gegen:** vX, Prüfdatum **…**` in
  `FIXES.md` selbst, ein zweiter Zustand ist nicht nötig. Steht die Spielversion höher, blockt der Hook einmal und verlangt
  beide Richtungen:
  1. Sheet-Einträge abholen, **auch wenn `FIXES.md` unverändert ist**. Ohne diesen Schritt bleiben Handy-Notizen
     bis zur nächsten zufälligen Spiegelung liegen.
  2. Die Changelog-Punkte der neuen Versionen (`--seit`) gegen die offenen Punkte halten. Ein Punkt wird nur mit Beleg im Code
     auf ✅ gesetzt, und die Version kommt dazu.
  3. `--geprueft` schreibt die Kopfzeile neu. Dadurch ändert sich der Hash, und die Spiegelung folgt automatisch.
- **`manage-v`**: Ein letzter Schritt `node tools/spiegel-fixes.js --seit` zeigt nur an und bricht nie ab.
  Außerdem kommen `FIXES.md`, `tools/spiegel-fixes.js` und `tools/fixes-spiegel.json` in die Add-Liste.
  Im F1-RPG fehlten sie dort, und jede Änderung brauchte einen Nachtrags-Commit.

## 4. Anpassungen für dieses Projekt

| Punkt | F1-RPG | Bundesliga |
|---|---|---|
| Versionsquelle | `const VERSION` in `index.html` | `const VERSION` in **`template.html`** (`index.html` ist hier der Monolith) |
| Changelog für `--seit` | HTML-Block nach `<!-- CHANGELOG -->` | **`CHANGELOG.md`** (`## vX (Datum)` + `- `-Zeilen), lässt sich deutlich einfacher lesen |
| Release ohne Version | – | `-BuildOnly` → kein `--seit` |
| Branch | `master` | `main` |
| Hooks | `.claude/settings.json` hat schon Stop-Hooks | `.claude/settings.json` ist leer → Stop-Hook neu eintragen |

**Neu wegen der ODT-Notizen: Fragen an Claude.** Die ODT enthält Fragen, keine Fixes. Vorschlag: Status
**❓ Frage**. Claude beantwortet sie beim Abgleich als Unterpunkt „Antwort: …“, die Antwort erscheint dann im Blatt
„Konzepte“, und die Zeile bleibt ❓, bis der Nutzer sie schließt. Damit verschwinden Fragen nicht zwischen den Fixes.

## 5. Bekannte Fallen (im F1-RPG gemessen, gelten hier genauso)

- **Gebietsschema de_DE:** Formeln brauchen `;`, auch über die API. Mit `,` oder `{…}` kommt `#ERROR!`.
- **Kein `RAW` im Sheets-Connector:** `update_values` liest Eingaben wie die Oberfläche („0.8.212“ wird zum Datum).
  Deshalb setzt das Skript ein `'` vor jede Zelle.
- **4-Byte-Emoji** (🟡 usw.) zerfallen. Es bleibt bei ✅ ◐ ❌ ❔ ✚ ❓.
- Die Kennung erkennt **keine** Änderung nur am Bereich oder hinter Zeichen 30 des Punkts. Das ist bekannt und wurde in Kauf genommen.
- Zum Leeren immer **offene Bereiche** nehmen (`Fixes!A2:E`, `Konzepte!A2:B`), sonst bleiben Nutzer-Zeilen unter Zeile 1000 stehen.
  F1/F2 (Formel) schreibt die Spiegelung nie.
- **Google Drive für Desktop (`G:`) nicht zum Spiegeln nutzen:** `find` hängt dort. Geschrieben wird nur über den Connector.
  Das betrifft hier auch `G:\Meine Ablage\fussball.de`.
- Schreiben kann nur Claude (Sheets-Connector). Das Skript erzeugt die Werte und merkt sich den Stand.

## 6. Umsetzungsschritte

1. `tools/spiegel-fixes.js` aus dem F1-RPG kopieren und anpassen: Quelle `FIXES.md`, Version aus `template.html`, `--seit` liest `CHANGELOG.md`,
   Status ❓ in `STATUS`/`STATUS_FOLGE` aufnehmen.
2. **Einmaliger Import der ODT** nach `FIXES.md`: Gliederung übernehmen, Leerpunkte weglassen, Fragen als ❓.
   Jeden Punkt gegen Code und `CHANGELOG.md` prüfen (z. B. „Relegations-Button“ und „Erfolge im Steckbrief“ eventuell schon gebaut).
   Ergebnis vom Nutzer gegenlesen lassen.
3. Sheet im Drive-Ordner „Bundesliga HTML“ anlegen: Blätter „Fixes“ (sheetId 0) und „Konzepte“ (sheetId 1),
   Formel in `Fixes!F2`, Statusfarben über bedingte Formatierung.
4. Erste Spiegelung, dann `--fertig <sheetId>`.
5. Stop-Hook in `.claude/settings.json` eintragen, `manage-v.ps1` erweitern (Schritt `--seit` + Add-Liste).
6. Probelauf: Auf dem Handy eine Zeile anlegen und eine ändern → Hook → `--uebernehmen` → beide stehen unter ✚.
7. Regel in die Bundesliga-`CLAUDE.md` (zwei Zeilen und ein Zeiger auf dieses Konzept).

## 7. Offene Entscheidungen (Nutzer)

- **Sheet-Ort und Titel:** Drive-Ordner „Bundesliga HTML“ und „Bundesliga Fixes – Ist-Stand“?
- **ODT nach dem Import:** liegen lassen (wie das Google-Doc im F1-RPG) oder nach `docs/fixes-sync/` verschieben?
- **❓-Fragen:** wie oben (Antwort als Unterpunkt) oder eine eigene Spalte „Antwort“ im Sheet?
- **Eine Vorlage für beide Projekte?** Das Skript könnte Projektpfade aus einer kleinen Konfigurationsdatei lesen.
  Dann wird ein Fix im einen Projekt nicht im anderen vergessen. Der Preis dafür ist eine gemeinsame Abhängigkeit zwischen zwei sonst getrennten Repos.
