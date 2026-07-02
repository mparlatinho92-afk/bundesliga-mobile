#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Holt die echten Relegations-Playoffs 1. Bundesliga <-> 2. Bundesliga aus der de.wikipedia-Übersicht
"Relegation zur deutschen Fußball-Bundesliga" (zwei Tabellen: 1982–1991 + ab 2009), mappt die Teams via
tools/club_map.json + game_data.js -> teamId und schreibt tools/relegation_seed.json.

Datenmodell je Saison (Erstligist=BL-16., Zweitligist=2.BL-3.; alle Scores in Erstligist:Zweitligist-Orientierung):
  "1981/82": { h:<ErstligistId>, a:<ZweitligistId>, hName, aName, winnerId, result }
Speist archive.relegation + relStats (Engine._seedHistory) -> ⚔-Chronik/Bilanz/Steckbrief.

NUR 1.BL<->2.BL (Tabelle 0 + 1). 2.BL<->3.Liga (Tabelle 2) ausgelassen (User-Scope).
Jahr <= 2025 (Saison 2024/25) – 2026 (Live-Startsaison 2025/26) würde mit dem Live-Spiel kollidieren.

Aufruf:  python tools/relegationcrawl.py
"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import histcrawl as H

HERE = os.path.dirname(os.path.abspath(__file__))
URL = "https://de.wikipedia.org/wiki/Relegation_zur_deutschen_Fu%C3%9Fball-Bundesliga"

# Unentschiedene Gesamtscores, die per Auswärtstor/Elfmeter/Entscheidungsspiel-Elfmeter fielen:
# Jahr -> 'E' (Erstligist blieb/stieg auf) | 'Z' (Zweitligist stieg auf). Rest wird per Score entschieden.
OVERRIDE = {1988: 'E', 2014: 'E', 2019: 'Z', 2020: 'E', 2024: 'E'}

MAX_YEAR = 2025  # Saison 2024/25; 2025/26 (=2026) ist Live-Startsaison -> raus


def flip(s):
    """'0:1 n. V.' -> '1:0 n. V.' (nur den führenden d:d-Score drehen, Suffix behalten)."""
    m = re.match(r'^\s*(\d+):(\d+)(.*)$', s or '')
    return f'{m.group(2)}:{m.group(1)}{m.group(3)}' if m else (s or '')


def decide(year, agg_ez, third_ez):
    """Gibt 'E' oder 'Z' zurück (Sieger = wer in der BL landet). agg/third in Erstligist:Zweitligist."""
    if year in OVERRIDE:
        return OVERRIDE[year]
    for s in (third_ez, agg_ez):
        m = re.match(r'(\d+):(\d+)', s or '')
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if a != b:
                return 'E' if a > b else 'Z'
    return None  # unentschieden ohne Override -> Fehler, muss in OVERRIDE


def season_str(year):
    return f'{year-1}/{str(year)[2:]}'


def main():
    cmap = H.load_map()
    gd_ids, gd_name2id = H.load_gamedata()

    def mapid(name):
        c = H.clean_club(name)
        return cmap.get(c) or gd_name2id.get(c), c

    h = H.fetch(URL)
    p = H.TableParser()
    p.feed(h)

    # Tabelle 0: 1982–1991 (Zweitligist | Gesamt | Erstligist | Hin | Rück | [3. Spiel]) -> Scores Z:E, flippen
    # Tabelle 1: ab 2009  (Erstligist | Gesamt | Zweitligist | Hin | Rück)             -> Scores E:Z, direkt
    # Spalten-Indizes je Ära: (erstligist, zweitligist, hin, rück, third, flip?)
    specs = [
        (0, dict(e=3, z=1, hin=4, rueck=5, third=6, flip=True)),   # 1982–1991 (Datum=0, Zweitligist=1, Gesamt=2, Erstligist=3)
        (1, dict(e=1, z=3, hin=4, rueck=5, third=None, flip=False)),  # ab 2009
    ]

    seed = {}
    unmapped = {}
    for tidx, col in specs:
        for r in p.tables[tidx][1:]:
            if not re.match(r'^\d{4}$', r[0].strip()):
                continue
            year = int(r[0].strip())
            if year > MAX_YEAR:
                continue
            eName, zName = r[col['e']], r[col['z']]
            hin = r[col['hin']] if col['hin'] < len(r) else ''
            rueck = r[col['rueck']] if col['rueck'] < len(r) else ''
            third = r[col['third']] if (col['third'] is not None and col['third'] < len(r)) else ''
            # Aggregat aus Hin+Rück (robuster als die Gesamt-Zelle mit (a)/i.E.-Suffixen)
            def goals(s):
                m = re.match(r'(\d+):(\d+)', s or '')
                return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
            if col['flip']:
                hin, rueck, third = flip(hin), flip(rueck), flip(third)
            gh = goals(hin)
            gr = goals(rueck)
            agg_ez = f'{gh[0]+gr[0]}:{gh[1]+gr[1]}'  # Erstligist:Zweitligist
            side = decide(year, agg_ez, third)
            if side is None:
                print(f'!! {year}: unentschieden ohne Override -> bitte OVERRIDE ergänzen')
                continue
            eid, ec = mapid(eName)
            zid, zc = mapid(zName)
            if not eid:
                unmapped[ec] = unmapped.get(ec, 0) + 1
            if not zid:
                unmapped[zc] = unmapped.get(zc, 0) + 1
            winnerId = eid if side == 'E' else zid
            # Anzeige-Result: Aggregat + beide Spiele (+ Entscheidung), alles Erstligist:Zweitligist
            legs = f'{hin}, {rueck}' + (f', {third}' if third else '')
            result = f'{agg_ez} ({legs})'
            seed[season_str(year)] = {
                'h': eid, 'a': zid, 'hName': ec, 'aName': zc,
                'winnerId': winnerId, 'result': result,
            }

    out = {'version': 1, 'seasons': dict(sorted(seed.items()))}
    with open(os.path.join(HERE, 'relegation_seed.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    n = len(seed)
    nmap = sum(1 for v in seed.values() if v['h'] and v['a'])
    print(f'>>> {n} Relegationen (1.BL<->2.BL) -> tools/relegation_seed.json  ({nmap} voll gemappt)')
    for y, v in sorted(seed.items()):
        w = '?' if not v['winnerId'] else (v['hName'] if v['winnerId'] == v['h'] else v['aName'])
        print(f"   {y}: {v['hName']:24s} vs {v['aName']:24s}  {v['result']:28s}  -> {w}")
    if unmapped:
        print('\nNICHT gemappt (in club_map.json ergänzen: "<Name>": "<teamId>"):')
        for k, c in sorted(unmapped.items()):
            print(f'    "{k}": "",   # {c}x')


if __name__ == '__main__':
    main()
