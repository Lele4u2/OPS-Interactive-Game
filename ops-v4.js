"use strict";
(function(){
const $=id=>document.getElementById(id), R=window.OPS_RULES,KEY="OPS_COMMAND_SIM_V4";
if(!R||!Array.isArray(R.tasks))throw Error("OPS rules could not load.");
const POS=[
 {id:1,name:"FOS 1",country:"Japan",x:630,y:120},
 {id:6,name:"FOS 6",country:"Philippines",x:480,y:268},
 {id:14,name:"FOS 14",country:"Malaysia",x:325,y:385},
 {id:25,name:"FOS 25",country:"Thailand",x:200,y:285}
];
const HOME={x:92,y:186};
const SIM_TARGETS=[{id:"SIM-A",name:"OPFOR Training Site Alpha",x:795,y:150},{id:"SIM-B",name:"OPFOR Training Site Bravo",x:746,y:330},{id:"SIM-C",name:"OPFOR Training Site Charlie",x:575,y:430}];
const BOARD_BASE={x:500,y:485};
const BOARD_SITES=[{x:260,y:790},{x:770,y:790},{x:770,y:215},{x:260,y:215}];
function boardLocation(ref){if(ref==="MOB")return BOARD_BASE;const j=POS.findIndex(p=>p.id===ref);return BOARD_SITES[Math.max(0,j)];}
const MEDICAL_TASKS=[
"Blood Support","Battlefield Surgery","Triage Team","Battlefield Hospital",
"Delayed Bedspace","Medic Response","Minimal Care","Minimal Bedspace",
"Flight Surgeon","Flight Nurse","Medical Service Corp","Aeromedical Supply",
"Mortuary Affairs","Mortuary Services","Medical Logistics","War Reserve Material"
];
const CARGO=[
 {id:"people",name:"5-person MRA team",icon:"👥"},
 {id:"forklift",name:"Forklift equipment",icon:"🚜"},
 {id:"fuel",name:"Fuel token",icon:"⛽"},
 {id:"food",name:"Food / water",icon:"📦"},
 {id:"ammo",name:"Bomb / munitions",icon:"💥"},
 {id:"missile",name:"Missile token",icon:"🚀"}
];
const DEFAULT={people:15,forklift:3,fuel:18,food:14,ammo:9,missile:8};
const PRACTICE_SLOTS={C130:4,C17:6,C5:8};
const EVENTS=[
 {name:"AIRFIELD WEATHER ALERT",body:"Runway conditions require an extra assessment before arrival.",type:"weather"},
 {name:"SUPPLY CONVOY ARRIVES",body:"Additional food and water becomes available at the MOB.",type:"supply"},
 {name:"HOST NATION REVIEW",body:"One FOS must confirm renewed local access.",type:"access"},
 {name:"RAPID REPAIR TEAM",body:"A damaged aircraft may recover more quickly.",type:"repair"},
 {name:"MAINTENANCE INSPECTION",body:"The selected site has temporary maintenance restrictions.",type:"maintenance"},
 {name:"JOINT COORDINATION WINDOW",body:"The selected FOS may request extra RFI support.",type:"assessment"}
];
const RISKS=[
 {name:"FUEL DELAY",body:"MOB fuel stock loses one token on the next turn.",type:"fuel"},
 {name:"RAMP CONGESTION",body:"FOS cannot accept new mobility aircraft for one turn.",type:"ramp"},
 {name:"MEDICAL EMERGENCY",body:"Requires additional medical support. Computer applies mission pressure.",type:"medical"},
 {name:"COMMUNICATIONS DEGRADED",body:"FOS capabilities are restricted for one turn.",type:"comms"},
 {name:"TRANSPORT CAPACITY SHORTFALL",body:"Practice airlift resources become harder to sustain.",type:"delay"},
 {name:"ACCESS VERIFIED",body:"No further restriction from this risk card.",type:"clear"}
];
const RFI_NAMES=R.RFIs || ["Fire rescue","Mobility","Ramp","ATC","Equipment","Beddown","Fuel","Security","Host nation","Medical"];
let S=null,modal="launch",tab="map",selected=0,activePlane="C130-A",cargo={},toastTimer=null,moving=false,view="board",audioCtx=null,commandTimer=null,commandWorking=false;
function beep(type){if(!S||!S.sound)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audioCtx=audioCtx||new A();const o=audioCtx.createOscillator(),v=audioCtx.createGain();o.type=type==="warn"?"triangle":"sine";o.frequency.setValueAtTime(type==="warn"?270:type==="fly"?420:700,audioCtx.currentTime);if(type==="fly")o.frequency.exponentialRampToValueAtTime(110,audioCtx.currentTime+.32);v.gain.setValueAtTime(.045,audioCtx.currentTime);v.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.35);o.connect(v);v.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.38)}catch(e){}}
const root=$("app");
const h=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rnd=n=>{const a=new Uint32Array(1),lim=4294967296-(4294967296%n);do{crypto.getRandomValues(a)}while(a[0]>=lim);return a[0]%n+1};
const sum=o=>Object.values(o).reduce((a,b)=>a+Number(b||0),0);
const cargoWeight=o=>sum(o);
function game(mode,diff){
 return{
  version:4,mode,diff,turn:1,phase:"PLANNING",mp:0,dp:0,training:0,opfor:0,finished:false,
  stock:{...DEFAULT},site:0,selectedPlane:"C130-A",pilotActions:0,
  sites:POS.map(p=>({...p,rfis:[],tasks:[],pending:[],people:0,forklift:0,fuel:0,food:0,ammo:0,missile:0,blockedUntil:0,access:true,fighters:0,fighterReady:0,firstArrival:0,assessmentAwarded:false,damage:0,shortageDays:0})),
  fleet:[
   {id:"C130-A",type:"C130",name:"C-130 Hercules",at:"MOB",status:"READY",load:{},landed:0,until:0},
   {id:"C130-B",type:"C130",name:"C-130 Hercules",at:"MOB",status:"READY",load:{},landed:0,until:0},
   {id:"C17-A",type:"C17",name:"C-17 Globemaster",at:"MOB",status:"READY",load:{},landed:0,until:0},
   {id:"C5-A",type:"C5",name:"C-5 Galaxy",at:"MOB",status:"READY",load:{},landed:0,until:0}
  ],
  plans:[],events:[],effects:[],log:[],impact:[],strikes:[],targetId:"SIM-A",cardChoice:{event:-1,risk:-1},flags:{selected:false,rfi:false,loaded:false,dispatched:false,arrived:false,returned:false,task:false,card:false},
  ratings:{operations:0,decisions:0,logistics:0},medicalBoards:Array.from({length:4},(_,i)=>({name:"MEDCOM "+(i+1),tasks:[],pending:[],patients:{red:0,yellow:0,green:0},supply:8})),medicalBoard:0,satellites:[{id:"M1",name:"ISR Training Satellite",usedTurn:0},{id:"M2",name:"SATCOM Training Satellite",usedTurn:0},{id:"L1",name:"Space Warning Satellite",usedTurn:0}],selectedSatellite:"M1",support:{space:0,medical:0,requested:{}},sound:false,history:[],
  command:{auto:mode==="computer",autoTurns:false,pickPlane:"C130-A",pickSite:1,priority:"BUILD",returnHome:true,orders:[],completed:0,alerts:[]},
  objective:{"name":"Activate and sustain forward operating sites","target":25}
 };
}
function log(msg,who="OPS"){if(!S)return;S.log.unshift({turn:S.turn,who,msg,time:new Date().toLocaleTimeString()});S.log=S.log.slice(0,120)}
function notify(msg){const old=$("toastpop");if(old)old.remove();const d=document.createElement("div");d.id="toastpop";d.className="toast";d.textContent=msg;document.body.appendChild(d);clearTimeout(toastTimer);toastTimer=setTimeout(()=>d.remove(),3800)}
function save(show=false){if(!S)return;try{localStorage.setItem(KEY,JSON.stringify(S));if(show)notify("Mission saved on this device.")}catch(e){notify("Browser save unavailable.")}window.OPS_COPLAY?.broadcast?.(S)}
function loadSaved(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==4)throw Error();S=s;ensureCommand();S.support??={space:0,medical:0,requested:{}};S.impact??=[];S.strikes??=[];S.medicalBoards??=Array.from({length:4},(_,i)=>({name:"MEDCOM "+(i+1),tasks:[],pending:[],patients:{red:0,yellow:0,green:0},supply:8}));S.medicalBoard??=0;S.satellites??=[{id:"M1",name:"ISR Training Satellite",usedTurn:0},{id:"M2",name:"SATCOM Training Satellite",usedTurn:0},{id:"L1",name:"Space Warning Satellite",usedTurn:0}];S.selectedSatellite??="M1";S.sites.forEach(x=>x.shortageDays??=0);selected=S.site||0;activePlane=S.selectedPlane||"C130-A";modal="";render();startCommandClock()}catch(e){notify("No V4 mission save found on this browser.")}}
function start(mode,diff){
 S=game(mode,diff);modal="";selected=0;activePlane="C130-A";tab="site";view="board";cargo={people:1,forklift:1};
 log("Mission initialized: "+mode.toUpperCase()+" / "+diff.toUpperCase()+".","SIM GM");
 log("The simulated GM handles computer adjudication. Training load capacities and scenario cards are not official OPS data.","SIM GM");
 save();render();startCommandClock();
}
function site(){return S.sites[selected]}
function plane(){return S.fleet.find(x=>x.id===activePlane)}
function point(p){if(p==="MOB")return HOME;const s=S.sites.find(x=>x.id===p);return s?{x:s.x,y:s.y}:HOME}
function tutorial(){
 if(S.mode!=="tutorial")return null;
 const f=S.flags;
 const steps=[
 ["Choose a FOS","Select Airfield 1, 2, 3, or 4 on your original OPS MOB board. The selected airfield lights up.",f.selected,"map"],
 ["Request initial RFI","Click an RFI area on the original board and request the initial airfield information. The simulated instructor replies.",f.rfi,"site"],
 ["Choose an aircraft","Select a C-130 aircraft token on the board or in the roster. Choose a load and destination.",S.pilotActions>0,"flight"],
 ["Build the load","In AIRLIFT PLANNER add an MRA team and forklift, then submit the plan.",f.loaded,"flight"],
 ["Launch your aircraft","Click FLY MISSION. The aircraft will leave MOB and travel to your chosen FOS.",f.dispatched,"flight"],
 ["Watch arrival","Let the aircraft land and unload its counters. The FOS resource tally will change.",f.arrived,"map"],
 ["Advance one turn","An aircraft cannot leave the FOS until the following turn. Advance the game turn.",S.turn>1,"site"],
 ["Fly back to MOB","Select the aircraft at the FOS and press RETURN TO MOB.",f.returned,"flight"],
 ["Build capability","After your FOS has personnel, request a capability task and let the computer adjudicate it on a later turn.",f.task,"site"],
 ["Draw the Event/Risk cards","Draw the two cards for this turn. Their effects are applied in the next turn.",f.card,"events"]
 ];
 let i=steps.findIndex(x=>!x[2]);if(i<0)i=steps.length-1;
 return{index:i,total:steps.length,step:steps[i],done:steps.every(x=>x[2])};
}
function kickoff(){
 if(S.mode==="tutorial"){const t=tutorial();tab=t.step[3]}
 render();
}
function requestRFI(i){
 const s=site();if(s.rfis.includes(i)){notify("That RFI is already answered.");return}
 if(s.rfis.length>=10)return notify("Assessment complete.");
 const replies=["AVAILABLE WITH LIMITATIONS","AVAILABLE — COORDINATE SUPPORT","CAPABILITY REQUIRES RESOURCES","AVAILABLE FOR PRACTICE PLANNING"];
 const response=replies[(s.id+i+S.turn)%replies.length];
 s.rfis.push(i);S.flags.rfi=true;
 log("Simulated instructor answered "+RFI_NAMES[i]+" at "+s.name+": "+response,"SIM GM");
 if(s.rfis.length===10&&!s.assessmentAwarded){
  s.assessmentAwarded=true;S.mp+=5;S.training+=5;
  log("Full ten-RFI airfield assessment completed: +5 official-rule Mission Points.","SCORE");
 }
 save();render();
}
function requestInitial(){
 const s=site();let num=0;
 for(let i=0;i<10&&s.rfis.length<5;i++)if(!s.rfis.includes(i)){s.rfis.push(i);num++}
 if(num){S.flags.rfi=true;log("SIM GM returned "+num+" initial RFI answers to "+s.name,"SIM GM")}else notify("Five initial RFIs already answered. Continue follow-on assessment.");
 if(s.rfis.length===10&&!s.assessmentAwarded){s.assessmentAwarded=true;S.mp+=5}
 save();render();
}
function taskPrereq(i){return (R.prerequisites&&R.prerequisites[i])||[]}
function startTask(i){
 const s=site();
 if(s.tasks.includes(i)||s.pending.some(x=>x.i===i))return notify("Task already completed or underway.");
 const missing=taskPrereq(i).filter(x=>!s.tasks.includes(x));
 if(missing.length)return notify("First complete Task "+missing.map(x=>x+1).join(", ")+".");
 if(s.people<5)return notify("Deliver at least one MRA team (5 people) first.");
 if(s.blockedUntil>S.turn)return notify("Computer reports a temporary site restriction.");
 let duration=1;
 if(i===0){duration=s.people>=21?1:s.people>=11?2:4;}
 if(i===7){if(s.people<10)return notify("Task 8 requires at least 10 personnel.");duration=s.people>=11?1:2}
 if(i===9&&s.forklift===0)return notify("Mobility support practice requires a forklift.");
 s.pending.push({i,due:S.turn+duration,started:S.turn});
 S.flags.task=true;
 log("Task "+(i+1)+" "+R.tasks[i]+" started at "+s.name+"; SIM GM completion check Turn "+(S.turn+duration)+".","SIM GM");
 S.training+=2;save();render();
}
function selectPlane(id){if(!S.fleet.some(p=>p.id===id))return;activePlane=id;S.selectedPlane=id;S.pilotActions++;tab="flight";cargo={people:1,forklift:1};save();render()}
function capacity(p){return PRACTICE_SLOTS[p.type]}
function changeCargo(id,amount){const p=plane();if(!p||p.status!=="READY"||p.at!=="MOB")return notify("This aircraft must be ready at MOB to load.");const next=Math.max(0,(cargo[id]||0)+amount);if(next>S.stock[id])return notify("Insufficient "+id+" stock at MOB.");cargo[id]=next;if(cargoWeight(cargo)>capacity(p)){cargo[id]--;return notify("Practice aircraft load is full.");}render()}
function createPlan(){
 const p=plane(),s=site();
 if(!p||p.status!=="READY"||p.at!=="MOB")return notify("Select an available aircraft at MOB.");
 if(!cargoWeight(cargo))return notify("Add at least one cargo counter.");
 if(cargoWeight(cargo)>capacity(p))return notify("You exceeded the practice load capacity.");
 for(const [k,n] of Object.entries(cargo))if(n>S.stock[k])return notify("Insufficient "+k+" at MOB.");
 if(s.blockedUntil>S.turn||!s.access)return notify("Destination is currently restricted.");
 if(p.type==="C5"){notify("C-5 at FOS uses the special D20 landing-risk adjudication, shown on arrival.");}
 for(const [k,n] of Object.entries(cargo))S.stock[k]-=n;
 p.status="PLANNED";p.load={...cargo};
 S.plans.push({id:"ATO-"+String(S.plans.length+1).padStart(3,"0"),aircraft:p.id,site:s.id,load:{...cargo},status:"APPROVED",turn:S.turn,simulated:true});
 S.flags.loaded=true;S.training+=3;
 log("SIM CAOC validated practice ATO for "+p.name+" to "+s.name+". Load "+cargoWeight(cargo)+"/"+capacity(p)+" slots. "+(p.type==="C5"?"C-5 landing risk pending.":""),"SIM CAOC");beep("good");
 save();render();
}
function resolveC5(p,s){
 const n=rnd(20),out=R.dice("c5",n);S.roll={sides:20,number:n,title:out.title,body:out.explanation,kind:"C-5 LANDING RISK"};
 if(n<=3){p.status="LOST";p.at="LOST";S.training-=20;S.ratings.logistics-=10;log(p.name+" lost in a simulated C-5 FOS crash (D20="+n+").","SIM GM");return false}
 if(n<=6){p.status="DAMAGED";p.until=S.turn+2;log(p.name+" sustained significant landing damage: unavailable two turns (D20="+n+").","SIM GM");}
 else if(n<=10){p.status="DAMAGED";p.until=S.turn+1;log(p.name+" minor landing damage: unavailable one turn (D20="+n+").","SIM GM");}
 else{p.status="AT FOS";log(p.name+" landed safely; C-5 D20="+n+".","SIM GM")}
 return true;
}
function animate(from,to,done,label){
 if(moving)return;moving=true;
 if(view==="board"&&S.inspect&&S.inspect!=="MOB")view="map";
 const onPhysical=view==="board"&&(!S.inspect||S.inspect==="MOB");
 const d1=onPhysical?boardLocation(from):point(from),d2=onPhysical?boardLocation(to):point(to);
 S.flightFX={from,to,label};render();window.OPS_COPLAY?.flight?.(from,to,label);
 const marker=$("moving-plane");const path=$("moving-route");const btn=$("flight-live-label");
 const flightBanner=$("board-flight-status");if(flightBanner){flightBanner.textContent="✈ "+label;flightBanner.classList.add("active")}
 if(btn)btn.textContent=label;
 if(path)path.setAttribute("d","M"+d1.x+" "+d1.y+" Q"+((d1.x+d2.x)/2)+" "+(Math.min(d1.y,d2.y)-95)+" "+d2.x+" "+d2.y);
 const begin=performance.now();
 function frame(t){const u=Math.min(1,(t-begin)/2600),x=d1.x+(d2.x-d1.x)*u,y=d1.y+(d2.y-d1.y)*u-110*Math.sin(Math.PI*u);if(marker){marker.setAttribute("transform","translate("+x+" "+y+")");marker.setAttribute("opacity","1")}if(u<1)requestAnimationFrame(frame);else{moving=false;S.flightFX=null;done();render();save()}}
 requestAnimationFrame(frame);
}
function dispatch(){
 if(moving)return;
 const p=plane(),pl=S.plans.find(x=>x.aircraft===p.id&&x.status==="APPROVED");
 if(!pl)return notify("First create a mission plan and load the aircraft.");
 const s=S.sites.find(x=>x.id===pl.site);
 if(s.blockedUntil>S.turn||!s.access)return notify("Site access restricted. Wait for the next turn.");
 p.status="FLYING";pl.status="ENROUTE";S.flags.dispatched=true;beep("fly");log(p.name+" airborne from MOB to "+s.name+".","SIM CAOC");
 animate("MOB",s.id,()=>{
  p.at=s.id;p.landed=S.turn;
  const landed=p.type==="C5"?resolveC5(p,s):(p.status="AT FOS",true);
  if(landed){
    if(s.firstArrival===0)s.firstArrival=S.turn;
    S.impact.unshift({turn:S.turn,level:"success",text:p.name+" delivered personnel/equipment to "+s.name+". You may now begin eligible FOS tasks."});
    for(const [k,n] of Object.entries(p.load)){
      if(k==="people")s.people+=n*5;
      else if(k==="forklift")s.forklift+=n;
      else if(["fuel","food","ammo","missile"].includes(k)){
        if(s.forklift>0 || (p.load.forklift||0)>0)s[k]+=n;
        else{S.stock[k]+=n;log("Palletized "+k+" could not download without forklift; returned to MOB stock.","SIM GM")}
      }
    }
    pl.status="DELIVERED";S.flags.arrived=true;S.training+=12;S.ratings.logistics+=5;
    log(p.name+" landed and downloaded cargo at "+s.name+". "+s.people+" people now on site.","SIM GM");
  }else{pl.status="LOST";S.impact.unshift({turn:S.turn,level:"warning",text:"C-5 lost at "+s.name+". Mission cargo was lost. Review the D20 landing-risk rule and authorized route restrictions."});}
  p.load={};
 });
}
function returnFlight(){
 if(moving)return;
 const p=plane();
 if(p.at==="MOB"||p.at==="LOST")return notify("Aircraft must be at a FOS to return.");
 if(p.status==="DAMAGED"){if(S.turn<p.until)return notify(p.name+" damaged until Turn "+p.until);p.status="AT FOS"}
 if(p.status!=="AT FOS")return notify("Aircraft cannot return in its current status.");
 if(S.turn<=p.landed)return notify("Per the OPS guide, depart on a subsequent turn. Click END TURN first.");
 const from=p.at;p.status="RETURNING";beep("fly");log(p.name+" departed FOS "+from+" for MOB.","SIM CAOC");
 animate(from,"MOB",()=>{p.status="READY";p.at="MOB";p.landed=0;S.flags.returned=true;S.training+=7;log(p.name+" returned to MOB and is available for reassignment.","SIM CAOC");S.impact.unshift({turn:S.turn,level:"success",text:p.name+" is back at MOB and ready for another delivery."})});
}
function deployFighter(){
 const s=site();
 if(!R.fighterGate.every(i=>s.tasks.includes(i)))return notify("Establish and Operate categories must all be complete before fighters deploy.");
 if(!s.fighters){s.fighters=1;s.fighterReady=S.turn+1;log("Fighter allocated to "+s.name+"; available next turn.","SIM CAOC");save();render();return}
 notify("Fighter already assigned; available Turn "+s.fighterReady);
}
function fighterSortie(){
 const s=site();
 if(!R.fighterGate.every(i=>s.tasks.includes(i)))return notify("Fighter launch blocked until all Establish and Operate tasks are complete.");
 if(!s.fighters||S.turn<s.fighterReady)return notify("Fighter not yet ready. Allocate and wait one turn.");
 if(s.fuel<1||s.ammo<1||s.missile<1)return notify("Sortie requires a fuel, bomb and missile token at FOS.");
 if(s.blockedUntil>S.turn||!s.access)return notify("Site temporarily restricted.");
 // Demo objective assumes the user selected an activated training area, not a real EXORD location.
 s.fuel--;s.ammo--;s.missile--;S.mp+=5;S.training+=15;
 const target=SIM_TARGETS.find(x=>x.id===S.targetId)||SIM_TARGETS[0];
 const roll=rnd(10),result=roll>=5?"TARGET EFFECT ACHIEVED":"TARGET EFFECT UNCERTAIN";
 S.strikes.push({turn:S.turn,site:s.id,target:target.id,roll,result});
 if(roll>=5)S.opfor=Math.max(0,S.opfor-2);
 S.impact.unshift({turn:S.turn,level:roll>=5?"success":"warning",text:"Simulated strike at "+target.name+": "+result+" (practice D10="+roll+"). "+(roll>=5?"Computer pressure reduced by 2.":"No OPFOR reduction; review mission planning assumptions.")});
 S.strikeFx={x:target.x,y:target.y,id:target.id};
 view="map";
 log("Simulated fighter sortie from "+s.name+" to "+target.name+"; "+result+". Target eligibility is NOT linked to the actual EXORD.","SIM GM");
 save();render();
 setTimeout(()=>{if(S&&S.strikeFx?.id===target.id){S.strikeFx=null;render()}},3200);
}
function drawCards(){
 if(S.events.some(x=>x.turn===S.turn))return notify("Event and Risk Card already drawn this turn.");
 const team=rnd(4),index=rnd(4)-1,event=EVENTS[S.cardChoice?.event>=0?S.cardChoice.event:rnd(EVENTS.length)-1],risk=RISKS[S.cardChoice?.risk>=0?S.cardChoice.risk:rnd(RISKS.length)-1];
 S.cardChoice={event:-1,risk:-1};
 const draw={turn:S.turn,team,fos:index,event,risk};S.events.unshift(draw);
 S.effects.push({due:S.turn+1,site:index,kind:"event",item:event},{due:S.turn+1,site:index,kind:"risk",item:risk});
 S.flags.card=true;S.ratings.decisions+=2;beep("warn");
 log("SIM GM drew Event: "+event.name+" and Risk: "+risk.name+" — Team "+team+" / "+S.sites[index].name+". Apply following turn.","SIM GM");
 modal="cards";save();render();
}
function effect(e){
 const s=S.sites[e.site],k=e.item.type;
 if(k==="weather"||k==="ramp"||k==="access"||k==="comms"||k==="maintenance"||k==="delay"){s.blockedUntil=Math.max(s.blockedUntil,S.turn+1);log(e.item.name+" temporarily restricts "+s.name+".","SIM OPFOR")}
 else if(k==="fuel"){S.stock.fuel=Math.max(0,S.stock.fuel-1);log("Simulated risk removed one MOB fuel token.","SIM OPFOR")}
 else if(k==="supply"){S.stock.food+=2;log("Computer supplied two additional food tokens at MOB.","SIM GM")}
 else if(k==="repair"){S.fleet.filter(p=>p.status==="DAMAGED").forEach(p=>p.until=Math.max(S.turn,p.until-1));log("Maintenance recovery accelerates one turn.","SIM GM")}
 else if(k==="assessment"){log("Airfield assessment support is available at "+s.name+".","SIM GM")}
 else if(k==="medical"){S.dp+=2;const m=S.medicalBoards?.[S.medicalBoard||0];if(m)m.patients.red++;S.impact.unshift({turn:S.turn,level:"warning",text:"Medical emergency: a red-priority simulated patient was added to MEDCOM. Use the MEDCOM board to establish Triage and treat the patient."});log("Medical surge generated a simulated red-priority patient and 2 practice DP.","SIM OPFOR")}
}
function endTurn(){
 S.support??={space:0,medical:0,requested:{}};
 if(moving)return notify("Finish the current flight before ending the turn.");
 if(S.finished)return notify("Mission complete. See after-action review.");
 if(!S.events.some(e=>e.turn===S.turn))drawCards();
 S.history.push({turn:S.turn,mp:S.mp,dp:S.dp,training:S.training,opfor:S.opfor,sites:S.sites.map(s=>({name:s.name,crew:s.people,tasks:s.tasks.length,rfis:s.rfis.length})),log:S.log[0]?.msg||""});
 S.turn++;
 const due=S.effects.filter(e=>e.due===S.turn);due.forEach(effect);S.effects=S.effects.filter(e=>e.due>S.turn);
 for(const s of S.sites){
  const ready=s.pending.filter(p=>p.due<=S.turn);s.pending=s.pending.filter(p=>p.due>S.turn);
  ready.forEach(t=>{if(!s.tasks.includes(t.i)){s.tasks.push(t.i);S.training+=5;log("SIM GM validated Task "+(t.i+1)+" "+R.tasks[t.i]+" at "+s.name+".","SIM GM")}});
  if(s.people>0){
    if(s.food>0){s.food--;s.shortageDays=0;}
    else{s.shortageDays=(s.shortageDays||0)+1;const penalty=s.shortageDays===1?10:30;S.dp+=penalty;const consequence=s.name+" lacks food/water (Day "+s.shortageDays+"): +"+penalty+" DP. Deliver food to avoid further readiness loss.";S.impact.unshift({turn:S.turn,level:"warning",text:consequence});log(consequence,"SIM GM")}
    if(!s.tasks.includes(13)){S.dp+=5;S.impact.unshift({turn:S.turn,level:"warning",text:s.name+" has no Health and Welfare: +5 practice DP. Assign Task 14 to reduce personnel impacts."})}
    if(s.firstArrival&&S.turn-s.firstArrival>=4&&!s.tasks.includes(0)){S.dp+=5;S.impact.unshift({turn:S.turn,level:"warning",text:s.name+" still lacks Bed Down and Sanitation after four turns: +5 practice DP."})}
  }
 }
 S.fleet.forEach(p=>{if(p.status==="DAMAGED"&&p.until<=S.turn){p.status="AT FOS";log(p.name+" repaired; ready for departure from FOS.","SIM GM")}});
 for(const m of S.medicalBoards||[]){
  const ready=m.pending.filter(t=>t.due<=S.turn);m.pending=m.pending.filter(t=>t.due>S.turn);
  for(const t of ready){if(!m.tasks.includes(t.i)){m.tasks.push(t.i);S.training+=3;log(m.name+" activated practice capability "+MEDICAL_TASKS[t.i]+".","SIM MEDCOM")}}
  if(m.patients.red>0&&!m.tasks.includes(2)){
   S.dp+=2;S.impact.unshift({turn:S.turn,level:"warning",text:m.name+" has "+m.patients.red+" critical-priority patient(s) without an active Triage Team: +2 practice DP. Activate Task 3 and start treatment."});
  }
 }
 if(S.mode==="computer"){
   const pressure={cadet:1,standard:2,veteran:4}[S.diff]||2;
   const target=S.sites.reduce((a,b)=>{
     const score=x=>x.tasks.length*4+x.people/5+x.rfis.length+x.fighters*5;
     return score(b)>score(a)?b:a;
   },S.sites[0]);
   S.opfor+=pressure;
   const attack=rnd(6)<=pressure,protectedSite=target.tasks.includes(5)&&target.tasks.includes(4);
   if(attack&&S.support.space>=S.turn){
     log("Computer CSpOC warning disrupted OPFOR targeting of "+target.name+".","SIM CSpOC");
     S.training+=4;S.support.space=0;
   }else if(attack&&protectedSite&&rnd(2)===1){
     log("Computer selected "+target.name+" for disruption, but site security reduced the effect.","SIM OPFOR");
     S.training+=3;
   }else if(attack){
     target.blockedUntil=Math.max(target.blockedUntil,S.turn+1);
     S.opfor+=2;
     if(target.fuel>0&&rnd(3)===1){target.fuel--;log("OPFOR interrupted one practice fuel token at "+target.name+".","SIM OPFOR")}
     else log("OPFOR targeted the highest-value site "+target.name+" and interrupted operations for a turn.","SIM OPFOR");
   }else log("OPFOR observed "+target.name+" and preserved assets for a future disruption.","SIM OPFOR");
 }
 if(S.support&&S.support.medical>=S.turn&&S.dp>0){const recovered=Math.min(5,S.dp);S.dp-=recovered;log("MEDCOM simulated response prevented "+recovered+" Demoralization Points.","SIM MEDCOM");S.support.medical=0}
 if(S.dp>=5){const deduct=Math.floor(S.dp/5);const already=Math.floor((S.appliedDP||0)/5);const delta=deduct-already;if(delta>0){S.mp-=delta;log("Demoralization adjustment: -"+delta+" MP (1 per 5 accumulated DP).","SCORE")}S.appliedDP=S.dp}
 S.stock.food+=0;S.phase="PLANNING";
 if(S.turn>12){S.finished=true;if(S.command)S.command.auto=false;modal="aar"}
 if(S.sites.every(x=>x.people===0)&&S.turn>=3)S.impact.unshift({turn:S.turn,level:"warning",text:"No forward operating site is staffed. Deploy a team to start FOS tasks; otherwise the mission cannot develop."});
 if(S.plans.some(x=>x.status==="APPROVED"))S.impact.unshift({turn:S.turn,level:"warning",text:"An approved airlift chalk is still waiting on the ramp. Select the aircraft and click FLY MISSION."});
 S.impact=S.impact.slice(0,32);
 log("Turn "+S.turn+" planning opened.","OPS");
 save();render();
}
function setSite(i){if(!S.sites[i])return;selected=i;S.site=i;S.flags.selected=true;save();render()}
function modeSwitch(m){if(!S)return;S.mode=m;save();render();notify("Mode changed to "+m+".")}
function resetGame(){if(!confirm("Start a fresh mission? Your current progress is saved until replaced."))return;S=null;modal="launch";render()}
function rollDice(sides){
 const n=rnd(sides);const info=sides===10?R.dice("risk",n):sides===20?R.dice("c5",n):{title:"D"+sides+" ROLL",explanation:"Rolled "+n};
 S.roll={sides,number:n,title:info.title,body:info.explanation,kind:"SIM GAME MASTER"};
 log("Dice D"+sides+" result "+n+": "+info.title,"SIM GM");modal="dice";save();render();
}
function sound(){S.sound=!S.sound;save();render();notify(S.sound?"Sound enabled":"Sound muted")}
function shortSite(s){return s.tasks.length+"/16 tasks · "+s.rfis.length+"/10 RFIs"}
function smallStatus(p){return p.status==="READY"?"READY @ MOB":p.status+" @ "+(p.at==="MOB"?"MOB":p.at==="LOST"?"LOST":"FOS "+p.at)}
function renderHeader(){
 return '<div class="topbar"><a href="index.html" class="brand" title="Mission lobby">OPS <b>/// PACIFIC SHIELD</b></a><div class="topmiddle"><div class="hudstat"><span class="micro">TURN</span><strong>'+S.turn+' / 12</strong></div><div class="hudstat"><span class="micro">MISSION POINTS</span><strong class="gold">'+S.mp+'</strong></div><div class="hudstat"><span class="micro">MODE</span><strong>'+h(S.mode).toUpperCase()+'</strong></div></div><div class="righttop"><button class="smallbtn" data-action="invite">👥 INVITE TEAM</button><button class="smallbtn" data-action="sound">'+(S.sound?"🔊 SOUND":"🔇 SOUND")+'</button><button class="smallbtn" data-action="save">SAVE</button><button class="smallbtn" data-action="rules">RULES</button><button class="smallbtn" data-action="menu">MENU</button></div></div>';
}
function renderMap(){
 let grid="",land="";
 for(let x=0;x<900;x+=50)grid+='<line class="gridline" x1="'+x+'" x2="'+x+'" y1="0" y2="510"/>';
 for(let y=0;y<510;y+=50)grid+='<line class="gridline" x1="0" x2="900" y1="'+y+'" y2="'+y+'"/>';
 land='<path class="land" d="M565 0 L640 0 674 59 648 98 692 141 680 174 616 157 597 110 553 75Z"/><path class="land" d="M471 198 L502 226 501 276 526 301 501 344 475 316 456 272Z"/><path class="land" d="M165 215 L252 225 295 255 261 291 221 320 176 300Z"/><path class="land" d="M240 360 L364 350 411 391 391 435 311 454 247 415Z"/><path class="land" d="M650 240 L700 276 683 301 664 289Z"/>';
 const routes=S.sites.map(s=>'<path class="ring" d="M'+HOME.x+' '+HOME.y+' L'+s.x+' '+s.y+'"/>').join("");
 const sites=S.sites.map((s,i)=>'<g data-action="select-site" data-index="'+i+'" class="site '+(selected===i?"selected":"")+'" tabindex="0" role="button" aria-label="Select '+s.name+'" transform="translate('+s.x+' '+s.y+')"><circle r="17"/><text text-anchor="middle" dy="5" class="site-number">'+s.id+'</text><text text-anchor="middle" y="-31" class="sitelabel">'+s.name+'</text><text text-anchor="middle" y="34" class="sitetype">'+s.tasks.length+'/16 CAPABLE</text></g>').join("");
 const targets=SIM_TARGETS.map(t=>'<g class="sim-target '+(S.targetId===t.id?"selected":"")+'" data-action="target-select" data-id="'+t.id+'" tabindex="0" role="button" aria-label="Select fictional training target '+t.name+'" transform="translate('+t.x+' '+t.y+')"><circle r="17"/><path d="M-21 0H21M0 -21V21" stroke-width="2" stroke="#ffce8c"/><text y="34" text-anchor="middle">'+t.id+'</text></g>').join("");
 const blast=S.strikeFx?'<g class="strike-blast" transform="translate('+S.strikeFx.x+' '+S.strikeFx.y+')"><circle class="strike-ring" r="12"/><circle class="strike-core" r="5"/><text y="-26" text-anchor="middle">SIMULATED STRIKE</text></g>':"";
 const fleet=S.fleet.filter(p=>p.status!=="LOST"&&p.status!=="FLYING"&&p.status!=="RETURNING").map((p,i)=>{const pt=point(p.at);const x=pt.x-24+(i%2)*45,y=pt.y+40+Math.floor(i/2)*34;return '<g class="aircraftdot" role="button" tabindex="0" aria-label="Select '+p.name+'" data-action="select-plane" data-plane="'+p.id+'" transform="translate('+x+' '+y+')"><rect rx="8" width="41" height="25"/><text x="20" y="17" text-anchor="middle">✈</text></g>'}).join("");
 return '<div class="mapframe" id="mapframe"><svg viewBox="0 0 900 510" preserveAspectRatio="xMidYMid meet" aria-label="Clickable OPS operational map" role="img"><rect class="mapbg" width="900" height="510"/>'+grid+land+'<circle class="ring" cx="260" cy="290" r="220"/>'+routes+'<g class="mob" data-action="select-mob"><circle cx="'+HOME.x+'" cy="'+HOME.y+'" r="26"/><text x="'+HOME.x+'" y="'+(HOME.y+6)+'" fill="#fff" text-anchor="middle" font-weight="900" font-size="14">MOB</text></g>'+sites+targets+blast+fleet+'<path id="moving-route" class="route" d="" /><g id="moving-plane" transform="translate(-100 -100)" opacity="0" class="flying"><circle r="19" fill="#ffc86e"/><text text-anchor="middle" dy="6" font-size="24" fill="#112633">✈</text></g><text x="20" y="35" font-size="11" fill="#88bbc8" letter-spacing="3">PACIFIC THEATER • TRAINING SCHEMATIC / NOT TO SCALE</text><text x="835" y="489" text-anchor="end" font-size="10" fill="#88bbc8">SELECT SITE OR AIRCRAFT TOKEN</text></svg></div><div class="mapcaption"><div class="maplegend"><span><i class="dot green"></i> MOB</span><span><i class="dot gold"></i> SELECTED FOS</span><span><i class="dot"></i> OTHER FOS</span></div><span class="micro" id="flight-live-label">'+(S.flightFX?h(S.flightFX.label):"CLICK A BOARD TOKEN TO COMMAND IT")+'</span></div>';
}

function boardInspector(){
 S.inspect??="MOB";S.boardZoom??=1;S.boardLayer??="tasks";S.boardPick??={type:"intro"};S.medicalBoards??=Array.from({length:4},(_,i)=>({name:"MEDCOM "+(i+1),tasks:[],pending:[],patients:{red:0,yellow:0,green:0},supply:8}));
 const options=[
  ["MOB","MOB Board X4.png"],["CAOC","https://raw.githubusercontent.com/Lele4u2/Operation-Pacific-Shield-Interactive-Simulator/main/CAOC Board.png"],
  ["SPACE","CSPOC Board.png"],["MEDCOM","MEDCOM MOB x4.png"],["LOAD","MEDCOM C-130, C-17 and C-5 Loadout Board.png"]
 ];
 const which=S.inspect,item=options.find(x=>x[0]===which)||options[0];
 let out='<div class="original-board-toolbar"><div class="tabs">'+options.map(x=>'<button data-action="inspect" data-id="'+x[0]+'" class="'+(which===x[0]?"active":"")+'">'+x[0]+'</button>').join("")+'</div><div class="board-zoom-controls"><button data-action="board-zoom" data-step="-.4">−</button><button data-action="board-reset">FIT</button><button data-action="board-zoom" data-step=".4">＋</button><button class="primary" data-action="board-focus">FOCUS FOS</button></div></div>';
 if(which==="MOB")out+='<div class="board-banner"><strong>LIVE SOURCE BOARD</strong><span>Click an airfield number, RFI box or numbered task. Every action updates this board and the game.</span></div>';
 out+='<div class="board-lesson board-lesson-top" id="board-lesson">'+boardHelp(which)+'</div><div class="original-board-viewport" id="originalBoardScroll"><div class="original-board-stage" style="width:'+(100*S.boardZoom)+'%"><img src="'+encodeURI(item[1])+'" draggable="false" data-action="board-image-tap" alt="Original Operation Pacific Shield '+which+' tabletop board" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><div class="board-image-fallback" style="display:none">This original '+which+' board image is not yet in the published repository. Its live controls below still work. Upload the missing image to your GitHub main branch using the expected filename.</div>';
 if(which==="MOB"){
  const flightSlots=S.fleet.filter(p=>p.status!=="LOST").map((p,i)=>{
    const pos=boardLocation(p.at),sx=pos.x/10+((i%2)*3-2),sy=pos.y/10+(Math.floor(i/2)*3+3);
    return '<button class="board-aircraft-token" style="left:'+sx+'%;top:'+sy+'%" data-action="select-plane" data-plane="'+p.id+'" title="'+h(p.name)+' at '+h(String(p.at))+'">✈ '+p.id+' <small>'+h(p.status)+'</small></button>';
  }).join("");
  out+='<svg class="board-mission-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path id="moving-route" d="" class="board-flight-route"/><g id="moving-plane" opacity="0" transform="translate(-100 -100)" class="board-flight-plane"><circle r="24" fill="#ffc86e"/><text text-anchor="middle" dy="8" font-size="33" fill="#0d2433">✈</text></g></svg><div id="board-flight-status" class="board-flight-status">SELECT AN AIRCRAFT TO FLY A MISSION</div>'+flightSlots;
  const sectors=[
   {x:47.3,y:61.5,rfiX:8.3,rfiY:76.0,num:1},
   {x:52.7,y:61.5,rfiX:63.7,rfiY:76.0,num:2},
   {x:52.7,y:34.3,rfiX:91.6,rfiY:24.0,num:3},
   {x:47.3,y:34.3,rfiX:36.5,rfiY:24.0,num:4}
  ];
  sectors.forEach((p,k)=>{
   const f=S.sites[k];
   out+='<button class="board-airfield '+(selected===k?"current":"")+'" style="left:'+p.x+'%;top:'+p.y+'%" data-action="select-site" data-index="'+k+'" title="Select original board Airfield '+p.num+'">AF '+p.num+'<small>'+f.name+'</small></button>';
   out+='<button class="board-rfi '+(selected===k?"current":"")+'" style="left:'+p.rfiX+'%;top:'+p.rfiY+'%" data-action="board-rfi" data-index="'+k+'">RFI '+f.rfis.length+'/10</button>';
  });
  if(S.boardLayer==="tasks"){
   const xs=[19.2,26.7,19.2,26.7,35.0,41.7,35.0,41.7,19.2,26.7,19.2,26.7,35.0,41.7,35.0,41.7];
   const ys=[67.1,67.1,74.4,74.4,67.1,67.1,74.4,74.4,83.8,83.8,90.7,90.7,83.8,83.8,90.7,90.7];
   for(let i=0;i<16;i++){
    let x=xs[i],y=ys[i];
    if(selected===1)x+=54.5;
    else if(selected===2){x=94.0-x;y=100-y}
    else if(selected===3){x=45.0-x;y=100-y}
    const f=site(),done=f.tasks.includes(i),pending=f.pending.some(t=>t.i===i);
    out+='<button class="board-task-token '+(done?"complete":pending?"pending":"")+'" style="left:'+x+'%;top:'+y+'%" data-action="board-task" data-index="'+i+'" title="'+h(R.tasks[i])+'">'+(done?"✓":pending?"◷":i+1)+'</button>';
   }
  }
  const crew=site().people,taskCt=site().tasks.length;
  const resourceX=selected===0?27:selected===1?81:selected===2?81:27;
  out+='<button class="board-cargo" style="left:'+resourceX+'%;top:'+(selected<2?95:5)+'%" data-action="board-cargo">✈ '+site().name+' · '+crew+' PERSONNEL · '+taskCt+'/16 TASKS</button>';
  out+='<button class="board-cards" style="left:50%;top:79%" data-action="board-cards">🎴 CARDS</button>';
 }else{
  out+='<button class="board-other-action" data-action="board-workstation" data-id="'+which+'">OPEN LIVE '+which+' WORKSTATION →</button>';
  if(which==="CAOC"){
    S.fleet.forEach((p,i)=>{
      out+='<button class="board-other-token" style="left:'+(17+i*21)+'%;top:54%" data-action="select-plane" data-plane="'+p.id+'">✈ '+p.id+'<small>'+p.status+'</small></button>';
    });
    out+='<button class="board-other-token" style="left:50%;top:82%" data-action="board-cargo">VIEW FLIGHT PLANS / ATO</button>';
  }else if(which==="SPACE"){
    const satList=S.satellites||[];
    const points=[{x:19,y:25},{x:49,y:55},{x:78,y:37}];
    satList.forEach((sat,i)=>{
      const p=points[i]||points[0];
      out+='<button class="board-satellite '+(S.selectedSatellite===sat.id?"selected":"")+'" style="left:'+p.x+'%;top:'+p.y+'%" data-action="board-satellite" data-id="'+sat.id+'">🛰 '+sat.id+'<small>'+sat.name+'</small></button>';
    });
    out+='<button class="board-other-token" style="left:50%;top:83%" data-action="sat-support" data-id="'+(S.selectedSatellite||"M1")+'">▶ TASK SELECTED SATELLITE</button>';
  }else if(which==="MEDCOM"){
    out+='<button class="board-other-token" style="left:49%;top:50%" data-action="support" data-id="medical">✚ REQUEST MEDCOM SUPPORT</button>';
    const options=[{x:26,y:47},{x:74,y:47},{x:26,y:10},{x:74,y:10}];
    options.forEach((pos,i)=>out+='<button class="board-med-picker '+((S.medicalBoard||0)===i?"current":"")+'" style="left:'+pos.x+'%;top:'+pos.y+'%" data-action="med-board" data-index="'+i+'">MEDCOM '+(i+1)+'</button>');
    const xs=[23,30,23,30,38,45,38,45,23,30,23,30,38,45,38,45];
    const ys=[61,61,70,70,61,61,70,70,80,80,90,90,80,80,90,90];
    const k=S.medicalBoard||0,m=S.medicalBoards[k];
    for(let i=0;i<16;i++){
      let x=xs[i],y=ys[i];
      if(k===1)x+=50;
      if(k===2){x=50-x;y=100-y}
      if(k===3){x=100-x;y=100-y}
      out+='<button class="board-med-task '+(m.tasks.includes(i)?"complete":"")+'" style="left:'+x+'%;top:'+y+'%" data-action="med-task" data-index="'+i+'" title="'+MEDICAL_TASKS[i]+'">'+(m.tasks.includes(i)?"✓":i+1)+'</button>';
    }
    out+='<button class="board-other-token" style="left:50%;top:96%" data-action="med-incident">TRAINING PATIENT ARRIVAL</button>';
  }else if(which==="LOAD"){
    const choices=[["C130-A",18],["C17-A",49],["C5-A",79]];
    for(const [id,x] of choices)out+='<button class="board-other-token" style="left:'+x+'%;top:82%" data-action="select-plane" data-plane="'+id+'">✈ LOAD '+id+'</button>';
  }
 }
 out+='</div></div>';
 if(which==="MOB")out+='<div class="board-toggle"><button data-action="board-layer" data-id="tasks" class="'+(S.boardLayer==="tasks"?"active":"")+'">TASK MARKERS</button><button data-action="board-layer" data-id="clear" class="'+(S.boardLayer==="clear"?"active":"")+'">CLEAN BOARD</button><button data-action="board-rfi" data-index="'+selected+'">REQUEST RFIs</button><button data-action="board-cargo">AIRCRAFT / CARGO</button></div>';
 return out;
}
function boardHelp(which){
 const f=site(),p=S.boardPick||{type:"intro"},brief='<div class="board-facts"><span>'+f.name+'</span><span>'+f.people+' PEOPLE</span><span>'+f.tasks.length+'/16 TASKS</span><span>'+f.rfis.length+'/10 RFIs</span></div>';
 if(which==="SPACE"){
  S.satellites??=[{id:"M1",name:"ISR Training Satellite",usedTurn:0},{id:"M2",name:"SATCOM Training Satellite",usedTurn:0},{id:"L1",name:"Space Warning Satellite",usedTurn:0}];
  const sat=S.satellites.find(x=>x.id===S.selectedSatellite)||S.satellites[0];
  return '<div class="micro">LIVE SPACE BOARD / TRACKS</div><h3>🛰 '+h(sat.name)+'</h3><p>The original CSpOC board shows satellite orbital tracks. Select a moving training token on the artwork to designate support, then task it. The animated markers represent practice assets, not exact orbital ephemerides.</p><div class="board-facts"><span>'+h(sat.id)+'</span><span>'+(sat.usedTurn===S.turn?"USED THIS TURN":"AVAILABLE THIS TURN")+'</span><span>'+(S.support?.space>=S.turn?"SUPPORT ACTIVE":"SUPPORT NOT ACTIVE")+'</span></div><div class="actions"><button class="primary" data-action="sat-support" data-id="'+sat.id+'" '+(sat.usedTurn===S.turn?"disabled":"")+'>TASK SATELLITE</button><button data-action="tab" data-id="support">SPACE SUPPORT STATUS</button><button data-action="rules">RULES GUIDE</button></div>';
 }
 if(which==="MEDCOM"){
  const m=S.medicalBoards?.[S.medicalBoard||0];
  if(!m)return '<div class="callout">Select a MEDCOM board to begin.</div>';
  let guide='<div class="micro">MEDICAL BOARD '+((S.medicalBoard||0)+1)+' / PATIENT CARE</div><h3>MEDCOM LIVE TASK BOARD</h3><p>Select a task number on the original MEDCOM artwork, start a medical capability, or simulate an arriving patient. Requirements and timing beyond the named board tasks are practice-only.</p>';
  guide+='<div class="board-facts"><span>'+m.tasks.length+'/16 TASKS</span><span>'+m.supply+' PRACTICE SUPPLIES</span><span>RED '+m.patients.red+'</span><span>YELLOW '+m.patients.yellow+'</span><span>GREEN '+m.patients.green+'</span></div>';
  if(p.type==="med-task"){
    const i=p.i;guide+='<div class="board-instructions"><b>MEDCOM TASK '+(i+1)+': '+h(MEDICAL_TASKS[i])+'</b>. Activating this capability uses one practice medical supply and finishes on a later turn. Treat the original sheet as the authority for additional costs.</div><div class="actions"><button class="primary" data-action="med-start" data-index="'+i+'" '+(m.tasks.includes(i)||m.pending.some(x=>x.i===i)?"disabled":"")+'>START TASK '+(i+1)+'</button></div>';
  }
  guide+='<div class="actions"><button data-action="med-incident">SIMULATE PATIENT ARRIVAL</button><button class="primary" data-action="med-triage">TRIAGE / TREAT</button><button data-action="support" data-id="medical">REQUEST MEDICAL SUPPORT</button></div>';
  return guide;
 }
 if(which!=="MOB"){
  const text=which==="CAOC"?"Use CAOC flight allocation and airlift planning to approve routes and launch aircraft.":which==="LOAD"?"The source loadout board is a reference for aircraft capacity and equipment. Plan practice chalks in the AIRLIFT workbench.":which==="SPACE"?"Space support can counter a computer-generated disruption during a turn.":"MEDCOM support can mitigate practice demoralization penalties.";
  return '<div class="micro">ORIGINAL '+which+' BOARD / LIVE WORKSTATION</div><h3>'+which+' — WHAT YOU DO HERE</h3><p>'+text+'</p><div class="actions"><button class="primary" data-action="board-workstation" data-id="'+which+'">OPEN LIVE CONTROLS</button><button data-action="rules">OPEN GUIDELINES</button></div>';
 }
 if(p.type==="task"){
  const i=p.i,pre=taskPrereq(i),missing=pre.filter(n=>!f.tasks.includes(n));
  let explain="This is one of 16 FOS capability tasks. The computer checks known prerequisites and personnel, then progresses the task as turns pass.";
  const notes={
   0:"Bed Down and Sanitation: build living and sanitation infrastructure. Power (Task 2) must be complete first. The guide specifies 5–10 people: 4 turns; 11–20: 2 turns; 21 or more: 1 turn.",
   1:"Power: establish electrical support for the FOS. This task unlocks Bed Down and Sanitation (Task 1).",
   2:"Command and Control: establish the FOS ability to coordinate personnel, communications, and operations. Check the equipment and personnel icons printed on this task square.",
   3:"Contracts: establish contracting capability before assigning any tasks that the host nation may perform. Only one eligible task can be contracted per turn under the guide.",
   4:"Ramp Security: protect the aircraft parking and handling area. Completing this task is required before Mobility Support (Task 10).",
   5:"Perimeter Security: establish defensive security around the forward site. Check the security resources illustrated in this square.",
   6:"Missile Defense: build protection against a missile threat. The original task square displays the defensive resource requirements and combat modifier.",
   7:"Camouflage and Base Hardening: build concealment and hardening against attack. The source guide specifies 10 personnel over 2 turns, or 11–20 over 1 turn.",
   8:"Airfield Operations: establish the ability to control and operate the airfield. This is an Operate task required before fighter operations from the FOS.",
   9:"Mobility Support: enable the site to receive, unload and support airlift. Task 5 (Ramp Security) must be finished first.",
   10:"Integrated Combat Turns: create an FOS capability for fighter turn operations. All Establish and Operate tasks must be complete before fighter sorties.",
   11:"Specialized Fueling Operations: provide the fueling capability for combat aircraft. This is part of the fighter launch readiness gate.",
   12:"Host Nation Relationships: coordinate with the host nation. The guide says an appropriately resourced Ops/Intel team and vehicle can generate Resource Points; the full RP exchange is not yet simulated.",
   13:"Health and Welfare: support the personnel at the FOS. The guide assesses demoralization when this task is not complete.",
   14:"Base Recovery: prepare to repair airfield facilities after successful attacks. The guide uses this task in airfield recovery rules.",
   15:"Logistics Support: sustain the deployed airfield through continued supply and support. Check printed personnel, commodity and prerequisite symbols."
  };
  if(notes[i])explain=notes[i];
  let status=f.tasks.includes(i)?"COMPLETE":f.pending.some(t=>t.i===i)?"IN PROGRESS":missing.length?"REQUIRES TASK "+missing.map(x=>x+1).join(", "):f.people<5?"NEED 5+ PERSONNEL":"READY FOR TASKING";
  return brief+'<div class="micro">BOARD TASK '+(i+1)+' · '+R.categories[Math.floor(i/4)]+' · '+status+'</div><h3>'+h(R.tasks[i])+'</h3><p>'+explain+'</p><div class="board-instructions">TO PLAY: Request the task on this board. If prerequisites and staffing are present, the simulated instructor schedules its completion. Exact unverified costs are not assumed to be official.</div><div class="actions"><button class="primary" data-action="board-start-task" data-index="'+i+'" '+(f.tasks.includes(i)||f.pending.some(t=>t.i===i)?"disabled":"")+'>▶ START TASK '+(i+1)+'</button><button data-action="board-cargo">SEND PERSONNEL</button><button data-action="rules">TASK GUIDE</button></div>';
 }
 if(p.type==="rfi"){
  return brief+'<div class="micro">REQUESTS FOR INFORMATION / AIRFIELD ASSESSMENT</div><h3>ASK THE INSTRUCTOR ABOUT '+f.name+'</h3><p>Begin with five initial RFIs, then ask the remaining questions. After all ten responses, the board awards 5 Mission Points using the verified assessment rule.</p><div class="board-instructions">Responses are generated by the simulated instructor for practice, not real-world airfield condition reports.</div><div class="actions"><button class="primary" data-action="initial-rfi" '+(f.rfis.length>=5?"disabled":"")+'>ASK INITIAL FIVE</button><button data-action="board-next-rfi" '+(f.rfis.length===10?"disabled":"")+'>ASK NEXT RFI</button><button data-action="rules">READ GUIDE</button></div>';
 }
 if(p.type==="cargo"){
  return brief+'<div class="micro">MOB / AIRLIFT SUPPORT</div><h3>MOVE RESOURCES TO '+f.name+'</h3><p>Select a C-130, C-17 or C-5, load counters in the AIRLIFT workbench, submit the practice plan and launch. This board updates personnel and resources when the plane arrives. Return flights require a later turn.</p><div class="actions"><button class="primary" data-action="tab" data-id="flight">OPEN AIRLIFT CONTROLS</button><button data-action="inspect" data-id="LOAD">VIEW LOADOUT BOARD</button></div>';
 }
 if(p.type==="cards"){
  return brief+'<div class="micro">ORIGINAL EVENT AND RISK DECK</div><h3>DRAW EVENT / RISK CARDS</h3><p>A D4 selects the team and another D4 selects the FOS. Card effects take place on the following turn. The computer uses labeled practice injects.</p><button class="primary" data-action="tab" data-id="events">OPEN LIVE EVENT CARDS</button>';
 }
 return brief+'<div class="micro">GUIDED LIVE BOARD / START HERE</div><h3>CLICK YOUR ORIGINAL OPS BOARD TO PLAY</h3><p><b>1.</b> Choose Airfield 1–4. <b>2.</b> Click an RFI box to assess the FOS. <b>3.</b> Click task numbers on that FOS for requirements and activation. <b>4.</b> Use the aircraft and Event/Risk controls on the board to move resources and handle instructor decisions.</p><div class="actions"><button class="primary" data-action="board-rfi" data-index="'+selected+'">START WITH RFIs</button><button data-action="board-cargo">SEND AN AIRCRAFT</button><button data-action="rules">SEE THE GUIDELINES</button></div>';
}
function renderLeft(){
 const intro='<div class="panel"><div class="panel-head"><div><div class="micro">MISSION OBJECTIVES</div><h3>AGILE BASING</h3></div><span class="chip ok">SIM LIVE</span></div><p>Disperse capability, assess FOS sites, move resources and generate eligible sorties.</p><div class="scoregrid"><div class="scorebox"><b class="gold">'+S.mp+'</b><span>MISSION PTS</span></div><div class="scorebox"><b>'+S.training+'</b><span>TRAINING PTS</span></div><div class="scorebox"><b class="red">'+S.dp+'</b><span>DEMORALIZATION</span></div></div><div class="separator"></div><div class="micro">TURN PROGRESS</div><div class="progress"><span style="width:'+Math.min(100,S.turn/12*100)+'%"></span></div><div class="actions" style="margin-top:9px"><button class="primary" data-action="end-turn">END TURN →</button><button data-action="aar">AFTER-ACTION</button></div></div>';
 const rs='<div class="panel"><div class="panel-head"><div><div class="micro">MAIN OPERATING BASE</div><h3>MOB INVENTORY</h3></div></div><div class="resource-list">'+CARGO.map(c=>'<div class="resource"><span>'+c.icon+' '+c.name.split(" ")[0]+'</span><b>'+S.stock[c.id]+'</b></div>').join("")+'</div><p class="micro" style="margin-top:9px">Practice tokens. Official configurations remain on the source loadout boards.</p></div>';
 const fl='<div class="panel"><div class="panel-head"><div><div class="micro">AIR COMPONENT</div><h3>AIRCRAFT ROSTER</h3></div></div>'+S.fleet.map(p=>'<div data-action="select-plane" data-plane="'+p.id+'" class="fleet-item '+(p.id===activePlane?"on":"")+'"><div class="fleet-icon">✈</div><div><b>'+p.id+' · '+p.name+'</b><small>'+h(smallStatus(p))+'</small></div></div>').join("")+'</div>';
 return '<aside class="column left">'+intro+rs+fl+'</aside>';
}
function renderCoach(){
 const t=tutorial();
 if(t)return '<div class="panel guide" id="coach"><div class="micro">GUIDED ON-BOARD TRAINING</div><div class="guide-counter"><div class="stepno">'+(t.index+1)+'</div><h3>'+h(t.step[0])+'</h3></div><p>'+h(t.step[1])+'</p><div class="progress"><span style="width:'+((t.index+(t.step[2]?1:0))/t.total*100)+'%"></span></div><div class="guide-actions"><button data-action="guide">SHOW ME WHERE</button><button data-action="help">WHY?</button></div>'+(t.done?'<div class="status success">All tutorial milestones completed — continue free play!</div>':'')+'</div>';
 const msg=S.mode==="computer"?"Computer opponent: its pressure increases on your strongest FOS each turn. Keep aircraft flowing and build resilient capability.":"Free play: select a site or aircraft on the live board and make a decision.";
 return '<div class="panel guide"><div class="micro">MISSION COMMANDER COACH</div><h3>'+(S.mode==="computer"?"PLAY THE COMPUTER":"FREE-PLAY COACH")+'</h3><p>'+msg+'</p><div class="actions"><button data-action="guide">NEXT BEST ACTION</button><button data-action="help">RULES COACH</button></div></div>';
}
function renderImpact(){
 const rows=(S.impact||[]).slice(0,5);
 const pending=S.plans.filter(p=>p.status==="APPROVED").length;
 const gap=S.sites.filter(f=>f.people>0&&f.food===0).length;
 if(!rows.length&&pending===0&&gap===0)return '<div class="panel"><div class="micro">COMMAND IMPACT ASSESSMENT</div><div class="status success">No unresolved simulation warnings. Continue assessing FOS capabilities and supply lines.</div></div>';
 return '<div class="panel"><div class="panel-head"><div><div class="micro">CONSEQUENCE-BASED LEARNING</div><h3>MISSION IMPACT & NEXT ACTION</h3></div><span class="chip bad">'+rows.filter(x=>x.level==="warning").length+' ALERTS</span></div>'+
 (pending?'<div class="impact-row warning"><b>FLIGHT PLANS AWAITING EXECUTION</b><p>'+pending+' approved chalk(s) are not airborne. Those resources cannot help the FOS until the aircraft arrives.</p><button data-action="tab" data-id="flight">OPEN AIRLIFT →</button></div>':"")+
 (gap?'<div class="impact-row warning"><b>SUPPLY AT RISK</b><p>'+gap+' occupied FOS site(s) have no food. Deliver food to avoid demoralization consequences.</p><button data-action="tab" data-id="flight">PLAN FOOD RESUPPLY →</button></div>':"")+
 rows.map(x=>'<div class="impact-row '+(x.level==="success"?"success":"warning")+'"><b>TURN '+x.turn+' · '+(x.level==="success"?"MISSION PROGRESS":"ACTION REQUIRED")+'</b><p>'+h(x.text)+'</p></div>').join("")+'</div>';
}
function renderCenter(){
 return '<main class="column center">'+renderCoach()+'<div class="panel"><div class="panel-head"><div><div class="micro">ORIGINAL BOARD / LIVE GAME</div><h2>THE ORIGINAL OPS BOARD — PLAYABLE</h2></div><span class="chip '+(moving?"bad":"ok")+'">'+(moving?"AIRCRAFT IN FLIGHT":"TACTICAL OVERVIEW")+'</span></div><div class="tabs" style="margin-bottom:10px"><button data-action="view" data-id="map" class="'+(view==="map"?"active":"")+'">MISSION MAP</button><button data-action="view" data-id="board" class="'+(view==="board"?"active":"")+'">PLAY ORIGINAL BOARD</button><button data-action="view" data-id="timeline" class="'+(view==="timeline"?"active":"")+'">MISSION TRACK</button></div>'+(view==="map"?renderMap():view==="board"?boardInspector():renderTimeline())+'</div><div class="panel"><div class="panel-head"><div><div class="micro">SITE DEVELOPMENT</div><h3>FOUR FORWARD OPERATING SITES</h3></div></div><div class="site-actions">'+S.sites.map((s,i)=>'<button class="'+(selected===i?"primary":"")+'" data-action="select-site" data-index="'+i+'">'+s.name+' / '+s.country+'<br><span style="font-size:10px;font-weight:500">'+shortSite(s)+'</span></button>').join("")+'</div></div><div class="panel"><div class="panel-head"><div><div class="micro">LIVE OPERATIONS NET</div><h3>COMMAND LOG</h3></div><button class="flat" data-action="aar">VIEW AAR ↗</button></div><div class="log">'+S.log.slice(0,16).map(x=>'<div class="log-entry"><b>T'+x.turn+' / '+h(x.who)+'</b> · '+h(x.msg)+'</div>').join("")+'</div></div>'+renderImpact()+'</main>';
}
function renderTimeline(){
 return '<div class="stack">'+S.plans.slice().reverse().map(p=>'<div class="missioncard"><div class="micro">'+h(p.id)+' · T'+p.turn+'</div><strong>'+h(p.aircraft)+' → FOS '+p.site+'</strong><p>MISSION STATUS: '+p.status+' · '+cargoWeight(p.load)+' loaded counters</p></div>').join("")+'<div class="callout">Aircraft must return after a subsequent turn. Missions are saved between visits.</div></div>';
}
function renderSite(){
 const s=site();const valid=R.fighterGate.every(i=>s.tasks.includes(i));
 let html='<div class="micro">SITE COMMAND / FOS '+s.id+'</div><h2>'+s.name+'</h2><p>'+s.country+' · '+s.people+' personnel · '+s.forklift+' forklift(s)</p><div class="scoregrid"><div class="scorebox"><b>'+s.rfis.length+'/10</b><span>RFIS</span></div><div class="scorebox"><b>'+s.tasks.length+'/16</b><span>TASKS</span></div><div class="scorebox"><b>'+s.fighters+'</b><span>FIGHTERS</span></div></div>';
 html+='<div class="separator"></div><div class="panel-head"><h3>AIRFIELD ASSESSMENT</h3><span class="chip">'+(s.rfis.length<5?"INITIAL RFIs":"FOLLOW-ON")+'</span></div><p>Answer all ten RFIs to earn 5 Mission Points under the OPS scoring rule.</p><button class="primary full" data-action="initial-rfi" '+(s.rfis.length>=5?"disabled":"")+'>REQUEST FIVE INITIAL RFIs</button><div class="task-grid" style="margin-top:9px">'+RFI_NAMES.map((n,i)=>'<button class="task '+(s.rfis.includes(i)?"done":"")+'" data-action="rfi" data-index="'+i+'" '+(s.rfis.includes(i)?"disabled":"")+'><strong>'+(s.rfis.includes(i)?"✓ ":"○ ")+h(n)+'</strong><small>'+(s.rfis.includes(i)?"ANSWERED BY SIM GM":"REQUEST RESPONSE")+'</small></button>').join("")+'</div>';
 html+='<div class="separator"></div><h3>AIRFIELD CAPABILITY</h3><p>Use resources and verified prerequisites. Other personnel and timing requirements are represented by labeled practice assumptions.</p>';
 R.categories.forEach((category,cat)=>{
  html+='<div class="micro" style="margin:12px 0 5px">'+h(category)+'</div><div class="task-grid">';
  for(let i=cat*4;i<cat*4+4;i++){
   const done=s.tasks.includes(i),pend=s.pending.find(x=>x.i===i),missing=taskPrereq(i).filter(x=>!s.tasks.includes(x));
   html+='<button class="task '+(done?"done":pend?"pending":"")+'" data-action="task" data-index="'+i+'" '+(done||pend?"disabled":"")+'><strong>'+(done?"✓":pend?"◷":"○")+" "+(i+1)+". "+h(R.tasks[i])+'</strong><small>'+(done?"COMPLETE":pend?"FINISH T"+pend.due:missing.length?"REQUIRES TASK "+missing.map(x=>x+1).join(", "):"CLICK TO ASSIGN")+'</small></button>';
  }html+='</div>';
 });
 html+='<div class="separator"></div><div class="status '+(valid?"success":"warn")+'">FIGHTER OPERATIONS: '+(valid?"ESTABLISH + OPERATE COMPLETE":"LOCKED — FINISH ALL ESTABLISH AND OPERATE TASKS")+'</div><div class="actions" style="margin-top:8px"><button data-action="fighter-assign" '+(!valid?"disabled":"")+'>ASSIGN FIGHTER</button><button class="primary" data-action="fighter-launch" '+(!valid?"disabled":"")+'>LAUNCH SORTIE +5 MP</button></div><p class="micro">Training strike targets are fictional. Select SIM-A/B/C on the MISSION MAP; exercise eligibility must be validated against your EXORD.</p>';
 return html;
}
function renderFlight(){
 const p=plane(),s=site(),plan=S.plans.find(x=>x.aircraft===p.id&&x.status==="APPROVED");
 let html='<div class="micro">CFACC / AIR MOBILITY</div><h2>AIRLIFT PLANNER</h2><p>Move real inventory counters. After landing, the aircraft remains at the FOS until you return it on a subsequent turn.</p><div class="panel-head"><h3>SELECT AIRCRAFT</h3><span class="chip">'+capacity(p)+' PRACTICE SLOTS</span></div>';
 html+='<div class="tabs">'+S.fleet.map(f=>'<button data-action="select-plane" data-plane="'+f.id+'" class="'+(f.id===p.id?"active":"")+'">'+f.id+'</button>').join("")+'</div><div class="status '+(p.status==="READY"?"success":"warn")+'">'+p.name+' · '+smallStatus(p)+'</div>';
 html+='<div class="separator"></div><div class="micro">TARGET SITE</div><div class="tabs" style="margin-top:8px">'+S.sites.map((f,i)=>'<button data-action="select-site" data-index="'+i+'" class="'+(selected===i?"active":"")+'">'+f.name+'</button>').join("")+'</div>';
 if(p.status==="READY"){
  html+='<div class="separator"></div><div class="panel-head"><h3>BUILD A CHALK</h3><b class="gold">'+cargoWeight(cargo)+' / '+capacity(p)+'</b></div>';
  CARGO.forEach(c=>{html+='<div class="cargo-row"><span>'+c.icon+'</span><div class="name"><b>'+c.name+'</b><div class="micro">MOB AVAILABLE '+S.stock[c.id]+'</div></div><button data-action="cargo" data-id="'+c.id+'" data-step="-1">−</button><strong>'+(cargo[c.id]||0)+'</strong><button data-action="cargo" data-id="'+c.id+'" data-step="1">+</button></div>'});
  html+='<p class="micro">Source boards use aircraft-specific configurations. These slots are transparent training defaults, not the official load-planning capacity.</p><button class="primary full" data-action="plan">SUBMIT CHALK / SIM CAOC APPROVAL</button>';
 }
 if(plan){html+='<div class="missioncard"><div class="micro">SIMULATED ATO APPROVED</div><h3>'+plan.id+' → '+s.name+'</h3><p>Cargo secured. Execute the outbound leg to unload your resources at FOS '+plan.site+'.</p><button class="primary full" data-action="dispatch">✈ FLY MISSION TO FOS</button></div>'}
 if(p.status==="AT FOS"||p.status==="DAMAGED"){html+='<div class="missioncard"><h3>'+p.name+' AT FOS '+p.at+'</h3><p>Arrived Turn '+p.landed+'. '+(p.status==="DAMAGED"?"Damaged until Turn "+p.until+".":"Return requires a subsequent turn.")+'</p><button class="primary full" data-action="return" '+(S.turn<=p.landed||p.status==="DAMAGED"?"disabled":"")+'>↩ RETURN AIRCRAFT TO MOB</button></div>'}
 if(p.status==="LOST")html+='<div class="status warn">Aircraft lost in a simulated landing-risk event. This asset cannot be reused.</div>';
 return html;
}
function renderEvents(){
 const drew=S.events.some(x=>x.turn===S.turn);
 S.cardChoice??={event:-1,risk:-1};
 let box='<div class="micro">SIMULATED GAME MASTER / PRACTICE DECK</div><h2>EVENT & RISK DESK</h2><p>Choose an Event and Risk Card, or leave them unselected for random assignment. The D4 rolls select team and FOS. Effects begin on the following turn.</p><h3>EVENT CARD OPTIONS</h3><div class="task-grid" style="margin:8px 0">';
 EVENTS.forEach((c,i)=>box+='<button class="task '+(S.cardChoice.event===i?"pending":"")+'" data-action="choose-card" data-kind="event" data-index="'+i+'" '+(drew?"disabled":"")+'><strong>🎴 '+h(c.name)+'</strong><small>'+(S.cardChoice.event===i?"SELECTED FOR NEXT DRAW":"SELECT THIS CARD")+'</small></button>');
 box+='</div><h3>RISK CARD OPTIONS</h3><div class="task-grid" style="margin:8px 0">';
 RISKS.forEach((c,i)=>box+='<button class="task '+(S.cardChoice.risk===i?"pending":"")+'" data-action="choose-card" data-kind="risk" data-index="'+i+'" '+(drew?"disabled":"")+'><strong>⚠ '+h(c.name)+'</strong><small>'+(S.cardChoice.risk===i?"SELECTED FOR NEXT DRAW":"SELECT THIS CARD")+'</small></button>');
 box+='</div><button class="primary full" data-action="cards" '+(drew?"disabled":"")+'>🎲 DRAW / REVEAL EVENT + RISK CARDS</button>';
 box+='<p class="micro">These are representative interactive training cards, NOT transcriptions of the official physical OPS card deck.</p>';
 box+='<div style="margin-top:10px">'+(S.events.length?S.events.slice(0,3).map(c=>'<div class="eventcard"><div class="eventtype">TURN '+c.turn+' · TEAM '+c.team+' · '+S.sites[c.fos].name+'</div><h3>'+h(c.event.name)+'</h3><p>'+h(c.event.body)+'</p><div class="separator"></div><div class="eventtype">RISK CARD</div><h4>'+h(c.risk.name)+'</h4><p>'+h(c.risk.body)+'</p></div>').join(""):'<div class="callout">No cards drawn yet. Draw this turn or let the computer draw at the end.</div>')+'</div>';
 box+='<div class="separator"></div><h3>GAME MASTER DICE</h3><div class="actions" style="margin-top:9px"><button data-action="dice" data-sides="4">ROLL D4</button><button data-action="dice" data-sides="10">ROLL D10</button><button data-action="dice" data-sides="20">ROLL D20</button></div><div class="separator"></div><h3>COMPUTER OPPONENT</h3><p>Difficulty '+h(S.diff.toUpperCase())+' · SIM OPFOR pressure '+S.opfor+'. The computer selects developed FOS locations and schedules mission constraints.</p><div class="status">SIMULATED INSTRUCTOR, NOT AN OFFICIAL OPS ADJUDICATION</div>';
 return box;
}
function renderRight(){
 let current=tab;if(!["site","flight","events","support"].includes(current))current="site";
 return '<aside class="column right"><div class="panel"><div class="panel-head"><div><div class="micro">MISSION WORKBENCH</div><h3>COMMAND ACTIONS</h3></div></div><div class="tabs" style="margin-bottom:14px"><button data-action="tab" data-id="site" class="'+(current==="site"?"active":"")+'">FOS</button><button data-action="tab" data-id="flight" class="'+(current==="flight"?"active":"")+'">AIRLIFT</button><button data-action="tab" data-id="events" class="'+(current==="events"?"active":"")+'">GM CARDS</button><button data-action="tab" data-id="support" class="'+(current==="support"?"active":"")+'">SUPPORT</button></div>'+(current==="site"?renderSite():current==="flight"?renderFlight():current==="events"?renderEvents():renderSupport())+'</div></aside>';
}
function useSatellite(id){
 S.satellites??=[{id:"M1",name:"ISR Training Satellite",usedTurn:0},{id:"M2",name:"SATCOM Training Satellite",usedTurn:0},{id:"L1",name:"Space Warning Satellite",usedTurn:0}];
 const a=S.satellites.find(x=>x.id===id)||S.satellites[0];
 if(a.usedTurn===S.turn)return notify(a.name+" was already tasked this turn.");
 a.usedTurn=S.turn;S.selectedSatellite=a.id;
 S.support??={space:0,medical:0,requested:{}};
 S.support.space=S.turn+1;
 S.training+=3;
 S.impact.unshift({turn:S.turn,level:"success",text:"CSpOC assigned "+a.name+" for simulated warning support through the next turn. This may counter one OPFOR disruption."});
 log("CSpOC training asset "+a.id+" tasked for space support through Turn "+(S.turn+1)+".","SIM CSpOC");save();render();
}
function medAction(i){
 S.medicalBoards??=Array.from({length:4},(_,i)=>({name:"MEDCOM "+(i+1),tasks:[],pending:[],patients:{red:0,yellow:0,green:0},supply:8}));
 const m=S.medicalBoards[S.medicalBoard||0];
 if(m.tasks.includes(i)||m.pending.some(x=>x.i===i))return notify("This MEDCOM capability is already complete or underway.");
 if(m.supply<1)return notify("Medical practice supplies are depleted. The simulated instructor cannot start another task.");
 m.supply--;m.pending.push({i,due:S.turn+(i===3?2:1)});
 log("SIM MEDCOM scheduled "+MEDICAL_TASKS[i]+" (Task "+(i+1)+") to complete on Turn "+(S.turn+(i===3?2:1))+". Practice supply -1.","SIM MEDCOM");
 S.training+=1;save();render();
}
function medTriage(){
 const m=S.medicalBoards[S.medicalBoard||0];
 if(!m.tasks.includes(2))return notify("First complete MEDCOM Task 3: Triage Team.");
 if(m.patients.red>0&&!m.tasks.includes(1)&&!m.tasks.includes(3))return notify("Critical patient needs Battlefield Surgery or Battlefield Hospital capability.");
 const kind=m.patients.red?"red":m.patients.yellow?"yellow":"green";
 if(!m.patients[kind])return notify("No patients are awaiting treatment.");
 m.patients[kind]--;S.training+=5;S.dp=Math.max(0,S.dp-2);
 S.impact.unshift({turn:S.turn,level:"success",text:m.name+" completed a simulated "+kind+"-priority patient treatment. Practice demoralization decreased."});
 log(m.name+" completed triage/treatment for one "+kind+" patient.","SIM MEDCOM");save();render();
}
function renderSupport(){
 S.support??={space:0,medical:0,requested:{}};
 return '<div class="micro">SUPPORT COMPONENTS</div><h2>JOINT SUPPORT</h2><div class="missioncard"><h3>CSpOC</h3><p>Space warning and synchronization: in computer mode, a timely CSpOC request can counter one simulated OPFOR disruption.</p><div class="status '+(S.support.space>=S.turn?"success":"")+'">'+(S.support.space>=S.turn?"SPACE SUPPORT ACTIVE":"AWAITING REQUEST")+'</div><button class="full" data-action="support" data-id="space" '+(S.support.requested.space===S.turn?"disabled":"")+'>REQUEST SIM CSpOC ASSESSMENT</button></div><div class="missioncard"><h3>MEDCOM</h3><p>Medical coordination can mitigate up to five practice Demoralization Points in the following turn.</p><div class="status '+(S.support.medical>=S.turn?"success":"")+'">'+(S.support.medical>=S.turn?"MEDICAL SUPPORT ACTIVE":"AWAITING REQUEST")+'</div><button class="full" data-action="support" data-id="medical" '+(S.support.requested.medical===S.turn?"disabled":"")+'>REQUEST SIM MEDCOM SUPPORT</button></div><p class="micro">These are explicitly simulated support mechanics, not official component execution rules.</p>';
}
function aarHTML(){
 const playerScore=S.mp+Math.floor(S.training/8),enemyScore=S.opfor;
 const verdict=S.mode==="computer"?(playerScore>=enemyScore?"MISSION ADVANTAGE — FRIENDLY FORCES":"OPFOR HOLDS THE INITIATIVE"):"PRACTICE MISSION REVIEW";
 const timeline=S.history.slice(-12).map(x=>'<div class="row" style="padding:7px 0;border-bottom:1px solid #29475a"><span>TURN '+x.turn+'</span><strong class="gold">'+x.mp+' MP</strong><span class="mute">'+x.training+' TRAINING</span><button data-action="replay" data-index="'+(x.turn-1)+'">REVIEW</button></div>').join("");
 const total=S.plans.filter(p=>p.status==="DELIVERED").length,loss=S.fleet.filter(p=>p.status==="LOST").length,returns=S.flags.returned?1:0;
 let needs=[];
 if(!S.sites.some(x=>x.rfis.length===10))needs.push("Complete a ten-RFI airfield assessment for verified mission points.");
 if(!S.sites.some(x=>R.fighterGate.every(i=>x.tasks.includes(i))))needs.push("Finish all Establish and Operate tasks before scheduling a fighter sortie.");
 if(S.sites.some(x=>x.people>0&&!x.food))needs.push("Improve food and water support at occupied FOS locations.");
 if(loss)needs.push("Review C-5 FOS landing risks and route alternatives.");
 if(!total)needs.push("Build and launch an airlift mission to create a functioning FOS.");
 if(!needs.length)needs.push("You have built a foundation. Compare decisions against the authorized user guide.");
 return '<div class="micro">AFTER-ACTION REPORT / TURN '+S.turn+'</div><h1>'+verdict+'</h1><p>Friendly practice score: <b class="gold">'+playerScore+'</b> · Computer pressure: <b>'+enemyScore+'</b>. These comparative scores are simulated training metrics.</p><div class="scoregrid" style="margin:15px 0"><div class="scorebox"><b>'+S.mp+'</b><span>OPS MISSION PTS</span></div><div class="scorebox"><b>'+S.training+'</b><span>TRAINING POINTS</span></div><div class="scorebox"><b>'+S.dp+'</b><span>DEMORALIZATION</span></div></div><div class="resource-list"><div class="resource"><span>Delivered flights</span><b>'+total+'</b></div><div class="resource"><span>Aircraft lost</span><b>'+loss+'</b></div></div><h3 style="margin-top:15px">SITE READINESS</h3>'+S.sites.map(x=>'<div class="resource" style="margin:7px 0"><span>'+x.name+' · '+x.people+' personnel · '+x.rfis.length+'/10 RFIs</span><b>'+x.tasks.length+'/16</b></div>').join("")+'<h3 style="margin-top:15px">DEBRIEF FOCUS</h3><div class="stack">'+needs.map(n=>'<div class="callout">'+h(n)+'</div>').join("")+'</div><h3 style="margin-top:15px">TURN-BY-TURN REVIEW</h3>'+timeline+'<div id="turn-review" class="callout" style="margin-top:8px">Choose a turn to inspect its state and summary.</div><p>OPS MP uses verified scoring for complete assessments and simulated eligible sorties. Practice AI, training points, and this comparative outcome are not official OPS assessment scores.</p><div class="actions"><button data-action="print">PRINT / SAVE PDF</button><button data-action="save">SAVE GAME</button><button class="primary" data-action="new-game">NEW CAMPAIGN</button></div>';
}
function rulesHTML(){
 return '<div class="micro">SOURCE-ALIGNED TRAINING REFERENCE</div><h2>OPS RULES & COACH</h2><div class="rulesbox">'+[
 ["MISSION OBJECTIVE","Disperse from Main Operating Bases to build and sustain Forward Operating Sites. Earn Mission Points for eligible actions."],
 ["ASSESSMENT","+5 Mission Points when all 10 RFIs for an airfield have been answered. Five initial RFIs are requested per FOS."],
 ["AIRFIELD TASKS","16 tasks across Establish, Defend, Operate and Maintain. Task 1 requires Power (2). Task 10 requires Ramp Security (5). Other dependencies and costs remain subject to the original board."],
 ["FIGHTER SORTIES","All Establish and Operate tasks must be complete. Fighters require ICT, SFO, fuel and munitions and eligible activated operational areas. Valid sortie +5 MP."],
 ["MOBILITY","Mobility aircraft use aircraft-specific load planners, routes, PPR and MOG. An aircraft may depart on a subsequent turn after unloading."],
 ["C-5 FOS RISK","D20: 1–3 crash, 4–6 damaged 2 turns, 7–10 damaged 1 turn, 11–20 land unharmed. This does not waive USTRANSCOM allowable risk limits."],
 ["EVENT / RISK","One Event and one Risk per turn. D4 selects team and another D4 selects FOS. Effects apply on the next turn."],
 ["DEMORALIZATION","Five accumulated Demoralization Points cost one Mission Point. Additional rules cover food/water, welfare and overcrowding."],
 ["VERIFIED VS PRACTICE","Verified: named tasks, some prerequisites, scoring, C-5 and risk dice, card timing. Practice-only: simplified cargo slots, computer decisions, simulated card texts, geographic schematic, turn limit and training scores."]
 ].map(x=>'<div class="rule"><strong>'+x[0]+'</strong><p>'+x[1]+'</p></div>').join("")+'<div class="rule"><strong>READ THE SOURCE GUIDES</strong><p><a target="_blank" rel="noopener" href="https://github.com/Lele4u2/OPS-Interactive-Game/blob/main/OPERATION%20PACIFIC%20SHIELD%20User%20Guide%20%28CAO%2030%20Mar%202026%29.pdf">Open the March 2026 OPS User Guide</a></p><p><a target="_blank" rel="noopener" href="https://github.com/Lele4u2/OPS-Interactive-Game/blob/main/OPERATION%20PACIFIC%20SHIELD%20Quickstart%20Guide.pdf">Open OPS Quickstart</a></p></div></div>';
}
function modalHTML(){
 if(!modal)return "";
 let inner="";
 if(modal==="launch"){
  inner='<div class="micro">OPERATION PACIFIC SHIELD // COMMAND SIMULATION V4</div><h1>CHOOSE YOUR<br><span class="gold">MISSION MODE</span></h1><p>This is an original playable OPS training simulator with a live clickable board, computer decisions, aircraft missions and guided learning. Instructor-specific rules are explicitly identified.</p><div class="choice"><button data-action="start" data-mode="tutorial" data-diff="cadet" class="selected"><b>🎓 GUIDED</b><small>Step-by-step on the board. Learn as you command.</small></button><button data-action="start" data-mode="computer" data-diff="standard"><b>🎮 COMPUTER</b><small>AI pressure, training scenarios and score.</small></button><button data-action="start" data-mode="sandbox" data-diff="cadet"><b>⚙ SANDBOX</b><small>Explore aircraft, support and rules freely.</small></button></div><p class="micro">COMPUTER LEVEL: <select id="difficult" style="background:#17384b;padding:8px;color:white"><option value="cadet">Cadet — forgiving</option><option value="standard" selected>Standard — balanced</option><option value="veteran">Veteran — aggressive</option></select></p><footer><button class="primary" data-action="start" data-mode="tutorial" data-diff="cadet">START TRAINING</button><button data-action="resume">RESUME SAVE</button></footer>';
 }else if(modal==="rules"){inner=rulesHTML()+'<footer><button class="primary" data-action="close">RETURN TO GAME</button></footer>';}
 else if(modal==="aar"){inner=aarHTML()+'<footer><button class="primary" data-action="close">CONTINUE</button></footer>';}
 else if(modal==="cards"){
  const c=S.events[0];inner='<div class="micro">SIMULATED INSTRUCTOR / NEXT TURN EFFECT</div><h2>EVENT & RISK DRAW</h2><div class="eventcard" style="margin:15px 0"><div class="eventtype">TEAM '+c.team+' · '+S.sites[c.fos].name+'</div><h3>'+c.event.name+'</h3><p>'+c.event.body+'</p><div class="separator"></div><div class="eventtype">RISK CARD</div><h3>'+c.risk.name+'</h3><p>'+c.risk.body+'</p></div><p>Both effects will resolve on Turn '+(c.turn+1)+'. Cards are representative computer-generated practice injects, not the printed OPS deck.</p><footer><button class="primary" data-action="close">ACKNOWLEDGE</button></footer>';
 }else if(modal==="dice"){
  const r=S.roll;inner='<div class="micro">'+h(r.kind)+'</div><h2>GAME MASTER D'+r.sides+'</h2><div class="dice-stage"><div class="die rolling" id="rolling-die">?</div></div><h3 class="gold" id="dice-end" style="text-align:center;display:none">'+r.number+' · '+h(r.title)+'</h3><p style="text-align:center">'+h(r.body||"")+'</p><footer><button class="primary" data-action="close">CONTINUE</button></footer>';
 }else if(modal==="menu"){
  inner='<div class="micro">MISSION OPTIONS</div><h2>CAMPAIGN CONTROL</h2><p>Continue your current operation, save it, start another mode, or review the complete rules.</p><div class="stack"><button data-action="save">SAVE MISSION</button><button data-action="rules">RULES REFERENCE</button><button data-action="aar">AFTER-ACTION REVIEW</button><div class="micro">COMPUTER OPPOSITION DIFFICULTY</div><div class="actions"><button data-action="difficulty" data-id="cadet">CADET</button><button data-action="difficulty" data-id="standard">STANDARD</button><button data-action="difficulty" data-id="veteran">VETERAN</button></div><button data-action="new-game">START NEW GAME</button></div><footer><button class="primary" data-action="close">RESUME OPERATION</button></footer>';
 }
 return '<div class="modalwrap" id="modalwrap"><div class="modal '+(modal==="aar"?"wide":"")+'">'+(modal!=="launch"?'<button class="close flat" data-action="close">✕</button>':"")+inner+'</div></div>';
}
function render(){
 const oldBoard=$("originalBoardScroll");
 if(oldBoard&&S&&!S.boardFocus&&!S.boardSkipCapture)S.boardScroll={left:oldBoard.scrollLeft,top:oldBoard.scrollTop};
 if(S)S.boardSkipCapture=false;
 if(!S){root.innerHTML='<div class="boot"><div class="bootmark">OPS <span>/</span> PACIFIC SHIELD</div></div>'+modalHTML();return}
 root.innerHTML=renderHeader()+'<div class="layout">'+renderLeft()+renderCenter()+renderRight()+'</div>'+modalHTML();
 if($("originalBoardScroll"))requestAnimationFrame(()=>{
   const el=$("originalBoardScroll");if(!el)return;
   if(S.boardFocus){
     const cx=(selected===0||selected===3)?.28:.78,cy=selected<=1?.76:.24;
     el.scrollLeft=Math.max(0,el.scrollWidth*cx-el.clientWidth/2);
     el.scrollTop=Math.max(0,el.scrollHeight*cy-el.clientHeight/2);
     S.boardFocus=false;
   }else if(S.boardScroll){el.scrollLeft=S.boardScroll.left;el.scrollTop=S.boardScroll.top;}
 });
 if(modal==="dice"){const d=$("rolling-die"),n=S.roll.number;let t=0;const id=setInterval(()=>{if(!d||!d.isConnected){clearInterval(id);return}d.textContent=rnd(S.roll.sides);if(++t>15){clearInterval(id);d.classList.remove("rolling");d.textContent=n;const e=$("dice-end");if(e)e.style.display="block"}},85)}
}
function action(e){
 const target=e.target.closest("[data-action]");if(!target||moving)return;
 const a=target.dataset.action;
 const i=Number(target.dataset.index),id=target.dataset.id;
 if(window.OPS_COPLAY?.intercept?.(a,{...target.dataset,clientSite:selected,clientPlane:activePlane}))return;
 if(a==="start"){const m=target.dataset.mode,d=m==="computer"?($("difficult")?.value||target.dataset.diff||"standard"):"cadet";start(m,d)}
 else if(a==="resume")loadSaved();
 else if(a==="close"){modal="";render()}
 else if(a==="select-site"){setSite(i);tab="site";render()}
 else if(a==="select-plane")selectPlane(target.dataset.plane);
 else if(a==="select-mob"){tab="flight";render()}
 else if(a==="rfi")requestRFI(i);
 else if(a==="initial-rfi")requestInitial();
 else if(a==="task")startTask(i);
 else if(a==="tab"){tab=id;render()}
 else if(a==="view"){view=id;render()}
 else if(a==="board-task"){S.boardPick={type:"task",i};tab="site";render()}
 else if(a==="board-start-task"){S.boardPick={type:"task",i};startTask(i)}
 else if(a==="board-rfi"){setSite(i);S.boardPick={type:"rfi"};tab="site";render()}
 else if(a==="board-next-rfi"){const next=RFI_NAMES.findIndex((_,n)=>!site().rfis.includes(n));if(next>=0)requestRFI(next);else notify("Ten-RFI assessment complete.")}
 else if(a==="board-cargo"){S.boardPick={type:"cargo"};tab="flight";render()}
 else if(a==="board-cards"){S.boardPick={type:"cards"};tab="events";render()}
 else if(a==="board-layer"){S.boardLayer=id;render()}
 else if(a==="board-zoom"){S.boardZoom=Math.max(1,Math.min(3.2,Math.round(((S.boardZoom||1)+Number(target.dataset.step))*10)/10));render()}
 else if(a==="board-reset"){S.boardZoom=1;S.boardScroll={left:0,top:0};S.boardSkipCapture=true;render()}
 else if(a==="board-focus"){S.boardZoom=2;S.boardFocus=true;render()}
 else if(a==="board-workstation"){view="board";tab=(id==="SPACE"||id==="MEDCOM")?"support":"flight";render()}
 else if(a==="board-image-tap"){
   const rect=target.getBoundingClientRect();
   const x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
   const sector=y>=50?(x<50?0:1):(x>=50?2:3);
   if(sector!==selected)setSite(sector);
   const xs=[19.2,26.7,19.2,26.7,35,41.7,35,41.7,19.2,26.7,19.2,26.7,35,41.7,35,41.7];
   const ys=[67.1,67.1,74.4,74.4,67.1,67.1,74.4,74.4,83.8,83.8,90.7,90.7,83.8,83.8,90.7,90.7];
   let near=-1,distance=100;
   for(let j=0;j<16;j++){
     let px=xs[j],py=ys[j];if(sector===1)px+=54.5;else if(sector===2){px=94-px;py=100-py}else if(sector===3){px=45-px;py=100-py}
     const d=Math.sqrt((x-px)**2+((y-py)/1.4)**2);
     if(d<distance){distance=d;near=j}
   }
   S.boardPick=distance<5.5?{type:"task",i:near}:((sector===0&&x<17)||(sector===1&&x<72&&x>54)||(sector===2&&x>86)||(sector===3&&x>30&&x<47))?{type:"rfi"}:{type:"intro"};
   tab="site";render();
 }
 else if(a==="inspect"){view="board";S.inspect=id;S.boardZoom=1;S.boardScroll={left:0,top:0};S.boardSkipCapture=true;render()}
 else if(a==="cargo")changeCargo(id,Number(target.dataset.step));
 else if(a==="plan")createPlan();
 else if(a==="dispatch")dispatch();
 else if(a==="return")returnFlight();
 else if(a==="fighter-assign")deployFighter();
 else if(a==="fighter-launch")fighterSortie();
 else if(a==="board-satellite"){S.selectedSatellite=id;save();render()}
 else if(a==="sat-support"){useSatellite(id)}
 else if(a==="med-board"){S.medicalBoard=i;S.boardPick={type:"intro"};render()}
 else if(a==="med-task"){S.boardPick={type:"med-task",i};render()}
 else if(a==="med-start"){medAction(i)}
 else if(a==="med-triage"){medTriage()}
 else if(a==="med-incident"){S.medicalBoards[S.medicalBoard||0].patients.red++;S.impact.unshift({turn:S.turn,level:"warning",text:"Training patient arrival: red-priority casualty on MEDCOM "+((S.medicalBoard||0)+1)+". Complete Triage Team and treatment capability."});save();render()}
 else if(a==="target-select"){S.targetId=id;tab="site";save();render();notify("Selected simulated target: "+id)}
 else if(a==="cards")drawCards();
 else if(a==="choose-card"){S.cardChoice??={event:-1,risk:-1};S.cardChoice[target.dataset.kind]=i;save();render()}
 else if(a==="end-turn")endTurn();
 else if(a==="dice")rollDice(Number(target.dataset.sides));
 else if(a==="support"){
   S.support??={space:0,medical:0,requested:{}};
   if(S.support.requested[id]===S.turn)return notify("This support function already responded during this turn.");
   S.support.requested[id]=S.turn;S.support[id]=S.turn+1;
   log("SIM "+id.toUpperCase()+" support approved through next turn. "+(id==="space"?"Suppresses one computer disruption.":"Mitigates up to 5 practice DP."),"SIM GM");
   S.training+=2;save();render();notify(id+" support window activated.");
 }
 else if(a==="aar"){modal="aar";render()}
 else if(a==="print"){window.print()}
 else if(a==="replay"){const record=S.history[i];const el=$("turn-review");if(el&&record){el.innerHTML="<b>TURN "+record.turn+" | "+record.mp+" MP</b><p>"+record.sites.map(x=>x.name+": "+x.tasks+" tasks, "+x.rfis+" RFIs, "+x.crew+" personnel").join("<br>")+"</p><p>"+h(record.log)+"</p>"}}
 else if(a==="rules"){modal="rules";render()}
 else if(a==="menu"){modal="menu";render()}
 else if(a==="new-game")resetGame();
 else if(a==="save")save(true);
 else if(a==="invite"){if(window.OPS_COPLAY?.open)window.OPS_COPLAY.open();else notify("Team connection is still loading. Try again.")}
 else if(a==="sound"){sound()}
 else if(a==="difficulty"){S.diff=id;log("Computer challenge difficulty changed to "+id,"OPS");save();render();notify("Opponent difficulty: "+id)}
 else if(a==="guide"){const t=tutorial();if(t){view="board";S.inspect="MOB";tab=t.step[3];if(t.index>=8)tab=t.step[3];render();const btn=document.querySelector('[data-action="'+({map:"select-site",site:"initial-rfi",flight:"plan",events:"cards"}[tab]||"select-site")+'"]');btn?.classList.add("flash");btn?.scrollIntoView({block:"center",behavior:"smooth"})}else{tab=site().people<5?"flight":"site";view="board";render()}}
 else if(a==="help"){modal="rules";render()}
}
root.addEventListener("click",action);
root.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("g[data-action]")){e.preventDefault();action({target:e.target})}});
const requested=new URLSearchParams(location.search).get("mode");
let shouldAutoStart=["tutorial","computer","sandbox"].includes(requested);
if(shouldAutoStart){start(requested,requested==="computer"?"standard":"cadet");if(requested==="tutorial")tab="map"}
else{S=null;modal="launch";render()}
window.OPS_DEBUG={
 getState:()=>S?JSON.parse(JSON.stringify(S)):null,requestRFI,setSite,selectPlane,changeCargo,createPlan,dispatch,returnFlight,endTurn,start,render,issueOrder,commandPulse,recommendOrder,
 applyRemote:state=>{
  if(!state||state.version!==4||!Array.isArray(state.sites)||!Array.isArray(state.fleet))return;
  const previousSite=selected,previousPlane=activePlane;
  S=JSON.parse(JSON.stringify(state));ensureCommand();S.support??={space:0,medical:0,requested:{}};S.impact??=[];S.strikes??=[];
  selected=Math.min(S.sites.length-1,previousSite);activePlane=S.fleet.some(p=>p.id===previousPlane)?previousPlane:S.fleet[0]?.id;
  modal="";view="board";tab="site";render();
 },
 invoke:(name,data={})=>{
  if(!S)return;
  if(data.clientSite!==undefined){const n=Number(data.clientSite);if(S.sites[n]){selected=n;S.site=n}}
  if(data.clientPlane&&S.fleet.some(p=>p.id===data.clientPlane)){activePlane=data.clientPlane;S.selectedPlane=activePlane}
  action({target:{closest:()=>({dataset:{...data,action:name}})}});
 },
 showRemoteFlight:(from,to,label)=>{
  if(!S||moving)return;
  view="board";S.inspect="MOB";
  animate(from,to,()=>{},label);
 }
};
})();