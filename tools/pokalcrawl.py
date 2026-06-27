#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Holt die DFB-Pokal-/Tschammerpokal-Siegerliste (de.wikipedia: DFB-Pokal, Tabelle 'Jahr|Sieger'),
mappt Sieger via tools/club_map.json + game_data.js -> teamId und schreibt tools/pokal_seed.json
( { "1985/86": "<teamId oder Klartextname>" , ... } ). Mapped → teamId (P-Badge + Steckbrief-Link
+ Rekordsieger-Zählung); nicht mappbar (alte/ausländische Klubs) → Klartextname (nur Anzeige).

Aufruf:  python tools/pokalcrawl.py
"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import histcrawl as H

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    cmap = H.load_map()
    gd_ids, gd_name2id = H.load_gamedata()
    h = H.fetch("https://de.wikipedia.org/wiki/DFB-Pokal")
    p = H.TableParser(); p.feed(h)
    # Sieger-Tabelle = die mit Kopf 'Jahr'/'Sieger' und vielen Jahres-Zeilen
    best = None
    for tbl in p.tables:
        data = [r for r in tbl if len(r) >= 2]
        yrs = sum(1 for r in data if re.match(r"^\d{4}", r[0]))
        if yrs >= 50 and (best is None or yrs > best[0]):
            best = (yrs, data)
    if not best:
        print("Sieger-Tabelle nicht gefunden"); sys.exit(1)
    data = best[1]

    seed, names_unmapped = {}, {}
    for r in data:
        season = r[0].strip()
        if season == "1999/00":
            season = "1999/2000"   # Liga-Datenformat (sstr-Sonderfall Jahrtausendwende)
        if not re.match(r"^\d{4}", season):
            continue
        if season > "2024/25" and "/" in season:   # Zukunft/laufend überspringen
            continue
        if season.isdigit() and int(season) > 2024:
            continue
        club = H.clean_club(r[1])
        cid = cmap.get(club) or gd_name2id.get(club)
        if cid:
            seed[season] = cid
        else:
            seed[season] = club               # Klartext-Fallback (Anzeige ohne Link)
            names_unmapped[club] = names_unmapped.get(club, 0) + 1

    with open(os.path.join(HERE, "pokal_seed.json"), "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=0)

    mapped = sum(1 for v in seed.values() if v not in names_unmapped)
    print(f">>> {len(seed)} Pokalsieger ({mapped} gemappt, {len(seed)-mapped} Klartext) -> tools/pokal_seed.json")
    if names_unmapped:
        print("\nNICHT gemappt (Klartext-Anzeige; bei Bedarf in club_map.json ergänzen):")
        for k, v in sorted(names_unmapped.items()):
            print(f'    "{k}": "",   # {v}x')

if __name__ == "__main__":
    main()
