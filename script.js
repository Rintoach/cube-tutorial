/* =====================================================================
   MAIN TUTORIAL PAGE — mounts the shared cube-engine.js building blocks
   into index.html's specific elements. Load cube-engine.js before this file.
   ===================================================================== */

/* =====================================================================
   SAVED STATE (localStorage) — completed stages + chosen speed. Wrapped in
   try/catch throughout: private-browsing / storage-disabled just means
   progress silently doesn't persist rather than breaking the page.
   ===================================================================== */
const SAVE_KEY = 'cubeTutorial.v1';
function loadSaved(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveState(partial){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...loadSaved(), ...partial }));
  }catch(e){ /* no-op — nothing to persist to */ }
}
const savedState = loadSaved();
if(savedState.speed && SPEED_MS[savedState.speed]) GLOBAL_SPEED = savedState.speed;

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
// Exposed for the Playwright E2E suite (tests/e2e/tutorial.spec.js) to read
// real controller state (idx, animating, playing) instead of guessing
// animation timings. Harmless in normal browser use — nothing else reads it.
window.__controllers = controllers;

buildCubeDOM(document.getElementById('heroCube'));

const pillsRoot = document.getElementById('steppills');
STAGES.forEach((d,i)=>{
  const a = document.createElement('a');
  a.className = 'steppill';
  a.href = '#stage-'+(i+1);
  a.textContent = i+1;
  a.id = 'pill-'+i;
  a.setAttribute('aria-label', `Jump to stage ${i+1}: ${d.title}`);
  pillsRoot.appendChild(a);
});
function updateProgress(){
  let n = 0;
  controllers.forEach((c,i)=>{
    document.getElementById('pill-'+i).classList.toggle('done', c.done);
    if(c.done) n++;
  });
  document.getElementById('stepProgress').innerHTML = `<b>${n}</b>/7 completed`;
  saveState({ completed: controllers.map(c=>c.done) });
}

// Restore previously-completed stages (visual checkmark only — it does not
// replay the algorithm, just marks the stage as already practiced). Must run
// AFTER the pill elements above exist, since markComplete() -> updateProgress()
// looks up '#pill-'+i.
if(Array.isArray(savedState.completed)){
  controllers.forEach((c,i)=>{ if(savedState.completed[i]) c.markComplete(); });
}

updateProgress();

/* =====================================================================
   KEYBOARD-SHORTCUT TARGET — whichever stage is most visible in the
   viewport right now. Recomputed on scroll via IntersectionObserver so
   Space/←/→/R always act on the stage the user is actually looking at.
   ===================================================================== */
let activeController = controllers[0] || null;
const visibility = new Map();
const stageVisibilityObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry => visibility.set(entry.target, entry.intersectionRatio));
  let best = null, bestRatio = 0;
  visibility.forEach((ratio, el)=>{ if(ratio > bestRatio){ bestRatio = ratio; best = el; } });
  if(best){
    const match = controllers.find(c => c.el === best);
    if(match) activeController = match;
  }
}, { threshold: [0, 0.25, 0.5, 0.75, 1] });
controllers.forEach(c => stageVisibilityObserver.observe(c.el));

/* =====================================================================
   GLOBAL SPEED CONTROL (drives every stage + the finger-trick drill)
   ===================================================================== */
function applyGlobalSpeed(speed){
  if(!SPEED_MS[speed]) return;
  GLOBAL_SPEED = speed;
  document.querySelectorAll('#globalSpeedOpts .speed-opt').forEach(b=>{
    b.classList.toggle('active', b.dataset.speed === speed);
  });
  controllers.forEach(c => c.setSpeed(GLOBAL_SPEED));
  saveState({ speed });
}
document.querySelectorAll('#globalSpeedOpts .speed-opt').forEach(btn=>{
  btn.addEventListener('click', ()=> applyGlobalSpeed(btn.dataset.speed));
});
// Reflect a restored saved speed in the UI (constructors above already read
// GLOBAL_SPEED directly, so this only needs to fix up the active button).
if(savedState.speed && SPEED_MS[savedState.speed]){
  document.querySelectorAll('#globalSpeedOpts .speed-opt').forEach(b=>{
    b.classList.toggle('active', b.dataset.speed === savedState.speed);
  });
}

/* =====================================================================
   KEYBOARD SHORTCUTS — act on whichever stage is currently in view.
   Space = play/pause, ← / → = step back/forward, R = replay from the
   start, 1/2/3 = Slow/Medium/Fast. Ignored while a text field has focus
   so typing elsewhere on the page (or a future search box) isn't hijacked;
   NOT ignored just because a button has focus, since a keyboard user who
   just clicked Play should still be able to press Space/arrows next.
   ===================================================================== */
function shouldIgnoreShortcut(target){
  const tag = (target && target.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable);
}
document.addEventListener('keydown', (e)=>{
  if(shouldIgnoreShortcut(e.target)) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  const c = activeController;
  if(e.key === '1'){ applyGlobalSpeed('slow'); return; }
  if(e.key === '2'){ applyGlobalSpeed('medium'); return; }
  if(e.key === '3'){ applyGlobalSpeed('fast'); return; }
  if(!c) return;
  if(e.key === ' '){ e.preventDefault(); c.togglePlay(); return; }
  if(e.key === 'ArrowRight'){ e.preventDefault(); c.stepForward(true); return; }
  if(e.key === 'ArrowLeft'){ e.preventDefault(); c.stepBack(); return; }
  if(e.key === 'r' || e.key === 'R'){ e.preventDefault(); c.reset(); c.togglePlay(); return; }
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
