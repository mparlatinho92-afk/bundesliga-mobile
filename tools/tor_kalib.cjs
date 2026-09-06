/* Kalibrier-Lauf: Engine-Ergebnisse gegen die GEMESSENE Wirklichkeit stellen.
 *   node tools/tor_kalib.cjs [saisons] [GOAL_BASE GOAL_STEP GOAL_LEVEL GOAL_SAT GOAL_FADE GOAL_FADE_LVL]
 * Ohne Parameter laeuft die Engine wie eingebaut. Zielwerte (Verteilung, nicht nur Schnitt):
 *   Ebene 1-4  tools/torverteilung_real.json  (openfootball, bis 16 Saisons - Langfristwerte)
 *   Ebene 5-11 tools/torverteilung_fupa.json  (FuPa 2025/26, Einzelergebnisse bis Kreisliga B) */
const fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..')+path.sep;
const _ls={};global.localStorage={getItem:k=>(k in _ls?_ls[k]:null),setItem:(k,v)=>{_ls[k]=String(v);},removeItem:k=>{delete _ls[k];}};
global.document={getElementById:()=>null,querySelector:()=>null};global.window=global;global.performance={now:()=>Date.now()};
global.LZString={compressToUTF16:s=>s,decompressFromUTF16:s=>s};global.indexedDB=undefined;
['game_data.js','app/history_data.js','game_engine.js'].forEach(f=>eval.call(global,fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));

const N=parseInt(process.argv[2]||'10',10);
if(process.argv[3]){Engine.GOAL_BASE=+process.argv[3];Engine.GOAL_STEP=+process.argv[4];
                    Engine.GOAL_LEVEL=+process.argv[5];Engine.GOAL_SAT=+process.argv[6];Engine.GOAL_FADE=+process.argv[7];
                    if(process.argv[8])Engine.GOAL_FADE_LVL=+process.argv[8];}
const P=`BASE ${Engine.GOAL_BASE} STEP ${Engine.GOAL_STEP} LEVEL ${Engine.GOAL_LEVEL} SAT ${Engine.GOAL_SAT} FADE ${Engine.GOAL_FADE}+${Engine.GOAL_FADE_LVL}/Pkt`;

// --- Zielwerte aus der Recherche -------------------------------------------
const real=JSON.parse(fs.readFileSync(ROOT+'tools/torverteilung_real.json','utf8'));   // Ebene 1-4
const fupa=JSON.parse(fs.readFileSync(ROOT+'tools/torverteilung_fupa.json','utf8'));   // Ebene 1-11
const ZIEL={};
const auswerten=h=>{const ge=x=>Object.keys(h.c).filter(k=>+k>=x).reduce((a,k)=>a+h.c[k],0);
  return {tps:h.g/h.n,n:h.n,p6:ge(6)/h.n*100,p8:ge(8)/h.n*100,p10:ge(10)/h.n*100,max:Math.max(...Object.keys(h.c).map(Number))};};
// Ebene 1-4 aus openfootball (viele Saisons), 5-8 aus FuPa (einzige Quelle mit Einzelergebnissen)
for(const l of [1,2,3,4]) ZIEL[l]=auswerten(real[l]);
for(const l of [5,6,7,8]) ZIEL[l]=auswerten(fupa[l]);

// --- Engine messen ----------------------------------------------------------
Engine.init();Engine.fastMode=true;
const H={},POK={n:0,g:0,c:{}};
for(let s=0;s<N;s++){
  Engine.simulateFullSeason();
  Engine.seasonResults.forEach(r=>{const L=Engine.leagues[r.lid];if(!L)return;
    const h=H[L.level]||(H[L.level]={n:0,g:0,c:{}});h.n++;h.g+=r.s1+r.s2;
    const m=Math.max(r.s1,r.s2);h.c[m]=(h.c[m]||0)+1;});
  // Pokalspiele derselben Saison (DFB + Amateur) mitmessen
  [Engine.pokal,Engine.amateurpokal].forEach(pk=>(pk&&pk.rounds||[]).forEach(rd=>(rd.matches||[]).forEach(m=>{
    if(m.hGoals==null)return;POK.n++;POK.g+=m.hGoals+m.aGoals;
    const x=Math.max(m.hGoals,m.aGoals);POK.c[x]=(POK.c[x]||0)+1;})));
  Engine.processSeasonTransition();
}
const pct=(h,x)=>Object.keys(h.c).filter(k=>+k>=x).reduce((a,k)=>a+h.c[k],0)/h.n*100;
const mx=h=>Math.max(...Object.keys(h.c).map(Number));
console.log(`\n${P}  ·  ${N} Saisons`);
console.log('Ebene |  Spiele | Tore/Spiel   (real) |    >=6  (real) |    >=8  (real) |   >=10  (real) | max (real)');
Object.keys(H).map(Number).sort((a,b)=>a-b).forEach(l=>{const h=H[l],z=ZIEL[l]||{};
  const f=(v,r)=>v.toFixed(3).padStart(6)+(r==null?'      ':' ('+r.toFixed(3).padStart(5)+')');
  console.log(`${String(l).padStart(5)} | ${String(h.n).padStart(7)} | `
    +(h.g/h.n).toFixed(2).padStart(6)+' ('+(z.tps?z.tps.toFixed(2):' -- ')+') | '
    +f(pct(h,6),z.p6)+' | '+f(pct(h,8),z.p8)+' | '+f(pct(h,10),z.p10)+' | '
    +String(mx(h)).padStart(3)+(z.max?' ('+z.max+')':''));});
console.log(`Pokal | ${String(POK.n).padStart(7)} | ${(POK.g/POK.n).toFixed(2).padStart(6)}        | `
  +pct(POK,6).toFixed(3).padStart(6)+'         | '+pct(POK,8).toFixed(3).padStart(6)+'         | '
  +pct(POK,10).toFixed(3).padStart(6)+'         | '+mx(POK));
