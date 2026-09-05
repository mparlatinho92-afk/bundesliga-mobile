/* Torschnitt je Ligaebene aus echten Abschlusstabellen (FuPa-API, Saison 2025/26).
 *
 *   1) v1/districts                       -> alle Kreise/Verbaende (mit region)
 *   2) v1/competitions?district=<slug>    -> Ligen mit level + ageGroup
 *   3) v1/standings?competition=<slug>&season=2025-26
 *      -> je Team matches/ownGoals  =>  Tore/Spiel = SUM(ownGoals) / (SUM(matches)/2)
 *
 * Nur Herren, nur DEUTSCHE Regionen (luxemburg/zuerich liefern sonst Ligen auf denselben
 * Ebenen mit anderem Torniveau), nur Ligen mit vollstaendig gespielter Saison und
 * konsistenter Tabelle (Summe Tore == Summe Gegentore).
 *
 * Ausgabe: tools/torschnitt_fupa.json (eine Zeile je Liga) + Tabelle je Ebene auf stdout. */
import fs from 'fs';
const UA='Mozilla/5.0 (BundesligaSim-Recherche)';
const SEASON='2025-26';
const AUSLAND=new Set(['luxemburg','zuerich']);
const PRO_LEVEL=40;                        // ab Ebene 7 gibt es hunderte Ligen -> Stichprobe
const CACHE='tools/.fupa_comps.json';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(p){for(let i=0;i<6;i++){
  try{const r=await fetch('https://api.fupa.net/'+p,{headers:{'User-Agent':UA}});
    if(r.ok){const j=await r.json();if(j&&!j.error)return j;}
    if(r.status===404)return null;
  }catch(e){}
  await sleep(1500*(i+1));
} return null;}

let comps;
if(fs.existsSync(CACHE)) comps=JSON.parse(fs.readFileSync(CACHE,'utf8'));
else{
  const districts=await api('v1/districts')||[];
  console.error(`${districts.length} Districts`);
  const m=new Map(); let i=0;
  for(const d of districts){
    i++;
    if(AUSLAND.has(d.region&&d.region.slug))continue;
    if(/frauen|jugend|altherren|cup|pokal/i.test(d.slug))continue;
    const cs=await api('v1/competitions?district='+encodeURIComponent(d.slug));await sleep(100);
    (cs||[]).forEach(c=>{
      if(!c||!c.level)return;
      if(c.category&&c.category.name!=='Liga')return;
      if(c.ageGroup&&c.ageGroup.slug!=='m')return;
      if(!m.has(c.slug))m.set(c.slug,{slug:c.slug,name:c.name,level:c.level,region:(d.region||{}).slug});
    });
    if(i%50===0)process.stderr.write(`  ${i}/${districts.length}, ${m.size} Ligen\n`);
  }
  comps=[...m.values()];
  fs.writeFileSync(CACHE,JSON.stringify(comps));
}
console.error(`${comps.length} deutsche Herren-Ligen`);

const byLvl={};comps.forEach(c=>(byLvl[c.level]=byLvl[c.level]||[]).push(c));
const out=[];
for(const lvl of Object.keys(byLvl).map(Number).sort((a,b)=>a-b)){
  if(lvl>11)continue;
  const list=byLvl[lvl];
  const step=Math.max(1,Math.floor(list.length/PRO_LEVEL));       // gleichmaessig streuen,
  const pick=list.filter((_,k)=>k%step===0).slice(0,PRO_LEVEL);   // nicht nur ein Verband
  let ok=0;
  for(const c of pick){
    const j=await api(`v1/standings?competition=${encodeURIComponent(c.slug)}&season=${SEASON}`);await sleep(110);
    const st=j&&j.standings;if(!st||st.length<6)continue;
    const sp=st.reduce((a,x)=>a+(x.matches||0),0), gf=st.reduce((a,x)=>a+(x.ownGoals||0),0),
          ga=st.reduce((a,x)=>a+(x.againstGoals||0),0), spiele=sp/2;
    if(!spiele||spiele<40)continue;
    if(Math.abs(gf-ga)>2)continue;                                  // Tabelle inkonsistent
    if(!st.every(x=>x.matches>=(st.length-1)*2-2))continue;          // Saison nicht zu Ende
    out.push({level:lvl,liga:c.name,slug:c.slug,region:c.region,teams:st.length,spiele,tore:gf,tps:+(gf/spiele).toFixed(3)});
    ok++;
  }
  console.error(`  Ebene ${lvl}: ${ok}/${pick.length} von ${list.length} Ligen`);
}
fs.writeFileSync('tools/torschnitt_fupa.json',JSON.stringify(out,null,1));

const by={};out.forEach(x=>(by[x.level]=by[x.level]||[]).push(x));
console.log('\nEbene | Ligen | Spiele | Tore  | Tore/Spiel | Median | Spanne');
Object.keys(by).map(Number).sort((a,b)=>a-b).forEach(l=>{
  const r=by[l],sp=r.reduce((s,x)=>s+x.spiele,0),to=r.reduce((s,x)=>s+x.tore,0);
  const v=r.map(x=>x.tps).sort((p,q)=>p-q);
  console.log(String(l).padStart(5)+' |'+String(r.length).padStart(6)+' |'+String(sp).padStart(7)+' |'
    +String(to).padStart(6)+' |'+(to/sp).toFixed(2).padStart(11)+' |'+v[Math.floor(v.length/2)].toFixed(2).padStart(7)
    +' | '+v[0].toFixed(2)+'–'+v[v.length-1].toFixed(2));
});
