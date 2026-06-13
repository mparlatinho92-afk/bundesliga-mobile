#!/usr/bin/env node
/**
 * Theme-Color-Normalisierer — hält jedes Theme automatisch "farbenrein".
 *
 * Problem: Hartkodierte NEUTRALE Farben (Grau-/Dunkeltöne) in Inline-Styles brechen
 * das Light-Theme (schwarze Kästen / unleserlicher Text). Gesättigte Akzentfarben
 * (Status-Grün/-Rot, Level-Farben, Link-Blau) sind theme-unabhängig und ok.
 *
 * Statt den Build scheitern zu lassen, schreibt der --fix-Modus jede hartkodierte
 * Neutralfarbe automatisch in die passende CSS-Variable um → der Bug entsteht
 * gar nicht erst. manage-v ruft das vor dem Inlinen auf.
 *
 *   node tools/check_theme_colors.cjs --fix   → Quelle normalisieren (exit 0)
 *   node tools/check_theme_colors.cjs         → nur melden (exit 1 bei Fund)
 */
const fs = require('fs');
const path = require('path');

const FIX = process.argv.includes('--fix');

// UI-Module die HTML mit Inline-Styles erzeugen. (dfb_logo.js = SVG-Logo, ausgenommen.)
const FILES = ['app/core.js', 'app/pokal.js', 'app/league.js', 'app/modal.js', 'app/save_manager.js', 'app/map.js'];

// Property + Wert bis zum nächsten ';' (erfasst auch Farben in ${ternary} wie color:${x?'#fff':'#ddd'})
const PROP = /(?:^|[;"'`\s{(}:,])(color|background|background-color|border|border-color|border-top|border-bottom|border-left|border-right|outline|fill|stroke)\s*:\s*([^;]*?#[0-9a-fA-F]{3,6}[^;]*)/g;

// Bewusst theme-unabhängige neutrale Paare (z.B. Slate-Badge mit hellem Text)
const ALLOW = new Set(['#37474f', '#cfd8dc', '#546e7a', '#2d3e46', '#475569', '#64748b', '#1e293b']);

const SAT_THRESHOLD = 24; // RGB-Spannweite >= Schwelle = gesättigter Akzent (bleibt)

function rgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
const spread = h => { const c = rgb(h); return c ? Math.max(...c) - Math.min(...c) : 999; };
const avg = h => { const c = rgb(h); return c ? (c[0] + c[1] + c[2]) / 3 : 128; };

// Liefert die passende CSS-Variable für einen neutralen Hex je Property – oder null (Hex bleibt).
function mapVar(prop, hex) {
  const h = hex.toLowerCase();
  if (ALLOW.has(h)) return null;
  if (spread(h) >= SAT_THRESHOLD) return null;          // gesättigter Akzent
  const isWB = ['#fff', '#ffffff', '#000', '#000000'].includes(h);
  if (prop === 'color' || prop === 'fill' || prop === 'stroke') {
    if (isWB) return null;                               // Weiß/Schwarz als Textkontrast erlaubt
    return avg(h) >= 200 ? 'var(--text)' : 'var(--muted)';
  }
  if (prop === 'background' || prop === 'background-color') {
    return avg(h) < 48 ? 'var(--panel-3)' : 'var(--panel-2)';
  }
  return 'var(--border)';                                // border* / outline
}

let total = 0;
const changedFiles = [];
const root = path.resolve(__dirname, '..');

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  let fileHits = 0;

  const out = src.replace(PROP, (full, prop, val) => {
    const fixedVal = val.replace(/(?<!&)#[0-9a-fA-F]{3,6}\b/g, hex => {
      const v = mapVar(prop, hex);
      if (!v) return hex;
      fileHits++; total++;
      if (!FIX) console.log(`  ${rel}  ${prop}: ${hex}  →  ${v}`);
      return v;
    });
    return full.replace(val, fixedVal);
  });

  if (FIX && out !== src) { fs.writeFileSync(file, out); changedFiles.push(`${rel} (${fileHits})`); }
}

if (FIX) {
  if (changedFiles.length) console.log(`✓ Theme-Normalisierer: ${total} Neutralfarbe(n) → Variablen umgeschrieben in: ${changedFiles.join(', ')}`);
  else console.log('✓ Theme-Normalisierer: nichts umzuschreiben, bereits farbenrein.');
  process.exit(0);
} else if (total) {
  console.error(`\n✖ ${total} hartkodierte Neutralfarbe(n) gefunden. Beheben mit: npm run fix:theme`);
  process.exit(1);
} else {
  console.log('✓ Theme-Check: farbenrein.');
}
