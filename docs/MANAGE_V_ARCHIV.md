# manage-v: drei Stände statt Archiv

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

### Kein Archiv, aber die DREI aktuellsten Stände bleiben liegen (ab v0.8.96)
Es gibt kein `archive/` mehr. `manage-v` behält die **drei neuesten** `bundesliga-vX.Y.Z.html`
(den gerade gebauten mitgezählt) und löscht alles ältere — `$KeepVersions = 3` in `manage-v.ps1`.

**Warum nicht mehr:** Jeder Monolith ist ~44 MB, weil alle Wappen als Base64 eingebettet sind.
251 Snapshots waren zuletzt **7 GB** lokal. Die Git-Historie hält jede je gebaute Version ohnehin
vor — das Archiv war eine zweite, unkomprimierte Kopie desselben.

**Warum nicht nur einer:** Wenn die frisch gebaute Version Probleme macht, braucht es sofort einen
lauffähigen Stand zum Zurückgreifen, ohne erst in der Historie zu graben. Dazu der konkrete
Auslöser: am 30.08.2026 vergaben zwei Sitzungen parallel dieselbe Versionsnummer, der zweite Lauf
löschte den Snapshot des ersten als „alte Version“ — danach lag GAR KEINE lauffähige Datei mehr im
Projekt, und der nächste Build wäre an „Keine bundesliga-v*.html gefunden!“ abgebrochen.
Drei Stände ≈ 130 MB, gegen 7 GB beim alten Archiv.

> Sortiert wird nach der **Versionsnummer**, nicht nach Dateidatum oder Name: v0.8.9 stünde sonst
> hinter v0.8.129, und ein aus der Historie zurückgeholter Stand hat ein frisches Datum.

**Eine alte Version zurückholen:**
```bash
git log --oneline --diff-filter=A -- "bundesliga-v0.8.42.html"   # Commit finden
git show <commit>:bundesliga-v0.8.42.html > /tmp/alt.html        # herausschreiben
```
