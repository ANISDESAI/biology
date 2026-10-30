/* ============================================================
   APP · controls, selection, zoom, labels, cards and Study Mode
   ============================================================ */

const BASE_VIEW = {x:-120, y:-6, w:540, h:652};
const LAYER_NAMES = {
  skin:"External body and skin", muscle:"Muscular system", skeleton:"Skeletal system",
  organs:"Internal organs", nervous:"Nervous system", circulatory:"Circulatory system", all:"All layers"
};
const LAYER_HINTS = {
  skin:"Shows the outside of the body. Tap a region to learn its parts.",
  muscle:"Muscles that move the bones. Tap a muscle to learn what it does.",
  skeleton:"206 bones give the body its shape and protect organs. Tap a bone.",
  organs:"The organs inside the body. Tap an organ to open its card.",
  nervous:"The brain, spinal cord and nerves carry messages around the body.",
  circulatory:"The heart pumps blood. Red dots are oxygen-rich blood, blue dots are oxygen-poor blood.",
  all:"Several layers together. Turn layers off to see one clearly."
};

const state = {mode:"skin", view:"front", labels:false, current:null, walkIdx:-1, viewBox:{...BASE_VIEW}};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fig = () => document.getElementById("fig");

/* ---------- geometry helpers ---------- */
function visibleEls(id){
  return [...fig().querySelectorAll(`[data-id="${id}"]`)].filter(el=>{
    if(el.closest(".view-front") && state.view==="back") return false;
    if(el.closest(".view-back") && state.view==="front") return false;
    return el.getBBox && el.getBBox().width+el.getBBox().height>0;
  });
}
function bboxOf(els){
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  els.forEach(el=>{
    const b = el.getBBox(); const m = el.getCTM(); if(!m) return;
    [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].forEach(([px,py])=>{
      const X = m.a*px+m.c*py+m.e, Y = m.b*px+m.d*py+m.f;
      x1=Math.min(x1,X); y1=Math.min(y1,Y); x2=Math.max(x2,X); y2=Math.max(y2,Y);
    });
  });
  if(!isFinite(x1)) return null;
  return {x:x1,y:y1,w:x2-x1,h:y2-y1};
}
function setViewBox(v){
  state.viewBox = v;
  fig().setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
}
function tweenTo(target, ms=460){
  const from = {...state.viewBox}; const t0 = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce || ms===0){ setViewBox(target); return; }
  function step(now){
    const k = Math.min(1,(now-t0)/ms), e = 1-Math.pow(1-k,3);
    setViewBox({x:from.x+(target.x-from.x)*e, y:from.y+(target.y-from.y)*e, w:from.w+(target.w-from.w)*e, h:from.h+(target.h-from.h)*e});
    if(k<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function zoomToBox(b, pad=1.6){
  if(!b || ![b.x,b.y,b.w,b.h].every(Number.isFinite)) return;
  const cx=b.x+b.w/2, cy=b.y+b.h/2;
  /* keep enough of the body in view so it never disappears */
  let w=Math.min(Math.max(b.w,80)*pad, BASE_VIEW.w*0.75);
  let h=Math.min(Math.max(b.h,80)*pad, BASE_VIEW.h*0.75);
  const ratio = BASE_VIEW.w/BASE_VIEW.h;
  if(w/h>ratio){ h = w/ratio; } else { w = h*ratio; }
  tweenTo({x:cx-w/2,y:cy-h/2,w,h});
}
function zoomBy(f){
  const v = state.viewBox, cx=v.x+v.w/2, cy=v.y+v.h/2;
  const w=Math.max(120,Math.min(BASE_VIEW.w*2,v.w*f)), h=Math.max(120,Math.min(BASE_VIEW.h*2,v.h*f));
  tweenTo({x:cx-w/2,y:cy-h/2,w,h});
}
function resetView(){
  state.current = null; state.walkIdx = -1;
  highlight(null,null);
  tweenTo({...BASE_VIEW});
  renderCard(); renderList();
}

/* ---------- selection ---------- */
function highlight(id, region){
  fig().querySelectorAll(".sel").forEach(e=>e.classList.remove("sel"));
  if(region) fig().querySelectorAll(`[data-region="${region}"]`).forEach(e=>e.classList.add("sel"));
  if(id) visibleEls(id).forEach(e=>e.classList.add("sel"));
}
function selectPart(id, zoom=true){
  const p = BY[id]; if(!p) return;
  state.current = {type:"part", id};
  state.walkIdx = PARTS.indexOf(p);
  highlight(id);
  renderCard(); renderList();
  $(".card-col").scrollIntoView({block:"nearest",behavior:"smooth"});
}
function selectRegion(key, zoom=true){
  state.current = {type:"region", key};
  state.walkIdx = -1;
  highlight(null,key);
  renderCard(); renderList();
}

/* ---------- labels with leader lines ---------- */
function updateLabels(){
  const g = document.getElementById("labelG");
  g.innerHTML = "";
  if(!state.labels) return;
  let list = [];
  if(state.mode==="organs"||state.mode==="all") list = ORGANS;
  else if(state.mode==="nervous") list = ORGANS.filter(o=>["brain","spinal"].includes(o.id));
  else if(state.mode==="circulatory") list = ORGANS.filter(o=>o.id==="heart");
  else if(state.mode==="skeleton"||state.mode==="muscle"){ list = []; }
  if(!list.length) return;
  const left = list.filter(o=>o.anchor[0]<150).sort((a,b)=>a.anchor[1]-b.anchor[1]);
  const right = list.filter(o=>o.anchor[0]>=150).sort((a,b)=>a.anchor[1]-b.anchor[1]);
  const place = (arr, side) => {
    let y = 40;
    arr.forEach(o=>{
      const ly = Math.max(y, o.anchor[1]); y = ly + 20;
      const lx = side==="L" ? -12 : 312;
      const [ax,ay] = o.anchor;
      const fx = side==="L" ? -6 : 306;
      g.insertAdjacentHTML("beforeend",
        `<line x1="${ax}" y1="${ay}" x2="${fx}" y2="${ly}"/>
         <circle cx="${ax}" cy="${ay}" r="2.4"/>
         <text x="${lx}" y="${ly+3}" text-anchor="${side==="L"?"end":"start"}" data-id="${o.id}" style="cursor:pointer">${esc(o.name)}</text>`);
    });
  };
  place(left,"L"); place(right,"R");
  g.querySelectorAll("text[data-id]").forEach(t=>t.addEventListener("click",()=>selectPart(t.dataset.id,true)));
}

/* ---------- list ---------- */
function renderList(){
  const q = $("#q").value.trim().toLowerCase();
  const groups = ["Head","Upper body","Arms and hands","Lower body","Skeleton","Muscles","Inside the body","Extras"];
  let html = "";
  for(const g of groups){
    const items = PARTS.filter(p=>(p.group===g || (g==="Muscles"&&p.cat==="muscle")) && (!q || p.name.toLowerCase().includes(q) || (p.what||"").toLowerCase().includes(q)));
    if(!items.length) continue;
    html += `<div class="grp">${g} (${items.length})</div>`;
    html += items.map(p=>{
      const sel = state.current && state.current.type==="part" && state.current.id===p.id;
      return `<button class="item" data-id="${p.id}" aria-current="${sel}"><span>${esc(p.name)}</span><small>${p.cat==="organ"?esc(p.sys.split(" ")[0]):""}</small></button>`;
    }).join("");
  }
  $("#list").innerHTML = html || `<p class="item">No match for "${esc(q)}".</p>`;
  $("#list").querySelectorAll(".item").forEach(b=>b.addEventListener("click",()=>selectPart(b.dataset.id,true)));
  $("#total").textContent = PARTS.length+" parts";
}

/* ---------- magnifier and animation ---------- */
function magnifierMarkup(id, size){
  const b = bboxOf(visibleEls(id));
  if(!b) return "";
  const pad = Math.max(b.w,b.h)*0.35+6;
  const vb = `${b.x-pad} ${b.y-pad} ${b.w+pad*2} ${b.h+pad*2}`;
  const clones = visibleEls(id).map(el=>{
    const c = el.cloneNode(true);
    c.removeAttribute("class"); c.removeAttribute("data-id");
    return c.outerHTML;
  }).join("");
  return `<svg viewBox="${vb}" role="img" aria-label="Magnified ${esc(BY[id].name)}">${clones}</svg>`;
}
function animationMarkup(o){
  const b = bboxOf(visibleEls(o.id));
  if(!b) return "";
  const pad = Math.max(b.w,b.h)*0.35+6;
  const vb = `${b.x-pad} ${b.y-pad} ${b.w+pad*2} ${b.h+pad*2}`;
  const cls = {beat:"anim-beat",breathe:"anim-breathe",squeeze:"anim-squeeze"}[o.anim] || "anim-pulse";
  const clones = visibleEls(o.id).map(el=>{ const c=el.cloneNode(true); c.removeAttribute("class"); c.removeAttribute("data-id"); return c.outerHTML; }).join("");
  const dots = o.flow ? `
    <path d="${o.flow}" fill="none" stroke="#2A7F7A" stroke-width="1" stroke-dasharray="2 3" opacity=".7"/>
    <circle r="2.8" fill="#2A7F7A"><animateMotion dur="2.6s" repeatCount="indefinite" path="${o.flow}"/></circle>
    <circle r="2.8" fill="#2A7F7A"><animateMotion dur="2.6s" begin="-1.3s" repeatCount="indefinite" path="${o.flow}"/></circle>` : "";
  return `<svg viewBox="${vb}" role="img" aria-label="${esc(o.name)} animation"><g class="${cls}">${clones}</g>${dots}</svg>`;
}

/* ---------- cards ---------- */
function renderCard(){
  const box = $("#card");
  if(!state.current){
    box.innerHTML = `
      <div class="welcome">
        <div class="kicker">Start here</div>
        <h2>Explore your body, one part at a time</h2>
        <p>Tap a region, bone, muscle or organ on the figure. Use the layer buttons to see one system at a time. Zoom in to look closer, or take the guided walk from head to toes.</p>
        <div class="chips">
          <button class="chip" data-start="hair">Start at the hair</button>
          <button class="chip" data-start="skull">See the skull</button>
          <button class="chip" data-start="heart">Meet the heart</button>
        </div>
      </div>`;
    box.querySelectorAll("[data-start]").forEach(b=>b.addEventListener("click",()=>selectPart(b.dataset.start,true)));
    return;
  }

  if(state.current.type==="region"){
    const parts = PARTS.filter(p=>p.region===state.current.key);
    box.innerHTML = `
      <div class="kicker">Body region</div>
      <h2>${esc(REGION_NAMES[state.current.key]||state.current.key)}</h2>
      <p class="pron">${parts.length} parts in this region. Choose one to learn about it.</p>
      <div class="chips">${parts.map(p=>`<button class="chip" data-id="${p.id}">${esc(p.name)}</button>`).join("")}</div>`;
    box.querySelectorAll(".chip").forEach(b=>b.addEventListener("click",()=>selectPart(b.dataset.id,true)));
    return;
  }

  const p = BY[state.current.id];
  const idx = state.walkIdx;
  const prev = idx>0 ? PARTS[idx-1] : null;
  const next = idx<PARTS.length-1 && idx>=0 ? PARTS[idx+1] : null;
  const swatch = p.color || "#B9AE94";

  if(p.cat==="organ"){
    box.innerHTML = `
      <div class="kicker"><i style="background:${swatch}"></i>${esc(p.sys)}</div>
      <h2>${esc(p.name)}</h2>
      <p class="pron">Say it: ${esc(p.pron)} ${speakBtn(p.pron)}</p>
      ${p.term?`<div class="term">Scientific name: ${esc(p.term)}</div>`:""}
      <div class="block"><h3>What is it?</h3><p>${esc(p.what)}</p></div>
      <div class="block"><h3>Where is it?</h3><p>${esc(p.where)}</p></div>
      <div class="block"><h3>What does it do?</h3><p>${esc(p.does)}</p></div>
      <div class="block"><h3>How does it work?</h3><ol>${p.how.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>
      <div class="magnifier">
        <div>${magnifierMarkup(p.id)}</div>
        <div class="block"><h3>Magnified view</h3><p class="pron" style="margin:0">Zoomed in on ${esc(p.name.toLowerCase())}.</p></div>
      </div>
      <div class="anim-box">${animationMarkup(p)}<div><b>Watch how it works</b><br>${esc(p.anim==="beat"?"Each beat pushes blood out.":p.anim==="breathe"?"Each breath moves air in and out.":"Dots show the movement inside the organ.")}</div></div>
      <div class="callout warn"><b>What happens if it stops working?</b><br>${esc(p.broken)}</div>
      <div class="callout fact"><b>Interesting fact:</b> ${esc(p.fact)}</div>
      <div class="callout real"><b>Real-life example:</b> ${esc(p.real)}</div>
      <div class="callout memo"><b>Memory trick:</b> ${esc(p.mem)}</div>
      ${p.note?`<p class="pron">${esc(p.note)}</p>`:""}
      ${navRow(prev,next,idx)}`;
  } else {
    box.innerHTML = `
      <div class="kicker">${esc(p.kind)}${p.group?` · ${esc(p.group)}`:""}</div>
      <h2>${esc(p.name)}</h2>
      ${p.pron?`<p class="pron">Say it: ${esc(p.pron)} ${speakBtn(p.pron)}</p>`:""}
      ${p.term?`<div class="term">Scientific name: ${esc(p.term)}</div>`:""}
      <div class="block"><h3>What is it?</h3><p>${esc(p.what)}</p></div>
      ${p.fact?`<div class="callout fact"><b>Interesting fact:</b> ${esc(p.fact)}</div>`:""}
      ${navRow(prev,next,idx)}`;
  }
  box.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>selectPart(b.dataset.nav,true)));
}
function navRow(prev,next,idx){
  return `<div class="nav-row">
    <button data-nav="${prev?prev.id:""}" ${prev?"":"disabled"}>${prev?"← "+esc(prev.name):"Start"}</button>
    <span class="count">${idx>=0?(idx+1)+" of "+PARTS.length:""}</span>
    <button data-nav="${next?next.id:""}" ${next?"":"disabled"}>${next?esc(next.name)+" →":"End of tour"}</button>
  </div>`;
}

/* ---------- study mode ---------- */
const studyScore = {total:0, correct:0};
function renderStudy(){
  const host = $("#study-list");
  studyScore.total=0; studyScore.correct=0;
  host.innerHTML = ORGANS.map((o,oi)=>`
    <section class="qcard" data-org="${o.id}">
      <header><div><h2 style="font-size:1.2rem">${esc(o.name)}</h2><div class="pron">${esc(o.sys)}</div></div>
      <div class="score" id="sc-${o.id}">0 / 5 correct</div></header>
      <div class="callout real" style="margin-top:8px"><b>In short:</b> ${esc(o.what)} ${esc(o.does)}</div>
      ${o.qs.map((q,qi)=>`
        <div class="qitem">
          <p>${qi+1}. ${esc(q[0])}</p>
          ${q[1].map((opt,i)=>`<button class="qopt" data-o="${oi}" data-q="${qi}" data-i="${i}">${esc(opt)}</button>`).join("")}
          <div class="qfeed"></div>
        </div>`).join("")}
    </section>`).join("");
  host.querySelectorAll(".qopt").forEach(b=>b.addEventListener("click",()=>answerQ(b)));
  $("#study-score").textContent = "Score: 0";
}
function answerQ(b){
  const o = ORGANS[Number(b.dataset.o)], qi = Number(b.dataset.q), i = Number(b.dataset.i);
  const q = o.qs[qi];
  const box = b.closest(".qitem");
  if(box.dataset.done) return;
  box.dataset.done = "1";
  const ok = i===q[2];
  box.dataset.ok = ok ? "1" : "0";
  box.querySelectorAll(".qopt").forEach(x=>x.disabled=true);
  b.classList.add(ok?"right":"wrong");
  box.querySelectorAll(".qopt")[q[2]].classList.add("right");
  box.querySelector(".qfeed").textContent = ok ? "Correct!" : "The right answer is highlighted. Look again at the organ card.";
  const card = b.closest(".qcard");
  studyScore.total++; if(ok) studyScore.correct++;
  const correctHere = card.querySelectorAll('.qitem[data-ok="1"]').length;
  card.querySelector(".score").textContent = `${correctHere} / 5 correct`;
  $("#study-score").textContent = `Score: ${studyScore.correct} out of ${studyScore.total} answered`;
}

/* ---------- mode and layer controls ---------- */
function setMode(m){
  state.mode = m;
  fig().dataset.mode = m;
  $$("[data-mode-btn]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.modeBtn===m));
  $("#layer-hint").textContent = LAYER_HINTS[m];
  updateLabels();
}
function setView(v){
  state.view = v;
  fig().dataset.view = v;
  $$("[data-view-btn]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.viewBtn===v));
  if(state.current && state.current.type==="part") highlight(state.current.id);
  updateLabels();
}
function setExploreStudy(which){
  const study = which==="study";
  const three = which==="three";
  $("#explore").hidden = study || three;
  $("#study").classList.toggle("on", study);
  $("#three").hidden = !three;
  $$("[data-section]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.section===which));
  if(study) renderStudy();
  if(three && window.init3D) window.init3D();
  if(!three && window.stop3D) window.stop3D();
}

/* ---------- pronunciation audio (device text-to-speech, works offline) ---------- */
function speakBtn(pron){
  if(!pron || !("speechSynthesis" in window)) return "";
  return `<button class="speak" data-say="${esc(pron)}" aria-label="Hear how to say ${esc(pron)}" title="Hear it">&#9658; Listen</button>`;
}
function say(text){
  if(!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(String(text).replace(/-/g," "));
  u.lang = "en-IN"; u.rate = 0.8; u.pitch = 1;
  const voices = speechSynthesis.getVoices();
  const v = voices.find(x=>/en[-_](IN|GB|US)/i.test(x.lang));
  if(v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-say]");
  if(!b) return;
  e.stopPropagation();
  say(b.dataset.say);
});

/* ---------- init ---------- */
function init(){
  buildFigure();
  setViewBox({...BASE_VIEW});
  setMode("skin");
  setView("front");

  fig().addEventListener("click",e=>{
    const t = e.target.closest("[data-id],[data-region]");
    if(!t) return;
    if(t.dataset.id) selectPart(t.dataset.id, true);
    else selectRegion(t.dataset.region, true);
  });
  fig().addEventListener("keydown",e=>{
    if(e.key!=="Enter") return;
    const t = e.target.closest("[data-region]"); if(t) selectRegion(t.dataset.region,true);
  });
  $$("#hitG [data-region]").forEach(h=>{ h.setAttribute("tabindex","0"); h.setAttribute("role","button"); });

  $$("[data-mode-btn]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.modeBtn)));
  $$("[data-view-btn]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.viewBtn)));
  $$("[data-section]").forEach(b=>b.addEventListener("click",()=>setExploreStudy(b.dataset.section)));
  $("#zoomIn").addEventListener("click",()=>zoomBy(0.7));
  $("#zoomOut").addEventListener("click",()=>zoomBy(1.4));
  $("#resetView").addEventListener("click",resetView);
  $("#labelsBtn").addEventListener("click",e=>{
    state.labels = !state.labels;
    e.currentTarget.setAttribute("aria-pressed", state.labels);
    updateLabels();
  });
  $("#walkBtn").addEventListener("click",()=>selectPart(PARTS[0].id,true));
  $("#q").addEventListener("input",renderList);

  renderList();
  renderCard();
}
document.addEventListener("DOMContentLoaded", init);
