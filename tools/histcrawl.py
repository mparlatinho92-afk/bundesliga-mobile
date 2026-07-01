#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crawlt Abschlusstabellen der Fußball-Bundesliga / 2. Bundesliga von de.wikipedia,
mappt Vereine via tools/club_map.json -> teamId, validiert (S+U+N, Rang-Eindeutigkeit)
und schreibt tools/history_seasons.json (Array {y, lid, table:[{id,rank,s,u,n,gf,ga[,g]}]}).

Mehrstaffel-Saisons (2. BL Nord/Süd 1974-1981 + Gruppe Nord/Süd 1991/92) werden automatisch
erkannt (>=2 Abschlusstabellen je Seite, Gruppenlabel aus h2) und als EINE Saison mit pro-Zeile
`g`-Feld ("Nord"/"Süd") ausgegeben. Einzelstaffel-Saisons bleiben ohne `g`.
Zurückgezogene Vereine mit 0 Spielen (z.B. Rot-Weiss Essen 1993/94) werden toleriert.

Spart Tokens: Holen/Parsen/Mappen läuft hier; ins Spiel integriert wird via tools/histbuild.cjs.

Aufruf:
  python tools/histcrawl.py 1 1987 2024          # 1. Bundesliga 1987/88 .. 2024/25
  python tools/histcrawl.py 2 1974 2024 --append # 2. Bundesliga (Mehrstaffel auto) anhängen
"""
import sys, os, json, re, urllib.request, urllib.parse, html, time
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def load_map():
    with open(os.path.join(HERE, "club_map.json"), encoding="utf-8") as f:
        m = json.load(f)
    return {k: v for k, v in m.items() if not k.startswith("_")}

def load_gamedata():
    """(id-Set, name->id) aus game_data.js. Reserveteams (II/III/U..) ausgeschlossen für name->id."""
    try:
        with open(os.path.join(ROOT, "game_data.js"), encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return None, {}
    ids = set(re.findall(r'"id":"([^"]+)"', txt))
    name2id = {}
    RES = re.compile(r"\b(II|III|IV|U\s?\d+)\b|u\d+$|ii$|iii$")
    for cid, nm in re.findall(r'"id":"([^"]+)","name":"([^"]+)"', txt):
        if RES.search(cid) or RES.search(nm):
            continue
        name2id.setdefault(nm, cid)  # erster Treffer (Hauptteam)
    return ids, name2id

class TableParser(HTMLParser):
    """Sammelt alle <table> als Zeilenlisten + je Tabelle die zuletzt gesehene h2/h3-Überschrift.
    Überspringt style/script/sup UND unsichtbare Spans (visibility:hidden / display:none) – die
    nutzt de.wikipedia als Ausricht-Padding in der Tore-Zelle (<span hidden>0</span>56:34<span hidden>0</span>);
    ohne Skip würde daraus '056:340' → Gegentore ×10 korrupt. mw:Entity-Spans (+, :) bleiben erhalten."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.cur, self.row = [], None, None
        self.cell, self.depth, self.skip = None, 0, 0
        self.span_skip = []                      # Stack: hat dieses <span> skip erhöht?
        self.t_h2, self.t_h3 = [], []            # parallel zu tables
        self.cur_h2, self.cur_h3 = None, None
        self.in_head, self.htag, self.htext = False, None, None
    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "sup"):
            self.skip += 1; return
        if tag == "span":
            st = (dict(attrs).get("style") or "").replace(" ", "").lower()
            hidden = "visibility:hidden" in st or "display:none" in st
            self.span_skip.append(hidden)
            if hidden: self.skip += 1
            return
        if tag in ("h2", "h3", "h4"):
            self.in_head, self.htag, self.htext = True, tag, []
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.cur = []
                self.t_h2.append(self.cur_h2); self.t_h3.append(self.cur_h3)
        elif tag == "tr" and self.cur is not None and self.depth == 1:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
    def handle_endtag(self, tag):
        if tag in ("style", "script", "sup"):
            self.skip = max(0, self.skip - 1); return
        if tag == "span":
            if self.span_skip and self.span_skip.pop():
                self.skip = max(0, self.skip - 1)
            return
        if tag in ("h2", "h3", "h4") and self.in_head:
            txt = " ".join("".join(self.htext).split())
            if self.htag == "h2": self.cur_h2, self.cur_h3 = txt, None
            else: self.cur_h3 = txt
            self.in_head = False
        if tag == "table":
            if self.depth == 1 and self.cur is not None:
                self.tables.append(self.cur); self.cur = None
            self.depth -= 1
        elif tag == "tr" and self.row is not None and self.depth == 1:
            self.cur.append(self.row); self.row = None
        elif tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split())); self.cell = None
    def handle_data(self, data):
        if self.in_head and self.htext is not None:
            self.htext.append(data)
        if self.cell is not None and not self.skip:
            self.cell.append(data)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ba-histcrawl/2.0 (offline football archive)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

NUM = re.compile(r"^-?\d+$")
RANK = re.compile(r"^(\d+)\.?$")               # "1" oder "1." (de.wikipedia)
TORE = re.compile(r"^(\d+)\s*[:–-]\s*(\d+)$")  # "78:40"

def parse_one(tbl, min_rows=10):
    """Eine <table> -> [{rank, club, s, u, n, gf, ga}] (oder [] wenn keine Abschlusstabelle)."""
    data = [r for r in tbl if len(r) >= 7]
    if len(data) < min_rows:
        return []
    parsed = []
    for r in data:
        tore_i = next((i for i, c in enumerate(r) if TORE.match(c)), None)
        if tore_i is None:
            continue
        gf, ga = map(int, TORE.match(r[tore_i]).groups())
        nums = [(i, int(c)) for i, c in enumerate(r[:tore_i]) if NUM.match(c)]
        if len(nums) < 4:
            continue
        sp, s, u, n = [v for _, v in nums[-4:]]
        if s + u + n != sp:
            continue
        rank = next((int(RANK.match(c).group(1)) for c in r if RANK.match(c)), None)
        club_cells = [c for c in r if c and not RANK.match(c) and not NUM.match(c) and not TORE.match(c) and len(c) > 2]
        club = max(club_cells, key=len) if club_cells else None
        if not club:
            continue
        parsed.append({"rank": rank, "club": club, "s": s, "u": u, "n": n, "gf": gf, "ga": ga})
    if not (min_rows <= len(parsed) <= 24):
        return []
    # Rang-Sanity: Standings sind rangsortiert. Wenn Ränge nicht sauber 1..N sind (leere/fehlerhafte
    # Rang-Zelle -> None oder Ausreißer wie "26" aus der Spiele-Spalte), aus der Reihenfolge ableiten.
    n_rows = len(parsed)
    ranks = [p["rank"] for p in parsed]
    if sorted(r for r in ranks if r is not None) != list(range(1, n_rows + 1)):
        for i, p in enumerate(parsed):
            p["rank"] = i + 1
    return parsed

def group_label(h2):
    lo = (h2 or "").lower()
    if "nord" in lo: return "Nord"
    if "süd" in lo or "sud" in lo: return "Süd"
    return None

def collect_standings(p):
    """Liefert [(label, rows)] aller Abschlusstabellen der Seite. label='Nord'/'Süd' oder None (einstaffelig)."""
    out = []
    for tbl, h2, h3 in zip(p.tables, p.t_h2, p.t_h3):
        head = ((h3 or "") + " " + (h2 or "")).lower()
        if "kreuztabelle" in head:
            continue
        # "saisonverlauf" für frühe DDR-Saisons (z.B. 1957), deren Abschlusstabelle so überschrieben ist;
        # parse_one filtert Nicht-Standings streng (Zeilenzahl + S+U+N=Spiele) → risikoarm.
        if "abschluss" not in head and "tabelle" not in head and "saisonverlauf" not in head:
            continue
        rows = parse_one(tbl)
        if not rows:
            continue
        out.append((group_label(h2), rows))
    return out

def clean_club(name):
    name = re.sub(r"\s*\([^)]*\)", "", name)   # (M)/(N)/(P)/Fußnoten
    name = re.sub(r"\s*\[[^\]]*\]", "", name)
    return name.strip()

def map_rows(rows, glabel, season, cmap, gd_ids, gd_name2id, auto, unmapped, problems):
    """Vereine -> teamId, validiert pro Gruppe. Gibt gemappte Zeilen (mit g) oder None bei Fehler.
    Spielzahl-Soll = Modalwert der Gruppe (kein Round-Robin-Zwang; 1991/92 = 12 Teams/32 Spiele);
    0 Spiele (zurückgezogen) toleriert."""
    ranks, mapped, ok = set(), [], True
    tag = f"{season}{('/'+glabel) if glabel else ''}"
    gl = [r["s"] + r["u"] + r["n"] for r in rows]
    nz = [g for g in gl if g > 0]
    expected_games = max(set(nz), key=nz.count) if nz else 0
    for r in rows:
        club = clean_club(r["club"])
        cid = cmap.get(club)
        if not cid and club in gd_name2id:
            cid = gd_name2id[club]; auto[club] = cid
        if not cid:
            unmapped[club] = unmapped.get(club, 0) + 1; ok = False; continue
        if gd_ids is not None and not cid.startswith("hist_") and cid not in gd_ids:
            problems.append(f"{tag}: id '{cid}' ({club}) NICHT in game_data.js"); ok = False
        if r["rank"] in ranks:
            problems.append(f"{tag}: doppelter Rang {r['rank']}"); ok = False
        ranks.add(r["rank"])
        games = r["s"] + r["u"] + r["n"]
        if games != expected_games and games != 0:   # 0 = zurückgezogen (toleriert)
            problems.append(f"{tag} {club}: Spiele {games} != {expected_games}"); ok = False
        row = {"id": cid, "rank": r["rank"], "s": r["s"], "u": r["u"], "n": r["n"], "gf": r["gf"], "ga": r["ga"]}
        if glabel: row["g"] = glabel
        mapped.append(row)
    for k in range(1, len(rows) + 1):
        if k not in ranks:
            problems.append(f"{tag}: Rang {k} fehlt"); ok = False
    return (sorted(mapped, key=lambda x: x["rank"]) if ok else None)

def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lid = sys.argv[1]
    y0, y1 = int(sys.argv[2]), int(sys.argv[3])
    append = "--append" in sys.argv
    cmap = load_map()
    gd_ids, gd_name2id = load_gamedata()
    auto = {}
    base = {"1": "Fußball-Bundesliga", "2": "2._Fußball-Bundesliga",
            "ddr1": "DDR-Fußball-Oberliga"}.get(lid, "2._Fußball-Bundesliga")

    def sstr(y):
        # DDR-Sonderkalender: Übergangsrunde 1955 + Kalenderjahr-Saisons 1956-1960 sind einjährig ("1956");
        # davor 1949/50-1954/55 und ab 1961/62 wieder Herbst-Frühjahr ("Y/YY"). Nur lid ddr1.
        if lid == "ddr1" and 1955 <= y <= 1960:
            return str(y)
        return f"{y}/2000" if y == 1999 else f"{y}/{str(y+1)[-2:]}"
    out, unmapped, problems = [], {}, []
    for y in range(y0, y1 + 1):
        season = sstr(y)
        url = "https://de.wikipedia.org/wiki/" + urllib.parse.quote(f"{base}_{season}")
        try:
            htmltext = fetch(url)
        except Exception as e:
            problems.append(f"{season}: FETCH {e}"); continue
        p = TableParser(); p.feed(htmltext)
        stands = collect_standings(p)
        if not stands:
            problems.append(f"{season}: keine Abschlusstabelle erkannt"); print(f"  -- {season}: keine Tabelle"); continue

        labels = [lbl for lbl, _ in stands]
        grouped = any(labels)
        if grouped:
            # Nur Nord/Süd behalten, je Gruppe genau eine
            groups = {}
            for lbl, rows in stands:
                if lbl and lbl not in groups:
                    groups[lbl] = rows
            if set(groups) != {"Nord", "Süd"}:
                problems.append(f"{season}: Gruppen unvollständig {sorted(groups)}"); print(f"  -- {season}: Gruppen {sorted(groups)}"); continue
            combined, ok = [], True
            for lbl in ("Nord", "Süd"):
                rows = groups[lbl]
                m = map_rows(rows, lbl, season, cmap, gd_ids, gd_name2id, auto, unmapped, problems)
                if m is None: ok = False
                else: combined += m
            if ok:
                out.append({"y": season, "lid": lid, "table": combined})
                print(f"  OK {season}: Nord {len(groups['Nord'])} + Süd {len(groups['Süd'])} Vereine")
            else:
                print(f"  -- {season}: Mehrstaffel unvollständig")
        else:
            rows = max(stands, key=lambda lr: len(lr[1]))[1]   # größte Tabelle
            m = map_rows(rows, None, season, cmap, gd_ids, gd_name2id, auto, unmapped, problems)
            if m is not None:
                out.append({"y": season, "lid": lid, "table": m})
                print(f"  OK {season}: {len(m)} Vereine")
            else:
                print(f"  -- {season}: unvollständig")
        time.sleep(0.3)

    outpath = os.path.join(HERE, "history_seasons.json")
    existing = []
    if append and os.path.exists(outpath):
        with open(outpath, encoding="utf-8") as f: existing = json.load(f)
        have = {s["y"] + "|" + s["lid"] for s in out}        # neue ersetzen alte (Re-Crawl-Fix)
        existing = [s for s in existing if s["y"] + "|" + s["lid"] not in have]
        out = existing + out
    out.sort(key=lambda s: (s["lid"], int(s["y"].split("/")[0])))
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)

    print(f"\n>>> {len(out)} Saisons in tools/history_seasons.json")
    if auto:
        print(f"\nAUTO-gemappt via game_data.js ({len(auto)} – bitte spot-checken):")
        for k, v in sorted(auto.items()): print(f'    "{k}": "{v}"')
    if unmapped:
        print("\nUNGEMAPPTE Vereine (in tools/club_map.json ergänzen):")
        for k, v in sorted(unmapped.items()): print(f'    "{k}": "",   # {v}x')
    if problems:
        print("\nPROBLEME:")
        for pr in problems: print("    " + pr)
    if not unmapped and not problems:
        print("Alles sauber.")

if __name__ == "__main__":
    main()
