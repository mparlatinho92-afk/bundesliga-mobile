/**
 * destack_coords.cjs — entstapelt Klubs, die auf geteilten Stadtzentrum-
 * (Nominatim-)Koordinaten liegen, via gezielter Nominatim-Abfrage (Stadion/
 * Stadtteil). Dry-Run: schreibt nur tools/destack_review.json zum Review.
 * Mit --write: setzt team.venues[] (= als praezise markiert) in game_data.js.
 *
 * QUERIES: pro Team-ID ein praeziser Suchstring. conf 'stadion' = bekanntes
 * Stadion, 'bezirk' = Stadtteil-Ebene (entstapelt zuverlaessig, ~bezirksgenau).
 */
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=path.join(__dirname,'..'), GAME_F=path.join(ROOT,'game_data.js');
const write=process.argv.includes('--write');
const DELAY=1200;

// {id: [query, conf]}
const Q={
 // --- Berlin (Stadtteil-genau, entstapelt zuverlaessig) ---
 bfcmeteor06_805:["Sportplatz Behmstraße, Berlin Pankow","bezirk"],
 bfcpreussen_770:["Preußenpark, Lankwitz, Berlin","stadion"],
 blauweiss90berlin_757:["Stadion Lichterfelde, Ostpreußendamm, Berlin","stadion"],
 concordiawittenau_804:["Wittenau, Berlin","bezirk"],
 fcinternationale1980_806:["Werner-Seelenbinder-Sportpark, Neukölln, Berlin","stadion"],
 scgatow1931_812:["Gatow, Berlin","bezirk"],
 sdcroatiaberlin_765:["Schöneberg, Berlin","bezirk"],
 sportfreundejohannistal_783:["Johannisthal, Berlin","bezirk"],
 sscteutonia99_772:["Haselhorst, Berlin","bezirk"],
 tsvmariendorf1897_771:["Mariendorf, Berlin","bezirk"],
 tuerkiyemsporberlin_790:["Katzbach-Stadion, Kreuzberg, Berlin","stadion"],
 // --- Aschaffenburg ---
 svviktoriaaschaffenburg_18:["Stadion am Schönbusch, Aschaffenburg","stadion"],
 svvatansporaschaffenburg_76:["Aschaffenburg-Damm","bezirk"],
 tus1893aschaffenburgleider_78:["Leider, Aschaffenburg","bezirk"],
 // --- Augsburg ---
 schwabenaugsburg_53:["Schwabenstadion, Augsburg","stadion"],
 tuerksporaugsburg_60:["Augsburg-Oberhausen","bezirk"],
 // --- Düren ---
 "1fcdueren_1075":["Westkampfbahn, Düren","stadion"],
 sportfreundedueren_1111:["Düren-Birkesdorf","bezirk"],
 svkurdistandueren_1120:["Düren-Nord","bezirk"],
 // --- München ---
 tsv1860muenchen_6:["Grünwalder Stadion, München","stadion"],
 tuerkguecuemuenchen_20:["Grünwalder Stadion, München","stadion"],
 // --- Schweinfurt ---
 "1fcschweinfurt05_17":["Willy-Sachs-Stadion, Schweinfurt","stadion"],
 ftschweinfurt_72:["Sachs-Stadion, Schweinfurt","bezirk"],
 // --- Bamberg ---
 fceintrachtbamberg_25:["Fuchs-Park-Stadion, Bamberg","stadion"],
 djkdonboscobamberg_64:["Bamberg-Gaustadt","bezirk"],
 // --- Erlangen ---
 atsverlangen_39:["Sportzentrum West, Erlangen","bezirk"],
 fsverlangenbruck_84:["Erlangen-Bruck","bezirk"],
 // --- Mainz ---
 fcbasaramainz_313:["Mainz-Bretzenheim","bezirk"],
 fcaksudiyarmainz_364:["Mainz-Mombach","bezirk"],
 // --- Zweibrücken ---
 tsczweibruecken_348:["Zweibrücken-Ixheim","bezirk"],
 vbzweibruecken_422:["Westpfalzstadion, Zweibrücken","stadion"],
 // --- Haßloch ---
 "1fc08hassloch_379":["Haßloch","bezirk"],
 vfbhassloch_390:["Haßloch-Ost","bezirk"],
 // --- Schifferstadt ---
 fsvschifferstadt_328:["Schifferstadt","bezirk"],
 phoenixschifferstadt_329:["Schifferstadt-Süd","bezirk"],
 // --- Hamburg ---
 wandsbekertsvconcordiahamburg_488:["Wandsbek, Hamburg","bezirk"],
 // --- Eilendorf (Aachen) ---
 sv1914eilendorf_1112:["Aachen-Eilendorf","bezirk"],
 djkarminiaeilendorf_1113:["Eilendorf, Aachen","bezirk"],
};

function geo(q){return new Promise((res)=>{
  const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q='+encodeURIComponent(q);
  https.get(url,{headers:{'User-Agent':'bundesliga-coords/1.0 (cleanup)'}},r=>{
    let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{const j=JSON.parse(d);res(j[0]?{lat:+j[0].lat,lon:+j[0].lon,disp:j[0].display_name}:null);}catch(e){res(null);}});
  }).on('error',()=>res(null));
});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function hav(a,b,c,d){const R=6371,r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));}

(async()=>{
  const src=fs.readFileSync(GAME_F,'utf8');
  const GAME_DATA=JSON.parse(src.match(/const GAME_DATA\s*=\s*(\{[\s\S]*\});?\s*$/)[1]);
  const T=GAME_DATA.teams;
  const out=[];
  for(const [id,[q,conf]] of Object.entries(Q)){
    const t=T[id]; if(!t){console.log('?? unbekannt',id);continue;}
    const g=await geo(q); await sleep(DELAY);
    if(!g){out.push({id,name:t.name,q,conf,ok:false});console.log(`FAIL ${id}  q="${q}"`);continue;}
    const dist=hav(t.lat,t.lon,g.lat,g.lon);
    out.push({id,name:t.name,q,conf,old:[t.lat,t.lon],neu:[g.lat,g.lon],distKm:+dist.toFixed(1),disp:g.disp});
    console.log(`${id.padEnd(30)} ${conf.padEnd(7)} ${dist.toFixed(1).padStart(6)}km  ${g.lat.toFixed(4)},${g.lon.toFixed(4)}  <- ${q}`);
  }
  fs.writeFileSync(path.join(__dirname,'destack_review.json'),JSON.stringify(out,null,1));
  console.log('\n-> tools/destack_review.json ('+out.length+' Eintraege)'+(write?' [WRITE-Modus folgt separat]':' [DRY-RUN]'));
})();
