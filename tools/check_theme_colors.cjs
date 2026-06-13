#!/usr/bin/env node
/**
 * Theme-Color-Checker — hält jedes Theme "farbenrein".
 *
 * Regel: In Inline-Styles der UI-Module dürfen NEUTRALE Farben (Grau-/Dunkeltöne)
 * nicht hartkodiert sein – sie müssen über CSS-Variablen laufen, sonst brechen sie
 * im Light-Theme (schwarze Kästen / unleserlicher Text) bzw. in künftigen Themes.
 *
 * Gesättigte Akzentfarben (Status-Grün/-Rot, Level-Farben, Link-Blau, Badges) sind
 * theme-unabhängig und erlaubt – erkannt über die RGB-Spannweite (max-min).
 *
 * Exit-Code 1 bei Fund → blockt manage-v (außer -SkipThemeCheck).
 */
const fs = require('fs');
const path = require('path');

// UI-Module die HTML mit Inline-Styles erzeugen. (dfb_logo.js = SVG-Logo, ausgenommen.)
const FILES = ['app/core.js', 'app/pokal.js', 'app/league.js', 'app/modal.js', 'app/save_manager.js', 'app/map.js'];

// Farb-relevante CSS-Properties in Inline-Styles
// Property + Wert bis zum nächsten ';' (erfasst auch Farben in ${ternary} wie color:${x?'#fff':'#ddd'})
const PROP = /(?:^|[;"'`\s{(}:,])(color|background|background-color|border|border-color|border-top|border-bottom|border-left|border-right|outline|fill|stroke)\s*:\s*([^;]*?#[0-9a-fA-F]{3,6}[^;]*)/g;

// Bewusst theme-unabhängige neutrale Paare (z.B. Slate-Badge mit hellem Text)
const ALLOW = new Set(['#37474f', '#cfd8dc', '#546e7a', '#2d3e46', '#475569', '#64748b', '#1e293b']);

// Spannweite >= dieser Schwelle = gesättigte Akzentfarbe (erlaubt); darunter = Neutralton (Variable nötig)
const SAT_THRESHOLD = 24;

function expand(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function spread(hex) {
  const rgb = expand(hex);
  if (!rgb) return 999;
  return Math.max(...rgb) - Math.min(...rgb);
}

let violations = 0;
const root = path.resolve(__dirname, '..');
for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    let m;
    PROP.lastIndex = 0;
    while ((m = PROP.exec(line)) !== null) {
      const prop = m[1], val = m[2];
      const hexes = val.match(/(?<!&)#[0-9a-fA-F]{3,6}\b/g) || [];  // (?<!&) schließt HTML-Entities aus
      for (const hex of hexes) {
        const h = hex.toLowerCase();
        if (ALLOW.has(h)) continue;
        if (spread(h) >= SAT_THRESHOLD) continue; // gesättigter Akzent → ok
        // Reines Weiß/Schwarz als Text-/Icon-Kontrast (auf farbigem Badge) erlaubt – aber nicht als Fläche/Rahmen
        const isWB = ['#fff', '#ffffff', '#000', '#000000'].includes(h);
        const isTextProp = ['color', 'fill', 'stroke'].includes(prop);
        if (isWB && isTextProp) continue;
        violations++;
        console.log(`  ${rel}:${i + 1}  ${prop}: ${hex}  →  CSS-Variable verwenden (z.B. var(--muted)/var(--panel-2)/var(--border))`);
      }
    }
  });
}

if (violations) {
  console.error(`\n✖ Theme-Check: ${violations} hartkodierte Neutral-Farbe(n) in Inline-Styles gefunden.`);
  console.error('  Neutraltöne müssen über CSS-Variablen laufen, sonst brechen sie im Light-Theme.');
  console.error('  Bewusste Ausnahmen → in ALLOW in tools/check_theme_colors.cjs eintragen.');
  process.exit(1);
} else {
  console.log('✓ Theme-Check: keine hartkodierten Neutral-Farben in Inline-Styles.');
}
