"use strict";
(function(){
const el=id=>document.getElementById(id);
let lastCard=null;
const cards=[
 ["Runway inspection","Check the runway before the following turn"],
 ["Fuel disruption","Coordinate alternative fuel support on the following turn"],
 ["Communication outage","Request communications support on the following turn"],
 ["Host-nation access review","Recheck host-nation access on the following turn"],
 ["Maintenance alert","Inspect aircraft readiness on the following turn"],
 ["Medical surge","Review medical assistance on the following turn"]
];
function setup(){
 if(el("ops-controls"))return;
 const panel=document.createElement("section");panel.className="panel";panel.id="ops-controls";
 panel.innerHTML='<div class="eyebrow">LIVE BOARD CONTROLS / SIMULATED INSTRUCTOR</div><div class="hint">Click a FOS marker or aircraft marker on the board. Then prepare, fly, unload and return aircraft.</div><div id="ops-interactions"></div>';
 el("boardViewport").parentElement.after(panel);
 const st=document.createElement("style");st.textContent="#boardViewport .ops-pins{position:absolute;inset:0;pointer-events:none;z-index:10}#boardViewport .ops-pins button{position:absolute;pointer-events:auto;transform:translate(-50%,-50%);border:2px solid #ffd48c;background:#07324beb;color:#fff;font-size:12px;padding:8px;border-radius:12px;box-shadow:0 0 13px #1fe2ff90}#boardViewport .ops-pins button:hover{background:#2b7294}#ops-controls .ops-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:12px 0}#ops-controls .ops-chip{display:inline-block;margin:3px;padding:8px;border:1px solid #527e95;border-radius:8px;background:#092d43}#ops-controls button{min-height:45px}#ops-controls .ops-event{border-left:3px solid #ffd48c;padding:12px;background:#1b4258;margin:8px 0}";
 document.head.append(st);
}
function repairState(){
 if(!G)return;G.cards??=[];G.aircraft.forEach(p=>{p.base??="MOB";});
}
function chooseSite(i){
 siteIndex=i;station="MOB";tab="MOB";render();
}
function pins(){
 const view=el("boardViewport");view.querySelector(".ops-pins")?.remove();
 if(!G)return;
 const d=document.createElement("div");d.className="ops-pins";
 const pts=[[14,65,"MOB",null],[31,35,"FOS 1",0],[48,50,"FOS 2",1],[65,34,"FOS 3",2],[82,58,"FOS 4",3]];
 for(const [x,y,label,i] of pts){
  const b=document.createElement("button");b.textContent=label;b.style.left=x+"%";b.style.top=y+"%";
  b.onclick=e=>{e.stopPropagation();if(i!==null)chooseSite(i);else {station="MOB";tab="MOB";render();}};d.append(b);
 }
 G.aircraft.forEach((p,i)=>{
  const b=document.createElement("button");b.textContent="✈ "+p.name;b.style.left=(26+i*23)+"%";b.style.top="83%";
  b.onclick=e=>{e.stopPropagation();station="MOB";tab="MOB";render();};d.append(b);
 });
 view.append(d);
}
function prepare(id){
 if(G.phase!=="PLAN"){toast("Begin the planning phase first.");return;}
 const p=aircraft(id);
 if(p.status!=="AVAILABLE"||p.base!=="MOB"){toast(p.name+" is not at MOB and ready.");return;}
 if(G.home.pallet<2||G.home.team<1){toast("Not enough demonstration resources at MOB.");return;}
 const r={id:"ATO"+(++G.seq),plane:id,fos:siteIndex,status:"CLEARED",load:["pallet","pallet","team"],need:{pallet:2,team:1},alternate:"MOB",intent:"Deliver practice supplies",ppr:true,approved:true,simulated:true};
 G.home.pallet-=2;G.home.team--;G.requests.push(r);p.load=[...r.load];p.status="CLEARED";
 say("SIM CAOC cleared "+p.name+" to "+G.sites[siteIndex].name+" (practice configuration, not official ATO).","SIM GM");render();save();
}
function fly(){
 if(!G||G.phase!=="PLAN"){toast("Start planning first.");return;}
 const r=G.requests.find(r=>r.status==="CLEARED");
 if(!r){toast("Prepare an aircraft mission first.");return;}
 const p=aircraft(r.plane);G.phase="EXECUTION";render();
 flightAnimation(p.name+" outbound to "+G.sites[r.fos].name,()=>{
  const s=G.sites[r.fos];r.load.forEach(k=>s.stock[k]++);
  p.base=s.name;p.status="AT FOS";p.load=[];r.status="DONE";
  G.phase="REVIEW";
  say(p.name+" arrived at "+s.name+" and unloaded. Select RETURN AIRCRAFT for its flight home.","SIM CAOC");
  el("flightStatus").textContent=p.name+" ARRIVED AT "+s.name;render();save();
 });
}
function returnFlight(){
 if(busy)return;
 const p=G.aircraft.find(p=>p.status==="AT FOS");
 if(!p){toast("No aircraft is currently parked at a FOS.");return;}
 p.status="RETURNING";say(p.name+" launched return mission from "+p.base,"SIM CAOC");render();
 flightAnimation(p.name+" returning to MOB",()=>{
  p.base="MOB";p.status="AVAILABLE";p.load=[];
  say(p.name+" landed at MOB and is ready for another mission.","SIM CAOC");
  el("flightStatus").textContent=p.name+" RETURNED TO MOB";render();save();
 });
}
function issueRFI(){
 const s=G.sites[siteIndex];
 if(!s.rfis.length){toast("Select up to five RFIs first in the MOB station.");return;}
 const words=["Limited availability; verify with site lead.","Conditional host-nation capability.","Available for simulated planning.","Additional personnel or equipment required."];
 s.rfis.forEach((i,n)=>{s.responses[i]??="SIM GM: "+words[(i+n+siteIndex)%words.length]});
 say("SIM GM replied to selected RFIs at "+s.name,"SIM GM");render();save();
}
function approveTasks(){
 const s=G.sites[siteIndex];let count=0;
 for(const i of [...s.pending]){
  if((R.prerequisites[i]||[]).some(x=>!s.complete.includes(x)))continue;
  s.pending=s.pending.filter(x=>x!==i);s.complete.push(i);count++;
 }
 if(!count){toast("No ready tasks pending. Select FOS tasks first.");return;}
 say("SIM GM approved "+count+" task(s), subject to workbook cost and timing verification.","SIM GM");render();save();
}
function eventCard(){
 const team=prng(4),fos=prng(4),c=cards[prng(cards.length)-1];
 lastCard={team,fos,name:c[0],effect:c[1],turn:G.turn};G.cards.push(lastCard);
 say("SIM Event/Risk Card: "+c[0]+" assigned Team "+team+" at FOS "+fos+"; applies following turn.","SIM GM");render();save();
}
function panel(){
 const d=el("ops-interactions");if(!d||!G)return;
 let html='<div><b>SELECTED '+esc(G.sites[siteIndex].name)+'</b> · '+G.sites[siteIndex].stock.pallet+' pallets delivered · '+G.sites[siteIndex].complete.length+'/16 tasks</div><div>';
 G.aircraft.forEach(p=>{html+='<span class="ops-chip">✈ '+esc(p.name)+' · '+esc(p.status)+' @ '+esc(p.base)+'</span>';});
 html+='</div><h3>Aircraft mission controls</h3><div class="ops-actions">';
 G.aircraft.forEach(p=>{html+='<button data-opsplane="'+p.id+'" '+(G.phase==="PLAN"&&p.status==="AVAILABLE"&&p.base==="MOB"?"":"disabled")+'>PREPARE '+esc(p.name)+'</button>';});
 html+='<button id="ops-fly">▶ FLY APPROVED AIRCRAFT</button><button id="ops-return">↩ RETURN TO MOB</button></div><h3>Simulated instructor and cards</h3><div class="ops-actions"><button id="ops-rfi">ISSUE RFI RESULTS</button><button id="ops-approve">REVIEW FOS TASKS</button><button id="ops-event">🎴 DRAW EVENT/RISK CARD</button><button id="ops-next">ADVANCE TURN</button></div>';
 if(lastCard)html+='<div class="ops-event"><b>🎴 '+esc(lastCard.name)+'</b><p>'+esc(lastCard.effect)+'</p><small>Team '+lastCard.team+' / FOS '+lastCard.fos+' / Turn '+lastCard.turn+'</small></div>';
 d.innerHTML=html;
 d.querySelectorAll("[data-opsplane]").forEach(b=>b.onclick=()=>prepare(b.dataset.opsplane));
 d.querySelector("#ops-fly").onclick=fly;
 d.querySelector("#ops-return").onclick=returnFlight;
 d.querySelector("#ops-rfi").onclick=issueRFI;
 d.querySelector("#ops-approve").onclick=approveTasks;
 d.querySelector("#ops-event").onclick=eventCard;
 d.querySelector("#ops-next").onclick=()=>advance();
}
const originalRender=render;
render=function(){if(!G)return;repairState();originalRender();setup();pins();panel();};
const originalStart=start;
start=function(){originalStart();if(G)render();};
const originalResume=resume;
resume=function(){originalResume();if(G)render();};
const originalAdvance=advance;
advance=function(){
 if(!G||busy)return;
 if(G.phase==="PLAN"&&G.requests.some(r=>r.status==="CLEARED")){fly();return;}
 originalAdvance();
};
el("launch").onclick=()=>start();
el("resume").onclick=()=>resume();
el("advance").onclick=()=>advance();
})();