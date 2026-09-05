const fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..')+path.sep;
const _ls={};global.localStorage={getItem:k=>(k in _ls?_ls[k]:null),setItem:(k,v)=>{_ls[k]=String(v);},removeItem:k=>{delete _ls[k];}};
global.document={getElementById:()=>null,querySelector:()=>null};global.window=global;global.performance={now:()=>Date.now()};
global.LZString={compressToUTF16:s=>s,decompressFromUTF16:s=>s};global.indexedDB=undefined;
['game_data.js','app/history_data.js','game_engine.js'].forEach(f=>eval.call(global,fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
Engine.init();
const mode=process.argv[2]||'fast';   // 'fast' | 'slow'
const N=parseInt(process.argv[3]||'3',10);
for(let s=0;s<N;s++){
  Engine.fastMode=(mode==='fast');
  Engine.simulateFullSeason();
  Engine.fastMode=false;
  Engine.processSeasonTransition();
  const R=Engine.archive&&Engine.archive.records;
  const perLvl={};
  Object.entries((R&&R.l)||{}).forEach(([lid,o])=>{
    const L=Engine.leagues[lid]; if(!L||!o.hs) return;
    const p=perLvl[L.level]||(perLvl[L.level]={n:0,best:0,y:''});
    p.n++; const hoch=o.hs[1];
    if(hoch>p.best){p.best=hoch;p.y=o.hs[3];}
  });
  console.log(`Saison ${s+1} (${mode}): `+Object.keys(perLvl).map(Number).sort((a,b)=>a-b)
    .map(lv=>`L${lv}: ${perLvl[lv].n} Ligen mit hs, max ${perLvl[lv].best} (${perLvl[lv].y})`).join(' | '));
}
