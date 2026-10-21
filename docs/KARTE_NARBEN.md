# Karte: Mini-Polygone („Narben") beseitigen

> Ausgelagert aus CLAUDE.md am 21.10.2026 (wörtlich). Im Kern steht nur noch die Kurzregel mit Verweis hierher.

Splitter, die nichts abdecken, aber einen Haarstrich in eine Fläche zeichnen. Routine:

```bash
python -m http.server 3334          # zweite Konsole
node tools/karte_narben.mjs         # meldet Narben mit Region; Exit 1 = Befund
python tools/gen_regions.py         # nach einer Korrektur neu erzeugen
node tools/karte_narben.mjs         # muss 0 melden
```

**Erkannt wird an der BREITE, nicht an der Fläche.** Ein 5 km langes, 5 m schmales Band hat
0,025 km² und überlebt jede Flächenschwelle:

```
breite = 2 · Fläche / Umfang      metrisch (cos-Breitengrad), Schwelle 166 m
```

Die Schwelle entspricht der Vereinfachungstoleranz `SIMPLIFY` — was schmaler ist als sie, besteht
nur aus ihrem Fehler. Echte Kleininseln (Fehmarn, Rügen, Bremerhaven) sind kompakt und damit um
Größenordnungen breiter; sie bleiben.

> **Die Regionen-Ebene hat DREI Erzeuger.** Wer nur einen filtert, sieht den Fehler weiterhin:
> 1. Waben (Voronoi je Verein) — `tools/gen_regions.py`, `waben_export`
> 2. statische Regionsflächen — `tools/gen_regions.py`, Ausgabe-Schleife
> 3. Laufzeit-Vereinigung — `app/map_saison.js`, `_wabenUnion`
>
> Alle drei müssen dieselbe Schwelle benutzen (`MINI_BREITE_M`, beide Dateien), sonst verwirft der
> Generator Splitter, die die Laufzeit gleich wieder erzeugt. **Und metrisch messen** — in Grad
> hinge die Schwelle von der Ausrichtung des Splitters ab (0,0015° sind nord-süd 166 m, ost-west
> auf 53° Breite nur ~100 m).

**Nicht raten, welche Ebene schuld ist** — `tools/karte_narben.mjs` misst, was der Browser
tatsächlich zeichnet, und nennt über das Tooltip-Label die Region. Ein Blick in die Dateien auf
der Platte übersieht Erzeuger 3 zwangsläufig.
