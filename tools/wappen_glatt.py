#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_glatt.py - grobe/verpixelte Wappen auf reine Farbflaechen zurueckfuehren und sauber hochskalieren.

AUF AUSDRUECKLICHEN WUNSCH DES NUTZERS (14.11.2026): "farben sauber machen, z.B. blautoene vereinheitlichen, damit es
weniger pixel sind, also upscalen". Sonst gilt die Rollen-Grenze: Artwork nicht eigenmaechtig verschoenern.
Das Ergebnis geht in einen UNTERORDNER zur Sichtung, nie direkt nach Wappen/.

WARUM SO UND NICHT ANDERS
Ein Wappen besteht aus wenigen Flaechenfarben. Grobe Dateien haben dazwischen Mischfarben (Antialiasing, JPEG-Rauschen,
Verlaeufe). Glattes Vergroessern (LANCZOS) vergroessert die Mischsaeume mit, Vektorisieren (potracer) ist 2026-08
gescheitert (eine Kontur je Ring, Innen/Aussen nicht trennbar). Hier stattdessen:
  1. Palette: k-means auf den deckenden Pixeln, nahe Zentren zusammenlegen, Kleinstcluster aufloesen
     (oder feste Palette je Wappen, z.B. "gelb und schwarz vereinheitlichen").
  2. Jedes Pixel bekommt die naechste Palettenfarbe (Label), Transparenz ist ein eigenes Label.
     Ein Modus-Filter 3x3 entfernt JPEG-Sprenkel.
  3. Je Label eine 0/1-Maske, bikubisch auf 2x Zielgroesse vergroessert und leicht weichgezeichnet;
     pro Pixel gewinnt die staerkste Maske -> glatte, runde Kanten ohne Treppen und ohne Mischsaum.
  4. Auf Zielgroesse herunterrechnen (LANCZOS) = sauberes Antialiasing.
Grenze: feine Linien unter ~1 px im Original (Zeichnungen, Kleinstschrift) koennen dicker oder duenner werden.

  python tools/wappen_glatt.py <eingabe> <ausgabe.png> [--k 4] [--palette ffe600,000000] [--rand] [--ziel 1024]
                               [--sigma 0.6] [--weg 0,0,0]
    --rand    Hintergrund vom Bildrand her entfernen (Farbe der Ecken, nur randberuehrende Flaechen)
    --weg     diese Palettenfarbe(n) nach der Zuordnung transparent machen (Rest eines Kastens)
    --aussen  diese Palettenfarbe(n) nur dort entfernen, wo sie aussen am Wappen haengen (heller Saum, weisse Ecken)
"""
import sys, argparse
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

sys.stdout.reconfigure(encoding='utf-8')


def hexrgb(s):
    s = s.strip().lstrip('#')
    return [int(s[i:i + 2], 16) for i in (0, 2, 4)]


def rand_weg(a, tol=60):
    """Hintergrund vom Rand her: Pixel nahe einer Eckfarbe, nur Flaechen mit Randkontakt."""
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int)
    ecken = [rgb[1, 1], rgb[1, w - 2], rgb[h - 2, 1], rgb[h - 2, w - 2]]
    nah = np.zeros((h, w), bool)
    for c in ecken:
        nah |= np.sqrt(((rgb - c) ** 2).sum(-1)) < tol
    nah |= a[..., 3] < 128
    zu = ndimage.binary_opening(nah, iterations=1)
    lab, _ = ndimage.label(zu)
    rand = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(rand))
    bg = ndimage.binary_dilation(bg, iterations=1) & nah
    a = a.copy(); a[bg, 3] = 0
    return a


def palette(px, k, merge=40.0, klein=0.004):
    np.random.seed(1)
    c, lab = kmeans2(px.astype(float), k, minit='++', seed=1)
    # nahe Zentren zusammenlegen (gewichtet), Kleinstcluster aufloesen
    zent = [(c[i], (lab == i).sum()) for i in range(len(c)) if (lab == i).sum()]
    while True:
        best = None
        for i in range(len(zent)):
            for j in range(i + 1, len(zent)):
                d = np.linalg.norm(zent[i][0] - zent[j][0])
                if d < merge and (best is None or d < best[0]):
                    best = (d, i, j)
        if not best: break
        _, i, j = best
        (ci, ni), (cj, nj) = zent[i], zent[j]
        zent[i] = ((ci * ni + cj * nj) / (ni + nj), ni + nj); del zent[j]
    n = sum(z[1] for z in zent)
    return np.array([z[0] for z in zent if z[1] / n >= klein])


def modus(lab, n):
    """3x3-Modusfilter: jedes Pixel nimmt das haeufigste Label der Nachbarschaft."""
    best = np.zeros(lab.shape, int) - 1; cnt = np.zeros(lab.shape)
    for l in range(-1, n):
        c = ndimage.uniform_filter((lab == l).astype(float), 3)
        m = c > cnt; best[m] = l; cnt[m] = c[m]
    return best


def glatt(src, dst, k=6, pal=None, rand=False, ziel=1024, sigma=0.6, weg=(), merge=40.0, klein=0.004, rand_tol=60, aussen=(), mod=True, sigma_rand=None, saum=False):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).copy()
    if rand:
        a = rand_weg(a, rand_tol)
    deck = a[..., 3] >= 128
    px = a[..., :3][deck].astype(float)
    P = np.array([hexrgb(p) for p in pal], float) if pal else palette(px, k, merge, klein)
    d = ((a[..., :3].astype(float)[..., None, :] - P[None, None]) ** 2).sum(-1)
    # Mischpixel (Kante zwischen zwei Flaechen) duerfen nur eine Farbe ihrer Nachbarschaft bekommen: Grau zwischen
    # Schwarz und Weiss lag sonst am naechsten am Gruen und ergab einen gruenen Saum (BSC Acosta).
    # Nur auf Wunsch (saum=True): feine Linien bestehen ganz aus Mischpixeln und verschwinden sonst (Goermin-Spieler).
    lab0 = d.argmin(-1)
    rein = np.sqrt(d.min(-1)) < 45 if saum else np.ones(lab0.shape, bool)
    for i in (range(len(P)) if saum else ()):
        nahe = ndimage.binary_dilation(rein & (lab0 == i), iterations=2)
        d[~rein & ~nahe, i] = np.inf
    lab = np.where(np.isinf(d.min(-1)), lab0, d.argmin(-1))   # keine reine Nachbarfarbe: naechste Farbe
    lab[~deck] = -1
    for w_ in weg:
        wi = np.argmin(((P - np.array(hexrgb(w_))) ** 2).sum(-1)); lab[lab == wi] = -1
    if mod:   # bei sehr kleinen Originalen aus: der 3x3-Modus frisst 1-2 px breite Schrift (Framersheim 138 px)
        lab = modus(lab, len(P))
    for w_ in aussen:
        wi = np.argmin(((P - np.array(hexrgb(w_))) ** 2).sum(-1))
        frei = np.pad(lab == -1, 1, constant_values=True)
        kand = np.pad((lab == wi) | (lab == -1), 1, constant_values=True)
        cl, _ = ndimage.label(kand)
        aus = np.isin(cl, np.unique(cl[frei & (cl > 0)][:1]))[1:-1, 1:-1]   # Komponente, die den Bildrand enthaelt
        lab[aus & (lab == wi)] = -1
    # Rand: Bild etwas auffuellen, damit Kanten am Bildrand nicht abgeschnitten werden
    pad = 4
    lab = np.pad(lab, pad, constant_values=-1)
    h, w = lab.shape
    f = 2 * ziel / max(h, w)
    H, W = int(round(h * f)), int(round(w * f))
    def hoch(l, s_):
        z = ndimage.zoom((lab == l).astype(np.float32), (H / h, W / w), order=3)
        return ndimage.gaussian_filter(z, s_ * f) if s_ else z
    # Mit sigma_rand wird die Aussenkontur GETRENNT geglaettet: erst Farben untereinander (ohne Transparenz), dann
    # die Transparenz als eigene Maske darueber. Im gemeinsamen Wettbewerb gewinnt sonst die schwaecher geglaettete
    # Farbe an jeder Treppenstufe -> Beulen am Rand (Framersheim, 1-px-Stufen alle 5 px).
    ids = list(range(0 if sigma_rand else -1, len(P)))
    best = None; bwert = None
    for l in ids:
        if not (lab == l).any(): continue
        z = hoch(l, sigma)
        if best is None:
            best = np.full(z.shape, l, int); bwert = z
        else:
            msk = z > bwert; best[msk] = l; bwert = np.where(msk, z, bwert)
    if sigma_rand:
        best[hoch(-1, sigma_rand) > 0.5] = -1
    out = np.zeros(best.shape + (4,), np.uint8)
    for i, c in enumerate(P):
        out[best == i, :3] = np.clip(c, 0, 255); out[best == i, 3] = 255
    big = Image.fromarray(out)
    small = big.resize((W // 2, H // 2), Image.LANCZOS)   # Pillow rechnet RGBA vormultipliziert, keine dunklen Saeume
    bb = small.getbbox()
    if bb: small = small.crop(bb)
    small.save(dst)
    print('%s -> %s  %dx%d  Palette %s' % (src, dst, small.width, small.height,
          ' '.join('%02x%02x%02x' % tuple(int(v) for v in np.clip(c, 0, 255)) for c in P)))
    return P


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--k', type=int, default=6)
    ap.add_argument('--palette', default='')
    ap.add_argument('--rand', action='store_true')
    ap.add_argument('--ziel', type=int, default=1024)
    ap.add_argument('--sigma', type=float, default=0.6)
    ap.add_argument('--weg', default='')
    ap.add_argument('--merge', type=float, default=40.0)
    ap.add_argument('--aussen', default='')
    a = ap.parse_args()
    glatt(a.src, a.dst, a.k, [p for p in a.palette.split(',') if p] or None, a.rand, a.ziel, a.sigma,
          [w for w in a.weg.split(',') if w], a.merge, aussen=[w for w in a.aussen.split(',') if w])


if __name__ == '__main__':
    main()
