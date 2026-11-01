
"use strict";

const $ = id => document.getElementById(id);
const R = window.OPS_RULES;
const SAVE_KEY = "OPS_MISSION_ENGINE_V3";

let G = null;
let gameChoice = 1;
let roleChoice = "MOB";
let station = "MOB";
let tab = "BRIEF";
let siteIndex = 0;
let cargoKind = "pallet";
let zoom = 1;
let panX = 0;
let panY = 0;
let busy = false;
let rolling = false;

const esc = v => String(v).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",
  '"':"&quot;","'":"&#39;"
})[c]);

function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.t);
  toast.t = setTimeout(() =>
    $("toast").classList.add("hidden"), 3400);
}

function say(msg, who = "OPS") {
  G.log.unshift({turn:G.turn, who, msg});
  G.log = G.log.slice(0,130);
}

function prng(n) {
  const a = new Uint32Array(1);
  const range = 4294967296;
  const limit = range - (range % n);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limit);
  return a[0] % n + 1;
}

function newState() {
  return {
    game:gameChoice,
    role:roleChoice,
    turn:1,
    phase:"BRIEF",
    seq:0,
    review:{orders:false,access:false},
    ai:$("aiEnable").checked,
    home:{pallet:24,team:24},
    sites:Array.from({length:4},(_,i)=>({
      name:`FOS ${i+1}`,
      location:"",
      rfis:[],
      responses:{},
      stock:{pallet:0,team:0},
      complete:[],
      pending:[],
      requirements:{}
    })),
    aircraft:R.aircraft.map(p=>({
      ...p,
      status:"AVAILABLE",
      load:[],
      unavailableUntil:0
    })),
    requests:[],
    support:{SPACE:"OPEN",MEDCOM:"OPEN"},
    pendingEvents:[],
    rolls:[],
    log:[]
  };
}

function aircraft(id) {
  return G.aircraft.find(p=>p.id===id);
}

function request(id) {
  return G.requests.find(r=>r.id===id);
}

function allowed(role) {
  return G && G.phase==="PLAN" && !busy && G.role===role;
}

function save(show=false) {
  if (!G || busy) return;
  try {
    localStorage.setItem(SAVE_KEY,JSON.stringify(G));
    if (show) toast("Mission saved locally in this browser");
  } catch(e) {
    if (show) toast("Browser storage is unavailable");
  }
}

function choices() {
  $("gameChoices").innerHTML = [1,2].map(n=>`
    <button class="${gameChoice===n?"active":""}"
      data-game="${n}">GAME ${n}</button>
  `).join("");

  $("roleChoices").innerHTML = R.roles.map(r=>`
    <button class="${roleChoice===r?"active":""}"
      data-role="${r}">${r}</button>
  `).join("");

  document.querySelectorAll("[data-game]").forEach(b=>{
    b.onclick=()=>{
      gameChoice=Number(b.dataset.game);
      choices();
    };
  });

  document.querySelectorAll("[data-role]").forEach(b=>{
    b.onclick=()=>{
      roleChoice=b.dataset.role;
      choices();
    };
  });
}

function start() {
  G=newState();
  station=roleChoice;
  tab="BRIEF";
  $("start").classList.add("hidden");
  say(`OPS Game ${G.game} initialized. Initial inventories are practice defaults.`);
  render();
  save();
}

function resume() {
  try {
    const x=JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!x || !x.sites || !x.aircraft || !x.requests)
      throw Error("Missing save");

    G=x;
    station=x.role;
    tab=x.role;
    $("start").classList.add("hidden");
    render();
  } catch(e) {
    toast("No saved mission found");
  }
}

function switchRole() {
  if (!G || busy) return;
  G.role=R.roles[
    (R.roles.indexOf(G.role)+1)%R.roles.length
  ];
  station=G.role;
  tab=G.role;
  say(`Human position now ${G.role}`);
  render();
  save();
}

function selectStation(s) {
  station=s;
  tab=s;
  zoom=1;
  panX=0;
  panY=0;
  render();
}

function setTab(t) {
  tab=t;
  render();
}

function site(i) {
  siteIndex=i;
  render();
}

function review(k) {
  G.review[k]=true;
  say(`Mission ${k} review acknowledged`);
  render();
  save();
}

function renderBoard() {
  const image=$("boardImage");
  image.src=R.boards[station];

  $("boardName").textContent=
    station==="SPACE" ? "CSpOC" : station+" BOARD";

  const icons={
    MOB:"▦",CAOC:"✈",SPACE:"◉",MEDCOM:"✚"
  };

  $("stations").innerHTML=R.roles.map(r=>`
    <button data-station="${r}"
      class="station ${r===station?"active":""}">
      <span>${icons[r]}</span>
      ${r==="SPACE"?"CSpOC":r}
    </button>
  `).join("");

  document.querySelectorAll("[data-station]").forEach(b=>{
    b.onclick=()=>selectStation(b.dataset.station);
  });

  $("sites").innerHTML=station==="MOB"?
    G.sites.map((s,i)=>`
      <button class="${siteIndex===i?"active":""}"
        data-site="${i}">
        ${s.name}
      </button>
    `).join(""):"";

  document.querySelectorAll("[data-site]").forEach(b=>{
    b.onclick=()=>site(Number(b.dataset.site));
  });

  transformBoard();
}

function transformBoard() {
  $("boardImage").style.transform=
    `translate(calc(-50% + ${panX}px),
     calc(-50% + ${panY}px)) scale(${zoom})`;
}

let drag=null;

$("boardViewport").addEventListener("pointerdown",e=>{
  drag={
    x:e.clientX,
    y:e.clientY,
    a:panX,
    b:panY
  };
  e.currentTarget.setPointerCapture(e.pointerId);
});

$("boardViewport").addEventListener("pointermove",e=>{
  if (!drag) return;
  panX=drag.a+e.clientX-drag.x;
  panY=drag.b+e.clientY-drag.y;
  transformBoard();
});

for (const ev of ["pointerup","pointercancel"]) {
  $("boardViewport").addEventListener(ev,()=>{
    drag=null;
  });
}

$("zoomPlus").onclick=()=>{
  zoom=Math.min(4,zoom+.25);
  transformBoard();
};
$("zoomMinus").onclick=()=>{
  zoom=Math.max(1,zoom-.25);
  transformBoard();
};
$("zoomReset").onclick=()=>{
  zoom=1;
  panX=0;
  panY=0;
  transformBoard();
};

function flightAnimation(label,done) {
  if (busy) return;
  busy=true;
  $("advance").disabled=true;
  $("flightStatus").textContent=label;

  const startTime=performance.now();
  const duration=3500;
  const sprite=$("sprite");

  function frame(now) {
    const t=Math.min(1,(now-startTime)/duration);
    const x=10+80*t;
    const y=72-50*Math.sin(Math.PI*t);

    sprite.style.left=x+"%";
    sprite.style.top=y+"%";
    sprite.style.transform=
      `translate(-50%,-50%) rotate(${-23+46*t}deg)`;

    if (t<1) {
      requestAnimationFrame(frame);
    } else {
      busy=false;
      if (done) done();
      render();
    }
  }
  requestAnimationFrame(frame);
}

$("preview").onclick=()=>{
  if (!G || busy) return;
  flightAnimation("FLIGHT PREVIEW (NO CARGO MOVED)",()=>{
    $("flightStatus").textContent=
      "Preview complete — no mission resources changed";
  });
};

function resultMeaning(mode,value) {
  if (mode==="combat") {
    const [a,b]=value;
    return {
      title:a===b?
        "TIE — INSTRUCTOR ADJUDICATION":
        a>b?"FIRST ROLL HIGHER":"SECOND ROLL HIGHER",
      explanation:`First: ${a}; second: ${b}.`,
      note:
        "Instructor resolves combat per aircraft " +
        "combat strength and opposition."
    };
  }
  return R.dice(mode,value);
}

function roll() {
  if (rolling) return;

  const mode=$("diceMode").value;
  const a=mode==="combat"?
    Number($("sideA").value):
    ["team","fos","dp4"].includes(mode)?4:
    mode==="c5"?20:10;

  const b=mode==="combat"?
    Number($("sideB").value):0;

  const final=b?[prng(a),prng(b)]:prng(a);

  rolling=true;
  $("roll").disabled=true;
  $("diceStatus").textContent=
    "TUMBLING — FINAL NUMBER HIDDEN";

  const die=$("die");
  die.classList.remove("rolling");
  void die.offsetWidth;
  die.classList.add("rolling");

  let ticks=0;

  const timer=setInterval(()=>{
    const display=prng(Math.max(a,b||a));

    // Decorative faces change during the animation.
    die.querySelectorAll(".face").forEach(face=>{
      face.textContent=display;
    });

    ticks++;

    if (ticks>=25) {
      clearInterval(timer);
      die.classList.remove("rolling");

      const display=Array.isArray(final)?
        final.join(" / "):String(final);

      die.querySelectorAll(".face").forEach(face=>{
        face.textContent=display;
      });

      const info=resultMeaning(mode,final);

      $("diceStatus").textContent="RESULT: "+display;
      $("rollFinal").textContent=
        `D${a}${b?" / D"+b:""} → ${display}`;
      $("rollTitle").textContent=info.title;
      $("rollExplanation").textContent=info.explanation;
      $("rollNote").textContent=info.note;

      $("resultModal").classList.remove("hidden");

      if (G) {
        G.rolls.push({turn:G.turn,mode,final});
        say(`DICE: ${mode} → ${display}`,"GM");
        renderLog();
        save();
      }

      rolling=false;
      $("roll").disabled=false;
    }
  },88);
}

function action(type,data={}) {
  if (!G || G.phase!=="PLAN" || busy) {
    return toast("Action requires an active planning phase");
  }

  try {
    const s=G.sites[siteIndex];
    let r,p;

    if (type==="RFI") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      if (s.rfis.includes(data.i)||s.rfis.length>=5)
        throw Error("Five initial RFIs maximum per FOS");

      s.rfis.push(data.i);
      say(`Selected RFI: ${R.RFIs[data.i]} at ${s.name}`,"MOB");
    }

    else if (type==="RFI_ANSWER") {
      const input=$("rfi_"+data.i);
      if (!input || !input.value.trim())
        throw Error("Enter the actual instructor response");

      s.responses[data.i]=input.value.trim();
      say(`RFI response saved: ${R.RFIs[data.i]}`,"GM");
    }

    else if (type==="TASK") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      if (s.pending.includes(data.i)||s.complete.includes(data.i))
        throw Error("Already submitted");

      const missing=(R.prerequisites[data.i]||[])
        .filter(n=>!s.complete.includes(n));

      if (missing.length) {
        throw Error("Missing prerequisite task(s): "+
          missing.map(i=>i+1).join(", "));
      }

      s.pending.push(data.i);
      say(`Task ${data.i+1} submitted for instructor validation`,"MOB");
    }

    else if (type==="TASK_APPROVE") {
      if (!s.pending.includes(data.i))
        throw Error("Task is not pending");

      const missing=(R.prerequisites[data.i]||[])
        .filter(n=>!s.complete.includes(n));

      if (missing.length)
        throw Error("Missing known prerequisite(s)");

      const confirmation=window.prompt(
        "GM: Verify all official costs, personnel, " +
        "timing and prerequisites against the OPS workbook. " +
        "Type APPROVE to confirm.",""
      );

      if (confirmation!=="APPROVE") return;

      s.pending=s.pending.filter(x=>x!==data.i);
      s.complete.push(data.i);
      say(`Instructor approved Task ${data.i+1} at ${s.name}`,"GM");
    }

    else if (type==="REQUEST") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      p=aircraft(data.plane);

      if (!p || p.status!=="AVAILABLE")
        throw Error("Aircraft unavailable");

      const active=G.requests.find(x=>
        x.plane===p.id &&
        !["DONE","CANCELLED"].includes(x.status)
      );

      if (active)
        throw Error("An active request already uses this aircraft");

      r={
        id:"ATO"+(++G.seq),
        plane:p.id,
        fos:siteIndex,
        status:"REQUESTED",
        load:[],
        need:{pallet:2,team:1},
        alternate:"",
        intent:"",
        risk:false,
        ppr:false,
        approved:false
      };

      G.requests.push(r);
      p.status="REQUESTED";
      say(`${p.name} requested for ${s.name}`,"MOB");
    }

    else if (type==="ALLOCATE") {
      if (!allowed("CAOC"))
        throw Error("CAOC position required");

      r=request(data.id);
      if (!r || r.status!=="REQUESTED")
        throw Error("Request not awaiting allocation");

      r.status="ALLOCATED";
      aircraft(r.plane).status="ALLOCATED";
      say(`Aircraft allocated: ${r.id}`,"CAOC");
    }

    else if (type==="LOAD") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      r=request(data.id);
      if (!r || r.status!=="ALLOCATED")
        throw Error("Allocation required");

      p=aircraft(r.plane);
      if (r.load.length>=p.slots)
        throw Error("Practice slot board full");

      if (!Object.hasOwn(r.need,data.kind) ||
          r.load.filter(x=>x===data.kind).length>=r.need[data.kind])
        throw Error("Required counter quantity reached");

      if (G.home[data.kind]<1)
        throw Error("Insufficient stock");

      G.home[data.kind]--;
      r.load.push(data.kind);
      p.load=[...r.load];

      say(`Loaded ${data.kind} on ${p.name}`,"MOB");
    }

    else if (type==="UNLOAD") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      r=request(data.id);
      if (!r || r.status!=="ALLOCATED")
        throw Error("Load is locked");

      const kind=r.load.splice(data.slot,1)[0];
      if (kind) G.home[kind]++;
      aircraft(r.plane).load=[...r.load];
    }

    else if (type==="ATO") {
      if (!allowed("MOB"))
        throw Error("MOB position required");

      r=request(data.id);
      if (!r || r.status!=="ALLOCATED")
        throw Error("Allocation required");

      for (const [kind,n] of Object.entries(r.need)) {
        if (r.load.filter(x=>x===kind).length!==n)
          throw Error("Complete the practice load");
      }

      r.alternate=$("alt_"+r.id)?.value;
      r.intent=$("intent_"+r.id)?.value.trim();

      if (!r.alternate || !r.intent)
        throw Error("Alternate and intent required");

      r.status="ATO";
      aircraft(r.plane).status="ATO";
      say(`Submitted ATO ${r.id}`,"MOB");
    }

    else if (type==="PPR") {
      if (!allowed("CAOC"))
        throw Error("CAOC position required");

      r=request(data.id);
      if (!r || r.status!=="ATO")
        throw Error("ATO required");

      if (!G.review.access)
        throw Error("Political access review missing");

      if (r.plane==="C5") {
        throw Error(
          "C-5 FOS landing requires risk authorization " +
          "and D20 adjudication; cannot auto-clear."
        );
      }

      const confirmation=window.prompt(
        "CAOC/GM: Verify MOG, route, airfield access, " +
        "aircraft configuration and ATO fields against " +
        "approved records. Type APPROVE to issue training PPR.",""
      );

      if (confirmation!=="APPROVE") return;

      r.status="CLEARED";
      r.ppr=true;
      aircraft(r.plane).status="CLEARED";
      say(`PPR cleared for ${r.id}`,"CAOC");
    }

    else if (type==="SUPPORT") {
      if (!allowed(data.role))
        throw Error(`${data.role} position required`);

      G.support[data.role]="REQUESTED";
      say(`${data.role} support assessment requested`,data.role);
    }

    else if (type==="SUPPORT_APPROVE") {
      G.support[data.role]="COMPLETE";
      say(`Instructor confirmed ${data.role} support`,"GM");
    }

    else {
      throw Error("Unknown operation");
    }

    render();
    save();

  } catch(e) {
    toast(e.message);
  }
}

function aiStep() {
  if (!G.ai || G.phase!=="PLAN") return;

  if (G.role!=="SPACE" && G.support.SPACE==="OPEN") {
    G.support.SPACE="REQUESTED";
    say("Automated CSpOC support request prepared","AI");
  }

  if (G.role!=="MEDCOM" && G.support.MEDCOM==="OPEN") {
    G.support.MEDCOM="REQUESTED";
    say("Automated MEDCOM support request prepared","AI");
  }

  if (G.role!=="CAOC") {
    for (const r of G.requests.filter(x=>x.status==="REQUESTED")) {
      r.status="ALLOCATED";
      aircraft(r.plane).status="ALLOCATED";
      say(`AI CAOC allocated ${r.id}`,"AI");
    }
  }

  if (G.role!=="MOB") {
    const s=G.sites[0];

    while (s.rfis.length<5) {
      const i=R.RFIs.findIndex((_,i)=>!s.rfis.includes(i));
      s.rfis.push(i);
    }

    const p=aircraft("C17");

    if (p.status==="AVAILABLE" &&
        G.home.pallet>=2 &&
        G.home.team>=1) {

      const r={
        id:"ATO"+(++G.seq),
        plane:p.id,
        fos:0,
        status:"ALLOCATED",
        load:["pallet","pallet","team"],
        need:{pallet:2,team:1},
        alternate:"MOB",
        intent:"Deliver resources",
        ppr:false,
        approved:false
      };

      G.home.pallet-=2;
      G.home.team--;
      p.load=[...r.load];
      p.status="ALLOCATED";
      G.requests.push(r);

      say(`AI MOB prepared load ${r.id} for review`,"AI");
    }
  }
}

function advance() {
  if (!G || busy) return;

  if (G.phase==="BRIEF") {
    if (!G.review.orders || !G.review.access) {
      return toast("Acknowledge orders and political access first");
    }
    G.phase="PLAN";
    aiStep();
    render();
    save();
    return;
  }

  if (G.phase==="REVIEW") {
    G.turn++;
    G.phase="PLAN";

    for (const p of G.aircraft) {
      if (p.status==="DAMAGED" && p.unavailableUntil<=G.turn)
        p.status="AVAILABLE";
    }

    aiStep();
    say(`Planning turn ${G.turn} opened`);
    render();
    save();
    return;
  }

  if (G.phase!=="PLAN") return;

  aiStep();

  const flights=G.requests.filter(r=>r.status==="CLEARED");
  G.phase="EXECUTION";
  render();

  let i=0;

  function next() {
    if (i>=flights.length) {
      G.phase="REVIEW";
      say("Execution complete. Review events, RFI and mission results.","GM");
      render();
      save();
      return;
    }

    const r=flights[i++];

    flightAnimation(
      `${r.plane} FLIGHT TO ${G.sites[r.fos].name}`,
      ()=>{
        const s=G.sites[r.fos];
        const p=aircraft(r.plane);

        for (const item of r.load) {
          s.stock[item]++;
        }

        p.load=[];
        p.status="AVAILABLE";
        r.status="DONE";

        say(
          `Flight ${r.id} arrived; cargo delivered to ${s.name}`,
          "CAOC"
        );

        $("flightStatus").textContent=
          `${r.plane} ARRIVED — CARGO UNLOADED`;

        next();
      }
    );
  }

  next();
}

function brief() {
  return `
    <h2>ORDERS AND ACCESS</h2>
    <div class="card">
      <h3>OPORD / EXORD / FRAGORD</h3>
      <p>Read the actual orders in the authorized files before starting.</p>
      <button class="fill" data-review="orders"
        ${G.review.orders?"disabled":""}>
        ${G.review.orders?"✓ ACKNOWLEDGED":"ACKNOWLEDGE ORDERS"}
      </button>
    </div>
    <div class="card">
      <h3>POLITICAL ACCESS / OVERFLIGHT</h3>
      <p>Recheck at the beginning of each execution block.</p>
      <button class="fill" data-review="access"
        ${G.review.access?"disabled":""}>
        ${G.review.access?"✓ ACKNOWLEDGED":"ACKNOWLEDGE ACCESS REVIEW"}
      </button>
    </div>
  `;
}

function loadPanel(r) {
  const p=aircraft(r.plane);
  const editing=allowed("MOB") && r.status==="ALLOCATED";

  let h=`
    <div class="card">
      <h3>${p.name} · ${r.status}</h3>
      <p>
        Practice slot counter board. Validate official capacity
        and configuration from the OPS loadout board.
      </p>
      <div class="buttons">
        <button data-kind="pallet"
          class="${cargoKind==="pallet"?"active":""}">
          PALLET
        </button>
        <button data-kind="team"
          class="${cargoKind==="team"?"active":""}">
          TEAM
        </button>
      </div>
      <div class="slots">
  `;

  for (let i=0;i<p.slots;i++) {
    h+=`
      <button class="${r.load[i]?"filled":""}"
        ${editing?"":"disabled"}
        data-load="${r.id}:${i}">
        ${esc(r.load[i]||"EMPTY")}<br>${i+1}
      </button>
    `;
  }

  h+="</div>";

  if (r.status==="ALLOCATED") {
    h+=`
      <label>Alternate airfield</label>
      <input id="alt_${r.id}" value="MOB">
      <label>Arrival intent</label>
      <input id="intent_${r.id}" value="Download resources">
      <button class="btn gold fill"
        data-ato="${r.id}" ${allowed("MOB")?"":"disabled"}>
        SUBMIT ATO
      </button>
    `;
  }

  return h+"</div>";
}

function mob() {
  const s=G.sites[siteIndex];

  let h=`
    <h2>MOB / ${s.name}</h2>
    <div class="row">Delivered pallets <b>${s.stock.pallet}</b></div>
    <div class="row">Delivered teams <b>${s.stock.team}</b></div>
    <div class="row">Task completion <b>${s.complete.length}/16</b></div>

    <h3>INITIAL FIVE RFIs</h3>
    <div class="rfis">
  `;

  R.RFIs.forEach((name,i)=>{
    h+=`
      <button data-rfi="${i}"
        ${allowed("MOB") &&
          !s.rfis.includes(i) &&
          s.rfis.length<5?"":"disabled"}>
        ${s.rfis.includes(i)?"✓":"+"} ${esc(name)}
      </button>
    `;
  });

  h+="</div><h3>GM RFI RESPONSES</h3>";

  s.rfis.forEach(i=>{
    h+=`
      <div class="card">
        <b>${esc(R.RFIs[i])}</b>
        ${s.responses[i]?
          `<p>${esc(s.responses[i])}</p>`:
          `<input id="rfi_${i}"
             placeholder="Enter actual instructor-provided answer">
           <button class="fill" data-rfi-answer="${i}">
             RECORD GM RESPONSE
           </button>`
        }
      </div>
    `;
  });

  h+=`
    <div class="card">
      <h3>MOBILITY AIRLIFT</h3>
      <div class="row">
        Origin pallets <b>${G.home.pallet}</b>
      </div>
      <div class="row">
        Origin teams <b>${G.home.team}</b>
      </div>
      <select id="planeChoice">
        ${G.aircraft.map(p=>`
          <option value="${p.id}">
            ${p.name} (${p.status})
          </option>
        `).join("")}
      </select>
      <button class="btn gold fill" data-request
        ${allowed("MOB")?"":"disabled"}>
        REQUEST AIRCRAFT
      </button>
    </div>
  `;

  for (const r of G.requests.filter(r=>r.fos===siteIndex)) {
    h+=loadPanel(r);
  }

  for (let c=0;c<4;c++) {
    h+=`<h3>${R.categories[c]}</h3><div class="tasks">`;

    for (let i=c*4;i<c*4+4;i++) {
      const mark=s.complete.includes(i)?"✓":
        s.pending.includes(i)?"⌛":"+";

      h+=`
        <button data-task="${i}"
          ${allowed("MOB") &&
            !s.complete.includes(i) &&
            !s.pending.includes(i)?"":"disabled"}>
          ${mark} ${i+1}. ${esc(R.tasks[i])}
        </button>
      `;
    }

    h+="</div>";
  }

  h+=`
    <div class="card">
      <h3>INSTRUCTOR TASK ADJUDICATION</h3>
      <p>
        GM must verify all costs, personnel, prerequisites
        and timing against the approved board and workbook.
      </p>
      ${s.pending.map(i=>`
        <button class="fill" data-task-approve="${i}">
          APPROVE TASK ${i+1}
        </button>
      `).join("")}
      <div class="row">
        Fighter-sortie capability gate
        <b>
          ${R.fighterGate.every(i=>s.complete.includes(i))?
            "READY SUBJECT TO OTHER RULES":"NOT READY"}
        </b>
      </div>
    </div>
  `;

  return h;
}

function caoc() {
  let h="<h2>CAOC / CFACC</h2>";

  for (const p of G.aircraft) {
    h+=`
      <div class="row">
        ${p.name}<b>${p.status}</b>
      </div>
    `;
  }

  for (const r of G.requests) {
    h+=`
      <div class="card">
        <h3>${r.id} · ${r.plane}</h3>
        <p>${G.sites[r.fos].name} · ${r.status}</p>
    `;

    if (r.status==="REQUESTED") {
      h+=`
        <button class="btn gold fill"
          data-allocate="${r.id}"
          ${allowed("CAOC")?"":"disabled"}>
          ALLOCATE AIRCRAFT
        </button>
      `;
    }

    if (r.status==="ATO") {
      h+=`
        <p>
          Alternate: ${esc(r.alternate)}<br>
          Intent: ${esc(r.intent)}
        </p>
        <button class="btn gold fill"
          data-ppr="${r.id}"
          ${allowed("CAOC")?"":"disabled"}>
          VERIFY ATO / ISSUE PPR
        </button>
      `;
    }

    h+="</div>";
  }

  return h;
}

function support(role) {
  return `
    <h2>${role==="SPACE"?"CSpOC":"MEDCOM"}</h2>
    <div class="row">
      Assessment status <b>${G.support[role]}</b>
    </div>
    <div class="card">
      <p>
        Use the corresponding approved exercise board.
        Instructor-controlled procedures still require confirmation.
      </p>
      <button class="btn gold fill" data-support="${role}"
        ${allowed(role) &&
          G.support[role]==="OPEN"?"":"disabled"}>
        REQUEST SUPPORT
      </button>
      ${G.support[role]==="REQUESTED"?
        `<button class="fill" data-support-approve="${role}">
           GM CONFIRM COMPLETE
         </button>`:""}
    </div>
  `;
}

function aar() {
  return `
    <h2>MISSION REVIEW · TURN ${G.turn}</h2>

    ${G.sites.map(s=>`
      <div class="row">
        ${s.name}
        <b>${s.complete.length}/16 tasks ·
           ${s.stock.pallet} pallets</b>
      </div>
    `).join("")}

    <div class="row">
      Completed flights
      <b>${G.requests.filter(r=>r.status==="DONE").length}</b>
    </div>
    <div class="row">
      Dice rolls <b>${G.rolls.length}</b>
    </div>

    <p>
      Review communications and instructor outcomes
      before advancing.
    </p>
  `;
}

function renderWork() {
  $("tabs").innerHTML=
    ["BRIEF",...R.roles,"AAR"].map(t=>`
      <button class="${tab===t?"active":""}"
        data-tab="${t}">${t}</button>
    `).join("");

  $("work").innerHTML=
    tab==="BRIEF"?brief():
    tab==="MOB"?mob():
    tab==="CAOC"?caoc():
    tab==="SPACE"?support("SPACE"):
    tab==="MEDCOM"?support("MEDCOM"):aar();

  const el=$("work");

  const events=[
    ["data-review",b=>review(b.dataset.review)],
    ["data-rfi",b=>action("RFI",{
      i:Number(b.dataset.rfi)
    })],
    ["data-rfi-answer",b=>action("RFI_ANSWER",{
      i:Number(b.dataset.rfiAnswer)
    })],
    ["data-task",b=>action("TASK",{
      i:Number(b.dataset.task)
    })],
    ["data-task-approve",b=>action("TASK_APPROVE",{
      i:Number(b.dataset.taskApprove)
    })],
    ["data-request",b=>action("REQUEST",{
      plane:$("planeChoice").value
    })],
    ["data-allocate",b=>action("ALLOCATE",{
      id:b.dataset.allocate
    })],
    ["data-ppr",b=>action("PPR",{
      id:b.dataset.ppr
    })],
    ["data-kind",b=>{
      cargoKind=b.dataset.kind;
      renderWork();
    }],
    ["data-load",b=>{
      const [id,slot]=b.dataset.load.split(":");
      const r=request(id);
      action(r.load[Number(slot)]?"UNLOAD":"LOAD",{
        id,slot:Number(slot),kind:cargoKind
      });
    }],
    ["data-ato",b=>action("ATO",{
      id:b.dataset.ato
    })],
    ["data-support",b=>action("SUPPORT",{
      role:b.dataset.support
    })],
    ["data-support-approve",b=>action("SUPPORT_APPROVE",{
      role:b.dataset.supportApprove
    })]
  ];

  for (const [attr,callback] of events) {
    el.querySelectorAll("["+attr+"]").forEach(b=>{
      b.onclick=()=>callback(b);
    });
  }

  document.querySelectorAll("[data-tab]").forEach(b=>{
    b.onclick=()=>setTab(b.dataset.tab);
  });

  if (R.roles.includes(tab) && tab!==G.role) {
    el.insertAdjacentHTML("afterbegin",
      '<div class="hint">Switch your role to operate '+
      'this workstation manually.</div>');
  }
}

function renderLog() {
  $("log").innerHTML=G.log.slice(0,35).map(l=>`
    <div>
      <b>T${l.turn} ${esc(l.who)}</b>
      ${esc(l.msg)}
    </div>
  `).join("");
}

function render() {
  if (!G) return;

  $("gameNo").textContent=G.game;
  $("turnNo").textContent=G.turn;
  $("phaseNo").textContent=G.phase;
  $("roleNo").textContent=G.role;

  $("advance").textContent=
    G.phase==="BRIEF"?"BEGIN PLANNING":
    G.phase==="PLAN"?"EXECUTE TURN":
    G.phase==="REVIEW"?"NEXT TURN":"EXECUTING";

  $("advance").disabled=busy;

  $("metrics").innerHTML=`
    <div class="row">
      Orders <b>${G.review.orders?"✓":"PENDING"}</b>
    </div>
    <div class="row">
      Access <b>${G.review.access?"✓":"PENDING"}</b>
    </div>
    <div class="row">
      Flights
      <b>${G.requests.filter(r=>r.status==="DONE").length}</b>
    </div>
    <div class="row">
      FOS tasks
      <b>${G.sites.reduce((n,s)=>n+s.complete.length,0)}/64</b>
    </div>
  `;

  $("roster").innerHTML=R.roles.map(r=>`
    <div class="row">
      ${r}
      <b>${r===G.role?"HUMAN":G.ai?"AI ASSIST":"MANUAL"}</b>
    </div>
  `).join("");

  $("coach").textContent=
    G.phase==="BRIEF"?
      "Read and acknowledge the orders and access review.":
    G.phase==="REVIEW"?
      "Review the after-action log before the next turn.":
    G.role==="MOB"?
      "Choose five RFIs per FOS, load aircraft and submit tasks.":
    G.role==="CAOC"?
      "Review allocations, flights and PPR authorization.":
    G.role==="SPACE"?
      "Request CSpOC assessment and instructor response.":
      "Request medical support and instructor response.";

  renderBoard();
  renderWork();
  renderLog();
}

$("diceMode").onchange=()=>{
  $("combatDice").classList.toggle(
    "hidden",$("diceMode").value!=="combat"
  );
};

$("roll").onclick=roll;
$("closeResult").onclick=()=>
  $("resultModal").classList.add("hidden");
$("advance").onclick=advance;
$("switchRole").onclick=switchRole;
$("launch").onclick=start;
$("resume").onclick=resume;
$("save").onclick=()=>save(true);

$("reset").onclick=()=>{
  if (confirm("Start a fresh mission? Unsaved progress will be lost.")) {
    $("start").classList.remove("hidden");
    G=null;
  }
};

choices();

if (["#MOB","#CAOC","#SPACE","#MEDCOM"].includes(
  location.hash.toUpperCase()
)) {
  roleChoice=location.hash.substring(1).toUpperCase();
  choices();
}
