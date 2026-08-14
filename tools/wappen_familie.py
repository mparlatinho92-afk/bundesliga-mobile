#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_familie.py - Reserve und erste Mannschaft tragen dasselbe Wappen.

Eine Reserve ist derselbe Verein. Ihr Wappen muss deshalb mit dem des Elternvereins
uebereinstimmen - eine Entscheidung fuer den einen gilt immer fuer beide, auch wenn
sie nur einmal getroffen wurde. Vor dem ersten Lauf wichen 35 von 80 Familien ab.

Regel: innerhalb einer Familie gewinnt die BESTE effektive Aufloesung (wappen_quality.py,
entlarvt hochskalierte Bilder). Bei Gleichstand der Elternverein.

Vorsicht ist nur dort noetig, wo sich die Wappen nicht bloss in der Schaerfe, sondern im
BILD unterscheiden - dann kann eines schlicht falsch sein (FC 08 Villingen II trug bei FM
ein ovales statt des Strahlenwappens). Solche Faelle werden gemeldet, nicht verschwiegen.

  python tools/wappen_familie.py            # Bericht, aendert nichts
  python tools/wappen_familie.py --apply
"""
import io, os, sys, json, shutil, argparse, subprocess
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BINS = 4


def eff_map():
    """effektive Aufloesung je Verein; erzeugt die CSV notfalls neu."""
    p = os.path.join(HERE, 'wappen_quality.csv')
    if not os.path.exists(p):
        subprocess.run([sys.executable, os.path.join(HERE, 'wappen_quality.py'), '--csv'],
                       capture_output=True)
    import csv
    if not os.path.exists(p):
        return {}
    return {r['id']: float(r['eff']) for r in csv.DictReader(io.open(p, encoding='utf-8'))}


def hist(p):
    try:
        im = Image.open(p).convert('RGBA')
    except Exception:
        return None
    im.thumbnail((96, 96), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    px = a[..., :3][a[..., 3] > 40]
    if len(px) < 30:
        return None
    q = np.clip((px / 256.0 * BINS).astype(int), 0, BINS - 1)
    h = np.zeros(BINS ** 3, np.float32)
    np.add.at(h, q[:, 0] * BINS * BINS + q[:, 1] * BINS + q[:, 2], 1.0)
    return h / h.sum()


def abstand(a, b):
    ha, hb = hist(a), hist(b)
    if ha is None or hb is None:
        return 0.0
    return float(np.sqrt(max(0.0, 1.0 - np.sum(np.sqrt(ha * hb)))))


def familien(teams):
    fam = {}
    for i, t in teams.items():
        fam.setdefault(t.get('parentId') or i, []).append(i)
    return {k: v for k, v in fam.items() if len(v) > 1}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()

    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    teams = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])['teams']
    eff = eff_map()
    pfad = lambda i: os.path.join(ROOT, teams[i]['thumb'].replace('/', os.sep))

    angleich, verdacht = [], []
    for wurzel, mit in familien(teams).items():
        da = [i for i in mit if os.path.exists(pfad(i))]
        if len(da) < 2:
            continue
        gleich = len({open(pfad(i), 'rb').read() for i in da}) == 1
        if gleich:
            continue
        # Beste Aufloesung gewinnt, bei Gleichstand der Elternverein
        best = max(da, key=lambda i: (eff.get(i, 0), i == wurzel))
        for i in da:
            if i == best:
                continue
            d = abstand(pfad(best), pfad(i))
            angleich.append((i, best, d))
            if d > 0.45:
                verdacht.append((teams[i]['name'], teams[best]['name'], d))

    print('%d Wappen weichen innerhalb ihrer Vereinsfamilie ab' % len(angleich))
    if verdacht and not a.quiet:
        print('\nDavon %d mit deutlich ANDEREM Bild, nicht nur schlechterer Schaerfe –' % len(verdacht))
        print('hier lohnt ein Blick, ob die uebernommene Seite die richtige ist:')
        for nm, von, d in sorted(verdacht, key=lambda x: -x[2]):
            print('   %.2f  %-34s <- %s' % (d, nm[:34], von))
    if not a.apply:
        print('\nProbelauf - nichts geaendert. Mit --apply ausfuehren.')
        return 0

    for i, best, _ in angleich:
        shutil.copyfile(pfad(best), pfad(i))
    if angleich:
        # Auch die VORLAGE durch intake schicken, nicht nur die Kopien: sonst trimmt es der
        # Kopie einen transparenten Rand ab, den das Original behaelt - dasselbe Bild, aber
        # 70x53 gegen 68x51, und die Familie gilt weiter als abweichend.
        betroffen = {i for i, _, _ in angleich} | {b for _, b, _ in angleich}
        subprocess.run([sys.executable, os.path.join(HERE, 'wappen_intake.py'),
                        '--apply', '--only', ','.join(sorted(betroffen))],
                       capture_output=True)
        # ... und danach erneut kopieren, damit beide Seiten wirklich byte-gleich sind.
        for i, best, _ in angleich:
            shutil.copyfile(pfad(best), pfad(i))
    print('\n%d Wappen angeglichen. Rueckgaengig: git checkout -- Wappen/' % len(angleich))
    return 0


if __name__ == '__main__':
    sys.exit(main())
