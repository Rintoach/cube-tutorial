/* =====================================================================
   MAIN TUTORIAL PAGE — mounts the shared cube-engine.js building blocks
   into index.html's specific elements. Load cube-engine.js before this file.
   ===================================================================== */

/* =====================================================================
   BUILD LEGEND
   ===================================================================== */
const legendGrid = document.getElementById('legendGrid');
FACE_INFO.forEach(f=>{
  const div = document.createElement('div');
  div.className = 'legend-face';
  div.innerHTML = `<div class="sw" style="background:${PALETTE[f.color]}"></div><b>${f.k}</b><span>${f.sub}</span>`;
  legendGrid.appendChild(div);
});



/* =====================================================================
   MOUNT STAGES + HERO + STEP NAV
   ===================================================================== */
const stagesRoot = document.getElementById('stages');
const controllers = [];
STAGES.forEach((data, i)=>{
  const el = document.createElement('section');
  el.className = 'stage';
  el.id = 'stage-' + (i+1);
  stagesRoot.appendChild(el);
  controllers.push(new StageController(el, data, i));
});
window.__controllers = controllers;

buildCubeDOM(document.getElementById('heroCube'));

const pillsRoot = document.getElementById('steppills');
STAGES.forEach((d,i)=>{
  const a = document.createElement('a');
  a.className = 'steppill';
  a.href = '#stage-'+(i+1);
  a.textContent = i+1;
  a.id = 'pill-'+i;
  pillsRoot.appendChild(a);
});
function updateProgress(){
  let n = 0;
  controllers.forEach((c,i)=>{
    document.getElementById('pill-'+i).classList.toggle('done', c.done);
    if(c.done) n++;
  });
  document.getElementById('stepProgress').innerHTML = `<b>${n}</b>/7 completed`;
}
updateProgress();

/* =====================================================================
   GLOBAL SPEED CONTROL (drives every stage + the finger-trick drill)
   ===================================================================== */
document.querySelectorAll('#globalSpeedOpts .speed-opt').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#globalSpeedOpts .speed-opt').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    GLOBAL_SPEED = btn.dataset.speed;
    controllers.forEach(c => c.setSpeed(GLOBAL_SPEED));
  });
});

/* =====================================================================
   FINGER TRICK PRACTICE DRILL
   ===================================================================== */
const ftScene = document.getElementById('ftScene');
let ftCubies = buildCubeDOM(ftScene);
let ftAnimating = false;
const ftArrows = {
  top: document.querySelector('#ftViewport .move-arrow.pos-top'),
  bottom: document.querySelector('#ftViewport .move-arrow.pos-bottom'),
  left: document.querySelector('#ftViewport .move-arrow.pos-left'),
  right: document.querySelector('#ftViewport .move-arrow.pos-right'),
  center: document.querySelector('#ftViewport .move-arrow.pos-center'),
};
function ftShowArrow(move){
  Object.values(ftArrows).forEach(a=>a.classList.remove('show'));
  const v = MOVE_VISUAL[move];
  const a = ftArrows[v.pos];
  const glyph = a.querySelector('.arrow-glyph');
  glyph.innerHTML = ICON_GLYPH[v.icon];
  glyph.className = 'arrow-glyph' + (v.icon==='cw' ? ' spin-cw' : v.icon==='ccw' ? ' spin-ccw' : '');
  a.querySelector('.move-badge').textContent = move;
  a.classList.add('show');
}
function ftHideArrows(){ Object.values(ftArrows).forEach(a=>a.classList.remove('show')); }

const ftButtonsEl = document.getElementById('ftButtons');
const ftCaptionEl = document.getElementById('ftCaption');
const FT_ORDER = ["R","R'","U","U'","L","L'","D","D'","F","F'"];
FT_ORDER.forEach(m=>{
  const btn = document.createElement('button');
  btn.className = 'ft-move-btn';
  btn.textContent = m;
  btn.dataset.move = m;
  btn.addEventListener('click', ()=>{
    if(ftAnimating) return;
    document.querySelectorAll('.ft-move-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const trick = FINGER_TRICKS[m];
    ftCaptionEl.innerHTML = `<b>${m} — ${trick.hand} · ${trick.finger}</b>${trick.cue}`;
    ftShowArrow(m);
    ftAnimating = true;
    animateMove(ftScene, ftCubies, m, SPEED_MS[GLOBAL_SPEED], ()=>{
      ftAnimating = false;
      ftHideArrows();
      btn.classList.remove('active');
    });
  });
  ftButtonsEl.appendChild(btn);
});
document.getElementById('ftReset').addEventListener('click', ()=>{
  if(ftAnimating) return;
  ftCubies = buildCubeDOM(ftScene);
  ftHideArrows();
  ftCaptionEl.innerHTML = 'Tap a move above to see the recommended fingertrick and watch it played on the cube.';
});

const ftGrid = document.getElementById('ftGrid');
FT_ORDER.forEach(m=>{
  const t = FINGER_TRICKS[m];
  const card = document.createElement('div');
  card.className = 'ft-card';
  card.innerHTML = `<div class="mv">${m}</div><div class="hf">${t.hand} · ${t.finger}</div><div class="cue">${t.cue}</div>`;
  ftGrid.appendChild(card);
});
