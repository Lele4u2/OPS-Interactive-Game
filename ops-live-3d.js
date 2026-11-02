"use strict";
(function(){
/* OPS live 3D table: adds a real WebGL tabletop without changing mission scoring. */
const is3D = new URLSearchParams(location.search).get("view")==="3d";
const API = () => window.OPS_DEBUG;
const rules = window.OPS_RULES || {};
const RFIS = rules.RFIs || ["Crash Fire Rescue","Mobility Support","Ramp Space","Air Traffic Control","Equipment","Bed Down","Fuel","Airfield Security","Host Nation Support","Medical Capability"];
const TASKS = rules.tasks || [];
const BOARD_ASSETS={
 MOB:{label:"MOB / FOUR AIRFIELDS",paths:["MOB Board X4.png","assets/boards/mob_loadout_board.png"]},
 CAOC:{label:"CAOC / AIR OPERATIONS",paths:["CAOC Board.png","assets/boards/caoc_board.png"]},
 SPACE:{label:"CSPOC / SPACE SUPPORT",paths:["CSPOC Board.png","assets/boards/cspoc_board.png"]},
 MEDCOM:{label:"MEDCOM / MEDICAL COMMAND",paths:["MEDCOM MOB x4.png","assets/boards/medcom_board.png"]},
 LOADOUT:{label:"MOB / AIRCRAFT LOADOUT",paths:["Load Planner.png","LOAD Board.png","assets/boards/mob_loadout_board.png","MOB Board X4.png"]}
};
let boardType="MOB",boardTicket=0,boardSource="",stationChoice=0;
const text = (s) => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let overlay=null, canvas=null, three=null, selected=0, mode="rfi", revealed=new Set(), currentTurn=0, scenes=null, look={yaw:.48,pitch:.93,zoom:14}, targetRot=0, raf=0, bannerTimer=0, mouseDown=null,sceneState=null,lastStateAt=0,announcedOutcome="";
const styles = [
"#ops3d-open{position:fixed;right:16px;bottom:20px;z-index:900;border:2px solid #ad98ff;background:#281d55;color:white;padding:14px 19px;border-radius:15px;box-shadow:0 0 24px #8c68ff66;font:800 14px system-ui;cursor:pointer}",
"#ops3d{position:fixed;inset:0;z-index:2000;color:#f5f2ff;background:#080910f6;font:14px/1.45 system-ui;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}",
"#ops3d *{box-sizing:border-box}#ops3d button{font:inherit;color:inherit;border:1px solid #5a5574;background:#222538;border-radius:10px;padding:9px 12px;cursor:pointer}",
"#ops3d button:hover{border-color:#b69cff;background:#3a305e}#ops3d button:focus-visible{outline:3px solid #b39cff;outline-offset:2px}",
"#ops3d .top{padding:12px 18px;border-bottom:1px solid #35314a;background:linear-gradient(90deg,#151522,#28204d);display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}",
"#ops3d-board-select{background:#211b38;border:2px solid #9483cc;border-radius:9px;color:#fff;padding:9px;font:700 13px system-ui;max-width:230px}#ops3d .board-source{font-size:12px;font-weight:700;color:#c4e2f1;border:1px solid #575078;border-radius:10px;padding:8px;margin:8px 0;background:#26243b}#ops3d .board-source.warn{color:#ffd5a4;border-color:#ba8543;background:#403321}",
"#ops3d .station-actions{display:grid;gap:8px;margin:10px 0}#ops3d .station-actions button{min-height:41px;text-align:left}#ops3d .station-actions button.selected{background:#49337a;border-color:#c0a1ff}#ops3d .station-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}#ops3d .board-hidden{display:none!important}",
"#ops3d h2{font-size:19px;margin:0;letter-spacing:.08em}#ops3d h3{font-size:16px;margin:4px 0 10px}#ops3d small{color:#bbb5d8}",
"#ops3d .stage{min-height:0;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.8fr)}",
"#ops3d .view{min-height:0;position:relative;background:radial-gradient(circle at 50% 40%,#20233c,#080a12 73%);overflow:hidden}",
"#ops3d canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}",
"#ops3d .view:active canvas{cursor:grabbing}",
"#ops3d .hint{position:absolute;left:14px;bottom:13px;border:1px solid #50466a;border-radius:12px;background:#0f1025d9;padding:8px 12px;font-size:12px;pointer-events:none;max-width:78%}",
"#ops3d .tools{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:6px}#ops3d .tools button{background:#111422d9}",
"#ops3d .side{overflow:auto;min-height:0;background:#131422;border-left:1px solid #4a4764;padding:16px}",
"#ops3d .location{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:10px 0}#ops3d .location button.active{border-color:#44dfff;color:#44dfff;background:#12364a}",
"#ops3d .modes{display:flex;gap:6px;margin:10px 0}#ops3d .modes button.active{background:#4d3178;border-color:#c3a8ff}",
"#ops3d .deck{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:4px 0 12px}",
"#ops3d .face{height:104px;border:1px solid #bda7ff!important;border-radius:12px!important;background:linear-gradient(135deg,#3c2b7a,#181d4c)!important;box-shadow:0 6px 0 #08091a,0 10px 22px #0009;display:grid;place-items:center;text-align:center;transition:transform .25s ease}",
"#ops3d .face:hover{transform:translateY(-4px) rotateY(6deg)}#ops3d .face.known{background:linear-gradient(130deg,#25434c,#172434)!important;border-color:#64d5ed!important;animation:opsCardFlip .65s ease both}@keyframes opsCardFlip{0%{transform:rotateY(90deg) scale(.92);filter:brightness(2)}65%{transform:rotateY(-12deg) scale(1.04)}100%{transform:rotateY(0deg) scale(1)}}",
"#ops3d .face b{font-size:22px;display:block}#ops3d .face span{font-size:12px}#ops3d .score{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}",
"#ops3d .score>div{padding:9px;background:#1f2132;border-radius:10px;border:1px solid #393a55}#ops3d .score b{font-size:18px;display:block}",
"#ops3d .detail{border:1px solid #69608f;padding:13px;border-radius:14px;background:#1e1b33;margin:12px 0;min-height:82px}",
"#ops3d .detail strong{color:#dcceff}#ops3d .cta{width:100%;background:#613ad0!important;border-color:#ad92ff!important;font-weight:800!important}",
"#ops3d .warning{color:#ffb3bb;background:#3e1a2a;padding:8px 11px;border:1px solid #a95369;border-radius:10px;margin:9px 0}#ops3d-alert:not(:empty){color:#fff;background:#67223c;border:2px solid #ff8397;border-radius:12px;padding:12px;font-weight:800;margin-bottom:12px;animation:opsAlertPulse .65s infinite alternate}@keyframes opsAlertPulse{from{box-shadow:0 0 7px #eb4c7355}to{box-shadow:0 0 28px #f04778dd}}",
"#ops3d .live{font-size:12px;color:#b7c9d7}#ops3d .foot{font-size:11px;color:#a4a4bd;margin-top:14px;border-top:1px solid #393b50;padding-top:9px}#ops3d .obj{display:grid;gap:5px;margin:12px 0}#ops3d .obj>div{font-size:12px;padding:7px;border-radius:7px;border:1px solid #4a4567;background:#22203a}#ops3d .obj .done{border-color:#4ecfa0;color:#bcffe4;background:#183d35}",
"@media(max-width:900px){#ops3d .stage{grid-template-columns:1fr;grid-template-rows:minmax(320px,46vh) minmax(0,1fr)}#ops3d .side{border-left:0;border-top:1px solid #4a4764}#ops3d .top h2{font-size:15px}}"
].join("\n");
let style=document.createElement("style");style.textContent=styles;document.head.appendChild(style);
const openButton=document.createElement("button");openButton.id="ops3d-open";openButton.type="button";openButton.textContent="◈ OPEN 3D OPS BOARD";
openButton.addEventListener("click",open);document.body.appendChild(openButton);
function getState(){try{return API()?.getState?.()||null}catch(e){return null}}
function notify(message){if(!overlay)return;let el=overlay.querySelector("#ops3d-alert");if(!el)return;el.textContent=message;el.classList.remove("hidden");clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{if(el)el.textContent=""},4500)}
function q(id){return overlay?.querySelector(id)}
function chooseSite(i){
 selected=Math.max(0,Math.min(3,Number(i)||0));revealed.clear();update();
 try{API()?.invoke?.("select-site",{index:String(selected),clientSite:selected})}catch(e){notify(e.message)}
}
function open(){
 if(overlay){overlay.style.display="grid";update();return}
 if(!getState()){try{if(localStorage.getItem("OPS_COMMAND_SIM_V4"))API()?.resume?.()}catch(e){}if(!getState()&&API()?.start){API().start("tutorial","cadet")} }
 overlay=document.createElement("div");overlay.id="ops3d";
 overlay.innerHTML='<header class="top"><div><h2>OPERATION PACIFIC SHIELD <span style="color:#bbaaff">/ INTERACTIVE 3D TABLE</span></h2><small>Click an airfield. Flip a facedown RFI or task card. Make the decision on the same screen.</small></div><div style="display:flex;gap:7px"><label style="display:flex;gap:6px;align-items:center">BOARD <select id="ops3d-board-select" aria-label="Select original OPS game board"><option value="MOB">MOB / AIRFIELDS</option><option value="CAOC">CAOC</option><option value="SPACE">CSpOC</option><option value="MEDCOM">MEDCOM</option><option value="LOADOUT">LOADOUT</option></select></label><button id="ops3d-help" type="button">HOW TO PLAY</button><button id="ops3d-endturn" type="button">END TURN →</button><button id="ops3d-close" type="button">RETURN TO 2D ✕</button></div></header><div class="stage"><section class="view"><canvas id="ops3d-canvas" aria-label="3D tabletop with four interactive airfields"></canvas><div class="tools"><button id="ops3d-left">↶</button><button id="ops3d-reset">⌂</button><button id="ops3d-right">↷</button><button id="ops3d-plus">＋</button><button id="ops3d-minus">−</button></div><div class="hint">Drag to rotate · Scroll to zoom · Click an illuminated FOS model to inspect it<br><span id="ops3d-renderer">Loading 3D renderer…</span></div></section><aside class="side"><div id="ops3d-alert" role="alert"></div><div id="ops3d-live" class="live"></div><div id="ops3d-board-status" class="board-source" role="status">Loading original board image…</div><div class="location" id="ops3d-locations"></div><h3 id="ops3d-site-title">Choose an airfield</h3><div class="score" id="ops3d-score"></div><h3>MISSION OBJECTIVES / ENDEX</h3><div class="obj" id="ops3d-objectives"></div><div class="modes"><button data-ops-mode="rfi" class="active">🎴 RFI CARDS</button><button data-ops-mode="task">🛠 TASK CARDS</button><button data-ops-mode="event">⚠ EVENT / RISK</button></div><div class="deck" id="ops3d-deck"></div><div class="station-actions board-hidden" id="ops3d-station-actions"></div><div class="detail" id="ops3d-detail" aria-live="polite">Click a card to turn it over and learn what it is.</div><div class="foot">Practice visualization. Game state, mission scoring and approvals are handled by the existing OPS simulator. Exercise-specific restrictions require instructor verification.</div></aside></div>';
 document.body.appendChild(overlay);canvas=q("#ops3d-canvas");
 q("#ops3d-close").onclick=close;
 q("#ops3d-board-select").value=boardType;
 q("#ops3d-board-select").onchange=e=>switchBoard(e.target.value);
 q("#ops3d-endturn").onclick=()=>{
   const before=getState();if(!before)return;
   if(!before.events.some(x=>x.turn===before.turn)){mode="event";update();notify("⚠ POSSIBLE LIMFAC: Draw Event and Risk cards before End Turn.");return}
   if(!confirm("End Turn "+before.turn+"? The GM will review task deadlines, food/water and LIMFAC penalties. Continue?"))return;
   API()?.invoke?.("end-turn");const after=getState();update();
   notify(after?.turn>before.turn?"Turn "+before.turn+" complete. Training Day "+after.turn+" started.":"End Turn blocked. Review mission tasks.");
 };
 q("#ops3d-help").onclick=()=>notify("1. Choose MOB, CAOC, CSpOC, MEDCOM or LOADOUT. 2. Click physical board tokens or numbered RFI/task cards. 3. Confirm LIMFAC warnings. 4. Finish the Event/Risk draw before End Turn.");
 q("#ops3d-left").onclick=()=>look.yaw-=.22;
 q("#ops3d-right").onclick=()=>look.yaw+=.22;
 q("#ops3d-reset").onclick=()=>{look={yaw:.48,pitch:.93,zoom:14};};
 q("#ops3d-plus").onclick=()=>look.zoom=Math.max(8,look.zoom-1.3);
 q("#ops3d-minus").onclick=()=>look.zoom=Math.min(24,look.zoom+1.3);
 q("#ops3d-locations").onclick=e=>{const b=e.target.closest("[data-fos]");if(b)chooseSite(b.dataset.fos)};
 q(".modes").onclick=e=>{const b=e.target.closest("[data-ops-mode]");if(b){mode=b.dataset.opsMode;revealed.clear();update()}};
 q("#ops3d-deck").onclick=e=>{const b=e.target.closest("[data-card]");if(b)flip(b.dataset.card)};
 q("#ops3d-station-actions").onclick=e=>{const b=e.target.closest("[data-ops3d]");if(b)runStationAction(b.dataset.ops3d,b.dataset)};
 canvas.addEventListener("pointerdown",e=>{mouseDown={x:e.clientX,y:e.clientY,old:look.yaw,pitch:look.pitch};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener("pointermove",e=>{if(!mouseDown)return;look.yaw=mouseDown.old+(e.clientX-mouseDown.x)*.008;look.pitch=Math.max(.45,Math.min(1.35,mouseDown.pitch-(e.clientY-mouseDown.y)*.005))});
 canvas.addEventListener("pointerup",e=>{if(!mouseDown)return;const dist=Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y);mouseDown=null;if(dist<8)hit(e.clientX,e.clientY)});
 canvas.addEventListener("wheel",e=>{e.preventDefault();look.zoom=Math.max(8,Math.min(24,look.zoom+(e.deltaY>0?1:-1)))},{passive:false});
 document.addEventListener("keydown",escape);
 window.addEventListener("resize",resize);
 update();initRenderer();if(!raf)draw();
}
function close(){if(overlay)overlay.style.display="none"}
function escape(e){if(e.key==="Escape"&&overlay?.style.display!=="none")close()}
function flip(raw){
 const i=Number(raw),s=getState();if(!s)return notify("Start a mission first");
 revealed.add(mode+":"+selected+":"+i);
 const f=s.sites[selected];const box=q("#ops3d-detail");
 if(mode==="rfi"){
  const done=f.rfis.includes(i);box.innerHTML='<strong>RFI '+(i+1)+': '+text(RFIS[i])+'</strong><p>Airfield assessment question. Ask the simulated instructor to verify this capability; official site details depend on exercise source data.</p><p>'+ (done?"✅ ANSWER RECEIVED":"◯ NOT YET ANSWERED")+'</p><button id="ops3d-act" class="cta" type="button" '+(done?"disabled":"")+'>'+(done?"ALREADY ANSWERED":"REQUEST THIS RFI RESPONSE")+'</button>';
  const btn=q("#ops3d-act");if(btn&&!done)btn.onclick=()=>act("rfi",{index:String(i),clientSite:selected},"RFI requested. Check the response and mission points.");
 }else if(mode==="task"){
  const done=f.tasks.includes(i),pend=(f.pending||[]).some(x=>x.i===i),needs=rules.prerequisites?.[i]||[];
  const gaps=[];if(f.people<5)gaps.push("No MRA personnel at this FOS");
  for(const n of needs)if(!f.tasks.includes(n))gaps.push("Complete Task "+(n+1)+" first");
  box.innerHTML='<strong>TASK '+(i+1)+': '+text(TASKS[i])+'</strong><p>'+(done?"✅ COMPLETED":pend?"⌛ UNDERWAY":"◯ NOT YET STARTED")+'</p>'+(gaps.length?'<div class="warning">⚠ POSSIBLE LIMFAC: '+gaps.map(text).join("; ")+'</div>':"")+'<button id="ops3d-act" class="cta" type="button" '+(done||pend?"disabled":"")+'>'+(done?"COMPLETED":pend?"IN PROGRESS":"REQUEST TASK START")+'</button>';
  const btn=q("#ops3d-act");if(btn&&!done&&!pend)btn.onclick=()=>{if(gaps.length&&!confirm("Possible LIMFAC: "+gaps.join("; ")+". Continue and let the simulator validate?"))return;act("board-start-task",{index:String(i),clientSite:selected},"Task submitted. Check the site and GM feedback.")};
 }else{
  const already=(s.events||[]).some(x=>x.turn===s.turn);
  const c=i===0?"EVENT":"RISK";
  box.innerHTML='<strong>'+c+' CARD</strong><p>'+ (already?"This turn’s Event/Risk cards were already drawn.":"The practice GM draws one Event and one Risk card. D4 results determine team and FOS. Consequences apply next turn.")+'</p><button id="ops3d-act" class="cta" type="button" '+(already?"disabled":"")+'>'+(already?"ALREADY DRAWN":"DRAW / REVEAL BOTH CARDS")+'</button>';
  const btn=q("#ops3d-act");if(btn&&!already)btn.onclick=()=>act("cards",{},"Event/Risk cards drawn. Review the game log and next-turn consequences.");
 }
 updateCards();
}
function act(action,data,message){try{const before=getState(),n=Number(data.index||0);API()?.invoke?.(action,data);const after=getState();let succeeded=true;if(action==="rfi")succeeded=!!after?.sites?.[selected]?.rfis?.includes(n)&&!before?.sites?.[selected]?.rfis?.includes(n);if(action==="board-start-task")succeeded=!!after?.sites?.[selected]?.pending?.some(p=>p.i===n)&&!before?.sites?.[selected]?.pending?.some(p=>p.i===n);if(action==="cards")succeeded=!!after?.events?.some(x=>x.turn===after.turn)&&!before?.events?.some(x=>x.turn===before.turn);if(!succeeded){notify("⚠ POSSIBLE LIMFAC: Action not approved. Check missing personnel, prerequisites or an existing task. Your mission has not advanced.");return}notify(message);update();if(mode!=="event"){flip(data.index||0)}else{const state=getState();const draw=state?.events?.find(x=>x.turn===state.turn);if(draw){q("#ops3d-detail").innerHTML="<strong>🎴 CARDS REVEALED — TURN "+draw.turn+"</strong><p><b>EVENT:</b> "+text(draw.event?.name)+" — "+text(draw.event?.body)+"</p><p><b>RISK:</b> "+text(draw.risk?.name)+" — "+text(draw.risk?.body)+"</p><div class=\"warning\">⚠ TEAM "+draw.team+" · "+text(state.sites[draw.fos]?.name)+" · CONSEQUENCES NEXT TURN</div>";}else flip("0")}}catch(e){notify("Action failed: "+e.message)}}
function updateCards(){
 const box=q("#ops3d-deck");if(!box)return;const s=getState();if(!s)return;
 let count=mode==="rfi"?10:mode==="task"?16:2;const f=s.sites[selected];let html="";
 for(let i=0;i<count;i++){
  const known=revealed.has(mode+":"+selected+":"+i);
  const done=mode==="rfi"?f.rfis.includes(i):mode==="task"?f.tasks.includes(i):false;
  const label=mode==="rfi"?RFIS[i]:mode==="task"?TASKS[i]:i===0?"EVENT CARD":"RISK CARD";
  html+='<button type="button" data-card="'+i+'" class="face '+(known||done?"known":"")+'" aria-label="'+text((known||done)?label:"Reveal facedown card "+(i+1))+'">'+(known||done?'<span> '+(done?"✓ ":"")+"<b>"+(i+1)+"</b>"+text(label)+'</span>':'<span><b>?</b>FLIP CARD '+(i+1)+'</span>')+'</button>';
 }
 if(box.innerHTML!==html)box.innerHTML=html;
}
function update(){
 const s=getState();if(!overlay||!s)return;sceneState=s;lastStateAt=0;
 if(s.finished&&s.outcome!==announcedOutcome){announcedOutcome=s.outcome||"INCOMPLETE";q("#ops3d-detail").innerHTML='<h2 style="color:'+(s.outcome==="WIN"?"#9bf2ca":"#ff9aa9")+'">ENDEX — '+(s.outcome==="WIN"?"YOU WIN THE BATTLE!":"MISSION NOT ACCOMPLISHED")+'</h2><p>Review the mission objectives above and your After-Action Review on the main OPS screen.</p>';notify(s.outcome==="WIN"?"🏆 ENDEX — YOU WIN THE BATTLE!":"⚠ ENDEX — MISSION NOT ACCOMPLISHED");}
 if(currentTurn!==s.turn){currentTurn=s.turn;revealed.clear()}
 q("#ops3d-live").textContent="TRAINING DAY / TURN "+s.turn+" • "+s.mode.toUpperCase()+" • "+s.mp+" MP • "+s.dp+" DP";
 const isMOB=boardType==="MOB";q("#ops3d-locations").classList.toggle("board-hidden",!isMOB);q("#ops3d-site-title").classList.toggle("board-hidden",!isMOB);q("#ops3d-score").classList.toggle("board-hidden",!isMOB);q("#ops3d-deck").classList.toggle("board-hidden",!isMOB);q(".modes").classList.toggle("board-hidden",!isMOB);q("#ops3d-station-actions").classList.toggle("board-hidden",isMOB);
 if(!isMOB)renderStationActions(s);
 const progress=API()?.practiceChecklist?.()||[];const obj=q("#ops3d-objectives");
 if(obj)obj.innerHTML=progress.map(g=>'<div class="'+(g.done>=g.target?"done":"")+'">'+(g.done>=g.target?"✓":"◯")+" "+text(g.name)+" — "+g.done+"/"+g.target+"</div>").join("");
 const f=s.sites[selected];q("#ops3d-site-title").textContent=f.name+" / "+f.country+" — SITE "+(selected+1);
 q("#ops3d-locations").innerHTML=s.sites.map((a,i)=>'<button type="button" data-fos="'+i+'" class="'+(selected===i?"active":"")+'">FOS '+a.id+' <small>'+a.rfis.length+'/10 RFIs · '+a.tasks.length+'/16 tasks</small></button>').join("");
 q("#ops3d-score").innerHTML='<div><small>PERSONNEL</small><b>'+f.people+'</b></div><div><small>RFIs</small><b>'+f.rfis.length+'/10</b></div><div><small>TASKS</small><b>'+f.tasks.length+'/16</b></div>';
 q(".modes").querySelectorAll("[data-ops-mode]").forEach(b=>b.classList.toggle("active",b.dataset.opsMode===mode));
 updateCards();
}

function statusBoard(label,missing=false){
 boardSource=label;const element=q("#ops3d-board-status");
 if(element){element.textContent=label;element.classList.toggle("warn",missing)}
}
function boardFallback(T,type){
 const sheet=document.createElement("canvas");sheet.width=1024;sheet.height=768;
 const ctx=sheet.getContext("2d");if(!ctx)return null;
 ctx.fillStyle="#0d1927";ctx.fillRect(0,0,1024,768);
 ctx.lineWidth=1;ctx.strokeStyle="#375777";
 for(let x=0;x<=1024;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,768);ctx.stroke()}
 for(let y=0;y<=768;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke()}
 ctx.strokeStyle="#a78aff";ctx.lineWidth=12;ctx.strokeRect(18,18,988,732);
 ctx.fillStyle="#f5ecff";ctx.font="bold 62px system-ui";ctx.textAlign="center";
 ctx.fillText("OPERATION PACIFIC SHIELD",512,290);
 ctx.fillStyle="#c9aefc";ctx.font="bold 48px system-ui";
 ctx.fillText((BOARD_ASSETS[type]||BOARD_ASSETS.MOB).label,512,365);
 ctx.fillStyle="#ffcb98";ctx.font="28px system-ui";ctx.fillText("ORIGINAL IMAGE NOT AVAILABLE",512,438);
 ctx.fillStyle="#b8d6e8";ctx.font="24px system-ui";ctx.fillText("Training grid — live game controls remain active",512,504);
 const tex=new T.CanvasTexture(sheet);tex.needsUpdate=true;return tex;
}
function applyBoardTexture(tex,type,missing=false,filename=""){
 if(!three||type!==boardType){tex?.dispose?.();return}
 const {T,boardSurface}=three;const image=tex.image;
 const iw=image?.width||1024,ih=image?.height||768,ratio=iw/ih;
 const maxW=10.65,maxH=7.75;let w=maxW,h=maxW/ratio;
 if(h>maxH){h=maxH;w=h*ratio}
 boardSurface.geometry.dispose();boardSurface.geometry=new T.PlaneGeometry(w,h);
 boardSurface.material.map?.dispose?.();boardSurface.material.map=tex;
 boardSurface.material.needsUpdate=true;
 boardSurface.rotation.x=-Math.PI/2;boardSurface.position.y=.058;
 statusBoard(missing?"⚠ "+(BOARD_ASSETS[type].label)+": source image unavailable. Tactical fallback active.":"✓ Original board image loaded: "+filename,missing);
}
function loadBoardTexture(type){
 boardType=BOARD_ASSETS[type]?type:"MOB";if(!three)return;
 const ticket=++boardTicket,{T}=three,candidates=BOARD_ASSETS[boardType].paths;
 statusBoard("Loading "+BOARD_ASSETS[boardType].label+" board image…");
 const loader=new T.TextureLoader();
 let idx=0;
 const attempt=()=>{
  if(ticket!==boardTicket)return;
  if(idx>=candidates.length){const tex=boardFallback(T,boardType);if(tex)applyBoardTexture(tex,boardType,true);else statusBoard("⚠ Board image unavailable; training board remains interactive.",true);return}
  const path=candidates[idx++];
  loader.load(encodeURI(path),tex=>{
   if(ticket!==boardTicket){tex.dispose();return}
   tex.encoding=T.sRGBEncoding||tex.encoding;
   tex.anisotropy=Math.min(8,three.renderer.capabilities?.getMaxAnisotropy?.()||1);
   applyBoardTexture(tex,boardType,false,path);
  },undefined,()=>attempt());
 };
 attempt();
}

const MED_TASKS=["Blood Support","Battlefield Surgery","Triage Team","Battlefield Hospital","Delayed Bedspace","Medic Response","Minimal Care","Minimal Bedspace","Flight Surgeon","Flight Nurse","Medical Service Corp","Aeromedical Supply","Mortuary Affairs","Mortuary Services","Medical Logistics","War Reserve Material"];
const CARGO_ITEMS=[["people","5-person MRA team"],["forklift","Forklift"],["fuel","Fuel"],["food","Food / Water"],["ammo","Bomb"],["missile","Missile"]];
function openStationMarker(type,index){
 if(type!==boardType)switchBoard(type);
 stationChoice=Math.max(0,Number(index)||0);
 const s=getState();if(!s)return;
 if(type==="CAOC"||type==="LOADOUT"){const aircraft=s.fleet[stationChoice];if(aircraft)API()?.invoke?.("select-plane",{plane:aircraft.id,clientPlane:aircraft.id})}
 if(type==="SPACE"){const sat=s.satellites?.[stationChoice];if(sat)API()?.invoke?.("board-satellite",{id:sat.id})}
 if(type==="MEDCOM")API()?.invoke?.("med-board",{index:String(stationChoice)});
 const after=getState();if(after)renderStationActions(after);
}
function runStationAction(action,d){
 const before=getState();if(!before)return;
 const plane=before.fleet?.[stationChoice];
 if(action==="plane"){stationChoice=Number(d.index)||0;openStationMarker(boardType,stationChoice);return}
 if(action==="site"){chooseSite(Number(d.index));renderStationActions(getState());return}
 if(action==="board"){switchBoard(d.id);return}
 if(action==="cargo"){API()?.invoke?.("cargo",{id:d.id,step:d.step});update();return}
 if(action==="plan"||action==="dispatch"||action==="return"){if(!plane)return notify("Choose an aircraft first.");if(before.selectedPlane!==plane.id)API()?.invoke?.("select-plane",{plane:plane.id,clientPlane:plane.id});const prior=getState();API()?.invoke?.(action);const after=getState();const valid=action==="plan"?after?.fleet?.[stationChoice]?.status==="PLANNED":action==="dispatch"?after?.fleet?.[stationChoice]?.status==="FLYING":after?.fleet?.[stationChoice]?.status==="RETURNING";if(!valid&&after?.fleet?.[stationChoice]?.status===prior?.fleet?.[stationChoice]?.status)notify("⚠ POSSIBLE LIMFAC: Mission action did not proceed. Check aircraft status, destination access, prerequisites and inventory.");update();return}
 if(action==="sat"){stationChoice=Number(d.index)||0;openStationMarker("SPACE",stationChoice);return}
 if(action==="sat-support"){const sat=before.satellites?.[stationChoice];if(!sat)return notify("Select satellite");API()?.invoke?.("sat-support",{id:sat.id});update();return}
 if(action==="med-board"){stationChoice=Number(d.index)||0;API()?.invoke?.("med-board",{index:String(stationChoice)});update();return}
 if(action==="med-start"){API()?.invoke?.("med-start",{index:String(d.index)});update();return}
 if(action==="med-triage"){API()?.invoke?.("med-triage");update();return}
 if(action==="med-incident"){if(!confirm("Add a red-priority training patient to MEDCOM? This may create a LIMFAC. Continue?"))return;API()?.invoke?.("med-incident");update();return}
 if(action==="open2d"){close();API()?.invoke?.("inspect",{id:boardType==="LOADOUT"?"LOAD":boardType});return}
}
function renderStationActions(s){
 const el=q("#ops3d-station-actions");if(!el)return;
 let html="";
 if(boardType==="CAOC"||boardType==="LOADOUT"){
  const p=s.fleet?.[stationChoice]||s.fleet?.[0];
  html+='<h3>'+(boardType==="CAOC"?"CAOC / AIR TASKING ORDER":"LOADOUT / MOB INVENTORY")+'</h3>';
  html+='<div class="station-grid">'+s.fleet.map((a,i)=>'<button data-ops3d="plane" data-index="'+i+'" class="'+(stationChoice===i?"selected":"")+'">✈ '+text(a.id)+'<small> '+text(a.status)+'</small></button>').join("")+'</div>';
  if(p){
   html+='<div class="detail"><strong>'+text(p.id)+' — '+text(p.name)+'</strong><p>Status: '+text(p.status)+' · Location: '+text(String(p.at))+'</p></div>';
   html+='<h3>DESTINATION FOS</h3><div class="station-grid">'+s.sites.map((f,i)=>'<button data-ops3d="site" data-index="'+i+'" class="'+(selected===i?"selected":"")+'">'+text(f.name)+'<small> '+f.people+' people</small></button>').join("")+'</div>';
   if(boardType==="LOADOUT"){
    const load=API()?.getLoad?.()||{};
    html+='<h3>LOAD AIRCRAFT (PRACTICE COUNTERS)</h3>';
    for(const [key,label] of CARGO_ITEMS){
     html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:5px 2px;border-bottom:1px solid #41405d"><span>'+text(label)+': <strong>'+Number(load[key]||0)+'</strong></span><div style="display:flex;gap:5px"><button data-ops3d="cargo" data-id="'+key+'" data-step="-1" aria-label="Remove '+text(label)+'">−</button><button data-ops3d="cargo" data-id="'+key+'" data-step="1" aria-label="Add '+text(label)+'">＋</button></div></div>';
    }
   }
   const planReady=p.status==="READY"&&p.at==="MOB",flyReady=p.status==="PLANNED",returnReady=p.status==="AT FOS";
   html+='<div class="station-actions"><button class="'+(planReady?"selected":"")+'" data-ops3d="plan" '+(!planReady?"disabled":"")+'>1. VALIDATE / SUBMIT PRACTICE FLIGHT PLAN</button><button data-ops3d="dispatch" '+(!flyReady?"disabled":"")+'>2. EXECUTE APPROVED FLIGHT</button><button data-ops3d="return" '+(!returnReady?"disabled":"")+'>3. RETURN AIRCRAFT TO MOB</button></div>';
  }
  html+='<p class="foot">Aircraft capacities in this version are practice values, not the official OPS load planner. CAOC validates operational restrictions.</p>';
 }else if(boardType==="SPACE"){
  const satellites=s.satellites||[],sat=satellites[stationChoice]||satellites[0];
  html+='<h3>CSPOC / SPACE SUPPORT</h3><p>Select a satellite and task it for the current turn.</p><div class="station-grid">'+satellites.map((a,i)=>'<button data-ops3d="sat" data-index="'+i+'" class="'+(stationChoice===i?"selected":"")+'">🛰 '+text(a.id)+'<small> '+text(a.name)+'</small></button>').join("")+'</div>';
  if(sat)html+='<div class="detail"><strong>'+text(sat.name)+'</strong><p>'+(sat.usedTurn===s.turn?"Already tasked this turn.":"Available for support.")+'</p></div><button data-ops3d="sat-support" '+(sat.usedTurn===s.turn?"disabled":"")+'>TASK SELECTED SATELLITE</button>';
  html+='<p class="foot">Practice support is simulated. Official CSpOC effects must be adjudicated by the instructor.</p>';
 }else if(boardType==="MEDCOM"){
  const i=Math.max(0,Math.min(3,s.medicalBoard??stationChoice)),med=s.medicalBoards?.[i];
  stationChoice=i;
  html+='<h3>MEDCOM / MEDICAL RESPONSE</h3><div class="station-grid">'+(s.medicalBoards||[]).map((m,j)=>'<button data-ops3d="med-board" data-index="'+j+'" class="'+(i===j?"selected":"")+'">MEDCOM '+(j+1)+'<small> '+m.tasks.length+'/16 tasks</small></button>').join("")+'</div>';
  if(med){
   html+='<div class="detail"><strong>MEDCOM '+(i+1)+'</strong><p>Medical supplies: '+med.supply+' · RED '+med.patients.red+' · YELLOW '+med.patients.yellow+' · GREEN '+med.patients.green+'</p></div>';
   html+='<h3>CLICK A MEDICAL TASK TO START IT</h3><div class="station-grid">'+MED_TASKS.map((name,j)=>'<button data-ops3d="med-start" data-index="'+j+'" '+((med.tasks.includes(j)||med.pending.some(p=>p.i===j))?"disabled":"")+'>'+((med.tasks.includes(j))?"✓ ":med.pending.some(p=>p.i===j)?"⌛ ":"")+(j+1)+'. '+text(name)+'</button>').join("")+'</div>';
   html+='<button data-ops3d="med-triage">TRIAGE / TREAT PATIENTS</button> <button data-ops3d="med-incident">SIMULATE CASUALTY ARRIVAL</button>';
  }
  html+='<p class="foot">Additional medical conditions are training assumptions; consult the printed MEDCOM sheet and instructor.</p>';
 }
 html+='<button data-ops3d="open2d" style="margin-top:6px">OPEN FULL 2D WORKSTATION / LOG</button>';
 el.innerHTML=html;
}

function switchBoard(type){
 const next=BOARD_ASSETS[type]?type:"MOB";if(next!==boardType)stationChoice=0;boardType=next;
 if(overlay)q("#ops3d-board-select").value=boardType;
 if(three){
  three.mobPieces.forEach(x=>x.visible=boardType==="MOB");
  for(const [key,list] of Object.entries(three.stationPieces)){list.forEach(x=>x.visible=key===boardType)}
  loadBoardTexture(boardType);
 }
 if(overlay){q("#ops3d-detail").innerHTML="<strong>"+text(BOARD_ASSETS[boardType].label)+"</strong><p>Click the tabletop markers or choose a workstation action. OPS rules, card history and ENDEX remain connected to the same saved mission.</p>";update()}
}

function initRenderer(){
 if(three)return;
 const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
 script.onload=()=>{try{if(!window.THREE)throw Error("Three.js unavailable");setupThree();q("#ops3d-renderer").textContent="● REAL 3D ACTIVE · Drag to orbit, click a FOS";}catch(e){fallback(e.message)}};
 script.onerror=()=>{const backup=document.createElement("script");backup.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";backup.onload=script.onload;backup.onerror=()=>fallback("Both 3D library sources are unavailable");document.head.appendChild(backup)};
 document.head.appendChild(script);
}
function fallback(msg){
 q("#ops3d-renderer").textContent="3D unavailable: "+msg+" · Use FOS buttons/cards on the right.";
 const ctx=canvas.getContext("2d");if(ctx){canvas.width=1100;canvas.height=650;const draw=()=>{if(!overlay||overlay.style.display==="none")return;ctx.fillStyle="#11142a";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#bca6ff";ctx.font="bold 35px system-ui";ctx.fillText("OPERATION PACIFIC SHIELD",160,120);ctx.font="22px system-ui";ctx.fillText("Select FOS and flip your cards on the right →",160,180);};draw();}
}
function setupThree(){
 const T=window.THREE,scene=new T.Scene();scene.background=new T.Color(0x090d18);
 const camera=new T.PerspectiveCamera(44,1,.1,100),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"default"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.shadowMap.enabled=true;renderer.setClearColor(0x090d18);
 scene.add(new T.HemisphereLight(0xacc6ff,0x10101d,1.2));
 const light=new T.DirectionalLight(0xd4c4ff,2);light.position.set(0,13,7);light.castShadow=true;scene.add(light);
 const mat=(c,metal=.15)=>new T.MeshStandardMaterial({color:c,metalness:metal,roughness:.42});
 const group=new T.Group();scene.add(group);
 const box=(x,y,z,w,h,d,color,metal=0)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color,metal));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o};
 box(0,-.38,0,11,.6,8.1,0x111724,.45);box(0,-.04,0,10.7,.14,7.8,0x292c48,.3);
 const boardSurface=new T.Mesh(new T.PlaneGeometry(10.65,7.75),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,map:null}));boardSurface.rotation.x=-Math.PI/2;boardSurface.position.y=.058;group.add(boardSurface);
 const mobLayerStart=group.children.length;
 const spots=[[-3.35,-2.25],[3.35,-2.25],[-3.35,2.25],[3.35,2.25]];
 const siteMeshes=[],pickables=[];
 const label3D=(value,color)=>{const board=document.createElement("canvas");board.width=256;board.height=128;const context=board.getContext("2d");if(!context)return null;context.fillStyle="#"+Number(color).toString(16).padStart(6,"0");context.fillRect(0,0,256,128);context.fillStyle="#f7f2ff";context.font="bold 66px system-ui";context.textAlign="center";context.textBaseline="middle";context.fillText(value,128,64);const tex=new T.CanvasTexture(board);const obj=new T.Mesh(new T.PlaneGeometry(.95,.5),new T.MeshBasicMaterial({map:tex,transparent:false,side:T.DoubleSide}));obj.rotation.x=-Math.PI/2;return obj};
 const addCard=(x,z,value,kind,site,color)=>{const c=box(x,.54,z,1.05,.14,.64,color,.22);c.userData.cardKind=kind;c.userData.site=site;pickables.push(c);const tag=label3D(value,color);if(tag){tag.position.set(x,.62,z);group.add(tag)}return c};
 spots.forEach((p,i)=>{box(p[0],.08,p[1],3.2,.16,2.4,0x141c34);let base=box(p[0],.24,p[1],2.95,.22,2.05,i===selected?0x235b6f:0x302b52,.5);
 base.userData.site=i;siteMeshes.push(base);pickables.push(base);
 box(p[0],.4,p[1],2.45,.05,.22,0x475d8d);for(let j=0;j<3;j++)box(p[0]-1+j*.8,.5,p[1]-.65,.55,.23,.35,0x8f82c6);
 const tower=box(p[0]+.86,.74,p[1]+.65,.33,.8,.33,0x5be1fa,.3);tower.userData.site=i;pickables.push(tower);
 addCard(p[0]-.77,p[1]+.27,"RFI","rfi",i,0x3d287d);
 addCard(p[0]+.77,p[1]+.27,"TASK","task",i,0x145c74);
 });
 addCard(-.63,.14,"EVENT","event",-1,0x663777);
 addCard(.63,.14,"RISK","event",-1,0x8a3a59);
 box(0,.1,0,2,.2,1.5,0x34266a,.4);box(0,.3,0,1.25,.3,.9,0xb49fff,.6);
 const planeGroup=[];for(let i=0;i<4;i++){const t=new T.Group();group.add(t);const body=new T.Mesh(new T.ConeGeometry(.13,.62,5),mat(0x5be2f0,.5));body.rotation.x=Math.PI/2; t.add(body);const wing=new T.Mesh(new T.BoxGeometry(.61,.035,.16),mat(0xb8c2e8,.5));t.add(wing);planeGroup.push(t)}
 const mobPieces=group.children.slice(mobLayerStart),stationPieces={CAOC:[],SPACE:[],MEDCOM:[],LOADOUT:[]};
 const token=(type,x,z,name,index,color)=>{
   const start=group.children.length;
   const base=box(x,.18,z,2,.17,1.35,color,.35);
   base.userData.stationType=type;base.userData.stationIndex=index;pickables.push(base);
   const lab=label3D(name,color);
   if(lab){lab.geometry.dispose();lab.geometry=new T.PlaneGeometry(1.55,.75);lab.rotation.x=-Math.PI/2;lab.position.set(x,.281,z);lab.userData.stationType=type;lab.userData.stationIndex=index;group.add(lab);pickables.push(lab)}
   stationPieces[type].push(...group.children.slice(start));
 };
 [["C130-A","C130-B","C17-A","C5-A"]].forEach(list=>list[0].forEach((name,i)=>token("CAOC",spots[i][0],spots[i][1],name,i,0x254f75)));
 ["M1","M2","L1"].forEach((name,i)=>token("SPACE",spots[i][0],spots[i][1],name,i,0x513b82));
 for(let i=0;i<4;i++)token("MEDCOM",spots[i][0],spots[i][1],"MED "+(i+1),i,0x325e5b);
 ["C130-A","C130-B","C17-A","C5-A"].forEach((name,i)=>token("LOADOUT",spots[i][0],spots[i][1],name,i,0x76573a));
 three={T,scene,camera,renderer,group,spots,siteMeshes,pickables,planeGroup,mobPieces,stationPieces,boardSurface,pick:new T.Raycaster(),ptr:new T.Vector2(),positions:[],width:0,height:0};
 switchBoard(boardType);
 resize();
}
function resize(){if(!three||!canvas||overlay?.style.display==="none")return;const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;if(Math.abs(r.width-three.width)<1&&Math.abs(r.height-three.height)<1)return;three.width=r.width;three.height=r.height;three.renderer.setSize(r.width,r.height,false);three.camera.aspect=r.width/r.height;three.camera.updateProjectionMatrix()}
function hit(x,y){
 if(!three)return;
 const r=canvas.getBoundingClientRect();three.ptr.set(((x-r.left)/r.width)*2-1,-((y-r.top)/r.height)*2+1);three.pick.setFromCamera(three.ptr,three.camera);
 const hits=three.pick.intersectObjects(three.pickables.filter(x=>x.visible),false);if(!hits.length)return;const hit=hits[0].object.userData;if(hit.stationType){openStationMarker(hit.stationType,hit.stationIndex);return}if(hit.cardKind){if(hit.site>=0)chooseSite(hit.site);mode=hit.cardKind;revealed.delete(mode+":"+selected+":0");update();if(mode==="event"){const st=getState();if(st?.events?.some(x=>x.turn===st.turn)){flip("0")}else{act("cards",{},"Event and Risk cards revealed; consequences take effect on the following turn.")}}else{const st=getState(),f=st?.sites?.[selected];const limit=mode==="rfi"?10:16;let next=0;for(let j=0;j<limit;j++){if(mode==="rfi"?!f?.rfis?.includes(j):!f?.tasks?.includes(j)&&!f?.pending?.some(t=>t.i===j)){next=j;break}}flip(next)}return}chooseSite(hit.site);
}
function draw(now){
 raf=requestAnimationFrame(draw);
 if(!overlay||overlay.style.display==="none")return;
 if(now-lastStateAt>850||!sceneState){sceneState=getState();lastStateAt=now}const s=sceneState;if(!s||!three)return;
 if(three.renderer.domElement.width<1)return;
 resize();
 look.yaw+=0.00013;const radius=look.zoom;
 three.camera.position.set(Math.sin(look.yaw)*radius*Math.cos(look.pitch),Math.sin(look.pitch)*radius,Math.cos(look.yaw)*radius*Math.cos(look.pitch));three.camera.lookAt(0,0,0);
 for(let i=0;i<4;i++){three.siteMeshes[i].material.color.setHex(i===selected?0x257f9b:0x302b52);const f=s.sites[i];three.siteMeshes[i].scale.y=1+Math.min(f.tasks.length,16)*.016}
 s.fleet.slice(0,4).forEach((p,i)=>{const obj=three.planeGroup[i];if(!obj)return;let x=0,z=0;const at=String(p.at);const ix=s.sites.findIndex(f=>String(f.id)===at);if(ix>=0){x=three.spots[ix][0];z=three.spots[ix][1]}obj.position.x+=(x-obj.position.x)*.035;obj.position.z+=(z-obj.position.z)*.035;obj.position.y=.95+Math.sin(now/550+i)*.05;obj.rotation.y=Math.sin(now/1500+i)*.12});
 three.renderer.render(three.scene,three.camera);
}
document.addEventListener("click",e=>{if(overlay&&overlay.style.display!=="none")return;const b=e.target.closest("[data-action]");if(!b)return;const type=b.dataset.action;if(!["board-cards","board-rfi","board-task"].includes(type))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(type==="board-rfi")selected=Math.min(3,Math.max(0,Number(b.dataset.index)||0));mode=type==="board-cards"?"event":type==="board-task"?"task":"rfi";open();update();if(type==="board-task"&&b.dataset.index!==undefined)flip(b.dataset.index);},true);
setInterval(()=>{if(overlay&&overlay.style.display!=="none")update()},2500);
if(is3D)window.addEventListener("load",()=>setTimeout(open,230),{once:true});
window.OPS_3D_TABLE={open,close,chooseSite,update};
})();