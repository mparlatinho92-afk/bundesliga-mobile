# Handy-Ansicht am Desktop nachstellen

`vorher-nachher.png` – drei Panels bei **363 CSS px** (das gemessene Zielgerät), gleicher
Spielstand, gleiche Liga:

| Panel | Tabelle | Schirm | abgeschnitten |
|---|---|---|---|
| VORHER v0.8.140, mit gezogener Sp-Spalte | 493 px | 363 px | **138 px** (Pkt/Form/Info weg) |
| VORHER v0.8.140, ohne gezogene Spalte | 387 px | 363 px | **32 px** (Form/Info weg) |
| NACHHER, dieselbe gezogene Spalte | 359 px | 363 px | nein |

Zahlen im Rohformat: `_messwerte.json`.

`4-ziel-liga-tooltip.png` – der Hover-Ersatz fuers Handy: Antippen des Auf-/Abstiegs-Kuerzels
ganz rechts zeigt den vollen Ziel-Liganamen als schwebendes Fenster. Frueher ersetzte der Tipp
den Zellinhalt und schob dadurch die Tabelle.

## Warum das Handy zeigte, was der Browser nicht zeigte

Zwei Gründe, beide unabhängig voneinander:

1. **Gezogene Spaltenbreiten** (`ba_coltab_w`) landen als Inline-Style am `<th>` und schlagen
   damit jede Media-Query. Auf dem Handy lag ein solcher Wert, im Desktop-Browser nicht.
   Ab v0.8.141 ignoriert das Mobil-Layout sie.
2. **`pointer:coarse`.** Das Projekt schaltet das Mobil-Layout über
   `@media (max-width:768px), (pointer:coarse)`. Ein schmal gezogenes Desktop-Fenster hat
   `pointer:fine` – unter 768 px greift die Media-Query zwar trotzdem, aber alles, was nur an
   `pointer:coarse` hängt, fehlt.

## So stellt man es nach

**Firefox/Chrome von Hand:** Gerätesimulation einschalten und ein eigenes Gerät anlegen –
**363 × 806, DPR 3,5, Typ „Mobil"** (nicht „Responsive" ohne Touch: nur der Mobil-Typ setzt
`pointer:coarse`).

**Automatisch, mit Messwerten:**

```bash
python -m http.server 3334                      # zweite Konsole
node tools/handy_shot.mjs                       # aktueller Stand (template.html)
node tools/handy_shot.mjs --file index.html     # letzter Build
node tools/handy_shot.mjs --w 412 --out x.png   # anderes Gerät
```

Ausgabe u.a. `abgeschnitten: "nein"` bzw. `"32 px"` – das ist die Prüfgröße.

## Was so NICHT prüfbar bleibt

* echte Finger: Tap-Ziele, Wischen, Pull-to-Refresh, versehentliche Gesten
* die Systemleisten des Handys (oben Uhr/Akku, unten Navigation) – sie kosten Höhe, nicht Breite
* **der Spielstand.** Der localStorage des Handys kommt nicht in den Desktop-Browser. Genau
  daran ist die erste Suche gescheitert. Wenn ein Fehler nur auf dem Handy auftritt: dort
  **Exportieren**, die Datei auf dem Desktop **Importieren** – dann ist der Zustand derselbe.
