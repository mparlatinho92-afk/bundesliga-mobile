#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_galleries.py - erzeugt Vorher/Nachher-Galerien der Wappen-Aufbereitung.

Vergleicht tools/wappen_backup/ (VORHER, Original) mit Wappen/Vereinswappen/
(NACHHER, aktuell) und schreibt PNG-Tafeln nach  tools/wappen_galerie/ :

  galerie_transparenz.png  - Stecktabellen-/Transparenz-Fixes (sticker/holes/disc)
  galerie_kasten.png       - weisse-Kasten-Faelle (unbox)
  galerie_recrop.png       - markante seitenverhaeltnis-treue Zuschnitte

Aufruf:  python tools/make_galleries.py
Abhaengig von wappen_doctor.py (Analyse) + Pillow/numpy/scipy.
"""
import os, numpy as np, importlib.util
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WROOT = os.path.join(ROOT, "Wappen")
# aktuelle Wappen liegen seit der Landesverband-Sortierung in Unterordnern
CUR = {}
for _dp, _dirs, _fs in os.walk(WROOT):
    for _f in _fs:
        if _f.lower().endswith(".png"):
            CUR.setdefault(_f[:-4], os.path.join(_dp, _f))
B = os.path.join(HERE, "wappen_backup")
OUT = os.path.join(HERE, "wappen_galerie")

spec = importlib.util.spec_from_file_location("wd", os.path.join(HERE, "wappen_doctor.py"))
wd = importlib.util.module_from_spec(spec); spec.loader.exec_module(wd)
OV = wd.load_overrides()

DARK = (20, 20, 20)
try:
    FONT = ImageFont.truetype("arial.ttf", 12)
except Exception:
    FONT = ImageFont.load_default()


def _aspect(arr):
    a = arr[:, :, 3]
    rs = np.any(a > 16, axis=1).nonzero()[0]
    cs = np.any(a > 16, axis=0).nonzero()[0]
    return (cs[-1] - cs[0] + 1) / (rs[-1] - rs[0] + 1) if len(rs) else 1.0


def _fit(path, h, maxw):
    im = Image.open(path).convert("RGBA")
    r = h / im.height
    w = max(1, int(im.width * r))
    if w > maxw:
        r = maxw / im.width
        im = im.resize((maxw, max(1, int(im.height * r))), Image.LANCZOS)
    else:
        im = im.resize((w, h), Image.LANCZOS)
    return im


def build(title, ids, fname, cols=4, H=54, cellw=300):
    if not ids:
        print("  (leer)", fname); return
    half = (cellw - 20) // 2
    cellh = H + 18
    rows = (len(ids) + cols - 1) // cols
    cv = Image.new("RGB", (cols * cellw, rows * cellh + 34), DARK)
    dr = ImageDraw.Draw(cv)
    dr.text((10, 10), f"{title}  -  VORHER (links) | NACHHER (rechts)   |   {len(ids)} Wappen",
            fill=(150, 190, 230), font=FONT)
    for i, tid in enumerate(ids):
        col, row = i % cols, i // cols
        x0, y0 = col * cellw, 34 + row * cellh
        bak = _fit(os.path.join(B, tid + ".png"), H, half)
        cur = _fit(CUR.get(tid, os.path.join(B, tid + ".png")), H, half)
        cv.paste(bak, (x0 + 10 + (half - bak.width) // 2, y0 + (H - bak.height) // 2), bak)
        dr.line([x0 + cellw // 2, y0, x0 + cellw // 2, y0 + H], fill=(60, 60, 60))
        cv.paste(cur, (x0 + cellw // 2 + 6 + (half - cur.width) // 2, y0 + (H - cur.height) // 2), cur)
        dr.text((x0 + 10, y0 + H + 2), tid[:30], fill=(130, 130, 130), font=FONT)
    cv.save(os.path.join(OUT, fname))
    print("  ->", fname, cv.size)


def main():
    os.makedirs(OUT, exist_ok=True)
    transp, kasten, recrop = [], [], []
    for f in sorted(os.listdir(B)):
        if not f.endswith(".png"):
            continue
        tid = f[:-4]
        bak = np.array(Image.open(os.path.join(B, f)).convert("RGBA"))
        strat = OV.get(tid, {}).get("strategy")
        auto, _ = wd.analyze(bak)
        if strat == "unbox" or auto == "bg":
            kasten.append(tid)
        elif strat in ("sticker", "holes", "disc") or auto in ("sticker", "holes", "disc"):
            transp.append(tid)
        else:
            ar = _aspect(bak)
            if ar > 1.4 or ar < 0.7:
                recrop.append(tid)
    print("Galerien ->", OUT)
    build("TRANSPARENZ / STECKTABELLE (sticker/holes/disc)", transp, "galerie_transparenz.png")
    build("WEISSE KAESTEN (unbox)", kasten, "galerie_kasten.png", cols=3, H=64)
    build("RECROP (seitenverhaeltnis-treu)", recrop, "galerie_recrop.png")


if __name__ == "__main__":
    main()
