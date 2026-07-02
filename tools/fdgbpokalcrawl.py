#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baut tools/fdgb_pokal_seed.json (Saison -> teamId | Klartextname) aus der FDGB-Pokal-Siegerliste.
Quelle: de.wikipedia.org/wiki/FDGB-Pokal (Siegertabelle 1949-1991). Die Wikipedia-Tabelle hat die
Spaltenfolge Saison|Datum|Sieger|… – der generische pokalcrawl-Spaltengriff scheitert daran, daher
ist die Siegerliste hier fest hinterlegt (Single Source) und wird nur noch via club_map+game_data
auf teamIds gemappt. Mapped -> teamId (P-Badge im DDR-Archiv); sonst Klartext (kein Badge).

Aufruf:  python tools/fdgbpokalcrawl.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import histcrawl as H

HERE = os.path.dirname(os.path.abspath(__file__))

# Saison (Liga-Format) -> Siegername (wie de.wikipedia FDGB-Pokal). "1952/54" = damalige 2-Jahres-Edition.
WINNERS = {
    "1949": "BSG Waggonbau Dessau", "1949/50": "BSG EHW Thale", "1951/52": "SG Volkspolizei Dresden",
    "1952/54": "ZSK Vorwärts Berlin", "1954/55": "SC Wismut Karl-Marx-Stadt", "1956": "SC Chemie Halle",
    "1957": "SC Lokomotive Leipzig", "1958": "SC Einheit Dresden", "1959": "SC Dynamo Berlin",
    "1960": "SC Motor Jena", "1961/62": "SC Chemie Halle", "1962/63": "BSG Motor Zwickau",
    "1963/64": "SC Aufbau Magdeburg", "1964/65": "SC Aufbau Magdeburg", "1965/66": "BSG Chemie Leipzig",
    "1966/67": "BSG Motor Zwickau", "1967/68": "1. FC Union Berlin", "1968/69": "1. FC Magdeburg",
    "1969/70": "FC Vorwärts Berlin", "1970/71": "SG Dynamo Dresden", "1971/72": "FC Carl Zeiss Jena",
    "1972/73": "1. FC Magdeburg", "1973/74": "FC Carl Zeiss Jena", "1974/75": "BSG Sachsenring Zwickau",
    "1975/76": "1. FC Lokomotive Leipzig", "1976/77": "SG Dynamo Dresden", "1977/78": "1. FC Magdeburg",
    "1978/79": "1. FC Magdeburg", "1979/80": "FC Carl Zeiss Jena", "1980/81": "1. FC Lokomotive Leipzig",
    "1981/82": "SG Dynamo Dresden", "1982/83": "1. FC Magdeburg", "1983/84": "SG Dynamo Dresden",
    "1984/85": "SG Dynamo Dresden", "1985/86": "1. FC Lokomotive Leipzig", "1986/87": "1. FC Lokomotive Leipzig",
    "1987/88": "BFC Dynamo", "1988/89": "BFC Dynamo", "1989/90": "1. FC Dynamo Dresden",
    "1990/91": "FC Hansa Rostock",
}

def main():
    cmap = H.load_map()
    gd_ids, gd_name2id = H.load_gamedata()
    seed, unmapped = {}, {}
    for season, club in WINNERS.items():
        cid = cmap.get(club) or gd_name2id.get(club)
        if cid:
            seed[season] = cid
        else:
            seed[season] = club
            unmapped[club] = unmapped.get(club, 0) + 1
    with open(os.path.join(HERE, "fdgb_pokal_seed.json"), "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=0)
    print(f">>> {len(seed)} FDGB-Pokalsieger ({len(seed)-len(unmapped)} gemappt, {len(unmapped)} Klartext) -> tools/fdgb_pokal_seed.json")
    if unmapped:
        print("\nNICHT gemappt (Klartext-Anzeige; fuer P-Badge in club_map.json ergaenzen):")
        for k, v in sorted(unmapped.items()):
            print(f'    "{k}": "",')

if __name__ == "__main__":
    main()
