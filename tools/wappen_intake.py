#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_intake.py - normalisiert neu abgelegte Vereinswappen.

Findet Wappen in Wappen/<Landesverband>/*.png, schneidet auf den nicht-
transparenten Inhalt zu (alpha-bbox, seitenverhaeltnis-treu) und deckelt die
laengste Kante auf 240px (Pipeline-Standard) + kleiner transparenter Rand.
Aendert nur, was noetig ist (oversize oder ungetrimmt). In-place.

  python tools/wappen_intake.py                  # Report: was waere zu tun
  python tools/wappen_intake.py --apply          # alle oversize/ungetrimmt fixen
  python tools/wappen_intake.py --apply --only svxyz_12,abc_3
Fuer Transparenz-/Freistellungs-Fixes danach: tools/wappen_doctor.py --recrop
"""
import os, sys, glob, argparse
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WROOT = os.path.join(ROOT, "Wappen")
TARGET = 240
PAD = 3

def team_id(p): return os.path.splitext(os.path.basename(p))[0]

def farbzahl(im):
    """Verschiedene RGBA-Kombinationen - nicht nur RGB der deckenden Pixel.

    Die erste Fassung zaehlte `a[...,:3][alpha>40]` und uebersah damit genau das, was
    eine PNG gross macht: die weichen Kanten. 68 Wappen galten dadurch als quantisiert,
    obwohl sie 1000-3000 RGBA-Werte trugen (VfB 03 Hilden 3062). Fuer die Dateigroesse
    zaehlt jede Kombination, denn die Palette hat 256 Plaetze fuer RGBA, nicht fuer RGB.
    """
    a = np.asarray(im)
    if a.size == 0:
        return 0
    return len(np.unique(a.reshape(-1, 4), axis=0))


def quantisieren(im):
    """Auf eine 256-Farben-Palette bringen. Wappen sind Flaechengrafiken - selbst die
    farbreichsten (Bremer Verbandswappen, 29 278 Farben) weichen danach im Mittel um 1,5
    von 255 ab, also unsichtbar, bei rund 45 % weniger Bytes.

    Warum das noetig ist: manage-v bettet alle Wappen als Base64 in den Monolithen ein.
    Nach der HD-Umstellung war index.html 64,6 MB, davon 91 % Bilder - GitHub warnt ab
    50 MB und blockiert bei 100. Quantisiert bleibt reichlich Luft."""
    return im.quantize(colors=256, method=Image.FASTOCTREE).convert("RGBA")


def normalize(path, apply):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im); al = a[..., 3]
    ys, xs = np.where(al > 16)
    if len(xs) == 0:
        return None
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    # Nicht "hat ueberhaupt einen Rand?" fragen, sondern "hat es den RICHTIGEN Rand?".
    # Die erste Fassung verglich die bbox mit dem vollen Bild - da intake selbst PAD px
    # transparenten Rand anlegt, meldete sie danach jedes eigene Ergebnis wieder als
    # "trim": 1288 von 1291 Wappen im Report, also nutzlos. Ein Wappen ist in Ordnung,
    # wenn ringsum genau PAD (+-1) frei ist.
    raender = (box[0], box[1], im.width - box[2], im.height - box[3])
    trimmed = any(abs(r - PAD) > 1 for r in raender)
    long_side = max(box[2] - box[0], box[3] - box[1])
    oversize = long_side > TARGET + 8
    bunt = farbzahl(im) > 256
    if not (trimmed or oversize or bunt):
        return None
    if not apply:
        was = [x for x in ('trim' if trimmed else '', 'down' if oversize else '',
                           'quant' if bunt else '') if x]
        return f"{im.size[0]}x{im.size[1]} -> {'+'.join(was)}"
    crop = im.crop(box)
    w, h = crop.size; sc = TARGET / max(w, h)
    if sc < 1:
        crop = crop.resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
    cv = Image.new("RGBA", (crop.width + 2 * PAD, crop.height + 2 * PAD), (0, 0, 0, 0))
    cv.alpha_composite(crop, (PAD, PAD))
    if farbzahl(cv) > 256:
        cv = quantisieren(cv)
    cv.save(path, optimize=True)
    return f"-> {cv.size[0]}x{cv.size[1]}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    only = set(s.strip() for s in args.only.split(",") if s.strip())
    paths = []
    for dp, _d, fs in os.walk(WROOT):
        for f in fs:
            if f.lower().endswith(".png"):
                paths.append(os.path.join(dp, f))
    if only:
        paths = [p for p in paths if team_id(p) in only]
    n = 0
    for p in sorted(paths):
        r = normalize(p, args.apply)
        if r:
            n += 1
            print(f"  {team_id(p):34} {r}")
    print(f"\n{n} Wappen {'normalisiert' if args.apply else 'zu normalisieren (--apply zum Schreiben)'}")

if __name__ == "__main__":
    main()
