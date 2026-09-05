const fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..')+path.sep;
const _ls={};global.localStorage={getItem:k=>(k in _ls?_ls[k]:null),setItem:(k,v)=>{_ls[k]=String(v);},removeItem:k=>{delete _ls[k];}};
global.document={getElementById:()=>null,querySelector:()=>null};global.window=global;global.performance={now:()=>Date.now()};
global.LZString={compressToUTF16:s=>s,decompressFromUTF16:s=>s};global.indexedDB=undefined;
['game_data.js','app/history_data.js','game_engine.js'].forEach(f=>eval.call(global,fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
Engine.init();Engine.fastMode=true;
const H={};const N=parseInt(process.argv[2]||'10',10);
for(let s=0;s<N;s++){Engine.simulateFullSeason();
  Engine.seasonResults.forEach(r=>{const L=Engine.leagues[r.lid];if(!L)return;
    const h=H[L.level]||(H[L.level]={n:0,g:0,c:{}});h.n++;h.g+=r.s1+r.s2;const m=Math.max(r.s1,r.s2);h.c[m]=(h.c[m]||0)+1;});
  Engine.processSeasonTransition();}
console.log(`ueber ${N} Saisons – Anteil Spiele, in denen EIN Team >= X Tore schiesst:`);
console.log('Lvl |   Spiele | Tore/Spiel |    >=6 |    >=8 |   >=10 |   >=12 |   >=14 | max');
Object.keys(H).map(Number).sort((a,b)=>a-b).forEach(lv=>{const h=H[lv];
  const ge=x=>Object.keys(h.c).filter(k=>+k>=x).reduce((a,k)=>a+h.c[k],0);
  const mx=Math.max(...Object.keys(h.c).map(Number));
  const f=x=>(ge(x)/h.n*100).toFixed(3).padStart(6);
  console.log(`${String(lv).padStart(3)} | ${String(h.n).padStart(8)} | ${(h.g/h.n).toFixed(2).padStart(10)} | ${f(6)} | ${f(8)} | ${f(10)} | ${f(12)} | ${f(14)} | ${mx}`);});
