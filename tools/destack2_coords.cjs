/**
 * destack2_coords.cjs — entstapelt fehlplatzierte venue-Teams (europlan-Fehl-
 * zuordnung: mehrere Klubs auf 1 Stadion). Anker (echter Stadion-Eigentuemer)
 * bleibt; MOVERS bekommen ihre eigene Heimstaette via Nominatim.
 * Dry-Run -> tools/destack2_review.json.
 */
const https=require('https');
const DELAY=1200;
// MOVERS: {id:[query, stadName]}
const Q={
 // Hannover (Anker: Arminia/Rudolf-Kalweit)
 hschannover_600:["Hannover-Vahrenwald","Hannover-Vahrenwald"],
 osvhannover_604:["Hannover-Kleefeld, Pferdeturm","Hannover-Kleefeld"],
 // Kaiserslautern (Anker: 1.FCK/Fritz-Walter)
 vfrkaiserslautern_352:["Kaiserslautern-Erfenbach","Kaiserslautern-Erfenbach"],
 tsgkaiserslautern_434:["Kaiserslautern-Hohenecken","Kaiserslautern West"],
 // Ludwigshafen (Anker: SV Suedwest/Suedweststadion)
 arminialudwigshafen_304:["Ludwigshafen-Gartenstadt","Ludwigshafen-Gartenstadt"],
 esvludwigshafen_387:["Ludwigshafen-Mundenheim","Ludwigshafen-Mundenheim"],
 // Bremerhaven (Anker: OSC/Nordsee-Stadion)
 lehertsbremerhaven_454:["Bremerhaven-Lehe","Bremerhaven-Lehe"],
 sflbremerhaven_474:["Bremerhaven-Geestemuende","Bremerhaven-Geestemünde"],
 // Idar-Oberstein (Anker: SC/Hans-Dieter-Krieger)
 fsvblauweissidaroberstein_357:["Idar-Oberstein Tiefenstein","Idar-Oberstein"],
 // Bremen (Anker: TuRa Bremen)
 ksvvatansport_451:["Bremen-Gröpelingen","Bremen-Gröpelingen"],
 // Wolfsburg (Anker: VfL/VW-Arena)
 usilupomartiniwolfsburg_552:["Wolfsburg-Westhagen, Elsterweg","Wolfsburg-Westhagen"],
 // Berlin
 berlinersc_760:["Berlin-Grunewald, Hüttenweg","Berlin-Grunewald"],
 blauweiss90berlin_757:["Berlin-Lankwitz","Berlin-Lankwitz"],
 sccharlottenburg_766:["Berlin-Charlottenburg, Sömmeringstraße","Berlin-Charlottenburg"],
 delaysports_815:["Berlin-Friedenau","Berlin-Friedenau"],
 // Leipzig (Anker: RBL/RB Arena)
 fcinternationalleipzig_892:["Leipzig-Probstheida","Leipzig-Probstheida"],
 // Neckarsulm (Anker: Sport-Union/Pichterich)
 tuerksporneckarsulm_979:["Neckarsulm-Amorbach","Neckarsulm"],
 // Leinfelden-Echterdingen (Anker: TV Echterdingen/Goldäcker)
 calcioleinfeldenechterdingen_970:["Leinfelden","Leinfelden"],
};
function geo(q){return new Promise(res=>{const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q='+encodeURIComponent(q);https.get(url,{headers:{'User-Agent':'bundesliga-coords/1.0'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{const j=JSON.parse(d);res(j[0]?{lat:+j[0].lat,lon:+j[0].lon,disp:j[0].display_name}:null);}catch(e){res(null);}});}).on('error',()=>res(null));});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fs=require('fs');
(async()=>{const out=[];for(const[id,[q,sn]]of Object.entries(Q)){const g=await geo(q);await sleep(DELAY);if(!g){out.push({id,q,sn,ok:false});console.log('FAIL',id,q);continue;}out.push({id,q,sn,neu:[g.lat,g.lon],disp:g.disp});console.log(`${id.padEnd(34)} ${g.lat.toFixed(4)},${g.lon.toFixed(4)}  ${(g.disp||'').slice(0,44)}  <- ${q}`);}
fs.writeFileSync(__dirname+'/destack2_review.json',JSON.stringify(out,null,1));console.log('\n-> destack2_review.json ('+out.length+')');})();
