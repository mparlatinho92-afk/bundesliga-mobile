#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_quality.py - rankt alle Wappen nach ECHTER Inhalts-Aufloesung.

Misst nicht die Datei-Groesse (irrefuehrend), sondern:
  - content: Bounding-Box der nicht-transparenten Pixel (= echte Logo-px)
  - eff:     effektive Aufloesung = content-Laengskante / Blockgroesse
             (Blockgroesse = groesster Faktor, mit dem das Bild verlustfrei
              rekonstruierbar ist -> entlarvt hochskalierte Tiefpass-Bilder)
Je kleiner eff, desto eher braucht das Wappen ein HD-Update.

  python tools/wappen_quality.py            # 40 schlechteste + Verteilung
  python tools/wappen_quality.py --csv      # zusaetzlich tools/wappen_quality.csv
  python tools/wappen_quality.py --n 80     # mehr Zeilen
"""
import os, glob, argparse, csv
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WROOT = os.path.join(ROOT, "Wappen")

def analyze(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im); al = a[..., 3]
    ys, xs = np.where(al > 16)
    if len(xs) == 0:
        return None
    crop = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = crop.size; s = min(w, h)
    long_side = max(w, h)
    bk = 1
    if s >= 8:
        arr = np.asarray(crop.convert("RGB"), np.float32)
        m = (np.asarray(crop)[..., 3] > 16)[..., None].astype(np.float32)
        for k in range(2, min(s // 6, 16) + 1):
            sm = crop.convert("RGB").resize((max(1, w // k), max(1, h // k)), Image.BOX)
            big = np.asarray(sm.resize((w, h), Image.NEAREST), np.float32)
            if (np.abs(arr - big) * m).sum() / (m.sum() * 3 + 1e-6) < 3.5:
                bk = k
            else:
                break
    return dict(content=f"{w}x{h}", long=long_side, block=bk,
                eff=round(long_side / bk, 1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=40)
    ap.add_argument("--csv", action="store_true")
    args = ap.parse_args()
    rows = []
    for p in glob.glob(os.path.join(WROOT, "*", "*.png")):
        if os.sep + "Ligen" in p:   # Liga-/Verbandslogos ueberspringen
            continue
        r = analyze(p)
        if r:
            r["id"] = os.path.splitext(os.path.basename(p))[0]
            r["folder"] = os.path.basename(os.path.dirname(p))
            rows.append(r)
    rows.sort(key=lambda r: r["eff"])
    print(f"{len(rows)} Wappen analysiert. Schlechteste {args.n} (eff = effektive px):\n")
    print(f"{'eff':>6} {'blk':>3} {'inhalt':>9}  {'ordner':<16} datei")
    print("-" * 72)
    for r in rows[:args.n]:
        print(f"{r['eff']:>6} {r['block']:>3} {r['content']:>9}  {r['folder']:<16} {r['id']}")
    import collections
    b = collections.Counter()
    for r in rows:
        e = r["eff"]
        b["<60" if e < 60 else "60-90" if e < 90 else "90-140" if e < 140 else ">=140"] += 1
    print("\nVerteilung eff:", {k: b[k] for k in ["<60", "60-90", "90-140", ">=140"]})
    if args.csv:
        with open(os.path.join(ROOT, "tools", "wappen_quality.csv"), "w", newline="", encoding="utf-8") as f:
            wr = csv.DictWriter(f, fieldnames=["eff", "block", "content", "long", "folder", "id"])
            wr.writeheader(); wr.writerows(rows)
        print("-> tools/wappen_quality.csv")

if __name__ == "__main__":
    main()
