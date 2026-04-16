(function(){
"use strict";
const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let _tt;
function toast(msg,dur=2600){const t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove("on"),dur);}
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}

/* STARFIELD */
const cvs=$("starfield"),ctx=cvs.getContext("2d");let stars=[],warp=0,tw=0;
function initS(){cvs.width=innerWidth;cvs.height=innerHeight;stars=[];for(let i=0;i<320;i++)stars.push({x:Math.random()*cvs.width-cvs.width/2,y:Math.random()*cvs.height-cvs.height/2,z:Math.random()*1000});}
function drawS(){ctx.fillStyle="rgba(5,8,16,0.3)";ctx.fillRect(0,0,cvs.width,cvs.height);const cx=cvs.width/2,cy=cvs.height/2;for(const s of stars){s.z-=1+warp*28;if(s.z<=0){s.z=1000;s.x=Math.random()*cvs.width-cx;s.y=Math.random()*cvs.height-cy;}const sx=(s.x/s.z)*300+cx,sy=(s.y/s.z)*300+cy,r=Math.max(.3,(1-s.z/1000)*(1.5+warp*2)),b=Math.min(1,(1-s.z/1000)*1.5+warp*.5);ctx.fillStyle=`rgba(180,210,255,${b})`;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();}warp+=(tw-warp)*.05;requestAnimationFrame(drawS);}
addEventListener("resize",()=>{cvs.width=innerWidth;cvs.height=innerHeight;});
initS();drawS();

async function fireWarp(dur=480){return new Promise(res=>{tw=1;const ov=$("warp-overlay");ov.innerHTML="";ov.classList.add("fire");const cx=innerWidth/2,cy=innerHeight/2;for(let i=0;i<48;i++){const l=el("div","warp-line");const a=(i/48)*360,d=35+Math.random()*70,len=18+Math.random()*36,rad=a*Math.PI/180;l.style.cssText=`left:${cx+Math.cos(rad)*d}px;top:${cy+Math.sin(rad)*d}px;width:${len}px;background:linear-gradient(90deg,transparent,rgba(140,200,255,.5),transparent);transform-origin:left center;transform:rotate(${a}deg) scaleX(0);`;ov.appendChild(l);setTimeout(()=>l.classList.add("fire"),15+Math.random()*55);}setTimeout(()=>{tw=0;ov.classList.remove("fire");ov.innerHTML="";res();},dur);});}

/* WORKSPACES */
const WS=[
  {key:"technician",title:"Technician",accent:"#378ADD",glow:"rgba(55,138,221,.14)",iconbg:"rgba(55,138,221,.14)",sub:"Clock in, accept work orders, capture field photos",chips:["Clock In","Work Orders","Photos","Complete"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#6CAEEB" stroke-width="1.5"><circle cx="9" cy="9" r="6"/><path d="M9 5.5v3.5l2 2"/></svg>`},
  {key:"fieldmap",title:"Field Map",accent:"#1D9E75",glow:"rgba(29,158,117,.14)",iconbg:"rgba(29,158,117,.14)",sub:"Drop pins, name locations, capture GPS coordinates",chips:["Drop Pin","Name It","GPS Fix","Save"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#4EC29A" stroke-width="1.5"><path d="M9 2C6.24 2 4 4.24 4 7c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z"/><circle cx="9" cy="7" r="2"/></svg>`},
  {key:"photos",title:"Field Photos",accent:"#00bcd4",glow:"rgba(0,188,212,.14)",iconbg:"rgba(0,188,212,.14)",sub:"Upload GPS-tagged photos, assign MH node tags",chips:["Upload","GPS Tags","MH Assign","Photo Map"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#00bcd4" stroke-width="1.5"><rect x="2.5" y="3" width="13" height="11.5" rx="1.8"/><circle cx="6.2" cy="7" r="1.2"/><path d="M4.8 12l2.8-3 2.2 2.1 1.8-1.6 2 2.5"/></svg>`},
  {key:"splicer",title:"Splicer",accent:"#7F77DD",glow:"rgba(127,119,221,.14)",iconbg:"rgba(127,119,221,.14)",sub:"Projects, billing codes, redline map",chips:["Projects","Billing Codes","Fiber Map","Redline"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#A59CF4" stroke-width="1.5"><path d="M3 9h12"/><path d="M6 5l-3 4 3 4"/><path d="M12 5l3 4-3 4"/></svg>`},
  {key:"dispatch",title:"Dispatch",accent:"#D39A44",glow:"rgba(211,154,68,.14)",iconbg:"rgba(186,117,23,.14)",sub:"Create work orders, assign crews, track queue",chips:["Create WO","Assign","Priority","Queue"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#D39A44" stroke-width="1.5"><rect x="2" y="5" width="14" height="10" rx="1.5"/><path d="M6 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5"/><path d="M9 9v3M7.5 10.5h3"/></svg>`},
  {key:"office",title:"Office & Billing",accent:"#EE835D",glow:"rgba(238,131,93,.14)",iconbg:"rgba(216,90,48,.14)",sub:"Invoice review, approve billing, run reports",chips:["Invoices","Approve","Reports","Export"],icon:`<svg viewBox="0 0 18 18" fill="none" stroke="#EE835D" stroke-width="1.5"><rect x="4" y="2.5" width="10" height="13" rx="1.5"/><path d="M6.5 6h5M6.5 9h5M6.5 12h3.5"/></svg>`},
];

/* SPLASH */
$("splashEnter").addEventListener("click",async()=>{$("splash").classList.add("out");await wait(400);await fireWarp(380);buildHub();$("hub").classList.add("active");});

function buildHub(){
  const g=$("hubGrid");g.innerHTML="";
  WS.forEach((ws,i)=>{
    const c=el("div","hub-card");
    c.style.cssText+=`--hc-accent:${ws.accent};--hc-glow:${ws.glow};animation:slideUp .4s ease ${i*.06}s both;`;
    c.innerHTML=`<div class="hub-icon" style="background:${ws.iconbg};">${ws.icon}</div><div class="hub-card-title">${ws.title}</div><div class="hub-card-sub">${ws.sub}</div><div class="hub-chips">${ws.chips.map(ch=>`<span class="hub-chip">${ch}</span>`).join("")}</div>`;
    c.addEventListener("click",()=>openWS(ws));
    g.appendChild(c);
  });
}

async function openWS(ws){
  $("cineTop").classList.add("active");$("cineBottom").classList.add("active");
  $("hub").classList.remove("active");
  await fireWarp(400);
  $("cineTop").classList.remove("active");$("cineBottom").classList.remove("active");
  const shell=$("demo-shell");
  shell.style.setProperty("--ws-accent",ws.accent);
  $("dsLabel").textContent=ws.title;$("dsLabel").style.color=ws.accent;
  $("dsFrame").style.boxShadow=`0 0 90px ${ws.glow},0 0 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04)`;
  buildWS(ws);shell.classList.add("active");
}

async function exitWS(){
  $("cineTop").classList.add("active");$("cineBottom").classList.add("active");
  $("demo-shell").classList.remove("active");
  await fireWarp(380);
  $("cineTop").classList.remove("active");$("cineBottom").classList.remove("active");
  $("dsTabs").innerHTML="";$("dsBody").innerHTML="";
  $("hub").classList.add("active");
}
$("dsBack").addEventListener("click",exitWS);

function buildWS(ws){
  const scenes=getScenes(ws),tabs=$("dsTabs"),body=$("dsBody");
  tabs.innerHTML="";body.innerHTML="";
  scenes.forEach((sc,i)=>{
    const t=el("button","ds-tab"+(i===0?" active":""),sc.label);
    t.addEventListener("click",()=>{tabs.querySelectorAll(".ds-tab").forEach(b=>b.classList.remove("active"));t.classList.add("active");showScene(sc,body);});
    tabs.appendChild(t);
  });
  showScene(scenes[0],body);
}

function showScene(sc,body){body.innerHTML="";const d=el("div","scene");sc.build(d);body.appendChild(d);body.scrollTop=0;}

/* MAP HELPER */
function makeMap(h,accent,pins,onDrop){
  const m=el("div","sc-map");m.style.height=h+"px";
  m.innerHTML=`<div class="sc-map-grid"></div>
    <div class="sc-road" style="top:30%;left:0;right:0;height:3px;opacity:.4;"></div>
    <div class="sc-road" style="top:58%;left:0;right:0;height:2px;opacity:.25;"></div>
    <div class="sc-road" style="top:0;bottom:0;left:38%;width:2px;opacity:.25;"></div>
    <div class="sc-road" style="top:0;bottom:0;left:70%;width:2px;opacity:.18;"></div>
    <div class="sc-map-hint">${onDrop?"Tap anywhere to drop a pin":"Tap a pin to view details"}</div>`;
  (pins||[]).forEach(p=>m.appendChild(makePin(p.x,p.y,accent,p.label)));
  if(onDrop){m.style.cursor="crosshair";m.addEventListener("click",e=>{if(e.target.closest(".sc-pin"))return;const r=m.getBoundingClientRect();onDrop(((e.clientX-r.left)/r.width*100).toFixed(1),((e.clientY-r.top)/r.height*100).toFixed(1),m);});}
  return m;
}
function makePin(x,y,accent,label){
  const p=el("div","sc-pin");p.style.cssText=`left:${x};top:${y};--pc:${accent};`;
  p.innerHTML=`${label?`<div class="sc-pin-lbl">${label}</div>`:""}<svg width="18" height="26" viewBox="0 0 20 28"><path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 18 10 18S20 17.5 20 10C20 4.48 15.52 0 10 0z" fill="${accent}"/><circle cx="10" cy="10" r="3.5" fill="rgba(255,255,255,.3)"/></svg><div class="sc-pin-ring"></div><div class="sc-pin-shad"></div>`;
  return p;
}
function drawCheck(c){requestAnimationFrame(()=>{c.querySelector(".ck-circle")?.classList.add("on");setTimeout(()=>c.querySelector(".ck-path")?.classList.add("on"),700);});}

/* SCENES */
function getScenes(ws){
  const A=ws.accent;

  if(ws.key==="technician") return [
    {label:"Clock In",build(c){
      c.innerHTML=`<div class="sc-title">Start Your Shift</div>
        <div style="text-align:center;padding:16px 0;"><div class="sc-clock" id="lc" style="color:${A};">—</div><div class="sc-clock-sub" id="ls">Not clocked in</div></div>
        <label class="sc-lbl">Select Project</label>
        <select class="sc-sel" id="lp"><option>Ruidoso Fire Rebuild</option><option>Lincoln County Expansion</option><option>Mescalero Trunk Run</option></select>
        <button class="sc-btn p pulse" id="lb" style="width:100%;padding:13px;font-size:14px;margin-top:4px;">⏱ Clock In</button>
        <div id="lr" style="display:none;"><div class="sc-card sel" style="text-align:center;padding:14px;"><div style="font-size:24px;margin-bottom:6px;">✅</div><div style="font-weight:700;font-size:14px;color:${A};">Clocked In Successfully</div><div class="sc-cs" style="margin-top:4px;">Session active · <span id="lp2"></span></div></div></div>`;
      const tick=()=>{const n=new Date();$("lc").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};tick();const iv=setInterval(tick,1000);let done=false;
      $("lb").addEventListener("click",function(){if(done)return;done=true;clearInterval(iv);this.classList.remove("pulse");this.disabled=true;this.style.opacity=".45";this.textContent="✓ Clocked In";$("ls").textContent="Session active";$("lp2").textContent=$("lp").value;$("lr").style.display="block";toast("✅ Clocked in! Have a safe shift.");});
    }},
    {label:"Work Orders",build(c){
      const wos=[{id:"WO-4821",type:"Splice Closure",node:"MH-1635CA_03",area:"Ruidoso, NM",pri:"High",pc:"#D39A44"},{id:"WO-4822",type:"Maintenance",node:"MH-1635EA_01",area:"Lincoln Co.",pri:"Normal",pc:A},{id:"WO-4823",type:"Emergency Repair",node:"MH-1440BB_02",area:"Priority",pri:"Urgent",pc:"#EE835D"}];
      c.innerHTML=`<div class="sc-title">Today's Work Orders</div><div class="sc-hint">Tap a card to accept the work order</div><div id="wl" style="display:flex;flex-direction:column;gap:8px;"></div>`;
      const list=$("wl");
      wos.forEach((wo,i)=>{
        const d=el("div","sc-card click");d.style.animationDelay=(i*.1)+"s";d.style.animation="fadeIn .3s ease both";
        d.innerHTML=`<div class="sc-row" style="justify-content:space-between;align-items:flex-start;"><div><div class="sc-ct">${wo.id} · ${wo.type}</div><div class="sc-cs">${wo.node} · ${wo.area}</div></div><span class="sc-badge" style="background:${wo.pc}22;color:${wo.pc};">${wo.pri}</span></div><div id="wa-${wo.id}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid rgba(55,138,221,.07);"><div class="sc-row" style="gap:6px;"><button class="sc-btn p" style="font-size:10px;padding:5px 12px;" data-a="accept" data-id="${wo.id}">Accept &amp; Navigate</button><button class="sc-btn g" style="font-size:10px;padding:5px 12px;" data-a="view" data-id="${wo.id}">View Details</button></div></div>`;
        d.addEventListener("click",e=>{if(e.target.closest("[data-a]"))return;list.querySelectorAll(".sc-card").forEach(x=>x.classList.remove("sel"));list.querySelectorAll("[id^=wa-]").forEach(x=>x.style.display="none");d.classList.add("sel");document.getElementById("wa-"+wo.id).style.display="block";});
        list.appendChild(d);
      });
      list.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b)return;if(b.dataset.a==="accept")toast(`✅ ${b.dataset.id} accepted — navigate to job site`);if(b.dataset.a==="view")toast(`📋 Opening ${b.dataset.id} details...`);});
    }},
    {label:"Capture Photo",build(c){
      const emojis=["🔌","📦","🔧","🪛","⚡","🛠️","🔩","📡"];let photos=[];
      c.innerHTML=`<div class="sc-title">Capture Field Photos</div><div class="sc-hint">Photos attach to active work order with GPS coordinates</div><label class="sc-lbl">Attached to</label><select class="sc-sel"><option>WO-4821 · MH-1635CA_03</option><option>WO-4822 · MH-1635EA_01</option></select><div class="sc-pz" id="cam"><svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="${A}" stroke-width="1.4"><rect x="4" y="10" width="40" height="30" rx="4"/><circle cx="24" cy="26" r="9"/><path d="M16 10l2.5-6h7L28 10"/><circle cx="39" cy="16" r="2.5" fill="${A}"/></svg><div style="font-size:12px;color:var(--dim);">Tap to take a photo</div></div><div class="sc-pg" id="pg"></div><div class="sc-row" style="justify-content:space-between;"><span style="font-size:11px;color:var(--muted);" id="pc2"></span><button class="sc-btn g" id="pub" style="font-size:10px;padding:6px 14px;display:none;">Upload All</button></div>`;
      $("cam").addEventListener("click",()=>{if(photos.length>=emojis.length){toast("All photos captured!");return;}const e2=emojis[photos.length];photos.push(e2);const t=el("div","sc-pt");t.style.animationDelay=(photos.length*.05)+"s";t.innerHTML=`<div style="font-size:20px;">${e2}</div><div style="font-size:8px;color:var(--dim);margin-top:3px;">IMG_48${20+photos.length}.jpg</div>`;$("pg").appendChild(t);$("pc2").textContent=`${photos.length} photo${photos.length>1?"s":""} ready`;$("pub").style.display="inline-flex";toast("📷 Photo captured & GPS-tagged!");});
      $("pub").addEventListener("click",function(){toast(`✅ ${photos.length} photos uploaded!`);this.textContent="Uploaded ✓";this.disabled=true;});
    }},
    {label:"Complete Job",build(c){
      c.innerHTML=`<div class="sc-title">Complete Work Order</div><div class="sc-card" style="background:rgba(55,138,221,.05);"><div class="sc-ct">WO-4821 · Splice Closure</div><div class="sc-cs">MH-1635CA_03 · Ruidoso, NM</div></div><label class="sc-lbl">Completion Notes</label><textarea class="sc-in" rows="3" placeholder="Describe work performed, issues found..."></textarea><label class="sc-lbl">Final Status</label><select class="sc-sel"><option>Complete</option><option>Needs Follow-up</option><option>Partially Complete</option></select><div style="display:flex;gap:16px;"><label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;"><input type="checkbox" style="accent-color:${A};"/> Photos attached</label><label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;"><input type="checkbox" style="accent-color:${A};"/> Billing codes entered</label></div><button class="sc-btn p" id="fin" style="width:100%;">Mark Job Complete</button><div id="finr" style="display:none;" class="sc-ok"><svg width="62" height="62" viewBox="0 0 62 62"><circle cx="31" cy="31" r="28" fill="none" stroke="rgba(29,158,117,.15)" stroke-width="2"/><circle cx="31" cy="31" r="28" fill="none" stroke="#4EC29A" stroke-width="2.5" class="ck-circle" style="transform:rotate(-90deg);transform-origin:center;"/><path d="M19 32l9 9 16-19" fill="none" stroke="#4EC29A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="ck-path"/></svg><div style="font-family:var(--brand);font-size:18px;font-weight:700;color:#4EC29A;letter-spacing:2px;">JOB COMPLETE</div><div style="font-size:11px;color:var(--muted);">WO-4821 submitted · Billing queued</div></div>`;
      $("fin").addEventListener("click",function(){this.style.display="none";$("finr").style.display="flex";drawCheck(c);toast("🎉 Work order submitted!");});
    }},
  ];

  if(ws.key==="fieldmap") return [
    {label:"Drop a Pin",build(c){
      let dropped=false,lx=50,ly=50;
      c.innerHTML=`<div class="sc-title">Field Map</div><div class="sc-hint">Tap anywhere on the map to create a new location pin</div><div id="mw"></div><div id="pf" style="display:none;flex-direction:column;gap:9px;"><div class="sc-div"></div><label class="sc-lbl">Location Code / Name</label><input class="sc-in" id="pn" placeholder="e.g. MH-1635CA_03" autocomplete="off"/><label class="sc-lbl">Location Type</label><select class="sc-sel" id="pt"><option>Splice Point</option><option>Node</option><option>Closure</option><option>Handhole</option><option>Pedestal</option><option>MST</option><option>Other</option></select><label class="sc-lbl">Notes (optional)</label><input class="sc-in" id="pnotes" placeholder="Field notes, access info..." autocomplete="off"/><button class="sc-btn p" id="ps" style="width:100%;">📍 Create Location Here</button></div><div id="pd" style="display:none;" class="sc-ok"><div style="font-size:30px;">📍</div><div style="font-family:var(--brand);font-size:15px;font-weight:700;color:${A};" id="pdn"></div><div style="font-size:11px;color:var(--muted);" id="pdc"></div><button class="sc-btn g" id="pr" style="margin-top:6px;font-size:11px;">Drop Another Pin</button></div>`;
      const map=makeMap(200,A,[{x:"22%",y:"36%",label:"Node A"},{x:"60%",y:"24%",label:"MH-1440"},{x:"76%",y:"60%",label:"Splice-04"}],(x,y,mapEl)=>{lx=x;ly=y;if(!dropped){mapEl.appendChild(makePin(x+"%",y+"%",A,"New Location"));dropped=true;}mapEl.querySelector(".sc-map-hint").textContent="Pin placed — fill in the details below";$("pf").style.display="flex";$("pd").style.display="none";});
      c.querySelector("#mw").appendChild(map);
      $("ps").addEventListener("click",()=>{const name=$("pn").value.trim()||"New Location",type=$("pt").value;$("pf").style.display="none";$("pd").style.display="flex";$("pdn").textContent=`${name} · ${type}`;$("pdc").textContent=`34.${parseFloat(lx).toFixed(0)}°N, 87.${parseFloat(ly).toFixed(0)}°W (simulated GPS)`;toast(`📍 ${name} saved to project!`);});
      $("pr").addEventListener("click",()=>{dropped=false;$("pd").style.display="none";$("pn").value="";map.querySelector(".sc-map-hint").textContent="Tap anywhere to drop a pin";toast("Ready — tap the map to drop a new pin");});
    }},
    {label:"Saved Locations",build(c){
      const locs=[{name:"MH-1635CA_03",type:"Splice Point",status:"Complete",photos:4,x:"28%",y:"38%"},{name:"MH-1440BB_02",type:"Node",status:"In Progress",photos:2,x:"55%",y:"22%"},{name:"MH-1635EA_01",type:"Closure",status:"Not Started",photos:0,x:"72%",y:"55%"},{name:"PED-0042",type:"Pedestal",status:"Complete",photos:6,x:"38%",y:"68%"}];
      const sc=s=>s==="Complete"?"cg":s==="In Progress"?"cb2":"ca";
      c.innerHTML=`<div class="sc-title">Saved Locations</div><div class="sc-hint">Tap a location to add photos or notes</div><div id="lmw"></div><div id="ll" style="display:flex;flex-direction:column;gap:7px;margin-top:8px;"></div>`;
      c.querySelector("#lmw").appendChild(makeMap(140,A,locs.map(l=>({x:l.x,y:l.y,label:l.name})),null));
      const list=$("ll");
      locs.forEach((loc,i)=>{
        const d=el("div","sc-card click");d.style.animationDelay=(i*.08)+"s";d.style.animation="fadeIn .3s ease both";
        d.innerHTML=`<div class="sc-row" style="justify-content:space-between;"><div><div class="sc-ct">${loc.name}</div><div class="sc-cs">${loc.type}</div></div><span class="sc-badge ${sc(loc.status)}">${loc.status}</span></div><div id="ld-${i}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid rgba(55,138,221,.07);"><div class="sc-row" style="justify-content:space-between;"><span style="font-size:10px;color:var(--muted);">📷 ${loc.photos} photo${loc.photos!==1?"s":""}</span><div class="sc-row" style="gap:5px;"><button class="sc-btn g" style="font-size:9px;padding:4px 10px;" data-a="photo" data-n="${loc.name}">+ Photo</button><button class="sc-btn g" style="font-size:9px;padding:4px 10px;" data-a="note" data-n="${loc.name}">+ Note</button><button class="sc-btn g" style="font-size:9px;padding:4px 10px;" data-a="nav" data-n="${loc.name}">Navigate</button></div></div></div>`;
        d.addEventListener("click",e=>{if(e.target.closest("[data-a]"))return;list.querySelectorAll(".sc-card").forEach(x=>x.classList.remove("sel"));list.querySelectorAll("[id^=ld-]").forEach(x=>x.style.display="none");d.classList.add("sel");document.getElementById("ld-"+i).style.display="block";});
        list.appendChild(d);
      });
      list.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b)return;if(b.dataset.a==="photo")toast(`📷 Camera opened for ${b.dataset.n}`);if(b.dataset.a==="note")toast(`📝 Note opened for ${b.dataset.n}`);if(b.dataset.a==="nav")toast(`🗺 Navigating to ${b.dataset.n}...`);});
    }},
    {label:"GPS Fix",build(c){
      c.innerHTML=`<div class="sc-title">GPS Location Capture</div><div class="sc-hint">Simulate capturing your exact field coordinates</div><div class="sc-card" style="background:rgba(29,158,117,.05);border-color:rgba(29,158,117,.12);"><div class="sc-row" style="gap:10px;align-items:flex-start;"><div style="font-size:26px;margin-top:2px;">📡</div><div style="flex:1;"><div class="sc-ct" id="gs">Ready to capture</div><div class="sc-cs" id="gc">Tap button below to start</div><div class="sc-pb" style="margin-top:8px;"><div class="sc-pf" id="gb" style="width:0%;background:#1D9E75;"></div></div></div></div></div><button class="sc-btn p" id="gcap" style="width:100%;">📡 Capture My Location</button><div id="gr" style="display:none;flex-direction:column;gap:8px;"><div class="sc-div"></div><div class="sc-card sel"><div class="sc-row" style="justify-content:space-between;"><div><div class="sc-ct" style="color:${A};">GPS Fix Acquired</div><div class="sc-cs" id="gf"></div><div class="sc-cs" id="ga"></div></div><span class="sc-badge cg">±4m</span></div></div><button class="sc-btn p" id="gcre" style="width:100%;">Create Location Here</button></div>`;
      $("gcap").addEventListener("click",async function(){this.disabled=true;this.style.opacity=".45";const steps=[[20,"Searching satellites...","Scanning..."],[45,"3 satellites found","Triangulating..."],[70,"High-accuracy fix","34.5801°N, -87.0337°W"],[92,"Applying corrections","34.5801°N, -87.0337°W"],[100,"Fix acquired ±4m","34.580128°N, -87.033768°W"]];for(const[pct,status,coords]of steps){$("gb").style.width=pct+"%";$("gs").textContent=status;$("gc").textContent=coords;await wait(500);}$("gr").style.display="flex";$("gf").textContent="34.580128°N, -87.033768°W";$("ga").textContent="Elevation: 1,050 ft";toast("📡 GPS fix acquired!");});
      $("gcre").addEventListener("click",()=>toast("📍 Location pinned at current GPS coordinates!"));
    }},
  ];

  if(ws.key==="photos") return [
    {label:"Upload",build(c){
      const ff=[{e:"📷",n:"IMG_4821.jpg"},{e:"🔌",n:"IMG_4822.jpg"},{e:"🔧",n:"IMG_4823.jpg"},{e:"⚡",n:"IMG_4824.jpg"},{e:"📦",n:"IMG_4825.jpg"},{e:"🛠️",n:"IMG_4826.jpg"}];let cnt=0;
      c.innerHTML=`<div class="sc-title">Upload Field Photos</div><div class="sc-hint">GPS coordinates are auto-extracted from photo EXIF data</div><div class="sc-pz" id="dz"><svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="${A}" stroke-width="1.4"><rect x="4" y="10" width="40" height="30" rx="4"/><circle cx="24" cy="26" r="9"/><path d="M16 10l2.5-6h7L28 10"/></svg><div style="font-size:12px;color:var(--dim);">Tap to select photos</div></div><div class="sc-pg" id="phg"></div><div class="sc-row" style="justify-content:space-between;align-items:center;"><span style="font-size:11px;color:var(--muted);" id="phc"></span><button class="sc-btn p" id="phu" style="display:none;font-size:11px;padding:7px 16px;">Upload All</button></div>`;
      $("dz").addEventListener("click",()=>{if(cnt>=ff.length){toast("All demo photos added!");return;}const f=ff[cnt++];const t=el("div","sc-pt");t.style.animationDelay=(cnt*.05)+"s";t.innerHTML=`<div style="font-size:18px;">${f.e}</div><div style="font-size:8px;color:var(--dim);margin-top:2px;">${f.n}</div>`;$("phg").appendChild(t);$("phc").textContent=`${cnt} photo${cnt>1?"s":""} ready`;$("phu").style.display="inline-flex";toast(`Added ${f.n} · GPS detected`);});
      $("phu").addEventListener("click",function(){toast(`✅ ${cnt} photos uploaded & geo-tagged!`);this.textContent="Uploaded ✓";this.disabled=true;});
    }},
    {label:"GPS Tags",build(c){
      const photos=[{n:"IMG_4821.jpg",lat:"33.3946°N",lng:"105.6731°W",alt:"6,942 ft",ok:true},{n:"IMG_4822.jpg",lat:"33.3951°N",lng:"105.6728°W",alt:"6,938 ft",ok:true},{n:"IMG_4823.jpg",lat:"33.3938°N",lng:"105.6745°W",alt:"6,951 ft",ok:true},{n:"IMG_4824.jpg",lat:"—",lng:"—",alt:"No GPS data",ok:false}];
      c.innerHTML=`<div class="sc-title">GPS EXIF Data</div><div class="sc-hint">Coordinates extracted automatically from photo metadata</div><div style="display:flex;flex-direction:column;gap:7px;" id="gpl"></div>`;
      photos.forEach((p,i)=>{const d=el("div","sc-card");d.style.animationDelay=(i*.1)+"s";d.style.animation="fadeIn .3s ease both";d.innerHTML=`<div class="sc-row" style="justify-content:space-between;"><div><div class="sc-ct">📷 ${p.n}</div><div class="sc-cs">${p.lat}${p.lat!=="—"?", "+p.lng:""}</div><div class="sc-cs">${p.alt}</div></div><span class="sc-badge ${p.ok?"cg":"ca"}">${p.ok?"GPS ✓":"No GPS"}</span></div>`;$("gpl").appendChild(d);});
    }},
    {label:"MH Assign",build(c){
      const assigns=[{p:"IMG_4821.jpg",n:"",ok:false},{p:"IMG_4822.jpg",n:"",ok:false},{p:"IMG_4823.jpg",n:"",ok:false},{p:"IMG_4824.jpg",n:"",ok:false}];
      const nodes=["MH-1635CA_03","MH-1635EA_01","MH-1440BB_02","PED-0042","CLOSURE-07"];
      function render(){const list=c.querySelector("#tl");list.innerHTML="";assigns.forEach((a,i)=>{const d=el("div","sc-card");d.style.animationDelay=(i*.06)+"s";d.style.animation="fadeIn .25s ease both";d.innerHTML=`<div class="sc-row" style="justify-content:space-between;align-items:flex-start;"><div style="flex:1;"><div class="sc-ct">📷 ${a.p}</div>${a.ok?`<div class="sc-cs" style="color:${A};margin-top:3px;">→ ${a.n}</div>`:`<select class="sc-sel" style="margin-top:6px;padding:6px 10px;font-size:11px;" data-i="${i}"><option value="">-- Assign to node --</option>${nodes.map(n=>`<option>${n}</option>`).join("")}</select>`}</div><span class="sc-badge ${a.ok?"cg":"ca"}" style="margin-top:2px;">${a.ok?"Tagged ✓":"Untagged"}</span></div>`;list.appendChild(d);});list.querySelectorAll("select[data-i]").forEach(s=>{s.addEventListener("change",()=>{if(s.value){assigns[+s.dataset.i].n=s.value;assigns[+s.dataset.i].ok=true;render();toast(`Tagged to ${s.value}`);}});});}
      c.innerHTML=`<div class="sc-title">Assign MH Node Tags</div><div class="sc-hint">Link each photo to its job site node location</div><div style="display:flex;flex-direction:column;gap:7px;" id="tl"></div><button class="sc-btn p" id="ata" style="width:100%;margin-top:2px;">⚡ Auto-Tag All from GPS</button>`;
      render();
      $("ata").addEventListener("click",()=>{assigns.forEach((a,i)=>{a.n=nodes[i%nodes.length];a.ok=true;});render();toast("✅ All photos auto-tagged!");$("ata").textContent="✓ All Tagged";$("ata").disabled=true;});
    }},
    {label:"Photo Map",build(c){
      c.innerHTML=`<div class="sc-title">Photo Map</div><div class="sc-hint">Each photo pinned to its exact GPS location</div><div id="pmw"></div><div class="sc-card" style="background:rgba(0,188,212,.05);border-color:rgba(0,188,212,.12);"><div class="sc-row" style="justify-content:space-between;"><div><div class="sc-ct">4 Photos Mapped</div><div class="sc-cs">Ruidoso area · All GPS-verified</div></div><span class="sc-badge cg">Synced</span></div></div>`;
      const map=makeMap(200,A,[{x:"28%",y:"34%",label:"IMG_4821"},{x:"54%",y:"50%",label:"IMG_4822"},{x:"70%",y:"26%",label:"IMG_4823"},{x:"36%",y:"66%",label:"IMG_4824"}],null);
      c.querySelector("#pmw").appendChild(map);map.style.cursor="default";map.querySelector(".sc-map-hint").textContent="Tap a pin to preview";
      map.addEventListener("click",e=>{const p=e.target.closest(".sc-pin");if(p){const l=p.querySelector(".sc-pin-lbl");toast(`📷 ${l?l.textContent:"Photo"} — full resolution view`);}});
    }},
  ];

  if(ws.key==="splicer") return [
    {label:"Projects",build(c){
      const projects=[{name:"Ruidoso Fire Rebuild",code:"TC-241635027",done:31,total:48,status:"In Progress"},{name:"Lincoln County Expansion",code:"TC-241890015",done:22,total:22,status:"Complete"},{name:"Mescalero Trunk Run",code:"TC-242010008",done:3,total:15,status:"In Progress"}];
      c.innerHTML=`<div class="sc-title">Active Projects</div><div class="sc-hint">Tap a project to set it as active</div><div style="display:flex;flex-direction:column;gap:8px;" id="prl"></div>`;
      const list=$("prl");
      projects.forEach((p,i)=>{const pct=Math.round(p.done/p.total*100);const d=el("div","sc-card click");d.style.animationDelay=(i*.1)+"s";d.style.animation="fadeIn .3s ease both";d.innerHTML=`<div class="sc-row" style="justify-content:space-between;"><div class="sc-ct">${p.name}</div><span class="sc-badge ${p.status==="Complete"?"cg":"cb2"}">${p.status}</span></div><div class="sc-cs" style="margin:3px 0;">${p.code} · ${p.done}/${p.total} closures</div><div class="sc-pb"><div class="sc-pf" style="width:0%;background:${A};" data-pct="${pct}"></div></div><div style="font-size:9px;color:var(--dim);margin-top:3px;">${pct}%</div>`;d.addEventListener("click",()=>{list.querySelectorAll(".sc-card").forEach(x=>x.classList.remove("sel"));d.classList.add("sel");toast(`Active project: ${p.name}`);});list.appendChild(d);setTimeout(()=>{const bar=d.querySelector("[data-pct]");if(bar)bar.style.width=bar.dataset.pct+"%";},200+i*100);});
    }},
    {label:"Billing Codes",build(c){
      const codes=[{c:"FBSP-2",d:"Splice labor (per fiber)",u:23.63},{c:"FBOSC-12",d:"12-count closure set",u:45.00},{c:"FBTERM",d:"Terminal placement",u:18.50},{c:"FBTEST",d:"OTDR test & cert",u:35.00},{c:"FBCAB-1",d:"Cable (per foot)",u:1.85}];
      let total=0;
      c.innerHTML=`<div class="sc-title">Billing Codes</div><div class="sc-card" style="background:rgba(127,119,221,.05);border-color:rgba(127,119,221,.12);"><div class="sc-ct">MH-1635CA_03 · Splice Closure</div><div class="sc-cs">Ruidoso Fire Rebuild</div></div><div class="sc-row" style="gap:7px;align-items:flex-end;"><div class="sc-col" style="flex:2;"><label class="sc-lbl">Code</label><select class="sc-sel" id="bcs"><option value="">Select code...</option>${codes.map(c2=>`<option value="${c2.c}|${c2.u}|${c2.d}">${c2.c} · ${c2.d}</option>`).join("")}</select></div><div class="sc-col" style="flex:1;"><label class="sc-lbl">Qty</label><input class="sc-in" type="number" id="bcq" value="1" min="1" style="text-align:center;"/></div><button class="sc-btn p" id="bca" style="padding:9px 14px;">Add</button></div><div id="bctw" style="display:none;"><table class="sc-tbl"><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody id="bcb"></tbody></table></div><div id="bctr" style="display:none;" class="sc-tot"><span style="font-size:12px;font-weight:700;">Total</span><span style="font-size:16px;font-weight:800;color:${A};" id="bct">$0.00</span></div>`;
      $("bca").addEventListener("click",()=>{const sel=$("bcs");if(!sel.value)return toast("⚠ Select a billing code first");const[code,unitStr,desc]=sel.value.split("|");const unit=parseFloat(unitStr),qty=parseInt($("bcq").value)||1,amt=unit*qty;total+=amt;const tr=document.createElement("tr");tr.innerHTML=`<td style="color:${A};font-weight:600;">${code}</td><td style="color:var(--muted);">${desc}</td><td>${qty}</td><td style="font-weight:600;">$${amt.toFixed(2)}</td>`;$("bcb").appendChild(tr);$("bctw").style.display="block";$("bctr").style.display="flex";$("bct").textContent=`$${total.toFixed(2)}`;sel.value="";$("bcq").value="1";toast(`Added ${code} ×${qty} — $${amt.toFixed(2)}`);});
    }},
    {label:"Redline Map",build(c){
      let pins=[],cnt=0;
      c.innerHTML=`<div class="sc-title">Redline Map</div><div class="sc-hint">Tap the map to drop redline correction markers</div><div id="rlw"></div><div class="sc-row" style="justify-content:space-between;margin-top:4px;"><span style="font-size:11px;color:var(--muted);" id="rlc">0 markers</span><button class="sc-btn g" id="rlcl" style="font-size:10px;padding:5px 11px;">Clear All</button></div>`;
      const map=makeMap(220,"#D85A30",[{x:"20%",y:"35%",label:"Node A"},{x:"55%",y:"20%",label:"Splice-01"},{x:"75%",y:"58%",label:"Node B"}],(x,y,mapEl)=>{cnt++;const p=makePin(x+"%",y+"%","#D85A30","");mapEl.appendChild(p);pins.push(p);$("rlc").textContent=`${cnt} marker${cnt>1?"s":""}`;toast("🔴 Redline marker placed");});
      c.querySelector("#rlw").appendChild(map);
      $("rlcl").addEventListener("click",()=>{pins.forEach(p=>p.remove());pins=[];cnt=0;$("rlc").textContent="0 markers";toast("Markers cleared");});
    }},
  ];

  if(ws.key==="dispatch") return [
    {label:"Create WO",build(c){
      let woNum=4824;
      c.innerHTML=`<div class="sc-title">Create Work Order</div><div id="wof" style="display:flex;flex-direction:column;gap:9px;"><div class="sc-row" style="gap:8px;"><div class="sc-col" style="flex:1;"><label class="sc-lbl">Type</label><select class="sc-sel" id="wot"><option>Splice Closure</option><option>Maintenance</option><option>Emergency Repair</option><option>New Install</option></select></div><div class="sc-col" style="flex:1;"><label class="sc-lbl">Priority</label><select class="sc-sel" id="wop"><option>Normal</option><option>High</option><option>Urgent</option></select></div></div><label class="sc-lbl">Node / Location</label><input class="sc-in" id="won" placeholder="e.g. MH-1635CA_03" autocomplete="off"/><label class="sc-lbl">Assign To</label><select class="sc-sel" id="woa"><option value="">-- Select Technician --</option><option>J. Reyes</option><option>T. Morrison</option><option>D. Pierce</option><option>K. Flowers</option><option>M. Sandoval</option></select><label class="sc-lbl">Instructions</label><textarea class="sc-in" rows="2" id="woi" placeholder="Special instructions, access codes..."></textarea><button class="sc-btn p" id="woc" style="width:100%;margin-top:2px;">📋 Dispatch Work Order</button></div><div id="wos2" style="display:none;" class="sc-ok"><div style="font-size:30px;">📋</div><div style="font-family:var(--brand);font-size:16px;font-weight:700;color:${A};" id="woid"></div><div style="font-size:11px;color:var(--muted);" id="wod"></div><button class="sc-btn g" id="woan" style="margin-top:8px;">Create Another</button></div>`;
      $("woc").addEventListener("click",()=>{const a=$("woa").value;if(!a)return toast("⚠ Assign a technician first");const type=$("wot").value,node=$("won").value.trim()||"(no location)",id=`WO-${woNum++}`;$("wof").style.display="none";$("wos2").style.display="flex";$("woid").textContent=`${id} Dispatched`;$("wod").textContent=`${type} · ${node} → ${a}`;toast(`✅ ${id} sent to ${a}`);});
      $("woan").addEventListener("click",()=>{$("wos2").style.display="none";$("wof").style.display="flex";$("won").value="";$("woi").value="";$("woa").value="";});
    }},
    {label:"Queue",build(c){
      const q=[{id:"WO-4821",type:"Splice Closure",tech:"J. Reyes",status:"En Route",pri:"High"},{id:"WO-4822",type:"Maintenance",tech:"T. Morrison",status:"In Progress",pri:"Normal"},{id:"WO-4823",type:"Emergency Repair",tech:"D. Pierce",status:"Dispatched",pri:"Urgent"},{id:"WO-4819",type:"New Install",tech:"K. Flowers",status:"Complete",pri:"Normal"}];
      const sc=s=>s==="En Route"?"cb2":s==="In Progress"?"ca":s==="Complete"?"cg":"cr";
      c.innerHTML=`<div class="sc-title">Dispatch Queue</div><div class="sc-hint">Live status of all active work orders</div><div style="display:flex;flex-direction:column;gap:7px;" id="ql"></div>`;
      q.forEach((wo,i)=>{const d=el("div","sc-card click");d.style.animationDelay=(i*.08)+"s";d.style.animation="fadeIn .3s ease both";d.innerHTML=`<div class="sc-row" style="justify-content:space-between;"><div><div class="sc-ct">${wo.id} · ${wo.type}</div><div class="sc-cs">→ ${wo.tech}</div></div><div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;"><span class="sc-badge ${sc(wo.status)}">${wo.status}</span><span style="font-size:9px;color:var(--dim);">${wo.pri}</span></div></div>`;d.addEventListener("click",()=>toast(`${wo.id}: ${wo.status} · ${wo.tech}`));$("ql").appendChild(d);});
    }},
  ];

  if(ws.key==="office") return [
    {label:"Invoices",build(c){
      const invs=[{id:"TDS-2401",node:"1635EA_03",tech:"J. Reyes",amt:2450,status:"Approved"},{id:"TDS-2402",node:"1635CA_02",tech:"T. Morrison",amt:1820,status:"Approved"},{id:"TDS-2403",node:"1440BB_01",tech:"D. Pierce",amt:3100,status:"Pending Review"},{id:"TDS-2404",node:"1635EA_01",tech:"K. Flowers",amt:2880,status:"Pending Review"},{id:"TDS-2405",node:"PED-0042",tech:"J. Reyes",amt:940,status:"Draft"}];
      const sc=s=>s==="Approved"?"cg":s==="Pending Review"?"ca":"cb2";
      c.innerHTML=`<div class="sc-title">Invoice Review</div><div class="sc-hint">Tap Pending invoices to review and approve</div><table class="sc-tbl"><thead><tr><th>Invoice</th><th>Node</th><th>Amount</th><th>Status</th></tr></thead><tbody id="ib"></tbody></table><div id="id2" style="display:none;flex-direction:column;gap:8px;"><div class="sc-div"></div><div class="sc-card" id="idc"></div><div class="sc-row" style="gap:7px;"><button class="sc-btn p" id="iap" style="flex:1;font-size:12px;">✓ Approve</button><button class="sc-btn g" id="irj" style="flex:1;font-size:12px;">✗ Send Back</button></div></div>`;
      let sel=null;
      invs.forEach((inv,i)=>{const tr=document.createElement("tr");tr.style.animationDelay=(i*.08)+"s";tr.innerHTML=`<td style="color:${A};font-weight:600;">${inv.id}</td><td style="color:var(--muted);">${inv.node}</td><td style="font-weight:600;">$${inv.amt.toLocaleString()}</td><td><span class="sc-badge ${sc(inv.status)}">${inv.status}</span></td>`;if(inv.status==="Pending Review"){tr.style.cursor="pointer";tr.addEventListener("click",()=>{sel=inv;$("idc").innerHTML=`<div class="sc-ct">${inv.id} · ${inv.node}</div><div class="sc-cs">Tech: ${inv.tech} · $${inv.amt.toLocaleString()}</div><div class="sc-cs">3 line items · 4 photos attached</div>`;$("id2").style.display="flex";});}$("ib").appendChild(tr);});
      $("iap").addEventListener("click",()=>{if(sel){toast(`✅ ${sel.id} approved — queued for payment`);$("id2").style.display="none";}});
      $("irj").addEventListener("click",()=>{if(sel){toast(`↩ ${sel.id} sent back for corrections`);$("id2").style.display="none";}});
    }},
    {label:"Reports",build(c){
      c.innerHTML=`<div class="sc-title">Project Reports</div><div class="sc-hint">Tap Generate to run a report</div><div style="display:flex;flex-direction:column;gap:7px;">${[{n:"Weekly Production Summary",d:"Closures, photos, billing by week",i:"📊"},{n:"Technician Hours Report",d:"Clock-in/out totals by tech",i:"⏱"},{n:"Invoice Reconciliation",d:"Wired vs SpecCom vs K&S billing",i:"💰"},{n:"Photo Documentation Export",d:"All GPS-tagged photos as PDF",i:"📷"},{n:"KMZ Route Summary",d:"Fiber path + node inventory",i:"🗺"}].map((r,i)=>`<div class="sc-card" style="animation:fadeIn .3s ease ${i*.08}s both;"><div class="sc-row" style="gap:10px;"><div style="font-size:20px;">${r.i}</div><div style="flex:1;"><div class="sc-ct">${r.n}</div><div class="sc-cs">${r.d}</div></div><button class="sc-btn g" style="font-size:9px;padding:4px 10px;" data-rn="${r.n}">Generate</button></div></div>`).join("")}</div>`;
      c.addEventListener("click",e=>{const b=e.target.closest("[data-rn]");if(b)toast(`📄 Generating: ${b.dataset.rn}...`);});
    }},
    {label:"Export",build(c){
      c.innerHTML=`<div class="sc-title">Export & Share</div><div class="sc-hint">Package project data for client delivery</div><div style="display:flex;flex-direction:column;gap:8px;">${[{f:"PDF",d:"Full documentation packet",s:"~4.2 MB",i:"📄"},{f:"CSV",d:"Line items & billing codes",s:"~180 KB",i:"📊"},{f:"KMZ",d:"Route & node map file",s:"~820 KB",i:"🗺"},{f:"ZIP",d:"All photos + reports",s:"~240 MB",i:"📦"}].map((e2,i)=>`<div class="sc-card" style="animation:fadeIn .3s ease ${i*.08}s both;"><div class="sc-row" style="justify-content:space-between;"><div class="sc-row" style="gap:10px;"><div style="font-size:22px;">${e2.i}</div><div><div class="sc-ct">${e2.f} Export</div><div class="sc-cs">${e2.d} · ${e2.s}</div></div></div><button class="sc-btn p" style="font-size:10px;padding:5px 12px;" data-fmt="${e2.f}">Export</button></div></div>`).join("")}</div>`;
      c.addEventListener("click",e=>{const b=e.target.closest("[data-fmt]");if(b)toast(`⬇ Preparing ${b.dataset.fmt} export...`);});
    }},
  ];

  return [];
}

buildHub();
})();
