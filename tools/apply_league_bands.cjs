// Einmal-Skript: fügt min/max je Liga in game_data.js ein + korrigiert vier targets.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'game_data.js');
let txt = fs.readFileSync(file, 'utf8');

// --- Explizite Bänder (Nicht-Bodenligen, real verankert) ---
// Format: id -> { min, max, target? }
const SPEC = {
  '1':   { min:18, max:18 },
  '2':   { min:18, max:18 },
  '3':   { min:20, max:20 },
  '4-1': { min:17, max:19 }, '4-2': { min:17, max:19 }, '4-3': { min:17, max:19 },
  '4-4': { min:17, max:19 }, '4-5': { min:17, max:19 },
  '5-1': { min:17, max:18 }, '5-2': { min:17, max:18 }, '5-3': { min:17, max:18 },
  '5-4': { min:15, max:16 }, '5-5': { min:17, max:18 },
  '5-6': { min:16, max:18, target:16 },
  '5-7': { min:15, max:17 },
  '5-8': { min:16, max:16, target:16 }, '5-9': { min:16, max:16, target:16 },
  '5-10':{ min:17, max:19 }, '5-11':{ min:17, max:18 }, '5-12':{ min:15, max:17 },
  '5-13':{ min:17, max:19 }, '5-14':{ min:17, max:19 },
  '6-1': { min:15, max:17 }, '6-2': { min:17, max:18 }, '6-3': { min:17, max:18 },
  '6-21':{ min:17, max:18 },
  '7-1': { min:14, max:16 }, '7-2': { min:14, max:16 },
  '8-2': { min:14, max:18, target:16 },
};

// --- Bodenliga-Regel ---
function ruleBand(target) {
  return { min: Math.max(8, target - 2), max: target + 1 };
}

// leagues-Objekt lokalisieren (keine Braces in String-Werten -> Brace-Balancing sicher)
const marker = '"leagues":';
const mi = txt.indexOf(marker);
const objStart = txt.indexOf('{', mi + marker.length);
let depth = 0, j = objStart;
for (; j < txt.length; j++) {
  const c = txt[j];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
}
const leagues = JSON.parse(txt.slice(objStart, j));

let bodenCount = 0, specCount = 0, targetChanges = [];
for (const id of Object.keys(leagues)) {
  const L = leagues[id];
  let band;
  if (SPEC[id]) {
    band = SPEC[id];
    specCount++;
    if (band.target != null && band.target !== L.target) {
      targetChanges.push(`${id}: ${L.target} -> ${band.target}`);
      L.target = band.target;
    }
  } else {
    band = ruleBand(L.target);
    bodenCount++;
  }
  L.min = band.min;
  L.max = band.max;
}

const newStr = JSON.stringify(leagues);
txt = txt.slice(0, objStart) + newStr + txt.slice(j);
fs.writeFileSync(file, txt);

console.log('Explizit:', specCount, ' Bodenliga-Regel:', bodenCount, ' gesamt:', specCount + bodenCount);
console.log('target-Korrekturen:', targetChanges.join(' | '));
// Stichprobe
['5-8','5-6','8-2','6-32','6-15','5-10','7-1'].forEach(id => {
  const L = leagues[id];
  console.log(`  ${id} ${L.name}: target=${L.target} min=${L.min} max=${L.max}`);
});
