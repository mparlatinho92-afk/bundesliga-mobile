/* Reale Ergebnis-VERTEILUNG bis in die Kreisliga (FuPa, Saison 2025/26).
 *
 * Gegenstueck zu tools/torverteilung_real.mjs (openfootball), das nur bis Ebene 4 reicht.
 * Beantwortet die Frage, die ein Torschnitt nicht beantwortet: wie oft schiesst real EIN Team
 * >= X Tore - und wie hoch faellt das hoechste Ergebnis einer Saison wirklich aus?
 *
 * DIE ROUTE (nicht zu raten, steht in einem Lazy-Chunk des FuPa-Frontends):
 *     v1/competitions/<slug>/seasons/<2025-26|current>/matches?sort=desc&limit=100&offset=N
 * Felder: homeGoal / awayGoal. Bis zu 100 Spiele je Seite, weiter ueber offset (der Link-Header
 * nennt die naechste Seite). `?competition=<slug>` gibt es NUR fuer /standings - auf /matches
 * antwortet jede Query-Form mit "No profile for the specified request found".
 *
 * Ligen kommen aus tools/torschnitt_fupa.json (dort stehen Slug + Ebene der bereits geprueften
 * Ligen). Ausgabe: tools/torverteilung_fupa.json + Tabelle je Ebene. */
import fs from 'fs';
const UA='Mozilla/5.0 (BundesligaSim-Recherche)';
const SEASON=process.argv[2]||'2025-26';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(p){for(let i=0;i<5;i++){
  try{const r=await fetch('https://api.fupa.net/'+p,{headers:{'User-Agent':UA}});
    if(r.ok){const j=await r.json();if(Array.isArray(j))return j;}
    if(r.status===404)return null;
  }catch(e){}
  await sleep(1200*(i+1));
} return null;}

const ligen=JSON.parse(fs.readFileSync('tools/torschnitt_fupa.json','utf8'));
console.error(`${ligen.length} Ligen`);
const H={},REK={};
let n=0;
for(const L of ligen){
  n++;
  let off=0, geholt=0;
  for(;;){
    const j=await api(`v1/competitions/${encodeURIComponent(L.slug)}/seasons/${SEASON}/matches?sort=desc&limit=100&offset=${off}`);
    await sleep(110);
    if(!j||!j.length)break;
    for(const m of j){
      if(m.homeGoal==null||m.awayGoal==null)continue;
      const a=m.homeGoal|0,b=m.awayGoal|0;
      const h=H[L.level]||(H[L.level]={n:0,g:0,c:{},ligen:new Set()});
      h.n++;h.g+=a+b;h.ligen.add(L.slug);
      const mx=Math.max(a,b);h.c[mx]=(h.c[mx]||0)+1;
      const r=REK[L.level];
      if(!r||mx>r.mx)REK[L.level]={mx,txt:`${a}:${b} ${m.homeTeam?.name?.full||'?'} - ${m.awayTeam?.name?.full||'?'} (${L.liga})`};
      geholt++;
    }
    if(j.length<100)break;
    off+=100;
    if(off>1200)break;                       // Reissleine gegen Endlosschleifen
  }
  if(n%20===0)process.stderr.write(`  ${n}/${ligen.length} Ligen\n`);
}
const out={};
Object.keys(H).forEach(l=>{const h=H[l];out[l]={n:h.n,g:h.g,c:h.c,ligen:h.ligen.size,rekord:REK[l]};});
fs.writeFileSync('tools/torverteilung_fupa.json',JSON.stringify(out,null,1));

console.log(`\nREAL ${SEASON} - Anteil Spiele, in denen EIN Team >= X Tore schiesst:`);
console.log('Ebene | Ligen |  Spiele | Tore/Spiel |    >=6 |    >=8 |   >=10 |   >=12 | max');
Object.keys(H).map(Number).sort((a,b)=>a-b).forEach(l=>{const h=H[l];
  const ge=x=>Object.keys(h.c).filter(k=>+k>=x).reduce((a,k)=>a+h.c[k],0);
  const f=x=>(ge(x)/h.n*100).toFixed(3).padStart(6);
  console.log(`${String(l).padStart(5)} |${String(h.ligen.size).padStart(6)} | ${String(h.n).padStart(7)} | `
    +(h.g/h.n).toFixed(2).padStart(10)+` | ${f(6)} | ${f(8)} | ${f(10)} | ${f(12)} | ${REK[l].mx}`);});
console.log('\nHoechstes Ergebnis je Ebene:');
Object.keys(REK).map(Number).sort((a,b)=>a-b).forEach(l=>console.log(`  Ebene ${l}: ${REK[l].txt}`));
