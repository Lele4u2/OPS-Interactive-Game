"use strict";
(function(){
/* OPS live 3D table: adds a real WebGL tabletop without changing mission scoring. */
const is3D = new URLSearchParams(location.search).get("view")==="3d";
const API = () => window.OPS_DEBUG;
const rules = window.OPS_RULES || {};
const RFIS = rules.RFIs || ["Crash Fire Rescue","Mobility Support","Ramp Space","Air Traffic Control","Equipment","Bed Down","Fuel","Airfield Security","Host Nation Support","Medical Capability"];
const TASKS = rules.tasks || [];
const text = (s) => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let overlay=null, canvas=null, three=null, selected=0, mode="rfi", revealed=new Set(), currentTurn=0, scenes=null, look={yaw:.48,pitch:.93,zoom:14}, targetRot=0, raf=0, bannerTimer=0, mouseDown=null;
const styles = [
"#ops3d-open{position:fixed;right:16px;bottom:20px;z-index:900;border:2px solid #ad98ff;background:#281d55;color:white;padding:14px 19px;border-radius:15px;box-shadow:0 0 24px #8c68ff66;font:800 14px system-ui;cursor:pointer}",
"#ops3d{position:fixed;inset:0;z-index:2000;color:#f5f2ff;background:#080910f6;font:14px/1.45 system-ui;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}",
"#ops3d *{box-sizing:border-box}#ops3d button{font:inherit;color:inherit;border:1px solid #5a5574;background:#222538;border-radius:10px;padding:9px 12px;cursor:pointer}",
"#ops3d button:hover{border-color:#b69cff;background:#3a305e}#ops3d button:focus-visible{outline:3px solid #b39cff;outline-offset:2px}",
"#ops3d .top{padding:12px 18px;border-bottom:1px solid #35314a;background:linear-gradient(90deg,#151522,#28204d);display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}",
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
"#ops3d .face:hover{transform:translateY(-4px) rotateY(6deg)}#ops3d .face.known{background:linear-gradient(130deg,#25434c,#172434)!important;border-color:#64d5ed!important}",
"#ops3d .face b{font-size:22px;display:block}#ops3d .face span{font-size:12px}#ops3d .score{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}",
"#ops3d .score>div{padding:9px;background:#1f2132;border-radius:10px;border:1px solid #393a55}#ops3d .score b{font-size:18px;display:block}",
"#ops3d .detail{border:1px solid #69608f;padding:13px;border-radius:14px;background:#1e1b33;margin:12px 0;min-height:82px}",
"#ops3d .detail strong{color:#dcceff}#ops3d .cta{width:100%;background:#613ad0!important;border-color:#ad92ff!important;font-weight:800!important}",
"#ops3d .warning{color:#ffb3bb;background:#3e1a2a;padding:8px 11px;border:1px solid #a95369;border-radius:10px;margin:9px 0}",
"#ops3d .live{font-size:12px;color:#b7c9d7}#ops3d .foot{font-size:11px;color:#a4a4bd;margin-top:14px;border-top:1px solid #393b50;padding-top:9px}",
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
 overlay.innerHTML='<header class="top"><div><h2>OPERATION PACIFIC SHIELD <span style="color:#bbaaff">/ INTERACTIVE 3D TABLE</span></h2><small>Click an airfield. Flip a facedown RFI or task card. Make the decision on the same screen.</small></div><div style="display:flex;gap:7px"><button id="ops3d-help" type="button">HOW TO PLAY</button><button id="ops3d-close" type="button">RETURN TO 2D ✕</button></div></header><div class="stage"><section class="view"><canvas id="ops3d-canvas" aria-label="3D tabletop with four interactive airfields"></canvas><div class="tools"><button id="ops3d-left">↶</button><button id="ops3d-reset">⌂</button><button id="ops3d-right">↷</button><button id="ops3d-plus">＋</button><button id="ops3d-minus">−</button></div><div class="hint">Drag to rotate · Scroll to zoom · Click an illuminated FOS model to inspect it<br><span id="ops3d-renderer">Loading 3D renderer…</span></div></section><aside class="side"><div id="ops3d-alert" role="alert"></div><div id="ops3d-live" class="live"></div><div class="location" id="ops3d-locations"></div><h3 id="ops3d-site-title">Choose an airfield</h3><div class="score" id="ops3d-score"></div><div class="modes"><button data-ops-mode="rfi" class="active">🎴 RFI CARDS</button><button data-ops-mode="task">🛠 TASK CARDS</button><button data-ops-mode="event">⚠ EVENT / RISK</button></div><div class="deck" id="ops3d-deck"></div><div class="detail" id="ops3d-detail" aria-live="polite">Click a card to turn it over and learn what it is.</div><div class="foot">Practice visualization. Game state, mission scoring and approvals are handled by the existing OPS simulator. Exercise-specific restrictions require instructor verification.</div></aside></div>';
 document.body.appendChild(overlay);canvas=q("#ops3d-canvas");
 q("#ops3d-close").onclick=close;
 q("#ops3d-help").onclick=()=>notify("1. Click an airfield model or FOS selector. 2. Choose RFI or Task. 3. Click a facedown card to flip it. 4. Use the action on that card. 5. Return to 2D for aircraft loading and other workstations.");
 q("#ops3d-left").onclick=()=>look.yaw-=.22;
 q("#ops3d-right").onclick=()=>look.yaw+=.22;
 q("#ops3d-reset").onclick=()=>{look={yaw:.48,pitch:.93,zoom:14};};
 q("#ops3d-plus").onclick=()=>look.zoom=Math.max(8,look.zoom-1.3);
 q("#ops3d-minus").onclick=()=>look.zoom=Math.min(24,look.zoom+1.3);
 q("#ops3d-locations").onclick=e=>{const b=e.target.closest("[data-fos]");if(b)chooseSite(b.dataset.fos)};
 q(".modes").onclick=e=>{const b=e.target.closest("[data-ops-mode]");if(b){mode=b.dataset.opsMode;revealed.clear();update()}};
 q("#ops3d-deck").onclick=e=>{const b=e.target.closest("[data-card]");if(b)flip(b.dataset.card)};
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
function act(action,data,message){try{API()?.invoke?.(action,data);notify(message);update();if(mode!=="event"){flip(data.index||0)}else{const state=getState();const draw=state?.events?.find(x=>x.turn===state.turn);if(draw){q("#ops3d-detail").innerHTML="<strong>🎴 CARDS REVEALED — TURN "+draw.turn+"</strong><p><b>EVENT:</b> "+text(draw.event?.name)+" — "+text(draw.event?.body)+"</p><p><b>RISK:</b> "+text(draw.risk?.name)+" — "+text(draw.risk?.body)+"</p><div class=\"warning\">⚠ TEAM "+draw.team+" · "+text(state.sites[draw.fos]?.name)+" · CONSEQUENCES NEXT TURN</div>";}else flip("0")}}catch(e){notify("Action failed: "+e.message)}}
function updateCards(){
 const box=q("#ops3d-deck");if(!box)return;const s=getState();if(!s)return;
 let count=mode==="rfi"?10:mode==="task"?16:2;const f=s.sites[selected];let html="";
 for(let i=0;i<count;i++){
  const known=revealed.has(mode+":"+selected+":"+i);
  const done=mode==="rfi"?f.rfis.includes(i):mode==="task"?f.tasks.includes(i):false;
  const label=mode==="rfi"?RFIS[i]:mode==="task"?TASKS[i]:i===0?"EVENT CARD":"RISK CARD";
  html+='<button type="button" data-card="'+i+'" class="face '+(known||done?"known":"")+'" aria-label="'+text((known||done)?label:"Reveal facedown card "+(i+1))+'">'+(known||done?'<span> '+(done?"✓ ":"")+"<b>"+(i+1)+"</b>"+text(label)+'</span>':'<span><b>?</b>FLIP CARD '+(i+1)+'</span>')+'</button>';
 }
 box.innerHTML=html;
}
function update(){
 const s=getState();if(!overlay||!s)return;
 if(currentTurn!==s.turn){currentTurn=s.turn;revealed.clear()}
 q("#ops3d-live").textContent="TURN "+s.turn+" • "+s.mode.toUpperCase()+" • "+s.mp+" MP • "+s.dp+" DP";
 const f=s.sites[selected];q("#ops3d-site-title").textContent=f.name+" / "+f.country+" — SITE "+(selected+1);
 q("#ops3d-locations").innerHTML=s.sites.map((a,i)=>'<button type="button" data-fos="'+i+'" class="'+(selected===i?"active":"")+'">FOS '+a.id+' <small>'+a.rfis.length+'/10 RFIs · '+a.tasks.length+'/16 tasks</small></button>').join("");
 q("#ops3d-score").innerHTML='<div><small>PERSONNEL</small><b>'+f.people+'</b></div><div><small>RFIs</small><b>'+f.rfis.length+'/10</b></div><div><small>TASKS</small><b>'+f.tasks.length+'/16</b></div>';
 q(".modes").querySelectorAll("[data-ops-mode]").forEach(b=>b.classList.toggle("active",b.dataset.opsMode===mode));
 updateCards();
}
function initRenderer(){
 if(three)return;
 const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
 script.onload=()=>{try{if(!window.THREE)throw Error("Three.js unavailable");setupThree();q("#ops3d-renderer").textContent="● REAL 3D ACTIVE · Drag to orbit, click a FOS";}catch(e){fallback(e.message)}};
 script.onerror=()=>fallback("3D library could not load");
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
 const spots=[[-3.35,-2.25],[3.35,-2.25],[-3.35,2.25],[3.35,2.25]];
 const siteMeshes=[],pickables=[];
 spots.forEach((p,i)=>{box(p[0],.08,p[1],3.2,.16,2.4,0x141c34);let base=box(p[0],.24,p[1],2.95,.22,2.05,i===selected?0x235b6f:0x302b52,.5);
 base.userData.site=i;siteMeshes.push(base);pickables.push(base);
 box(p[0],.4,p[1],2.45,.05,.22,0x475d8d);for(let j=0;j<3;j++)box(p[0]-1+j*.8,.5,p[1]-.65,.55,.23,.35,0x8f82c6);
 const tower=box(p[0]+.86,.74,p[1]+.65,.33,.8,.33,0x5be1fa,.3);tower.userData.site=i;pickables.push(tower);
 });
 box(0,.1,0,2,.2,1.5,0x34266a,.4);box(0,.3,0,1.25,.3,.9,0xb49fff,.6);
 const planeGroup=[];for(let i=0;i<4;i++){const t=new T.Group();group.add(t);const body=new T.Mesh(new T.ConeGeometry(.13,.62,5),mat(0x5be2f0,.5));body.rotation.x=Math.PI/2; t.add(body);const wing=new T.Mesh(new T.BoxGeometry(.61,.035,.16),mat(0xb8c2e8,.5));t.add(wing);planeGroup.push(t)}
 three={T,scene,camera,renderer,group,spots,siteMeshes,pickables,planeGroup,pick:new T.Raycaster(),ptr:new T.Vector2(),positions:[],width:0,height:0};
 resize();
}
function resize(){if(!three||!canvas||overlay?.style.display==="none")return;const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;if(Math.abs(r.width-three.width)<1&&Math.abs(r.height-three.height)<1)return;three.width=r.width;three.height=r.height;three.renderer.setSize(r.width,r.height,false);three.camera.aspect=r.width/r.height;three.camera.updateProjectionMatrix()}
function hit(x,y){
 if(!three)return;
 const r=canvas.getBoundingClientRect();three.ptr.set(((x-r.left)/r.width)*2-1,-((y-r.top)/r.height)*2+1);three.pick.setFromCamera(three.ptr,three.camera);
 const hits=three.pick.intersectObjects(three.pickables,false);if(hits.length)chooseSite(hits[0].object.userData.site);
}
function draw(now){
 raf=requestAnimationFrame(draw);
 if(!overlay||overlay.style.display==="none")return;
 const s=getState();if(!s||!three)return;
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