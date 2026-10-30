/* ==========================================================================
   body3d.js · 3D human body for My Human Body Explorer
   Original model built in code with Three.js (r128). No external anatomy
   model or image is used, so there is no third-party licence to keep.
   Shapes are placed at approximate real positions for teaching.
   ========================================================================== */
(function(){
"use strict";

/* ---------- state ---------- */
const LAYERS = ["skin","skeleton","muscle","organs","nervous","circulatory"];
const group = {}; LAYERS.forEach(k=>{ group[k]=null; });
const pickables = [];          // meshes with userData.id
const skinMats = [];           // materials of the skin layer
const flows = [];              // {curve,color,speed,offset,count}
const flowDots = [];
let renderer, scene, camera, host, canvas;
let inited = false, active = false;
let yaw = 0.0, pitch = 0.08, dist = 4.0;     // current camera
let tYaw = 0.0, tPitch = 0.08;               // target camera (for view buttons)
let selectedId = null;
const CENTER = new THREE.Vector3(0, 0.92, 0);
const pointers = new Map();
let dragStart = null, pinchDist = null;
const clock = {t:0, last:0};

/* ---------- material / primitive helpers ---------- */
function mat(color, opts){
  return new THREE.MeshStandardMaterial(Object.assign({
    color: new THREE.Color(color), roughness: 0.55, metalness: 0.0
  }, opts||{}));
}
function addMesh(layerName, mesh, id){
  if(id){ mesh.userData.id = id; pickables.push(mesh); }
  group[layerName].add(mesh);
  return mesh;
}
function ell(layerName, id, color, p, s, opts){
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat(color, opts));
  m.position.set(p[0], p[1], p[2]);
  m.scale.set(s[0], s[1], s[2]);
  return addMesh(layerName, m, id);
}
function limb(layerName, id, color, a, b, r1, r2, opts){
  const A = new THREE.Vector3(a[0],a[1],a[2]), B = new THREE.Vector3(b[0],b[1],b[2]);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 14), mat(color, opts));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), B.clone().sub(A).normalize());
  return addMesh(layerName, m, id);
}
function tube(layerName, id, color, pts, r, opts, flow){
  const curve = new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 8, false), mat(color, opts));
  addMesh(layerName, m, id);
  if(flow) flows.push({curve, color: flow, count: flow.count||2, speed: flow.speed||0.12});
  return m;
}
const SIDES = [1, -1];

/* ---------- build the body ---------- */
function buildBody(){
  LAYERS.forEach(k=>{ group[k] = new THREE.Group(); group[k].name = k; scene.add(group[k]); });

  /* SKIN ------------------------------------------------------------ */
  const L = "skin", skin = "#F1D2B8", skinLine = {transparent:true, opacity:1};
  const prof = [[0.001,0.80],[0.12,0.82],[0.155,0.90],[0.165,1.00],[0.14,1.08],[0.15,1.20],[0.17,1.30],[0.18,1.42],[0.16,1.50],[0.07,1.55],[0.001,1.56]]
    .map(([r,y])=> new THREE.Vector2(r,y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), mat(skin, {transparent:true, opacity:1}));
  torso.scale.set(1, 1, 0.66);
  addMesh(L, torso, "skin"); skinMats.push(torso.material);
  ell(L, "skin", skin, [0,1.63,0.01], [0.095,0.12,0.105], {transparent:true,opacity:1});
  limb(L, "skin", skin, [0,1.5,0],[0,1.6,0], 0.05, 0.045, {transparent:true,opacity:1});
  ell(L, "skin", skin, [0,0.88,0], [0.17,0.09,0.12], {transparent:true,opacity:1});
  SIDES.forEach(s=>{
    limb(L,"skin",skin,[s*0.19,1.42,0],[s*0.25,1.13,0.02],0.05,0.04);
    limb(L,"skin",skin,[s*0.25,1.13,0.02],[s*0.28,0.86,0.04],0.04,0.03);
    ell(L,"skin",skin,[s*0.29,0.79,0.05],[0.035,0.08,0.02]);
    limb(L,"skin",skin,[s*0.09,0.88,0],[s*0.095,0.5,0],0.085,0.06);
    limb(L,"skin",skin,[s*0.095,0.5,0],[s*0.095,0.1,0],0.055,0.035);
    ell(L,"skin",skin,[s*0.095,0.05,0.07],[0.05,0.035,0.12]);
    ell(L,"skin",skin,[s*0.19,1.42,0],[0.055,0.055,0.055]);
    ell(L,"skin",skin,[s*0.095,0.5,0],[0.06,0.06,0.06]);
  });
  // collect all skin materials once built
  group[L].traverse(o=>{ if(o.isMesh && skinMats.indexOf(o.material)<0) skinMats.push(o.material); });

  /* SKELETON --------------------------------------------------------- */
  const Lk = "skeleton", bone = "#F6F1E4", bonePale = {roughness:0.7};
  ell(Lk, "skull", bone, [0,1.64,0.0], [0.085,0.105,0.095], bonePale);
  ell(Lk, "mandible", bone, [0,1.56,0.04], [0.06,0.03,0.05], bonePale);
  for(let i=0;i<24;i++){
    const y = 1.5 - i*0.026;
    const id = i<7 ? "cervical" : (i<19 ? "thoracic" : "lumbar");
    ell(Lk, id, bone, [0,y,-0.065], [0.022,0.014,0.022], bonePale);
  }
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.2,0.012), mat(bone,bonePale));
  sternum.position.set(0,1.31,0.1); addMesh(Lk, sternum, "sternum");
  for(let i=0;i<10;i++){
    const y = 1.36 - i*0.03;
    SIDES.forEach(s=>{
      tube(Lk, "ribs", bone, [[0,y,-0.07],[s*0.12,y-0.005,-0.035],[s*0.17,y-0.02,0.03],[s*0.06,y-0.035,0.1]], 0.006, bonePale);
    });
  }
  SIDES.forEach(s=>{
    tube(Lk, "clavicle", bone, [[0,1.46,0.07],[s*0.12,1.46,0.06],[s*0.19,1.44,0.03]], 0.008, bonePale);
    ell(Lk, "pelvis", bone, [s*0.09,0.94,-0.01], [0.07,0.1,0.035], bonePale);
    limb(Lk, "femur", bone, [s*0.09,0.88,0],[s*0.095,0.5,0], 0.025, 0.018, bonePale);
    ell(Lk, "patella", bone, [s*0.095,0.47,0.03], [0.02,0.025,0.012], bonePale);
    limb(Lk, "tibia", bone, [s*0.095,0.46,0],[s*0.095,0.1,0], 0.02, 0.014, bonePale);
    limb(Lk, "fibula", bone, [s*0.115,0.46,-0.01],[s*0.112,0.1,-0.01], 0.008, 0.008, bonePale);
    ell(Lk, "tarsals", bone, [s*0.095,0.06,0.04], [0.035,0.02,0.05], bonePale);
    limb(Lk, "humerus", bone, [s*0.19,1.4,0],[s*0.25,1.13,0.02], 0.02, 0.015, bonePale);
    limb(Lk, "radius", bone, [s*0.25,1.12,0.02],[s*0.28,0.87,0.04], 0.012, 0.01, bonePale);
    limb(Lk, "ulna", bone, [s*0.24,1.12,-0.01],[s*0.27,0.87,0.02], 0.012, 0.01, bonePale);
    ell(Lk, "carpals", bone, [s*0.29,0.82,0.05], [0.025,0.03,0.015], bonePale);
  });

  /* MUSCLE ----------------------------------------------------------- */
  const Lm = "muscle", muscle = "#C96B5B", mop = {transparent:true, opacity:0.82, roughness:0.6};
  SIDES.forEach(s=>{
    ell(Lm,"m-pec",muscle,[s*0.09,1.33,0.08],[0.1,0.06,0.04],mop);
    ell(Lm,"m-delt",muscle,[s*0.2,1.38,0.02],[0.05,0.06,0.05],mop);
    ell(Lm,"m-biceps",muscle,[s*0.23,1.24,0.05],[0.03,0.08,0.03],mop);
    ell(Lm,"m-quad",muscle,[s*0.1,0.7,0.06],[0.05,0.17,0.05],mop);
    ell(Lm,"m-tib",muscle,[s*0.095,0.3,0.03],[0.03,0.12,0.03],mop);
    ell(Lm,"m-calf",muscle,[s*0.095,0.3,-0.05],[0.04,0.12,0.04],mop);
    ell(Lm,"m-glut",muscle,[s*0.09,0.92,-0.1],[0.09,0.07,0.07],mop);
    ell(Lm,"m-lats",muscle,[s*0.15,1.15,-0.07],[0.04,0.12,0.05],mop);
  });
  ell(Lm,"m-abs",muscle,[0,1.12,0.09],[0.05,0.12,0.02],mop);
  ell(Lm,"m-trap",muscle,[0,1.48,-0.08],[0.14,0.04,0.06],mop);

  /* ORGANS ----------------------------------------------------------- */
  const Lo = "organs";
  const org = (id, color, p, s, extra) => ell(Lo, id, color, p, s, extra||{});
  org("heart","#C94C5A",[0.04,1.3,0.06],[0.055,0.07,0.05]);
  org("lungs","#E8A2AE",[0.1,1.32,-0.01],[0.085,0.15,0.1],{transparent:true,opacity:0.9});
  org("lungs","#E8A2AE",[-0.1,1.32,-0.01],[0.09,0.15,0.1],{transparent:true,opacity:0.9});
  org("liver","#9E5A3C",[-0.1,1.1,0.07],[0.15,0.07,0.08]);
  org("stomach","#E6A57E",[0.1,1.08,0.07],[0.09,0.08,0.06]);
  org("spleen","#8E6BA8",[0.15,1.1,-0.03],[0.035,0.06,0.03]);
  org("pancreas","#E8C872",[0.02,1.02,0.02],[0.12,0.025,0.03]);
  org("kidneys","#A9633A",[0.09,1.02,-0.07],[0.035,0.06,0.025]);
  org("kidneys","#A9633A",[-0.09,1.02,-0.07],[0.035,0.06,0.025]);
  org("gallbladder","#6FA86A",[-0.07,1.04,0.08],[0.02,0.03,0.02]);
  org("bladder","#D9B86A",[0,0.8,0.03],[0.045,0.045,0.045]);
  org("reproductive","#E7A3C6",[0.03,0.8,0.02],[0.02,0.015,0.02]);
  org("reproductive","#E7A3C6",[-0.03,0.8,0.02],[0.02,0.015,0.02]);
  org("thyroid","#7FBF8E",[0.02,1.5,0.07],[0.025,0.014,0.012]);
  org("thyroid","#7FBF8E",[-0.02,1.5,0.07],[0.025,0.014,0.012]);
  org("diaphragm","#7FB9D6",[0,1.2,0],[0.15,0.02,0.11],{transparent:true,opacity:0.5});
  // digestive tract
  const coil = []; for(let i=0;i<60;i++){ const a=i*0.5; coil.push([0.09*Math.cos(a), 0.94+0.06*(i/59)-0.03, 0.05+0.06*Math.sin(a)]); }
  tube(Lo, "smallint", "#E8B9A0", coil, 0.011, {});
  tube(Lo, "largeint", "#B8806A", [[-0.13,0.95,0.04],[0.13,0.95,0.04],[0.13,1.12,0.04],[-0.13,1.12,0.04],[-0.13,0.98,0.04]], 0.012, {});
  limb(Lo, "trachea", "#DFEEFB", [0,1.5,-0.01],[0,1.33,0.0], 0.012, 0.012);
  limb(Lo, "oesophagus", "#D49A7F", [0,1.5,-0.03],[0,1.2,-0.03], 0.01, 0.01);
  // brain (also in nervous layer)
  ell(Lo, "brain", "#E9B7CE", [0,1.66,-0.005], [0.08,0.085,0.085]);

  /* NERVOUS ---------------------------------------------------------- */
  const Ln = "nervous", nerve = "#F2C230";
  ell(Ln, "brain", "#E9B7CE", [0,1.66,-0.005], [0.08,0.085,0.085]);
  tube(Ln, "spinal", nerve, [[0,1.5,-0.058],[0,1.2,-0.058],[0,0.9,-0.058]], 0.007, {});
  SIDES.forEach(s=>{
    tube(Ln, "nerves", "#D9A21B", [[0,1.45,-0.058],[s*0.14,1.42,-0.04],[s*0.22,1.3,0.0],[s*0.26,1.12,0.02]], 0.004, {});
    tube(Ln, "nerves", "#D9A21B", [[0,0.88,-0.06],[s*0.09,0.6,-0.02],[s*0.1,0.3,-0.02],[s*0.09,0.1,-0.01]], 0.005, {});
  });

  /* CIRCULATORY ------------------------------------------------------ */
  const Lc = "circulatory", red = "#C94C5A", blue = "#3F6FB0";
  ell(Lc, "heart", red, [0.04,1.3,0.06], [0.055,0.07,0.05]);
  tube(Lc, "vessels", red, [[0.04,1.25,0.02],[0.03,1.42,0.0],[0.0,1.46,-0.02],[0.0,1.35,-0.05],[0.0,1.1,-0.06],[0.0,0.9,-0.05]], 0.011, {}, {color:"#E4572E", count:3, speed:0.09});
  SIDES.forEach(s=>{
    tube(Lc, "vessels", red, [[0.03,1.4,0.03],[s*0.19,1.42,0.02],[s*0.25,1.13,0.02],[s*0.28,0.86,0.04]], 0.006, {}, {color:"#E4572E", count:2, speed:0.1});
    tube(Lc, "vessels", blue, [[s*0.19,1.42,-0.01],[s*0.25,1.13,-0.01],[s*0.28,0.86,0.0]], 0.005, {}, {color:"#3F6FB0", count:2, speed:0.08});
    tube(Lc, "vessels", red, [[s*0.07,0.92,0],[s*0.095,0.5,0],[s*0.095,0.1,0.02]], 0.006, {}, {color:"#E4572E", count:2, speed:0.1});
    tube(Lc, "vessels", blue, [[s*0.07,0.92,-0.02],[s*0.095,0.5,-0.02],[s*0.095,0.1,0.0]], 0.005, {}, {color:"#3F6FB0", count:2, speed:0.08});
  });
  // moving blood cells
  flows.forEach(f=>{
    for(let i=0;i<f.count;i++){
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.014,8,6), new THREE.MeshBasicMaterial({color:new THREE.Color(f.color.color)}));
      d.userData.flow = f; d.userData.offset = i/f.count;
      group[Lc].add(d); flowDots.push(d);
    }
  });
}

/* ---------- picking and highlighting ---------- */
function setHighlight(id){
  pickables.forEach(m=>{
    const on = (id && m.userData.id===id);
    if(m.material.emissive){
      m.material.emissive.setHex(on ? 0x7a5200 : 0x000000);
    }
  });
  selectedId = id;
}
function pickAt(clientX, clientY){
  const r = canvas.getBoundingClientRect();
  const v = new THREE.Vector2(((clientX-r.left)/r.width)*2-1, -((clientY-r.top)/r.height)*2+1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(v, camera);
  const otherOn = LAYERS.some(k=>k!=="skin" && group[k] && group[k].visible);
  const candidates = pickables.filter(m=>m.parent && m.parent.visible && (otherOn ? m.userData.id!=="skin" : true));
  const hits = ray.intersectObjects(candidates, false);
  return hits.length ? hits[0].object.userData.id : null;
}

/* ---------- info panel ---------- */
function infoHTML(id){
  const d = BY[id];
  if(!d) return `<p>${id}</p>`;
  const where = d.where ? `<h4>Where is it?</h4><p>${esc(d.where)}</p>` : "";
  const fn = d.does || d.what;
  const simple = d.real ? `<h4>Simple explanation</h4><p>${esc(d.real)}</p>` : "";
  const term = d.term ? `<div class="term">Scientific name: ${esc(d.term)}</div>` : "";
  return `
    <h3>${esc(d.name)}</h3>
    ${d.pron?`<div class="pron">Say it: ${esc(d.pron)} ${speakBtn(d.pron)}</div>`:""}
    ${term}
    ${where}
    <h4>What does it do?</h4><p>${esc(fn)}</p>
    ${simple}
    ${d.fact?`<div class="callout fact"><b>Fun fact:</b> ${esc(d.fact)}</div>`:""}`;
}
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function select3d(id){
  setHighlight(id);
  const box = document.getElementById("info3d");
  box.innerHTML = id ? infoHTML(id) : `<p class="small">Tap any organ, bone or muscle to see its name, place and job.</p>`;
}

/* ---------- camera ---------- */
function camPos(){
  return new THREE.Vector3(
    CENTER.x + dist*Math.sin(yaw)*Math.cos(pitch),
    CENTER.y + dist*Math.sin(pitch),
    CENTER.z + dist*Math.cos(yaw)*Math.cos(pitch));
}
function setView(v){
  const map = {front:[0,0.08], back:[Math.PI,0.08], side:[Math.PI/2,0.08]};
  const m = map[v]; if(!m) return;
  tYaw = m[0]; tPitch = m[1];
  document.querySelectorAll("[data-v3d]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v3d===v));
}
function zoom(f){ dist = Math.min(7, Math.max(1.4, dist*f)); }
function resetView(){ dist = 4.0; setView("front"); }

/* ---------- layers ---------- */
function setLayer(name, on){
  group[name].visible = on;
  const others = LAYERS.filter(k=>k!=="skin" && group[k].visible).length;
  skinMats.forEach(m=>{
    m.transparent = true;
    m.opacity = (name==="skin" ? on : group.skin.visible) && others>0 ? 0.22 : 1.0;
    m.depthWrite = !(others>0);
  });
  group.skin.visible = group.skin.visible; // keep skin on/off state
  document.querySelectorAll("[data-l3d]").forEach(b=>{
    if(b.dataset.l3d===name) b.setAttribute("aria-pressed", on);
  });
}

/* ---------- render loop ---------- */
function resize(){
  if(!renderer || !host) return;
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
}
function frame(now){
  if(!active) return;
  requestAnimationFrame(frame);
  clock.t = now/1000;
  // ease toward the target view (shortest way round)
  let dy = tYaw - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  yaw += dy*0.12; pitch += (tPitch-pitch)*0.12;
  camera.position.copy(camPos());
  camera.lookAt(CENTER);
  // blood cells
  flowDots.forEach(d=>{
    const f = d.userData.flow;
    const t = (clock.t*f.speed + d.userData.offset) % 1;
    d.position.copy(f.curve.getPointAt(t));
    d.visible = group.circulatory.visible;
  });
  renderer.render(scene, camera);
}

/* ---------- input (mouse, touch, pinch) ---------- */
function bindInput(){
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", e=>{
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    dragStart = {x:e.clientX, y:e.clientY, moved:0};
    if(pointers.size===2){ const [a,b]=[...pointers.values()]; pinchDist = Math.hypot(a.x-b.x,a.y-b.y); }
  });
  canvas.addEventListener("pointermove", e=>{
    if(!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      const [a,b]=[...pointers.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinchDist){ zoom(pinchDist/d); }
      pinchDist = d; return;
    }
    const dx = e.clientX-prev.x, dy = e.clientY-prev.y;
    if(dragStart) dragStart.moved += Math.abs(dx)+Math.abs(dy);
    if(pointers.size===1){
      tYaw += dx*0.008; yaw = tYaw;
      tPitch = Math.max(-1.2, Math.min(1.2, tPitch + dy*0.006)); pitch = tPitch;
    }
  });
  const end = e=>{
    const moved = dragStart ? dragStart.moved : 0;
    pointers.delete(e.pointerId);
    if(pointers.size<2) pinchDist = null;
    if(e.type==="pointerup" && moved<8 && pointers.size===0){
      const id = pickAt(e.clientX, e.clientY);
      select3d(id);
    }
    if(pointers.size===0) dragStart = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", e=>{ e.preventDefault(); zoom(e.deltaY>0?1.08:0.92); }, {passive:false});
}

/* ---------- search inside 3D ---------- */
function bindSearch(){
  const input = document.getElementById("search3d");
  const out = document.getElementById("results3d");
  input.addEventListener("input", ()=>{
    const q = input.value.trim().toLowerCase();
    if(!q){ out.innerHTML=""; return; }
    const ids = [...new Set(pickables.map(m=>m.userData.id))].filter(id=>BY[id]);
    const hits = ids.filter(id=>BY[id].name.toLowerCase().includes(q)).slice(0,8);
    out.innerHTML = hits.map(id=>`<button class="chip" data-pick="${id}">${esc(BY[id].name)}</button>`).join("") || `<span class="small">No match</span>`;
    out.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>select3d(b.dataset.pick)));
  });
}

/* ---------- start ---------- */
function init3D(){
  if(inited) { active = true; resize(); requestAnimationFrame(frame); return; }
  host = document.getElementById("three-host");
  canvas = document.createElement("canvas");
  host.appendChild(canvas);
  if(typeof THREE === "undefined"){
    host.innerHTML = `<p class="small" style="padding:20px">The 3D engine could not load. Check your internet connection and reload the page.</p>`;
    return;
  }
  try{
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:"default"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setClearColor(0xF4F8F7, 1);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c9c4, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(2,3,4); scene.add(sun);
    buildBody();
    bindInput();
    bindSearch();
    document.querySelectorAll("[data-l3d]").forEach(b=>b.addEventListener("click",()=>{
      const k=b.dataset.l3d; setLayer(k, !group[k].visible);
    }));
    document.querySelectorAll("[data-v3d]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.v3d)));
    document.getElementById("zoom3in").addEventListener("click",()=>zoom(0.8));
    document.getElementById("zoom3out").addEventListener("click",()=>zoom(1.25));
    document.getElementById("reset3").addEventListener("click",resetView);
    // default: skin + skeleton on, the rest off (students turn layers on)
    LAYERS.forEach(k=>group[k].visible = (k==="skin"||k==="skeleton"));
    document.querySelectorAll("[data-l3d]").forEach(b=>b.setAttribute("aria-pressed", group[b.dataset.l3d].visible));
    setLayer("skin", group.skin.visible);
    select3d(null);
    inited = true;
    yaw = tYaw = 0; pitch = tPitch = 0.08;
    window.addEventListener("resize", resize);
    if(window.ResizeObserver) new ResizeObserver(resize).observe(host);
    active = true; resize(); requestAnimationFrame(frame);
  } catch(err){
    host.innerHTML = `<p class="small" style="padding:20px">3D could not start on this device: ${esc(err.message)}</p>`;
  }
}
function stop3D(){ active = false; }
window.init3D = init3D;
window.stop3D = stop3D;
})();
