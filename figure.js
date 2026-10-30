/* ============================================================
   FIGURE · builds the front and back body with separate layers
   Layers: skin, muscle, skeleton, organs, nervous, circulatory
   Each layer has a front part and a back part (shown by data-view)
   ============================================================ */

const MIRROR = 'transform="matrix(-1 0 0 1 300 0)"';

/* helpers to draw a left/right pair from one right-side shape */
function pair(id, d, attrs){
  return `<path data-id="${id}" d="${d}" ${attrs}/><path data-id="${id}" ${MIRROR} d="${d}" ${attrs}/>`;
}
function bone(d, w, id){
  return `<path data-id="${id}" d="${d}" fill="none" stroke="#A99D84" stroke-width="${w+2}" stroke-linecap="round"/>`+
         `<path data-id="${id}" d="${d}" fill="none" stroke="#FBF7EE" stroke-width="${w}" stroke-linecap="round"/>`;
}
function bonePair(d, w, id){ return bone(d,w,id) + `<g ${MIRROR}>${bone(d,w,id)}</g>`; }
function blob(d, id, fill, stroke){
  return `<path data-id="${id}" d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}

/* ---------- SKIN (silhouette, both views share it) ---------- */
const SKIN_SVG = `
  <use href="#bodyHalf" fill="url(#skinFill)" stroke="#B98163" stroke-width="1.2"/>
  <use href="#bodyHalf" ${MIRROR} fill="url(#skinFill)" stroke="#B98163" stroke-width="1.2"/>
  <rect x="148.6" y="16" width="2.8" height="336" fill="#F2D0B4"/>
  <ellipse cx="150" cy="636" rx="92" ry="6" fill="#23313F" opacity=".1"/>`;
const SKIN_FRONT_DETAIL = `
  <g fill="none" stroke="#B98163" stroke-width="1" opacity=".55" stroke-linecap="round">
    <path d="M136 62 C140 66 145 66 149 63"/><path d="M164 62 C160 66 155 66 151 63"/>
    <path d="M147 74 C148 80 149 82 151 83"/><path d="M142 92 C148 96 152 96 158 92"/>
    <path d="M150 112 C150 124 152 130 150 132"/>
  </g>`;

/* ---------- HIT AREAS (regions, bottom-most so organs get clicks first) ---------- */
const HITS_SVG = `
  <ellipse class="hit" data-region="head" cx="150" cy="62" rx="40" ry="48"/>
  <rect class="hit" data-region="neck" x="138" y="104" width="24" height="26"/>
  <rect class="hit" data-region="chest" x="94" y="128" width="112" height="72"/>
  <rect class="hit" data-region="abdomen" x="104" y="200" width="92" height="132"/>
  <path class="hit" data-region="arms" d="M200 150 Q214 192 216 242 Q222 300 222 352" stroke-width="30" fill="none"/>
  <path class="hit" data-region="arms" d="M100 150 Q86 192 84 242 Q78 300 78 352" stroke-width="30" fill="none"/>
  <ellipse class="hit" data-region="hands" cx="222" cy="392" rx="18" ry="26"/>
  <ellipse class="hit" data-region="hands" cx="78" cy="392" rx="18" ry="26"/>
  <path class="hit" data-region="legs" d="M182 352 Q198 420 192 482 Q194 546 192 598" stroke-width="44" fill="none"/>
  <path class="hit" data-region="legs" d="M118 352 Q102 420 108 482 Q106 546 108 598" stroke-width="44" fill="none"/>
  <ellipse class="hit" data-region="feet" cx="206" cy="618" rx="24" ry="12"/>
  <ellipse class="hit" data-region="feet" cx="94" cy="618" rx="24" ry="12"/>`;

/* ---------- MUSCLES ---------- */
const MUSCLE_FRONT = `
  ${pair("m-pec","M150 146 C168 138 188 142 194 162 C186 178 166 180 150 172 Z",'fill="#C7715E" opacity=".62" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-delt","M196 136 C212 136 222 152 218 172 C212 166 204 158 196 150 Z",'fill="#C7715E" opacity=".62" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-biceps","M210 182 C218 200 220 222 216 244 C210 226 206 204 204 186 Z",'fill="#C7715E" opacity=".62" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-abs","M150 196 C162 194 172 198 174 214 L172 294 C164 300 156 300 150 296 Z",'fill="#C7715E" opacity=".5" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-quad","M168 380 C186 384 200 420 196 470 C188 474 178 472 172 462 C170 430 166 404 168 380 Z",'fill="#C7715E" opacity=".58" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-tib","M196 500 C202 530 200 560 198 590 C194 592 190 590 188 586 C190 560 190 530 196 500 Z",'fill="#C7715E" opacity=".55" stroke="#94453A" stroke-width=".6"')}`;
const MUSCLE_BACK = `
  ${pair("m-trap","M150 112 C170 120 194 128 200 150 L150 172 Z",'fill="#C7715E" opacity=".6" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-lats","M192 172 C206 200 202 240 188 262 C180 250 178 220 180 192 Z",'fill="#C7715E" opacity=".6" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-glut","M160 296 C188 296 206 316 204 344 C190 354 170 350 158 338 Z",'fill="#C7715E" opacity=".58" stroke="#94453A" stroke-width=".6"')}
  ${pair("m-calf","M196 470 C206 500 204 540 198 580 C194 582 190 580 188 576 C190 540 190 500 196 470 Z",'fill="#C7715E" opacity=".58" stroke="#94453A" stroke-width=".6"')}`;

/* ---------- SKELETON ---------- */
let SPINE_RECTS = "";
for(let i=0;i<24;i++){
  const y = 118 + i*9;
  const id = i<7 ? "cervical" : (i<19 ? "thoracic" : "lumbar");
  SPINE_RECTS += `<rect data-id="${id}" x="144" y="${y}" width="12" height="7" rx="3.5" fill="#FBF7EE" stroke="#A99D84" stroke-width=".9"/>`;
}
let RIBS = "";
for(let i=0;i<10;i++){
  const y = 140 + i*8;
  RIBS += bonePair(`M146 ${y} C128 ${y-8} 112 ${y+4} 106 ${y+26}`, 3.5, "ribs");
}
const SKULL = `
  <path data-id="skull" d="M150 18 C178 18 190 38 190 62 C190 84 182 98 170 106 L130 106 C118 98 110 84 110 62 C110 38 122 18 150 18Z" fill="#FBF7EE" stroke="#A99D84" stroke-width="2"/>
  <ellipse data-id="skull" cx="134" cy="68" rx="9" ry="8" fill="#B8AC92"/>
  <ellipse data-id="skull" cx="166" cy="68" rx="9" ry="8" fill="#B8AC92"/>
  <path data-id="skull" d="M150 76 L146 90 L154 90Z" fill="#B8AC92"/>`;
const SKELETON_FRONT = `
  ${SKULL}
  <path data-id="mandible" d="M128 104 Q150 124 172 104" fill="none" stroke="#A99D84" stroke-width="10" stroke-linecap="round"/>
  <path data-id="mandible" d="M128 104 Q150 124 172 104" fill="none" stroke="#FBF7EE" stroke-width="7" stroke-linecap="round"/>
  <line data-id="spine" x1="150" y1="118" x2="150" y2="336" stroke="#CFC4A8" stroke-width="7" stroke-linecap="round"/>
  ${SPINE_RECTS}
  <rect data-id="sternum" x="146" y="140" width="8" height="66" rx="4" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  ${RIBS}
  ${bonePair("M150 128 Q178 116 200 130",4,"clavicle")}
  ${bonePair("M200 150 Q214 192 216 242",10,"humerus")}
  ${bonePair("M214 248 Q222 300 222 352",5,"radius")}
  ${bonePair("M206 250 Q214 302 214 352",5.5,"ulna")}
  <ellipse data-id="carpals" cx="222" cy="392" rx="10" ry="14" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  <ellipse data-id="carpals" cx="78" cy="392" rx="10" ry="14" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  <path data-id="pelvis" d="M150 300 C138 292 118 296 104 314 C96 326 100 340 118 346 C128 348 140 344 150 340" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.6"/>
  <path data-id="pelvis" ${MIRROR} d="M150 300 C138 292 118 296 104 314 C96 326 100 340 118 346 C128 348 140 344 150 340" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.6"/>
  ${bonePair("M182 352 Q198 420 192 482",13,"femur")}
  <circle data-id="patella" cx="192" cy="488" r="7" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  <circle data-id="patella" ${MIRROR} cx="192" cy="488" r="7" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  ${bonePair("M194 496 Q196 546 192 598",10,"tibia")}
  ${bonePair("M184 498 Q186 548 184 594",5,"fibula")}
  <ellipse data-id="tarsals" cx="206" cy="618" rx="13" ry="6" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>
  <ellipse data-id="tarsals" cx="94" cy="618" rx="13" ry="6" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"/>`;
const SKELETON_BACK = `
  ${SKULL}
  <line data-id="spine" x1="150" y1="118" x2="150" y2="336" stroke="#CFC4A8" stroke-width="7" stroke-linecap="round"/>
  ${SPINE_RECTS}
  ${RIBS}
  ${bonePair("M150 128 Q178 116 200 130",4,"clavicle")}
  ${pair("scapula","M104 150 L90 186 L110 196 Z",'fill="#FBF7EE" stroke="#A99D84" stroke-width="1.2"')}
  ${bonePair("M200 150 Q214 192 216 242",10,"humerus")}
  ${bonePair("M214 248 Q222 300 222 352",5,"radius")}
  ${bonePair("M206 250 Q214 302 214 352",5.5,"ulna")}
  <path data-id="pelvis" d="M150 300 C138 292 118 296 104 314 C96 326 100 340 118 346 C128 348 140 344 150 340" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.6"/>
  <path data-id="pelvis" ${MIRROR} d="M150 300 C138 292 118 296 104 314 C96 326 100 340 118 346 C128 348 140 344 150 340" fill="#FBF7EE" stroke="#A99D84" stroke-width="1.6"/>
  ${bonePair("M182 352 Q198 420 192 482",13,"femur")}
  ${bonePair("M194 496 Q196 546 192 598",10,"tibia")}
  ${bonePair("M184 498 Q186 548 184 594",5,"fibula")}`;

/* ---------- ORGANS (front and back) ---------- */
const ORGANS_FRONT = `
  <path data-id="brain" d="M150 28 C176 26 192 42 190 62 C192 78 178 90 166 88 C160 94 140 94 134 88 C122 90 108 78 110 62 C108 42 124 26 150 28Z" fill="#E9B7CE" stroke="#A8508A" stroke-width="1"/>
  <path d="M122 60 Q130 54 138 60 M162 60 Q170 54 178 60 M130 74 Q140 70 150 76 Q160 70 170 74" fill="none" stroke="#A8508A" stroke-width="1.1" opacity=".7"/>
  <path data-id="thyroid" d="M150 116 C140 110 130 112 132 120 C134 128 146 126 150 122 C154 126 166 128 168 120 C170 112 160 110 150 116Z" fill="#7FBF8E" stroke="#2F7A44" stroke-width=".8"/>
  <rect data-id="trachea" x="141" y="106" width="7" height="48" rx="3.5" fill="#DDEBF8" stroke="#7FA9CF" stroke-width=".8"/>
  <path d="M141 114 H148 M141 122 H148 M141 130 H148 M141 138 H148 M141 146 H148" stroke="#7FA9CF" stroke-width=".7"/>
  <rect data-id="oesophagus" x="157" y="106" width="6" height="56" rx="3" fill="#E8C1AE" stroke="#B88068" stroke-width=".8"/>
  <path data-id="lungs" d="M136 160 C124 156 110 166 108 186 C106 214 110 240 124 246 C134 248 140 236 140 220 L140 170 C140 164 138 161 136 160Z" fill="#E8A2AE" stroke="#B8667A" stroke-width="1"/>
  <path data-id="lungs" d="M164 160 C176 156 190 166 192 186 C194 214 190 240 176 246 C166 248 160 236 160 220 L160 170 C160 164 162 161 164 160Z" fill="#E8A2AE" stroke="#B8667A" stroke-width="1"/>
  <path data-id="heart" d="M160 218 C146 206 138 192 144 180 C150 170 162 176 162 186 C162 176 174 170 180 180 C186 192 176 206 160 218Z" fill="#C94C5A" stroke="#7A1E2A" stroke-width="1"/>
  <path data-id="diaphragm" d="M104 250 Q150 212 196 250" fill="none" stroke="#7FB9D6" stroke-width="3.5" stroke-dasharray="7 4" stroke-linecap="round"/>
  <path data-id="liver" d="M104 236 C116 222 142 222 152 236 C154 252 144 266 122 270 C110 272 102 262 104 236Z" fill="#9E5A3C" stroke="#5E2415" stroke-width="1"/>
  <path data-id="gallbladder" d="M118 254 C124 250 128 254 126 260 C124 266 116 266 116 260 C116 257 117 255 118 254Z" fill="#6FA86A" stroke="#2D6E33" stroke-width=".8"/>
  <path data-id="stomach" d="M166 232 C186 220 204 230 204 248 C204 266 192 276 178 270 C170 266 166 256 168 246Z" fill="#E6A57E" stroke="#A9552A" stroke-width="1"/>
  <path data-id="spleen" d="M206 228 C212 226 216 236 214 244 C212 250 205 248 204 240Z" fill="#8E6BA8" stroke="#5B3272" stroke-width=".8"/>
  <path data-id="pancreas" d="M132 276 C146 266 172 266 184 272 C186 278 168 282 150 280 C142 280 134 282 132 276Z" fill="#E8C872" stroke="#A7842A" stroke-width=".8"/>
  <path data-id="kidneys" d="M108 268 C100 268 98 282 102 292 C106 300 116 298 118 290 C120 280 116 268 108 268Z" fill="#A9633A" stroke="#4A2612" stroke-width="1"/>
  <path data-id="kidneys" d="M192 268 C200 268 202 282 198 292 C194 300 184 298 182 290 C180 280 184 268 192 268Z" fill="#A9633A" stroke="#4A2612" stroke-width="1"/>
  <path data-id="smallint" d="M122 300 C134 288 146 310 156 300 S176 290 180 304 S160 318 150 312 S128 320 124 310" fill="none" stroke="#B8806A" stroke-width="10" stroke-linecap="round"/>
  <path d="M122 300 C134 288 146 310 156 300 S176 290 180 304 S160 318 150 312 S128 320 124 310" fill="none" stroke="#F3D2BE" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  <path data-id="largeint" d="M112 292 C110 282 118 280 124 286 L182 286 C190 286 194 296 188 304 L186 326 C184 338 170 336 170 326" fill="none" stroke="#8E5A44" stroke-width="9" stroke-linecap="round"/>
  <path d="M112 292 C110 282 118 280 124 286 L182 286 C190 286 194 296 188 304 L186 326 C184 338 170 336 170 326" fill="none" stroke="#E8B9A0" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
  <circle data-id="bladder" cx="150" cy="326" r="8" fill="#D9B86A" stroke="#A9782A" stroke-width=".9"/>
  <ellipse data-id="reproductive" cx="136" cy="338" rx="4.5" ry="3.5" fill="#E7A3C6" stroke="#B0568A" stroke-width=".6"/>
  <ellipse data-id="reproductive" cx="164" cy="338" rx="4.5" ry="3.5" fill="#E7A3C6" stroke="#B0568A" stroke-width=".6"/>
  <line data-id="spinal" x1="150" y1="116" x2="150" y2="332" stroke="#E8C547" stroke-width="2.6" stroke-linecap="round"/>`;
const ORGANS_BACK = `
  <path data-id="brain" d="M150 28 C176 26 192 42 190 62 C192 78 178 90 166 88 C160 94 140 94 134 88 C122 90 108 78 110 62 C108 42 124 26 150 28Z" fill="#E9B7CE" stroke="#A8508A" stroke-width="1"/>
  <path data-id="lungs" d="M136 160 C124 156 110 166 108 186 C106 214 110 240 124 246 C134 248 140 236 140 220 L140 170 C140 164 138 161 136 160Z" fill="#E8A2AE" stroke="#B8667A" stroke-width="1"/>
  <path data-id="lungs" d="M164 160 C176 156 190 166 192 186 C194 214 190 240 176 246 C166 248 160 236 160 220 L160 170 C160 164 162 161 164 160Z" fill="#E8A2AE" stroke="#B8667A" stroke-width="1"/>
  <path data-id="kidneys" d="M108 268 C100 268 98 282 102 292 C106 300 116 298 118 290 C120 280 116 268 108 268Z" fill="#A9633A" stroke="#4A2612" stroke-width="1"/>
  <path data-id="kidneys" d="M192 268 C200 268 202 282 198 292 C194 300 184 298 182 290 C180 280 184 268 192 268Z" fill="#A9633A" stroke="#4A2612" stroke-width="1"/>
  <line data-id="spinal" x1="150" y1="116" x2="150" y2="332" stroke="#E8C547" stroke-width="2.6" stroke-linecap="round"/>`;

/* ---------- NERVOUS LAYER ---------- */
const NERVES = `
  ${pair("nerves","M150 150 C162 160 180 170 198 186 C208 200 212 226 212 256 C212 290 218 300 226 306",'fill="none" stroke="#D9A21B" stroke-width="1.8" stroke-linecap="round"')}
  ${pair("nerves","M150 312 C158 330 172 360 178 400 C184 440 186 480 190 530 C192 556 192 580 192 600",'fill="none" stroke="#D9A21B" stroke-width="2" stroke-linecap="round"')}
  ${pair("nerves","M150 134 C140 128 132 118 128 110",'fill="none" stroke="#D9A21B" stroke-width="1.2" stroke-linecap="round"')}`;
const NERVOUS_LAYER = `
  <path data-id="brain" d="M150 28 C176 26 192 42 190 62 C192 78 178 90 166 88 C160 94 140 94 134 88 C122 90 108 78 110 62 C108 42 124 26 150 28Z" fill="#F0C9DE" stroke="#A8508A" stroke-width="1.2"/>
  <line data-id="spinal" x1="150" y1="116" x2="150" y2="332" stroke="#F2C230" stroke-width="3.2" stroke-linecap="round"/>
  ${NERVES}`;

/* ---------- CIRCULATORY LAYER ---------- */
const CIRC_LAYER = `
  <path data-id="heart" d="M160 218 C146 206 138 192 144 180 C150 170 162 176 162 186 C162 176 174 170 180 180 C186 192 176 206 160 218Z" fill="#C94C5A" stroke="#7A1E2A" stroke-width="1.2"/>
  <path data-id="vessels" d="M164 180 C166 160 156 140 150 128 C146 120 146 110 150 100" fill="none" stroke="#C94C5A" stroke-width="3.5" stroke-linecap="round"/>
  ${pair("vessels","M166 152 C192 146 208 164 214 200 C220 230 216 262 210 300",'fill="none" stroke="#C94C5A" stroke-width="2.6" stroke-linecap="round"')}
  ${pair("vessels","M152 300 C170 340 186 380 192 420 C196 460 194 520 192 580",'fill="none" stroke="#C94C5A" stroke-width="3" stroke-linecap="round"')}
  ${pair("vessels","M176 230 C166 232 156 222 152 206 C150 196 154 184 160 176",'fill="none" stroke="#3F6FB0" stroke-width="2.4" stroke-linecap="round"')}
  ${pair("vessels","M186 300 C182 330 180 380 182 420 C184 460 182 520 180 580",'fill="none" stroke="#3F6FB0" stroke-width="2.2" stroke-linecap="round"')}
  <g id="flowDots">
    <circle r="2.6" fill="#C94C5A"><animateMotion dur="3.4s" repeatCount="indefinite" path="M166 152 C192 146 208 164 214 200 C220 230 216 262 210 300"/></circle>
    <circle r="2.6" fill="#C94C5A"><animateMotion dur="3.4s" begin="-1.7s" repeatCount="indefinite" path="M166 152 C192 146 208 164 214 200 C220 230 216 262 210 300"/></circle>
    <circle r="2.6" fill="#C94C5A"><animateMotion dur="4s" begin="-.8s" repeatCount="indefinite" path="M152 300 C170 340 186 380 192 420 C196 460 194 520 192 580"/></circle>
    <circle r="2.4" fill="#3F6FB0"><animateMotion dur="3s" repeatCount="indefinite" path="M176 230 C166 232 156 222 152 206 C150 196 154 184 160 176"/></circle>
    <circle r="2.4" fill="#3F6FB0"><animateMotion dur="3.6s" begin="-1.5s" repeatCount="indefinite" path="M186 300 C182 330 180 380 182 420 C184 460 182 520 180 580"/></circle>
  </g>`;

/* ---------- FULL SVG ---------- */
function buildFigure(){
  const svg = `
  <defs>
    <linearGradient id="skinFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6DCC5"/><stop offset="1" stop-color="#EBC3A3"/>
    </linearGradient>
    <path id="bodyHalf" d="M150 16 C174 16 188 32 190 54 C192 74 188 92 180 104 C176 110 174 116 176 126 C196 130 212 136 222 152 C230 170 230 196 228 220 C226 246 232 268 234 294 C236 316 240 334 240 352 C242 370 238 386 234 398 C230 410 222 416 214 410 C212 396 210 378 208 360 C206 336 204 312 202 290 C200 266 198 240 198 214 C198 196 196 178 194 166 C192 186 190 216 188 246 C186 270 184 292 190 312 C196 326 210 332 214 346 C218 364 214 392 210 428 C207 462 206 500 206 540 C206 572 210 594 212 606 C214 616 222 620 220 624 C208 628 180 626 168 622 C166 596 164 566 162 530 C160 480 158 430 156 396 C154 374 152 360 150 350 Z"/>
  </defs>

  <g id="hitG">${HITS_SVG}</g>

  <g class="layer" data-layer="skin" style="pointer-events:none">
    ${SKIN_SVG}
    <g class="view-front">${SKIN_FRONT_DETAIL}</g>
  </g>

  <g class="layer" data-layer="muscle">
    <g class="view-front">${MUSCLE_FRONT}</g>
    <g class="view-back">${MUSCLE_BACK}</g>
  </g>

  <g class="layer" data-layer="skeleton">
    <g class="view-front">${SKELETON_FRONT}</g>
    <g class="view-back">${SKELETON_BACK}</g>
  </g>

  <g class="layer" data-layer="organs">
    <g class="view-front">${ORGANS_FRONT}</g>
    <g class="view-back">${ORGANS_BACK}</g>
  </g>

  <g class="layer" data-layer="nervous">${NERVOUS_LAYER}</g>

  <g class="layer" data-layer="circulatory">${CIRC_LAYER}</g>

  <g id="labelG" class="labels"></g>`;
  const el = document.getElementById("fig");
  el.innerHTML = svg;
}
