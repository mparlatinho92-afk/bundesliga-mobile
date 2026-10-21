# Patch-Skripte: `\\` ueberlebt die Bash-Tool-Zeile NICHT

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

**Gemessen, nicht vermutet.** Ein doppelter Backslash im Kommando des Bash-Tools kommt als
einfacher an — schon *vor* der Shell, also unabhaengig von Quoting und Heredoc-Form:

```python
a = "X\\nY"        # erwartet: Backslash + n  (Laenge 4)
```
| Weg | Ergebnis |
|---|---|
| `python - <<'PY'` | `'X\nY'`, Laenge 3 ❌ |
| `cat > datei.py <<'PY'` + `python datei.py` | `'X\nY'`, Laenge 3 ❌ |
| **Write-Tool** + `python datei.py` | `'X\\nY'`, Laenge 4 ✅ |

`cat > datei` hilft also NICHT — das war eine Fehldiagnose. Ein einzelner Backslash (`\n`, `\t`)
kommt unveraendert durch, nur die Verdopplung geht verloren. Betroffen ist damit alles, was einen
LITERALEN Backslash in eine Datei schreiben soll: Python-/JS-Strings mit `\n`, Regexe (`\d`,
`\s`), `sed`-Ausdruecke.

**Regel:** Patch-Skript mit dem **Write-Tool** anlegen, dann per Bash aufrufen. Nur wenn es
unbedingt inline sein muss: Backslash als `chr(92)` (Python) bzw. `String.fromCharCode(92)` (JS)
bauen und mit `+` zusammensetzen — dann kommt kein `\\` in der Kommandozeile vor.

**Zwei Begleitfallen aus derselben Sitzung:**
- **Erst pruefen, dann schreiben.** Schlaegt ein `assert` in der Mitte fehl, ist ohne
  Sammel-Schreibvorgang am Ende gar nichts gespeichert — und die bereits geglueckten Ersetzungen
  sind weg. Also alle `replace` auf einer Variablen sammeln und EINMAL am Schluss schreiben.
- **`game_engine.js` enthaelt Umlaute.** Ein Suchanker in Transliteration ("haelt" statt "hält")
  findet den Block nicht. Anker immer aus der Datei kopieren, nicht aus dem Gedaechtnis tippen.
- **Windows-Python kann `/c/Users/...` nicht oeffnen.** Git-Bash-Pfade vorher durch
  `cygpath -w` schicken oder gleich den Windows-Pfad verwenden.
