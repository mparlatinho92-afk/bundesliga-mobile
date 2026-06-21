#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wappen_doctor.py  -  Transparenz-Arzt fuer Vereinswappen
========================================================

ZWECK
-----
Behebt objektive Transparenz-DEFEKTE in den PNG-Wappen, die im Dark-Theme
sichtbar werden (dunkler App-Hintergrund scheint durch falsch transparente
Flaechen). Das Script ist die "trainierte" Wissensbasis fuer diese Faelle:
eine neue Claude-Session muss sich keine Strategie mehr ausdenken, sondern
laesst das Script scannen und traegt fuer Sonderfaelle einen Eintrag in
  tools/wappen_overrides.json
ein.

WAS GEHOERT HIERHER (objektive PNG-Defekte, in BEIDEN Themes korrekt):
  - "holes"  : voll eingeschlossene transparente Innenflaechen -> mit Weiss
               hinterlegen. Klassischer Defekt aus zu aggressiver
               Hintergrund-Entfernung (z. B. TSV Gruenwald, SV Henstedt).
  - "disc"   : runde/ringfoermige Wappen mit "Eingaengen" (Luecken im Ring),
               durch die das Zentrum mit dem Aussenraum verbunden ist. Reine
               Konnektivitaet erkennt das Zentrum faelschlich als aussen.
               Morphologisches Schliessen ueberbrueckt die Luecken, dann wird
               die ganze Scheibe weiss hinterlegt (z. B. TSV Landsberg).
  - "bg"     : eingebrannter, FLAECHIGER Hintergrund (gruenes/weisses Rechteck).
               Flood-Fill von den Ecken, Hintergrundfarbe wird automatisch
               aus den Eck-Pixeln bestimmt und entfernt.
  - "sticker": Kicker-Stecktabellen-Prinzip (z. B. Union Berlin, SV Henstedt).
               Eine weisse Schutzschicht, die der SILHOUETTE folgt, plus ein
               kleiner weisser Rand nach aussen (wie mit der Schere ausgeschnitten).
               Innen keine Transparenz mehr: kein Inhalt = weiss. Ideal fuer
               Wappen mit Sonderform, die als sauberer "Aufkleber" wirken sollen.
               params: {"border": <px-aussen>, "close": <px-luecken-schliessen>}

WAS NICHT HIERHER GEHOERT (Theme-abhaengig, wird in CSS geloest):
  - Dunkle Logo-Elemente auf dunklem Theme (z. B. Wormatia Worms: dunkler
    Schrift-Aussenring). Das ist KEIN Loch -> nicht ins PNG einbrennen.
    Loesung: dezenter Dark-Theme-Halo via CSS (drop-shadow) in template.html.

KOMPOSITION (warum es sauber aussieht, kein "weisses Quadrat"):
  Das Weiss wird NUR innerhalb der erkannten Silhouette als Backing gelegt und
  das Original-Logo per Alpha-Composite darueber gerechnet. Anti-Aliasing-
  Kanten bleiben erhalten, dunkle Pixel bekommen Weiss dahinter statt
  durchscheinendem App-Hintergrund. Die Backing-Form folgt der Silhouette
  (rund, eckig, Sonderform) - kein hartes Rechteck.

NUTZUNG
-------
  # Scan ALLER Wappen, nur Report (schreibt nichts):
  python tools/wappen_doctor.py

  # Nur bestimmte Teams scannen:
  python tools/wappen_doctor.py --only tsvlandsberg_50,tsvgruenwald_144

  # Reparieren: wendet die Strategien aus wappen_overrides.json an
  # (Originale werden nach tools/wappen_backup/ gesichert):
  python tools/wappen_doctor.py --apply

  # Reparieren inkl. aller auto-erkannten Faelle (sticker/holes/disc):
  python tools/wappen_doctor.py --apply --auto

  # Zusaetzlich seitenverhaeltnis-treu zuschneiden (fuer .wp-Hoehendarstellung
  # in Tabellen: breite Wappen wie Union Berlin haengen ueber statt zu schrumpfen):
  python tools/wappen_doctor.py --apply --auto --recrop

  # Einzelnes Team mit expliziter Strategie reparieren (ohne Override-Eintrag):
  python tools/wappen_doctor.py --apply --only tsvlandsberg_50 --strategy disc

WORKFLOW BEI NEUEN VEREINEN
---------------------------
  1. Neues Wappen in Wappen/Vereinswappen/ ablegen.
  2. python tools/wappen_doctor.py --only <id>   -> Report lesen.
  3. Passt die Auto-Empfehlung? -> Eintrag in wappen_overrides.json setzen.
  4. python tools/wappen_doctor.py --apply --only <id>
  5. Optisch im Dark-Theme pruefen, dann ./manage-v (baked Base64 neu).

Abhaengigkeiten: Pillow, numpy, scipy.
"""

import argparse
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# --- Pfade (relativ zum Projekt-Root, egal von wo aufgerufen) -------------
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WAPPEN_ROOT = os.path.join(ROOT, "Wappen")  # Wappen liegen in Landesverband-Unterordnern
BACKUP_DIR = os.path.join(HERE, "wappen_backup")
OVERRIDES = os.path.join(HERE, "wappen_overrides.json")

SOLID = 128          # Alpha >= SOLID  -> gehoert sicher zum Logo
TRANSP = 40          # Alpha <  TRANSP -> sicher transparent
WHITE = (255, 255, 255)


# --------------------------------------------------------------------------
# Hilfsfunktionen
# --------------------------------------------------------------------------
def _disk(radius):
    """Rundes Struktur-Element fuer Morphologie."""
    r = int(radius)
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def _auto_radius(h, w):
    """Schliess-Radius relativ zur Bildgroesse (ueberbrueckt Ring-Luecken)."""
    return max(2, int(round(min(h, w) * 0.05)))


def recrop_aspect(arr, pad_pct=0.06):
    """
    Schneidet auf den Inhalts-Bereich (Alpha-Bounding-Box) zu und legt rundum
    einen kleinen gleichmaessigen Rand an - SEITENVERHAELTNIS-TREU (kein
    Quadrieren). So koennen breite/hohe Wappen im UI hoehenbasiert dargestellt
    werden und nach links/rechts ueberhaengen, statt ins Quadrat geschrumpft zu
    werden (vgl. .wp-Klasse / Kicker-Stecktabelle). Aendert die Bildgroesse.
    """
    a = arr[:, :, 3]
    rows = np.any(a > 16, axis=1)
    cols = np.any(a > 16, axis=0)
    if not rows.any():
        return arr
    r = np.where(rows)[0]
    c = np.where(cols)[0]
    crop = arr[r[0]:r[-1] + 1, c[0]:c[-1] + 1]
    ch, cw = crop.shape[:2]
    pad = max(2, int(round(max(ch, cw) * pad_pct)))
    out = np.zeros((ch + 2 * pad, cw + 2 * pad, 4), dtype=arr.dtype)
    out[pad:pad + ch, pad:pad + cw] = crop
    return out


def _composite_white_backing(arr, region_mask, feather=None):
    """
    Legt Weiss als Backing in region_mask und rechnet das Original-Logo per
    Alpha-Composite darueber. Kanten/Anti-Aliasing bleiben erhalten.
    arr: HxWx4 uint8 (wird nicht mutiert), region_mask: HxW bool.
    feather: weichzeichnet die Backing-KANTE (sigma in px) -> kein hartes
    0/255-Treppchen am Rand (Raender fein geglaettet). None = automatisch
    proportional zur Bildgroesse (sonst sind grosse Wappen zackig). 0 = aus.
    """
    h, w = arr.shape[:2]
    if feather is None:
        feather = max(0.8, min(h, w) / 130.0)      # skaliert mit Aufloesung
    f = arr.astype(np.float32)
    oa = f[:, :, 3:4] / 255.0                      # Original-Alpha 0..1
    region = region_mask.astype(np.float32)
    if feather and feather > 0:
        region = np.clip(ndimage.gaussian_filter(region, sigma=feather), 0.0, 1.0)
    back_a = region[:, :, None]                    # Backing-Alpha (weiche Kante)
    # Logo ueber weisses Backing: out = orig*oa + white*back_a*(1-oa)
    out = f.copy()
    for c in range(3):
        out[:, :, c] = f[:, :, c] * oa[:, :, 0] + 255.0 * back_a[:, :, 0] * (1 - oa[:, :, 0])
    out_a = oa[:, :, 0] + back_a[:, :, 0] * (1 - oa[:, :, 0])
    out[:, :, 3] = out_a * 255.0
    return np.clip(out, 0, 255).astype(np.uint8)


# --------------------------------------------------------------------------
# Strategien  ->  liefern jeweils das reparierte uint8-Array
# --------------------------------------------------------------------------
def strat_holes(arr):
    """Voll eingeschlossene transparente Flaechen weiss hinterlegen."""
    alpha = arr[:, :, 3]
    solid = alpha >= SOLID
    filled = ndimage.binary_fill_holes(solid)
    region = filled  # Backing nur unter der Silhouette inkl. gefuellter Loecher
    return _composite_white_backing(arr, region)


def strat_disc(arr, radius=None):
    """Ring/rund mit Luecken: schliessen -> fuellen -> ganze Scheibe weiss."""
    h, w = arr.shape[:2]
    if radius is None:
        radius = _auto_radius(h, w)
    alpha = arr[:, :, 3]
    solid = alpha >= SOLID
    closed = ndimage.binary_closing(solid, structure=_disk(radius))
    filled = ndimage.binary_fill_holes(closed)
    return _composite_white_backing(arr, filled)


def strat_bg(arr, tolerance=35):
    """Flaechigen, eingebrannten Hintergrund von den Ecken her entfernen."""
    a = arr.astype(np.int32)
    h, w = a.shape[:2]
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    samples = [a[y, x, :3].astype(float) for (x, y) in corners if a[y, x, 3] > 10]
    bg = np.mean(samples, axis=0) if samples else np.array([255.0, 255.0, 255.0])

    visited = np.zeros((h, w), dtype=bool)
    queue = list(corners)
    for (x, y) in corners:
        visited[y, x] = True
    i = 0
    while i < len(queue):
        cx, cy = queue[i]; i += 1
        a[cy, cx, 3] = 0
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                if a[ny, nx, 3] == 0:
                    queue.append((nx, ny))      # durch bereits Transparentes ziehen
                else:
                    d = np.sqrt(np.sum((a[ny, nx, :3].astype(float) - bg) ** 2))
                    if d <= tolerance:
                        queue.append((nx, ny))
    return a.astype(np.uint8)


def strat_sticker(arr, border=None, close=None):
    """
    Kicker-Stecktabellen-Prinzip: weisses Backing folgt der Silhouette + kleiner
    weisser Rand nach aussen (wie ausgeschnitten). Subsumiert holes & disc:
      close > 0 ueberbrueckt Ring-Luecken, fill_holes fuellt Innenflaechen,
      dilation legt den aeusseren Schutzrand an.
    """
    h, w = arr.shape[:2]
    if close is None:
        close = _auto_radius(h, w)
    if border is None:
        border = max(1, int(round(min(h, w) * 0.045)))
    alpha = arr[:, :, 3]
    solid = alpha >= SOLID
    shape = solid
    if close > 0:
        shape = ndimage.binary_closing(shape, structure=_disk(close))
    shape = ndimage.binary_fill_holes(shape)
    if border > 0:
        shape = ndimage.binary_dilation(shape, structure=_disk(border))
    return _composite_white_backing(arr, shape)


def _hull_backing(arr, pad=3):
    """Weisses Backing ueber die KONVEXE HUELLE des Inhalts: eine solide,
    abgerundete Flaeche hinter dem ganzen Logo (auch verstreute Text-Elemente),
    ohne hartes Rechteck. Fuer Text-/Kasten-Logos besser als die Silhouette."""
    from scipy.spatial import ConvexHull
    from PIL import ImageDraw
    a = arr[:, :, 3]
    ys, xs = np.where(a > 40)
    if len(xs) < 3:
        return _composite_white_backing(arr, a >= SOLID)
    pts = np.column_stack([xs, ys])
    try:
        hull = ConvexHull(pts)
    except Exception:
        return _composite_white_backing(arr, ndimage.binary_fill_holes(a >= SOLID))
    poly = [tuple(pts[v]) for v in hull.vertices]
    mask_img = Image.new("L", (arr.shape[1], arr.shape[0]), 0)
    ImageDraw.Draw(mask_img).polygon(poly, fill=255)
    m = np.array(mask_img) > 0
    if pad > 0:
        m = ndimage.binary_dilation(m, _disk(pad))
    return _composite_white_backing(arr, m)


def strat_circle(arr, pad_pct=0.06):
    """
    Weisses KREIS-Backing, gross genug dass der GESAMTE Inhalt (auch mehrere
    Teile, z. B. Monogramm + Text-Ring) in einem gemeinsamen Kreis liegt.
    Anti-aliased (4x supersampled). Fuer runde Logos wie SC Konstanz.
    """
    from PIL import ImageDraw
    h, w = arr.shape[:2]
    a = arr[:, :, 3]
    ys, xs = np.where(a > 40)
    if len(xs) == 0:
        return arr
    cx, cy = (xs.min() + xs.max()) / 2.0, (ys.min() + ys.max()) / 2.0
    # Radius = groesster Abstand vom Zentrum zu Inhaltspixeln -> umschliesst alles
    r = float(np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2).max())
    r *= (1.0 + pad_pct)
    S = 4  # Supersampling fuer glatte Kante
    mimg = Image.new("L", (w * S, h * S), 0)
    ImageDraw.Draw(mimg).ellipse(
        [(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=255)
    mimg = mimg.resize((w, h), Image.LANCZOS)
    region = np.array(mimg).astype(np.float32) / 255.0
    return _composite_white_backing(arr, region, feather=0.6)


def strat_unbox(arr, tolerance=35, pad=3):
    """
    Weisser/farbiger KASTEN-Hintergrund (z. B. Mondorf, Hiltrup, Essingen):
    erst den flaechigen Hintergrund per Eck-Flood-Fill entfernen (bg), dann
    seitenverhaeltnis-treu zuschneiden, dann solides Backing ueber die konvexe
    Huelle (kein weisses Quadrat, abgerundete Flaeche hinter dem ganzen Logo).
    WICHTIG aus dem Original-Backup (opaker Rand) anwenden, nicht zusaetzlich
    --recrop setzen.
    """
    cleaned = strat_bg(arr, tolerance=tolerance)
    cleaned = recrop_aspect(cleaned)
    return _hull_backing(cleaned, pad=pad)


STRATS = {
    "sticker": lambda arr, p: strat_sticker(arr, border=p.get("border"), close=p.get("close")),
    "circle": lambda arr, p: strat_circle(arr, pad_pct=p.get("pad_pct", 0.06)),
    "unbox": lambda arr, p: strat_unbox(arr, tolerance=p.get("tolerance", 35), pad=p.get("pad", 3)),
    "holes": lambda arr, p: strat_holes(arr),
    "disc": lambda arr, p: strat_disc(arr, radius=p.get("radius")),
    "bg": lambda arr, p: strat_bg(arr, tolerance=p.get("tolerance", 35)),
    "none": lambda arr, p: arr,
}


# --------------------------------------------------------------------------
# Analyse / Auto-Empfehlung
# --------------------------------------------------------------------------
def analyze(arr):
    """Erkennt den wahrscheinlichen Defekt-Typ; gibt (empfehlung, infos)."""
    alpha = arr[:, :, 3]
    h, w = alpha.shape
    solid = alpha >= SOLID
    if not solid.any():
        return "none", {"note": "leer/komplett transparent"}

    # Morphologie auf herunterskalierter Maske rechnen (Prozente sind
    # skaleninvariant) -> Scan ueber alle Wappen bleibt schnell, auch bei
    # grossen Quell-PNGs.
    SCAN_MAX = 200
    if max(h, w) > SCAN_MAX:
        sa = np.array(Image.fromarray(alpha).resize(
            (max(1, w * SCAN_MAX // max(h, w)), max(1, h * SCAN_MAX // max(h, w))),
            Image.NEAREST))
    else:
        sa = alpha
    s_solid = sa >= SOLID
    sh, sw = sa.shape

    # Anteil transparenter Pixel INNERHALB der Silhouette (= durchscheinender
    # App-Hintergrund). Das ist das eigentliche Dark-Theme-Problem.
    sil = ndimage.binary_fill_holes(ndimage.binary_closing(s_solid, _disk(_auto_radius(sh, sw))))
    inner_transp = sil & (sa < TRANSP)
    inner_transp_pct = 100.0 * inner_transp.sum() / max(1, sil.sum())

    # Flaechiger opaker Rand -> eingebrannter Hintergrund (gruen/weiss-Kasten)?
    border = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    border_opaque = 100.0 * (border >= SOLID).mean()

    # Hell-Inhalt-Waechter: mittlere Helligkeit der opaken Pixel. Sehr hell ->
    # weisses Backing koennte Weiss-auf-Weiss erzeugen -> markieren.
    op = arr[solid][:, :3].astype(float)
    lum = float(np.mean(0.299 * op[:, 0] + 0.587 * op[:, 1] + 0.114 * op[:, 2]))

    infos = {
        "inner_transp_pct": round(float(inner_transp_pct), 1),
        "border_opaque_pct": round(float(border_opaque), 1),
        "lum": int(round(lum)),
    }
    if lum > 205:
        infos["WARN"] = "HELL-INHALT (weiss-auf-weiss pruefen)"

    if border_opaque > 60:
        return "bg", infos
    # Transparenz scheint durch -> Stecktabellen-Sticker normalisiert das.
    if inner_transp_pct > 1.5:
        return "sticker", infos
    return "none", infos


# --------------------------------------------------------------------------
# Treiber
# --------------------------------------------------------------------------
def load_overrides():
    if os.path.exists(OVERRIDES):
        with open(OVERRIDES, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def team_id(fname):
    return os.path.splitext(fname)[0]


def main():
    ap = argparse.ArgumentParser(description="Transparenz-Arzt fuer Vereinswappen")
    ap.add_argument("--apply", action="store_true", help="Aenderungen schreiben (sonst nur Report)")
    ap.add_argument("--auto", action="store_true", help="mit --apply auch auto-erkannte Faelle (sticker/holes/disc) reparieren")
    ap.add_argument("--recrop", action="store_true", help="vor dem Fix seitenverhaeltnis-treu zuschneiden (fuer .wp-Hoehendarstellung)")
    ap.add_argument("--only", default="", help="Komma-Liste von Team-IDs (Dateiname ohne .png)")
    ap.add_argument("--strategy", default="", help="Strategie erzwingen (sticker|holes|disc|bg|none) - nur mit --only sinnvoll")
    args = ap.parse_args()

    overrides = load_overrides()
    only = set(s.strip() for s in args.only.split(",") if s.strip())

    # rekursiv durch alle Wappen/<Landesverband>/-Unterordner
    paths = []
    for dirpath, _dirs, fnames in os.walk(WAPPEN_ROOT):
        for f in fnames:
            if f.lower().endswith(".png"):
                paths.append(os.path.join(dirpath, f))
    paths.sort()
    if only:
        paths = [p for p in paths if team_id(os.path.basename(p)) in only]
        if not paths:
            print("Keine passenden Dateien gefunden fuer:", ", ".join(only))
            return

    if args.apply:
        os.makedirs(BACKUP_DIR, exist_ok=True)

    n_changed = 0
    n_flagged = 0
    for path in paths:
        fname = os.path.basename(path)
        tid = team_id(fname)
        img = Image.open(path).convert("RGBA")
        arr = np.array(img)

        rec = overrides.get(tid, {})
        auto, infos = analyze(arr)

        # Strategie bestimmen: CLI > override > auto(nur mit --auto)
        if args.strategy:
            strat = args.strategy
            params = {}
        elif rec.get("strategy"):
            strat = rec["strategy"]
            params = rec.get("params", {})
        elif args.auto and auto in ("sticker", "holes", "disc"):
            strat = auto
            params = {}
        else:
            strat = None
            params = {}

        if auto != "none" or strat:
            n_flagged += 1
            tag = f"override:{rec['strategy']}" if rec.get("strategy") else f"auto:{auto}"
            note = (" | " + rec["note"]) if rec.get("note") else ""
            print(f"{tid:30} {tag:14} {infos}{note}")

        if not args.apply:
            continue

        # Pipeline: erst seitenverhaeltnis-treu zuschneiden, dann Transparenz-Fix.
        out = arr
        actions = []
        if args.recrop:
            out = recrop_aspect(out)
            if not np.array_equal(out, arr):
                actions.append("recrop")
        if strat and strat != "none":
            fn = STRATS.get(strat)
            if fn is None:
                print(f"  ! unbekannte Strategie '{strat}' fuer {tid} - uebersprungen")
            else:
                out = fn(out, params)
                actions.append(strat)

        if not actions or (out.shape == arr.shape and np.array_equal(out, arr)):
            continue
        # Backup nur einmal
        bpath = os.path.join(BACKUP_DIR, fname)
        if not os.path.exists(bpath):
            shutil.copy2(path, bpath)
        Image.fromarray(out, "RGBA").save(path)
        n_changed += 1
        print(f"  -> {' + '.join(actions)}  [Backup: tools/wappen_backup/{fname}]")

    print(f"\nMarkiert: {n_flagged}  |  Repariert: {n_changed}", end="")
    if not args.apply:
        print("  (Dry-Run - nichts geschrieben; --apply zum Schreiben)")
    else:
        print()


if __name__ == "__main__":
    main()
