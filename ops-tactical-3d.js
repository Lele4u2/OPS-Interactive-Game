/* Optional 3D tactical overview: visualizes SAVED practice mission state.
   Never changes, adjudicates, or submits official OPS actions. */
(()=>{"use strict";
const KEY="OPS_COMMAND_SIM_V4";
const FOS=[{id:1,name:"FOS 1",x:12,z:-12},{id:6,name:"FOS 6",x:18,z:11},{id:14,name:"FOS 14",x:-2,z:18},{id:25,name:"FOS 25",x:-17,z:-7}];
const points=[{id:"MOB",name:"MOB",x:-21,z:5},...FOS];
let scene,camera,renderer,root,table,button,panel,status,raf,resizeObserver,lastHash="",objects=[],arcs=[],active=false,previousFocus=null;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||"null");return d?.version===4&&Array.isArray(d.sites)&&Array.isArray(d.fleet)?d:null}catch(_){return null}}
function label(text){const el=document.createElement("div");el.textContent=text;return el}
function buildUI(){if(document.querySelector("#ops-3d-launch"))return;
button=document.createElement("button");button.id="ops-3d-launch";button.type="button";button.textContent="◈ 3D TACTICAL TABLE";button.setAttribute("aria-controls","ops-3d-panel");button.setAttribute("aria-expanded","false");
panel=document.createElement("section");panel.id="ops-3d-panel";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","OPS 3D tactical overview");
panel.innerHTML='<header class="ops3d-head"><div><strong>OPS // HOLOGRAPHIC COMMAND TABLE</strong><p>Practice visualization • Original boards remain authoritative</p></div><button type="button" id="ops3d-close">CLOSE ×</button></header><div class="ops3d-content"><div id="ops3d-scene" role="img" aria-label="Schematic 3D layout of MOB and four forward operating sites"></div><aside class="ops3d-sidebar"><h3>MISSION TELEMETRY</h3><div id="ops3d-data"></div><h3>OPERATING SITES</h3><div id="ops3d-sites"></div><p class="ops3d-note">Locations are schematic, not geographic. Flight paths show only saved game information. This table cannot replace the official OPS board or instructor rulings.</p><button type="button" id="ops3d-refresh">REFRESH MISSION DATA</button><button type="button" id="ops3d-board">RETURN TO ORIGINAL BOARD</button></aside></div><div class="ops3d-bottom">Drag to rotate • Wheel to zoom • Press Escape to close • If 3D is unavailable, the mission report still works</div>';
document.body.append(button,panel);root=panel.querySelector("#ops3d-scene");status=panel.querySelector("#ops3d-data");
button.addEventListener("click",open);
panel.querySelector("#ops3d-close").addEventListener("click",close);
panel.querySelector("#ops3d-board").addEventListener("click",close);
panel.querySelector("#ops3d-refresh").addEventListener("click",refresh);
panel.addEventListener("keydown",e=>{if(e.key==="Tab"){const f=[...panel.querySelectorAll("button")];if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus()}}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&active)close()});
}
function readout(d){const sites=panel.querySelector("#ops3d-sites");sites.replaceChildren();if(!d){status.textContent="No saved V4 mission yet. Start a mission on the original board, then reopen or refresh this table.";sites.textContent="Awaiting mission setup.";return}
status.replaceChildren();
for(const [k,v] of [["Turn",d.turn],["Phase",d.phase],["Mode",d.mode],["Mission points",d.mp],["Aircraft",d.fleet.length],["Ready aircraft",d.fleet.filter(f=>f.status==="READY").length]]){
const line=label(k+": "+String(v??"Unknown"));line.className="ops3d-data-row";status.append(line)}
d.sites.slice(0,4).forEach((s,i)=>{const p=label((FOS[i]?.name||s.name||"FOS")+" • "+(s.tasks?.length||0)+" tasks complete • "+(s.rfis?.length||0)+" RFIs");p.className="ops3d-data-row";sites.append(p)})}
function release(){if(raf)cancelAnimationFrame(raf);raf=0;resizeObserver?.disconnect();resizeObserver=null;if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null}for(const obj of [...objects,...arcs]){obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(x=>x.dispose());else obj.material?.dispose()}objects=[];arcs=[];scene=null;camera=null;root.replaceChildren()}
function add(o){scene.add(o);objects.push(o);return o}
function build3D(){const T=window.THREE;if(!T){root.textContent="3D graphics unavailable (library blocked or offline). Your original 2D OPS boards are still available.";return}try{
scene=new T.Scene();scene.background=new T.Color(0x061421);scene.fog=new T.FogExp2(0x061421,.014);
camera=new T.PerspectiveCamera(45,1,.1,500);camera.position.set(0,39,61);camera.lookAt(0,0,0);
renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));root.appendChild(renderer.domElement);
add(new T.HemisphereLight(0x82dfff,0x091520,1.5));
const grid=add(new T.GridHelper(72,36,0x4cd5e6,0x1a3e53));grid.position.y=-.6;
const shape=new T.PlaneGeometry(65,65,48,48),attr=shape.attributes.position;
for(let i=0;i<attr.count;i++){const x=attr.getX(i),y=attr.getY(i);attr.setZ(i,.7*Math.sin(x*.37)*Math.cos(y*.27)+.6*Math.sin(y*.5))}shape.computeVertexNormals();
const land=add(new T.Mesh(shape,new T.MeshBasicMaterial({color:0x2c8391,wireframe:true,transparent:true,opacity:.25})));land.rotation.x=-Math.PI/2;land.position.y=-.4;
for(const p of points){const col=p.id==="MOB"?0x63e4f5:0xffc876;const sphere=add(new T.Mesh(new T.SphereGeometry(1.2,16,12),new T.MeshBasicMaterial({color:col})));sphere.position.set(p.x,2,p.z);const ring=add(new T.Mesh(new T.RingGeometry(1.9,2.35,32),new T.MeshBasicMaterial({color:col,side:T.DoubleSide,transparent:true,opacity:.7})));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.12,p.z);ring.userData.pulse=true}
const resize=()=>{if(!renderer||!camera)return;let w=Math.max(root.clientWidth,250),h=Math.max(root.clientHeight,220);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};resize();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(root);
let down=false,px=0;const cv=renderer.domElement;cv.addEventListener("pointerdown",e=>{down=true;px=e.clientX;cv.setPointerCapture(e.pointerId)});cv.addEventListener("pointerup",()=>down=false);cv.addEventListener("pointermove",e=>{if(!down)return;camera.position.applyAxisAngle(new T.Vector3(0,1,0),-(e.clientX-px)*.006);camera.lookAt(0,0,0);px=e.clientX});cv.addEventListener("wheel",e=>{e.preventDefault();camera.position.multiplyScalar(e.deltaY>0?1.06:.94);camera.position.clampLength(25,105);camera.lookAt(0,0,0)},{passive:false});
function frame(t){if(!active||!renderer)return;for(const o of objects){if(o.userData.pulse){const p=1+Math.sin(t*.003)*.12;o.scale.set(p,p,1)}}renderer.render(scene,camera);raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame);
}catch(e){release();root.textContent="3D mode unavailable: "+e.message+". Continue on the original OPS board."}}
function routes(d){if(!scene||!window.THREE)return;const T=THREE;for(const old of arcs){scene.remove(old);old.geometry.dispose();old.material.dispose()}arcs=[];
if(!d)return;for(const f of d.fleet){const loc=typeof f.at==="number"?FOS.find(p=>p.id===f.at):FOS.find(p=>p.name===f.at||String(p.id)===String(f.at));if(!loc)continue;const home=points[0],control=new T.Vector3((home.x+loc.x)/2,9,(home.z+loc.z)/2),curve=new T.QuadraticBezierCurve3(new T.Vector3(home.x,2,home.z),control,new T.Vector3(loc.x,2,loc.z));const line=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(40)),new T.LineBasicMaterial({color:0x6fe3f0,transparent:true,opacity:.7}));scene.add(line);arcs.push(line)}}
function refresh(){const d=load();readout(d);routes(d)}
function open(){if(active)return;active=true;previousFocus=document.activeElement;panel.hidden=false;button.setAttribute("aria-expanded","true");refresh();build3D();routes(load());panel.querySelector("#ops3d-close").focus()}
function close(){if(!active)return;active=false;panel.hidden=true;button.setAttribute("aria-expanded","false");release();previousFocus?.focus?.()}
function startUI(){buildUI();if(new URLSearchParams(location.search).get("view")==="3d")setTimeout(()=>document.getElementById("ops-3d-launch")?.click(),80)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startUI);else startUI();
})();