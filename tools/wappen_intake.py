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

def normalize(path, apply):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im); al = a[..., 3]
    ys, xs = np.where(al > 16)
    if len(xs) == 0:
        return None
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    trimmed = box != (0, 0, im.width, im.height)
    long_side = max(box[2] - box[0], box[3] - box[1])
    oversize = long_side > TARGET + 8
    if not (trimmed or oversize):
        return None
    if not apply:
        return f"{im.size[0]}x{im.size[1]} -> trim{'+down' if oversize else ''}"
    crop = im.crop(box)
    w, h = crop.size; sc = TARGET / max(w, h)
    if sc < 1:
        crop = crop.resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
    cv = Image.new("RGBA", (crop.width + 2 * PAD, crop.height + 2 * PAD), (0, 0, 0, 0))
    cv.alpha_composite(crop, (PAD, PAD))
    cv.save(path)
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
