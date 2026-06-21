/**
 * destack_apply.cjs — wendet die entstapelten Koordinaten an.
 * Quelle: tools/destack_review.json (Batch1) + Overrides (Batch2/Web) + Offsets.
 * Setzt team.lat/lon + team.venues[] (wie upgrade_coords). --write schreibt game_data.js.
 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),GAME_F=path.join(ROOT,'game_data.js');
const write=process.argv.includes('--write');
const r5=n=>Math.round(n*1e5)/1e5;

const review=JSON.parse(fs.readFileSync(path.join(__dirname,'destack_review.json'),'utf8'));
const coord={}, sname={};
for(const e of review){ if(e.neu){ coord[e.id]=[e.neu[0],e.neu[1]]; sname[e.id]=e.q; } }

// Overrides (Batch2 Nominatim + Web-Stadien)
Object.assign(coord,{
  bfcmeteor06_805:[52.5979,13.4353],
  tuerkiyemsporberlin_790:[52.4976,13.4119],
  vfbhassloch_390:[49.3630,8.2566],
  "1fcschweinfurt05_17":[50.05133,10.20298],
  fceintrachtbamberg_25:[49.90052,10.92878],
});
Object.assign(sname,{
  bfcmeteor06_805:"Berlin-Pankow", tuerkiyemsporberlin_790:"Berlin-Kreuzberg",
  vfbhassloch_390:"Haßloch", "1fcschweinfurt05_17":"Willy-Sachs-Stadion",
  fceintrachtbamberg_25:"Fuchs-Park-Stadion",
});
// Offsets fuer exakt identische Paare (sichtbare Marker, bleiben im Ort)
coord["vfbhassloch_390"]=[49.367,8.260];            // Haßloch leicht NO
coord["1fc08hassloch_379"]=[49.359,8.253];          // Haßloch leicht SW
coord["tuerkguecuemuenchen_20"]=[48.1128,11.5770];  // ~0.3km neben Gruenwalder
coord["djkarminiaeilendorf_1113"]=[50.7820,6.1575]; // Eilendorf leicht versetzt

// Concordia Hamburg II (eigenstaendig, parentId=None) -> Marienthal
coord["concordiahamburgii_520"]=[53.567,10.088]; sname["concordiahamburgii_520"]="Hamburg-Marienthal";
// Reserven an Stapelpunkten -> auf Eltern-Stadion (+Mini-Offset fuer Marker)
coord["tsv1860muenchenii_45"]=[48.1095,11.5760];     sname["tsv1860muenchenii_45"]="Grünwalder Stadion";
coord["fcinternationale1980ii_792"]=[52.4700,13.4200];sname["fcinternationale1980ii_792"]="Berlin-Neukölln";
coord["1fcduerenii_1116"]=[50.7998,6.4650];          sname["1fcduerenii_1116"]="Westkampfbahn Düren";
coord["fcaugsburgii_9"]=[48.3215,10.8840];           sname["fcaugsburgii_9"]="Augsburg";
coord["eintrachtmahlsdorfii_784"]=[52.5246,13.6230]; sname["eintrachtmahlsdorfii_784"]="Berlin-Mahlsdorf";

const src=fs.readFileSync(GAME_F,'utf8');
const GAME_DATA=JSON.parse(src.match(/const GAME_DATA\s*=\s*(\{[\s\S]*\});?\s*$/)[1]);
const T=GAME_DATA.teams;
function hav(a,b,c,d){const R=6371,r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));}

let txt=src, problems=[];
const seen={};
const ids=Object.keys(coord);
for(const id of ids){
  const t=T[id]; if(!t){problems.push(id+': unbekannt');continue;}
  const [la,lo]=coord[id]; const d=hav(t.lat,t.lon,la,lo);
  if(d>80) problems.push(`${id}: ${d.toFixed(0)}km Sprung!`);
  const key=`${la.toFixed(4)},${lo.toFixed(4)}`;
  if(seen[key]) problems.push(`${id}: identisch mit ${seen[key]} @ ${key}`); else seen[key]=id;
}
// Report
console.log(`${ids.length} Klubs | Probleme: ${problems.length}`);
problems.forEach(p=>console.log('  !! '+p));
if(write){
  let okLL=0, okV=0;
  for(const id of ids){
    const t=T[id]; if(!t)continue; const [la,lo]=coord[id];
    const esc=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const ven=[{stadName:sname[id]||'',lat:r5(la),lon:r5(lo),address:''}];
    // 1) lat/lon-Werte setzen
    let b1=txt;
    txt=txt.replace(new RegExp('("id":"'+esc+'"[\\s\\S]*?"lat":)[-\\d.]+(,"lon":)[-\\d.]+'),
                    `$1${r5(la)}$2${r5(lo)}`);
    if(txt!==b1)okLL++; else console.log('   WARN lat/lon nicht ersetzt:',id);
    // 2) venues einfuegen (Team hat keinen venues-Key; thumb ist letztes Feld)
    let b2=txt;
    txt=txt.replace(new RegExp('("id":"'+esc+'"[\\s\\S]*?"thumb":"[^"]*")(\\})'),
                    `$1,"venues":${JSON.stringify(ven)}$2`);
    if(txt!==b2)okV++; else console.log('   WARN venues nicht eingefuegt:',id);
  }
  fs.writeFileSync(GAME_F,txt);
  console.log(`-> game_data.js geschrieben (lat/lon:${okLL}, venues:${okV})`);
} else {
  // Abdeckungs-Check: welche der erwarteten 39 fehlen?
  console.log('[DRY-RUN] coord-Eintraege:',ids.length);
  console.log('--write zum Schreiben');
}
