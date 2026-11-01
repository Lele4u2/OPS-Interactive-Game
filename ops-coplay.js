"use strict";
(function(){
const st={peers:new Map(),host:false,guest:false,connected:false,room:"",role:"",lastInviteLink:""};
const $=id=>document.getElementById(id);
const rand=()=>{const a=new Uint32Array(4);crypto.getRandomValues(a);return Array.from(a).map(x=>x.toString(16)).join("")};
const enc=x=>btoa(unescape(encodeURIComponent(JSON.stringify(x))));
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
const cfg={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};
const status=msg=>{if($("peer-status"))$("peer-status").textContent=msg};
function waitIce(pc){return new Promise(resolve=>{if(pc.iceGatheringState==="complete")return resolve();let stop=setTimeout(resolve,14000);pc.addEventListener("icegatheringstatechange",()=>{if(pc.iceGatheringState==="complete"){clearTimeout(stop);resolve()}})})}
function send(ch,obj){if(ch?.readyState==="open"){try{ch.send(JSON.stringify(obj))}catch(e){status("Message could not be sent: "+e.message)}}}
function authorized(role,a,p){
 if(role==="GM")return !["new-game","start","resume","difficulty","invite"].includes(a);
 if(role==="MOB")return ["rfi","initial-rfi","board-next-rfi","task","board-start-task"].includes(a);
 if(role==="CAOC")return ["cargo","plan","dispatch","return","fighter-assign","fighter-launch"].includes(a);
 if(role==="CSpOC")return (a==="support"&&p.id==="space")||a==="board-satellite"||a==="sat-support";
 if(role==="MEDCOM")return a==="support"&&p.id==="medical";
 return false;
}
function attach(ch,role){
 ch.onopen=()=>{st.connected=true;status("CONNECTED — "+role+"; synchronizing mission.");if(st.host)send(ch,{kind:"state",state:window.OPS_DEBUG?.getState()})};
 ch.onclose=()=>{status("Disconnected from "+role+". Create a fresh invitation to reconnect.");if(st.guest)st.connected=false};
 ch.onerror=()=>status("Connection error. Your network may require a TURN relay.");
 ch.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}
  if(st.host&&m.kind==="action"){if(authorized(role,m.action,m.data||{}))window.OPS_DEBUG?.invoke?.(m.action,m.data);else send(ch,{kind:"error",text:"Your "+role+" position cannot execute that action."})}
  else if(st.guest&&m.kind==="state"&&m.state)window.OPS_DEBUG?.applyRemote?.(m.state);
  else if(st.guest&&m.kind==="flight")window.OPS_DEBUG?.showRemoteFlight?.(m.from,m.to,m.label);
  else if(m.kind==="error")status(m.text);
 };
}
function open(){
 if($("ops-peer-overlay"))return;
 const el=document.createElement("div");el.id="ops-peer-overlay";el.className="team-overlay";
 el.innerHTML='<div class="team-modal"><button id="peer-close" class="team-close">✕</button><div class="micro">OPERATIONS TEAM / COOPERATIVE MISSION</div><h2>INVITE YOUR MISSION TEAM</h2><p>Work from separate browsers with assigned responsibilities. The host controls the authoritative mission; connected teammates request actions.</p><div class="team-grid"><label>Invited position<select id="peer-role"><option value="MOB">MOB / FOS</option><option value="CAOC">CAOC / Mobility</option><option value="CSpOC">CSpOC</option><option value="MEDCOM">MEDCOM</option><option value="GM">Simulated Game Master</option></select></label><button id="peer-host" class="primary">CREATE INVITE</button><button id="peer-join">JOIN BY CODE</button></div><label id="peer-label">Invite or response code</label><textarea id="peer-code" rows="5" placeholder="Your invite appears here. Or paste an invitation received from your teammate." spellcheck="false"></textarea><div class="team-grid"><button id="peer-copy">COPY CODE</button><button id="peer-copy-link">COPY INVITE LINK</button><button id="peer-answer">HOST: ACCEPT ANSWER</button></div><div id="peer-status" class="team-status">Ready to invite a member.</div><p class="team-disclaimer">Connection uses encrypted WebRTC, an external STUN lookup, and manual offer/answer exchange. Every participant needs authorization to view the exercise. Restricted military networks may require an approved relay. Do not use for actual mission communications.</p></div>';
 document.body.appendChild(el);
 $("peer-close").onclick=()=>el.remove();
 el.onclick=e=>{if(e.target===el)el.remove()};
 $("peer-host").onclick=makeInvite;$("peer-join").onclick=join;$("peer-answer").onclick=accept;
 $("peer-copy-link").onclick=()=>{if(!st.lastInviteLink)return status("Create an invitation first.");if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(st.lastInviteLink).then(()=>status("Invitation link copied. Teammate still needs to return an answer code.")).catch(()=>status("Copy the invitation CODE instead."));else{const x=$("peer-code");x.value=st.lastInviteLink;x.select();status("Link selected. Press Ctrl+C to copy.")}};
 $("peer-copy").onclick=()=>{const e=$("peer-code");e.select();if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(e.value).then(()=>status("Copied. Send privately to your teammate.")).catch(()=>status("Select and copy the code manually."));else status("Code selected. Press Ctrl+C to copy.")};
 if(location.hash.startsWith("#opsInvite=")){$("peer-code").value=location.hash.split("#opsInvite=")[1];status("Invitation detected from link. Click JOIN BY CODE.")}
}
async function makeInvite(){
 try{
  if(!window.OPS_DEBUG?.getState())throw Error("Start a game before inviting teammates.");
  st.host=true;st.room ||= rand();
  const role=$("peer-role").value,id=rand(),pc=new RTCPeerConnection(cfg),ch=pc.createDataChannel("ops-sync");
  st.peers.set(id,{pc,ch,role});attach(ch,role);
  pc.onconnectionstatechange=()=>{if(pc.connectionState==="failed")status("Unable to connect. This network may require a relay.")};
  await pc.setLocalDescription(await pc.createOffer());status("Preparing invite…");await waitIce(pc);
  const invitation=enc({v:1,kind:"offer",room:st.room,id,role,sdp:pc.localDescription});
  $("peer-label").textContent="INVITATION CODE — send to "+role;
  $("peer-code").value=invitation;
  st.lastInviteLink=location.origin+location.pathname+(location.search||"")+"#opsInvite="+invitation;
  status("Invitation ready. Teammate pastes code, clicks JOIN BY CODE, then sends their answer back.");
 }catch(e){status("Invite error: "+e.message)}
}
async function join(){
 try{
  const txt=$("peer-code").value.trim().split("#opsInvite=").pop(),obj=dec(txt);
  if(obj.v!==1||obj.kind!=="offer")throw Error("Invalid offer code.");
  st.guest=true;st.host=false;st.role=obj.role;st.room=obj.room;
  const pc=new RTCPeerConnection(cfg);const peer={pc,ch:null,role:obj.role};st.peers.set(obj.id,peer);
  pc.ondatachannel=e=>{peer.ch=e.channel;attach(peer.ch,obj.role)};
  await pc.setRemoteDescription(obj.sdp);await pc.setLocalDescription(await pc.createAnswer());
  status("Preparing answer…");await waitIce(pc);
  $("peer-code").value=enc({v:1,kind:"answer",room:obj.room,id:obj.id,sdp:pc.localDescription});
  $("peer-label").textContent="ANSWER CODE — send back to host";
  status("Answer ready. Copy this code, send it back to the host; they click HOST: ACCEPT ANSWER.");
 }catch(e){status("Join failed: "+e.message)}
}
async function accept(){
 try{
  if(!st.host)throw Error("Only a host can accept answers.");
  const o=dec($("peer-code").value);if(o.kind!=="answer"||o.room!==st.room)throw Error("Incorrect room or answer.");
  const peer=st.peers.get(o.id);if(!peer)throw Error("No pending invite matches this code.");
  await peer.pc.setRemoteDescription(o.sdp);
  status("Answer accepted. Waiting for teammate connection…");
 }catch(e){status("Connection error: "+e.message)}
}
function broadcast(s){if(!st.host)return;for(const p of st.peers.values())send(p.ch,{kind:"state",state:s})}
function flight(from,to,label){if(!st.host)return;for(const p of st.peers.values())send(p.ch,{kind:"flight",from,to,label})}
function intercept(a,data){
 if(!st.guest)return false;
 const local=["select-site","select-plane","tab","view","inspect","board-task","board-rfi","board-cargo","board-cards","board-layer","board-zoom","board-reset","board-focus","rules","help","guide","menu","aar","save","sound","invite","close","replay","board-workstation"];
 if(local.includes(a))return false;
 if(!st.connected){status("Not connected to the host. Complete the invitation/answer exchange before submitting operations.");return true}
 const p=st.peers.values().next().value;
 status("Requesting host resolution: "+a+"…");
 send(p?.ch,{kind:"action",action:a,data});
 return true;
}
window.OPS_COPLAY={open,broadcast,flight,intercept,isHost:()=>st.host,isGuest:()=>st.guest,isConnected:()=>st.connected};
 if(location.hash.startsWith("#opsInvite="))setTimeout(open,250);
})();
