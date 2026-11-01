"use strict";
/* OPS guided-play expansion. Computer responses are simulated training behavior. */
(function(){
 const g=id=>document.getElementById(id);
 const phases=[
  {title:"1 · Review your orders",info:"The mission always begins with orders and access. Select the BRIEF tab.",test:()=>G?.review.orders&&G?.review.access,act:()=>{tab="BRIEF";render();}},
  {title:"2 · Enter planning",info:"Click BEGIN PLANNING in Mission Control. This unlocks aircraft planning.",test:()=>G?.phase==="PLAN"||G?.turn>1,act:()=>{tab="BRIEF";render();}},
  {title:"3 · Select a FOS on the map",info:"Use the FOS markers directly on the live board. Your destination is highlighted in the workbench.",test:()=>learn.site,act:()=>{station="MOB";tab="MOB";render();}},
  {title:"4 · Prepare an aircraft",info:"Select PREPARE C-130/C-17/C-5 in Live Board Controls. The computer CAOC clears a practice mission.",test:()=>G?.requests.some(r=>r.status==="CLEARED"||r.status==="DONE"),act:()=>{station="MOB";tab="MOB";render();}},
  {title:"5 · Fly the mission",info:"Click FLY APPROVED AIRCRAFT and watch the real state update on arrival.",test:()=>G?.requests.some(r=>r.status==="DONE"),act:()=>{g("ops-fly")?.scrollIntoView({block:"center",behavior:"smooth"});}},
  {title:"6 · Return the aircraft",info:"Click RETURN TO MOB. When it lands, you can reuse the same aircraft on another mission.",test:()=>G?.requests.some(r=>r.status==="DONE")&&G?.aircraft.some(p=>p.base==="MOB"&&p.status==="AVAILABLE"),act:()=>g("ops-return")?.scrollIntoView({block:"center",behavior:"smooth"})}
 ];
 const learn={on:false,step:0,site:false,mode:""};
 function install(){
  if(g("ops-game-mode"))return;
  const panel=document.createElement("section");panel.className="panel";panel.id="ops-game-mode";
  panel.innerHTML='<div class="eyebrow">TRAINING SIMULATOR MODES</div><div class="ops-modebuttons"><button id="ops-learn">🎓 LEARN ON LIVE BOARD</button><button id="ops-computer">🎮 PLAY THE COMPUTER</button><button id="ops-regular">⚙ FREE PLAY</button></div><div id="ops-tutorial" class="hint"></div><div id="ops-computer-report"></div>';
  g("boardViewport").closest(".panel").before(panel);
  const styles=document.createElement("style");styles.textContent='#ops-game-mode .ops-modebuttons{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}#ops-game-mode button{min-height:48px}#ops-tutorial{margin:12px 0}#ops-game-mode .ops-progress{height:8px;background:#12334a;border-radius:9px;overflow:hidden;margin:10px 0}#ops-game-mode .ops-progress span{height:100%;display:block;background:#ffd48c;transition:width .3s}#ops-computer-report{line-height:1.6;font-size:12px}#ops-game-mode .ops-modebuttons button.active{background:#876034;border-color:#ffd48c}@media(max-width:550px){#ops-game-mode .ops-modebuttons{grid-template-columns:1fr}}';
  document.head.append(styles);
  g("ops-learn").onclick=()=>begin("tutorial");
  g("ops-computer").onclick=()=>begin("computer");
  g("ops-regular").onclick=()=>begin("free");
  g("ops-tutorial").addEventListener("click",e=>{
   if(e.target.id==="ops-tutorial-go")phases[learn.step].act();
   if(e.target.id==="ops-tutorial-next"){learn.step=Math.min(phases.length-1,learn.step+1);show();}
  });
 }
 function begin(mode){
  learn.on=mode==="tutorial";learn.mode=mode;learn.step=0;learn.site=false;
  if(G){G.ai=mode!=="free";say("Simulator mode selected: "+mode.toUpperCase(),"SIM GM");save();}
  show();
 }
 function show(){
  install();
  ["ops-learn","ops-computer","ops-regular"].forEach((id,i)=>{
   g(id).classList.toggle("active",learn.mode===["tutorial","computer","free"][i]);
  });
  const help=g("ops-tutorial");
  if(!G){
   help.textContent="Choose GAME 1 or GAME 2, then click ENTER OPS to begin. You can start the live tutorial afterward.";
   return;
  }
  if(learn.on){
   while(learn.step<phases.length-1&&phases[learn.step].test())learn.step++;
   const s=phases[learn.step],done=s.test();
   help.innerHTML='<b>'+s.title+'</b><p>'+s.info+'</p><div class="ops-progress"><span style="width:'+((learn.step+(done?1:0))/phases.length*100)+'%"></span></div><button id="ops-tutorial-go">SHOW ME WHERE</button> '+(done?'<button id="ops-tutorial-next">NEXT STEP</button>':'');
  }else if(learn.mode==="computer"){
   help.innerHTML='<b>COMPUTER CHALLENGE ACTIVE</b><p>Complete deliveries, build FOS capability and manage aircraft returns. The computer generates changing mission conditions and support responses between turns.</p>';
  }else help.innerHTML='<b>FREE PLAY</b><p>Operate the board and aircraft freely. Simulated instructor controls remain in the Live Board Controls panel.</p>';
  const report=g("ops-computer-report");
  if(learn.mode==="computer"){
   const done=G.requests.filter(r=>r.status==="DONE").length;
   const tasks=G.sites.reduce((a,s)=>a+s.complete.length,0);
   const lost=G.aircraft.filter(p=>p.status==="LOST").length;
   report.innerHTML='<b>MISSION SCORE</b> · '+(done*25+tasks*10-lost*30)+' points · '+done+' deliveries · '+tasks+' tasks · turn '+G.turn+'<br><small>Training score, not official OPS scoring.</small>';
  }else report.textContent="";
 }
 const priorRender=render;
 render=function(){
  priorRender();if(!G)return;
  install();show();
 };
 const oldSite=site;
 site=function(i){learn.site=true;oldSite(i);};
 // Site markers in enhanced module use direct siteIndex assignment, so capture marker clicks too.
 document.addEventListener("click",e=>{if(e.target.closest(".ops-pins button")&&/FOS [1-4]/.test(e.target.textContent)){learn.site=true;setTimeout(show,0);}});
 const oldAdvance=advance;
 advance=function(){
  const prev=G?.turn;
  oldAdvance();
  if(G&&learn.mode==="computer"&&G.turn>prev){
   const selections=["Rain reduces ramp operations","Host-nation requests a logistics update","Communications check required","Fuel convoy arrives late"];
   const item=selections[prng(selections.length)-1];
   say("COMPUTER TURN "+G.turn+": "+item+". Review operational priorities.","SIM COMPUTER");
   if(G.support.SPACE==="REQUESTED")G.support.SPACE="COMPLETE";
   if(G.support.MEDCOM==="REQUESTED")G.support.MEDCOM="COMPLETE";
   save();render();
  }
 };
 // The game defines button handlers at script load; rebind after wrapping.
 g("advance").onclick=()=>advance();
 window.addEventListener("load",()=>{if(G){install();show();}});
})();
