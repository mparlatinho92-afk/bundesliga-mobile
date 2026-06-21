/** destack2_apply.cjs — wendet Mover-Koords an (Teams haben SCHON venues -> ersetzen). */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),GAME_F=path.join(ROOT,'game_data.js');
const write=process.argv.includes('--write');
const r5=n=>Math.round(n*1e5)/1e5;
const rev=JSON.parse(fs.readFileSync(path.join(__dirname,'destack2_review.json'),'utf8'));
const coord={},sname={};
for(const e of rev){ if(e.neu){coord[e.id]=[e.neu[0],e.neu[1]];sname[e.id]=e.sn;} }
coord["usilupomartiniwolfsburg_552"]=[52.4054,10.7382]; sname["usilupomartiniwolfsburg_552"]="Wolfsburg-Westhagen";

const src=fs.readFileSync(GAME_F,'utf8');
const GD=JSON.parse(src.match(/const GAME_DATA\s*=\s*(\{[\s\S]*\});?\s*$/)[1]);
const T=GD.teams;
function hav(a,b,c,d){const R=6371,r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
// alle bestehenden Koordinaten (fuer Kollisionspruefung)
const occupied={};
for(const id in T){ if(coord[id])continue; occupied[`${T[id].lat.toFixed(4)},${T[id].lon.toFixed(4)}`]=T[id].name; }

let txt=src,prob=[];const seen={};
for(const id of Object.keys(coord)){
  const t=T[id]; if(!t){prob.push(id+': unbekannt');continue;}
  let[la,lo]=coord[id]; const d=hav(t.lat,t.lon,la,lo);
  if(d>80)prob.push(`${id}: ${d.toFixed(0)}km!`);
  let key=`${la.toFixed(4)},${lo.toFixed(4)}`;
  if(occupied[key]||seen[key]){ la=r5(la+0.0015); lo=r5(lo+0.0015); key=`${la.toFixed(4)},${lo.toFixed(4)}`; coord[id]=[la,lo]; }
  seen[key]=id;
}
console.log(`${Object.keys(coord).length} Mover | Probleme: ${prob.length}`); prob.forEach(p=>console.log('  !! '+p));
if(write){
  let okLL=0,okV=0;
  for(const id of Object.keys(coord)){
    const esc=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const[la,lo]=coord[id];
    const ven=[{stadName:sname[id]||'',lat:r5(la),lon:r5(lo),address:''}];
    let b1=txt; txt=txt.replace(new RegExp('("id":"'+esc+'"[\\s\\S]*?"lat":)[-\\d.]+(,"lon":)[-\\d.]+'),`$1${r5(la)}$2${r5(lo)}`); if(txt!==b1)okLL++; else console.log('WARN ll',id);
    let b2=txt; txt=txt.replace(new RegExp('("id":"'+esc+'"[\\s\\S]*?"venues":)\\[[^\\]]*\\]'),`$1${JSON.stringify(ven)}`); if(txt!==b2)okV++; else console.log('WARN ven',id);
  }
  fs.writeFileSync(GAME_F,txt); console.log(`geschrieben (lat/lon:${okLL}, venues:${okV})`);
}else console.log('[DRY-RUN]');
