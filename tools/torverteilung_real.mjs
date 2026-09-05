/* Reale Ergebnis-VERTEILUNG (nicht nur der Schnitt) aus openfootball/deutschland.
 * Beantwortet die Frage, die ein Torschnitt NICHT beantwortet: wie oft schiesst real
 * EIN Team >= X Tore? Direktes Gegenstueck zu tools/tor_hist.cjs (Engine).
 * Quelle: github.com/openfootball/deutschland – Klartext-Spielplaene, Ebene 1-4.
 * Ausgabe: tools/torverteilung_real.json + Tabelle je Ebene. */
import fs from 'fs';
const RAW='https://raw.githubusercontent.com/openfootball/deutschland/master/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tree=await (await fetch('https://api.github.com/repos/openfootball/deutschland/git/trees/master?recursive=1')).json();
const dateien=tree.tree.filter(x=>/^\d{4}-\d{2}\/[1-4]-[a-z-]*\d*\.txt$/.test(x.path));
console.error(`${dateien.length} Dateien`);
const H={};
for(const f of dateien){
  const lvl=+f.path.match(/\/([1-4])-/)[1], se=f.path.slice(0,7);
  const r=await fetch(RAW+f.path);await sleep(30);
  if(!r.ok)continue;
  const txt=await r.text();
  const h=H[lvl]||(H[lvl]={n:0,g:0,c:{},dateien:0,von:se,bis:se});
  let treffer=0;
  for(const line of txt.split('\n')){
    const m=line.match(/\s(\d{1,2})-(\d{1,2})(?:\s|\(|$)/);      // "  Team A  3-1  Team B"
    if(!m)continue;
    const a=+m[1],b=+m[2];if(a>20||b>20)continue;
    h.n++;h.g+=a+b;treffer++;const mx=Math.max(a,b);h.c[mx]=(h.c[mx]||0)+1;
  }
  if(treffer>100){h.dateien++;if(se<h.von)h.von=se;if(se>h.bis)h.bis=se;}
  process.stderr.write(`${f.path}: ${treffer}          \r`);
}
fs.writeFileSync('tools/torverteilung_real.json',JSON.stringify(H,null,1));
console.log('\nREAL – Anteil Spiele, in denen EIN Team >= X Tore schiesst:');
console.log('Lvl | Staffeln |  Spiele | Tore/Spiel |    >=6 |    >=8 |   >=10 |   >=12 | max | Zeitraum');
Object.keys(H).map(Number).sort((a,b)=>a-b).forEach(l=>{const h=H[l];
  const ge=x=>Object.keys(h.c).filter(k=>+k>=x).reduce((a,k)=>a+h.c[k],0);
  const f=x=>(ge(x)/h.n*100).toFixed(3).padStart(6);
  console.log(`${String(l).padStart(3)} | ${String(h.dateien).padStart(8)} | ${String(h.n).padStart(7)} | ${(h.g/h.n).toFixed(2).padStart(10)} | ${f(6)} | ${f(8)} | ${f(10)} | ${f(12)} | ${String(Math.max(...Object.keys(h.c).map(Number))).padStart(3)} | ${h.von}…${h.bis}`);});
