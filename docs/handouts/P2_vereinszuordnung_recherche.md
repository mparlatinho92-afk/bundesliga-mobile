# P2 – Historische Vereine: derselbe Verein oder nicht? (152 Fälle, in Portionen)

**Anhängen:** `00_KONTEXT.md` + diese Datei + `P2_liste.txt`.
**Ergebnis je Portion:** `P2_ergebnis_<von>-<bis>.json`
**Art:** Reine Recherche mit Websuche, ideal in Portionen zu ~25 Fällen je Chat.

## Worum es geht
Das Archiv enthält Abschlusstabellen 1963–2008. Manche Vereinsnamen darin („Quellname“) stehen am
selben Ort wie ein Verein im Spiel („Spielverein“). Offen ist, ob es **derselbe Verein** ist, etwa nach
einer Umbenennung, oder ein **anderer**. Die Maschine hat per Wikipedia 179 Fälle geprüft, 152 blieben ohne
sicheren Beleg. Diese stehen in `P2_liste.txt`:

```
  <Quellname> [<Quelle>] (<Saisons>) -> <Spielverein>
      <warum die Maschine unsicher war>
```
Zwei Abschnitte: `== FUSION? ==` (9 Fälle: im Artikel steht eine Fusion am Ort, genauer hinsehen) und
`== offen ==` (143 Fälle: kein Beleg gefunden).

## Die Regeln (so hat der Nutzer bisher entschieden)
| Befund | Urteil |
|---|---|
| Quellname ist ein früherer Name des Spielvereins (Umbenennung, Belegsatz vorhanden) | `"umbenennung"` |
| Nur Schreibvariante/Tippfehler der Quelle (z. B. „FC Gundelfing“ statt Gundelfingen) | `"schreibweise"` |
| Quellname ist ein **Fusions-Vorgänger** des Spielvereins | `"fusion"` + Jahr |
| Verschiedene Vereine (spielten z. B. gleichzeitig, eigener Artikel, anderer Stadtteil) | `"getrennt"` |
| Kein belastbarer Beleg | `"offen"` |

**Fallen, gemessen:**
- **Weiterleitung ≠ Beleg für Umbenennung.** „TuS Ahlen“ leitet auf Rot Weiss Ahlen weiter, es war aber eine
  Fusion 1996.
- **„Ging aus einer Fusion hervor“ ist kein Beleg für Gleichheit.** VfB Rheine entstand 1971 aus einer
  Fusion, der Eintracht Rheine später aus einer weiteren.
- Spielten beide Namen in **derselben Saison**, sind es zwei Vereine.
- **Reserven:** „A“, „Am.“, „Amat.“, „Amateure“ = II. Ein Amateur-Team gehört zur II, nicht zum
  Profiverein.
- „SC“ und „FC“ am selben Ort sind oft zwei Vereine. Nicht nach Klang entscheiden.
- DDR-Namen (Motor, Chemie, Stahl, Aktivist, Empor …) → die Nachwendenamen sind oft Neugründungen oder
  Abspaltungen. Belegsatz nötig.

## Ergebnisformat
```json
[
  { "quelle": "BFC Wolfratshausen", "ziel": "BCF Wolfratshausen",
    "urteil": "schreibweise", "jahr": null,
    "beleg": "https://de.wikipedia.org/wiki/…", "zitat": "…kurzer Satz, der es zeigt…" }
]
```
`quelle` und `ziel` genau so schreiben wie in der Liste (der Einbau gleicht auf Zeichen ab).

## Ablauf
1. Portion nennen, z. B. „Fälle 1–25“ (in Reihenfolge der Liste gezählt, FUSION? zuerst).
2. Je Fall suchen: Wikipedia-Artikel beider Namen, Vereinshomepage (Chronik), fussball.de, Lokalpresse.
3. Die Datei ausgeben. **Am Ende eine Zählung:** wie viele je Urteil.
