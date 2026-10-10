// Unscharfe Schreibweisen von Vereinsnamen (Nutzerbefund 10.10.2026 beim Sortieren der Ewigen Tabelle).
// Genutzt von tools/hist_dubletten.mjs (Paare zum Entscheiden) und tools/historie_einbau.mjs (eine Abkuerzung des heutigen
// Namens ist kein damaliger Name: "SV Südwest Lu'hafen" ist SV Südwest Ludwigshafen, nicht eine Umbenennung).
//
// fussball.de kuerzt ab und verschreibt: "Hohenstein-E." = "Hohenstein-Ernstt.", "Billigh. /Ingenh." = "Billigheim-Ingenheim",
// "Lu-hafen" = "Ludwigshafen", "G/W" = "Gelb-Weiß", "Rene" = "René", "Kicker 94" = "Kickers 94".
// Regel: JEDES Kernwort beider Namen hat ein Gegenstueck (gleich / Abkuerzung = Wortanfang / ein Buchstabe Abstand / Farbkuerzel),
// Jahreszahlen widersprechen sich nicht, mindestens ein langes Wort ist gleich.
const AB = ['ts', 'tus', 'tsv', 'sb', 'sv', 'sg', 'bv', 'bsv', 'fv', 'fc', 'sc', 'spvgg', 'spvg', 'vfb', 'vfl', 'vfr', 'mtv', 'tv', 'tg'];
const FORM = new Set(AB.concat(['e', 'v', '1', 'i', 'ii', 'u21', 'u23', 'am', 'amateure', 'fussball', 'club', 'verein', 'und', 'von', 'der', 'die', 'im', 'in', 'a', 'turn', 'sport']));

const fold = n => n.normalize('NFD').replace(/[̀-ͯ​]/g, '').toLowerCase().replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
// Woerter mit Kennung "abgekuerzt" (Punkt dahinter); Farbkuerzel "G/W", "R.-W." -> Initialen-Wort "#gw"
export const woerter = n => {
    let t = fold(n).replace(/\be\.\s*v\.?/g, ' ').replace(/\b([rsbgw])\s*[\/.-]\s*([rsbgw])\b\.?/g, (m, a, b) => ' #' + a + b + ' ');
    t = t.replace(/(rot|schwarz|blau|gelb|gruen|grun)[\s-]*(weiss|weis|schwarz|rot|gelb|blau)/g, (m, a, b) => ' #' + a[0] + b[0] + ' ');
    const out = [];
    t.replace(/(#?[a-z0-9]+)(\.?)/g, (m, w, dot) => { out.push({ w, ab: !!dot }); return m; });
    // einzelner abgekuerzter Buchstabe ist ein Ortsteil ("Hohenstein-E."), keine Vereinsform
    return out.filter(x => (x.ab && x.w.length === 1 && x.w !== 'a') || (!FORM.has(x.w) && !['e', 'v'].includes(x.w)));
};
const jahr = ws => ws.filter(x => /^\d+$/.test(x.w)).map(x => x.w.length === 4 ? x.w.slice(2) : x.w);
const lev1 = (a, b) => { if (Math.abs(a.length - b.length) > 1) return false; let i = 0; while (i < a.length && a[i] === b[i]) i++;
    return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i); };
// Gegenstueck fuer Wort x in Wort y: Art des Treffers oder null
const passt = (x, y) => {
    if (x.w === y.w) return 'gleich';
    if (x.w[0] === '#' || y.w[0] === '#') return x.w[0] === '#' && y.w[0] === '#' && x.w[1] === y.w[1] && x.w[2] === y.w[2] ? 'Farbe' : null;
    const [k, l] = x.w.length <= y.w.length ? [x, y] : [y, x];
    if (l.w.startsWith(k.w) && (k.ab || k.w.length >= 4)) return 'Abkuerzung';
    if (k.w.length >= 5 && lev1(k.w, l.w)) return 'Schreibfehler';
    return null;
};
// "Lu-hafen" = "Ludwigshafen": zwei Woerter sind Anfang und Ende EINES Wortes
const klammer = (a, b, l) => a.w.length >= 2 && b.w.length >= 3 && l.w.length >= a.w.length + b.w.length + 2 && l.w.startsWith(a.w) && l.w.endsWith(b.w);
const vergleich1 = (na, nb) => {
    const A = woerter(na), B = woerter(nb);
    const ja = jahr(A), jb = jahr(B);
    if (ja.length && jb.length && !ja.some(y => jb.includes(y))) return null;
    const a = A.filter(x => !/^\d+$/.test(x.w)), b = B.filter(x => !/^\d+$/.test(x.w));
    if (!a.length || !b.length) return null;
    const frei = b.map(() => true), arten = new Set();
    let lang = false;
    for (let i = 0; i < a.length; i++) {
        let j = b.findIndex((y, k) => frei[k] && passt(a[i], y) === 'gleich');
        if (j < 0) j = b.findIndex((y, k) => frei[k] && passt(a[i], y));
        if (j >= 0) { const art = passt(a[i], b[j]); frei[j] = false; if (art === 'gleich') { if (a[i].w.length >= 5) lang = true; } else arten.add(art); continue; }
        // Klammer: a[i]+a[i+1] in b
        const k = b.findIndex((y, k) => frei[k] && i + 1 < a.length && klammer(a[i], a[i + 1], y));
        if (k >= 0) { frei[k] = false; i++; arten.add('Abkuerzung'); continue; }
        return null;
    }
    // uebrige Woerter von b: nur als Klammer-Gegenstueck erlaubt (b kuerzt ab)
    for (let k = 0; k < b.length; k++) if (frei[k]) {
        if (k + 1 < b.length && frei[k + 1] && a.some(x => klammer(b[k], b[k + 1], x))) { frei[k] = frei[k + 1] = false; arten.add('Abkuerzung'); k++; continue; }
        return null;
    }
    if (!arten.size && na.trim() !== nb.trim()) arten.add('Schreibweise');   // "G/W" = "Gelb-Weiß", "Rene" = "René"
    return arten.size && lang ? [...arten].join(' + ') : null;
};
// Vereinsform-Kuerzel eines Namens ("SG", "SC", "BSG" …). Fuer damalige Namen zaehlt ein Formwechsel als echte Umbenennung
// (SG -> SC Lichtenberg 47), auch wenn vergleich() die Woerter sonst gleich findet.
const FORMKURZ = new Set(AB.concat(['bsg', 'asg', 'hsg', 'zsg', 'ksg', 'tsg', 'tsc', 'sc', 'sg', 'fsv', 'ssv', 'esv', 'psv', 'djk', 'ev']));
export const formen = n => fold(n).replace(/\./g, '').split(/[^a-z0-9]+/).filter(w => FORMKURZ.has(w)).sort().join(' ');
// Art der Abweichung ("Abkuerzung", "Schreibfehler + Farbe" …) oder null = verschiedene Namen.
// Symmetrisch: die Klammer "Lu-hafen" greift nur aus Sicht des kurzen Namens.
export const vergleich = (na, nb) => vergleich1(na, nb) || vergleich1(nb, na);
