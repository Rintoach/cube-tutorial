/* =====================================================================
   CUBE ENGINE + STAGE DATA + STAGE CONTROLLER (shared across every page)
   This file has no page-specific DOM mounting — it only defines reusable
   building blocks. Each HTML page loads this first, then its own small
   mounting script (script.js for the main tutorial, finger-training.js for
   the full-screen practice trainer) wires these into that page's elements.
   ===================================================================== */
/* =====================================================================
   CUBE ENGINE — coordinates: x right(+1), y up(+1), z front(+1)
   Verified with an independent unit-test suite (four quarter turns and
   turn+inverse both return to solved; algorithm periods match known
   cubing facts) before being wired up to any animation.
   ===================================================================== */
const PALETTE = { white:'var(--c-white)', yellow:'var(--c-yellow)', green:'var(--c-green)', blue:'var(--c-blue)', red:'var(--c-red)', orange:'var(--c-orange)', core:'var(--c-core)' };
const SLOTS = { front:[0,0,1], back:[0,0,-1], right:[1,0,0], left:[-1,0,0], top:[0,1,0], bottom:[0,-1,0] };
const FACE_AXIS   = { R:'x', L:'x', U:'y', D:'y', F:'z', B:'z' };
const FACE_ANGLE  = { R:-90, L:90, U:-90, D:90, F:-90, B:90 };
const FACE_LAYER  = { R:1, L:-1, U:1, D:-1, F:1, B:-1 };

function rotVec(v, axis, deg){
  const r = deg*Math.PI/180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r));
  let [x,y,z] = v;
  if(axis==='x') return [x, y*c - z*s, y*s + z*c];
  if(axis==='y') return [x*c + z*s, y, -x*s + z*c];
  return [x*c - y*s, x*s + y*c, z];
}
function parseMove(move){
  const face = move[0], prime = move.includes("'"), dbl = move.includes('2');
  let angle = FACE_ANGLE[face];
  if(dbl) angle = 180; else if(prime) angle = -angle;
  return { face, axis:FACE_AXIS[face], layer:FACE_LAYER[face], angle };
}
function cssAngleFor(axis, angle){ return axis==='y' ? angle : -angle; }

function makeCubies(){
  const cubies = [];
  for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++){
    const stickers = [];
    if(x=== 1) stickers.push({normal:[1,0,0],  color:'red'});
    if(x===-1) stickers.push({normal:[-1,0,0], color:'orange'});
    if(y=== 1) stickers.push({normal:[0,1,0],  color:'yellow'});
    if(y===-1) stickers.push({normal:[0,-1,0], color:'white'});
    if(z=== 1) stickers.push({normal:[0,0,1],  color:'blue'});
    if(z===-1) stickers.push({normal:[0,0,-1], color:'green'});
    cubies.push({ pos:[x,y,z], stickers });
  }
  return cubies;
}
function applyMoveLogic(cubies, move){
  const { axis, layer, angle } = parseMove(move);
  const idx = {x:0,y:1,z:2}[axis];
  cubies.forEach(c=>{
    if(c.pos[idx]!==layer) return;
    c.pos = rotVec(c.pos, axis, angle);
    c.stickers = c.stickers.map(s=>({ normal: rotVec(s.normal, axis, angle), color:s.color }));
  });
}

/* ---------- DOM rendering ---------- */
function buildCubeDOM(sceneEl){
  sceneEl.innerHTML = '<div class="cubie-layer"></div>';
  const layer = sceneEl.querySelector('.cubie-layer');
  const cubies = makeCubies();
  cubies.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'cubie';
    Object.keys(SLOTS).forEach(slot=>{
      const s = document.createElement('i');
      s.className = 'sticker ' + slot;
      el.appendChild(s);
    });
    c.el = el;
    layer.appendChild(el);
    positionCubie(c);
    renderCubie(c);
  });
  return cubies;
}
function positionCubie(c){
  c.el.style.setProperty('--x', c.pos[0]);
  c.el.style.setProperty('--y', -c.pos[1]);
  c.el.style.setProperty('--z', c.pos[2]);
}
function renderCubie(c){
  Object.entries(SLOTS).forEach(([slot, n])=>{
    const hit = c.stickers.find(s => s.normal[0]===n[0] && s.normal[1]===n[1] && s.normal[2]===n[2]);
    const color = hit ? hit.color : 'core';
    c.el.querySelector('.'+slot).style.background = PALETTE[color];
  });
}
function resetCube(sceneEl, existing){
  return buildCubeDOM(sceneEl);
}

/* ---------- animate a single move ---------- */
// Every turn plays in three phases so the moving layer stays legible rather
// than snapping straight into an edge-on silhouette: it lifts a few pixels
// off the cube (LIFT_MS), spins through the turn while lifted (durationMs),
// then settles back flush (SETTLE_MS). Logical state only updates at the end.
const LIFT_MS = 120, SETTLE_MS = 150;

// True when the OS/browser has "reduce motion" turned on. Read fresh on every
// call (not cached at load) so toggling the OS setting mid-session takes
// effect on the very next move — matchMedia() itself is cheap to create.
// Guarded for non-browser contexts (e.g. if this file is ever required
// somewhere without a `window`) even though animateMove() itself is always
// DOM-only and never runs there.
function prefersReducedMotion(){
  return typeof window !== 'undefined' && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Single source of truth for a move's three phase-durations, shared by
// animateMove() and totalMoveMs() so autoplay's scheduling (moveTotalMs in
// StageController) never drifts out of sync with what animateMove() actually
// does. Under reduced motion the lift/settle phases (the part that's purely
// decorative flourish) collapse to 0, and the turn itself is capped short —
// still a real, awaited transition (so onDone timing stays correct), just
// too brief to read as a "spin."
function motionTimings(durationMs){
  if(prefersReducedMotion()) return { lift:0, settle:0, spin: Math.min(durationMs, 60) };
  return { lift:LIFT_MS, settle:SETTLE_MS, spin: durationMs };
}

function animateMove(sceneEl, cubies, move, durationMs, onDone){
  const { axis, layer, angle } = parseMove(move);
  const idx = {x:0,y:1,z:2}[axis];
  const layerEl = sceneEl.querySelector('.cubie-layer');
  const moving = cubies.filter(c => c.pos[idx]===layer);

  const group = document.createElement('div');
  group.className = 'turn-group';
  layerEl.appendChild(group);
  moving.forEach(c => group.appendChild(c.el));

  const { lift: LIFT_T, settle: SETTLE_T, spin: SPIN_T } = motionTimings(durationMs);
  const cssAngle = cssAngleFor(axis, angle);
  const LIFT = 13;
  const liftSign = axis==='y' ? -layer : layer;
  const liftPart = { x:0, y:0, z:0 };
  liftPart[axis] = liftSign * LIFT;
  const liftT = `translate3d(${liftPart.x}px,${liftPart.y}px,${liftPart.z}px)`;
  const flatT = `translate3d(0px,0px,0px)`;
  const AX = axis.toUpperCase();

  // phase 1: lift off the cube face
  group.style.transition = `transform ${LIFT_T}ms cubic-bezier(.2,.8,.3,1)`;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      group.style.transform = `${liftT} rotate${AX}(0deg) scale(1.05)`;
    });
  });

  // phase 2: spin the turn while lifted
  setTimeout(()=>{
    group.style.transition = `transform ${SPIN_T}ms cubic-bezier(.45,.05,.55,.95)`;
    group.style.transform = `${liftT} rotate${AX}(${cssAngle}deg) scale(1.05)`;
  }, LIFT_T);

  // phase 3: settle flush again
  setTimeout(()=>{
    group.style.transition = `transform ${SETTLE_T}ms cubic-bezier(.3,.1,.25,1)`;
    group.style.transform = `${flatT} rotate${AX}(${cssAngle}deg) scale(1)`;
  }, LIFT_T + SPIN_T);

  setTimeout(()=>{
    moving.forEach(c=>{
      c.pos = rotVec(c.pos, axis, angle);
      c.stickers = c.stickers.map(s=>({ normal: rotVec(s.normal, axis, angle), color:s.color }));
      positionCubie(c);
      renderCubie(c);
      layerEl.appendChild(c.el);
    });
    group.remove();
    if(onDone) onDone();
  }, LIFT_T + SPIN_T + SETTLE_T + 20);
}
function totalMoveMs(durationMs){
  const { lift, settle, spin } = motionTimings(durationMs);
  return lift + spin + settle;
}

/* =====================================================================
   MOVE VISUAL METADATA (arrows + plain-language hints)
   ===================================================================== */
const MOVE_VISUAL = {
  "R":  { pos:'right',  icon:'up',   plain:"Right layer: front edge slides up" },
  "R'": { pos:'right',  icon:'down', plain:"Right layer: top edge slides down to front" },
  "R2": { pos:'right',  icon:'up',   plain:"Right layer: double (180°) turn", tag:'180°' },
  "L":  { pos:'left',   icon:'down', plain:"Left layer: front edge slides down" },
  "L'": { pos:'left',   icon:'up',   plain:"Left layer: bottom edge slides up to front" },
  "L2": { pos:'left',   icon:'down', plain:"Left layer: double (180°) turn", tag:'180°' },
  "U":  { pos:'top',    icon:'left', plain:"Top layer: front edge slides left" },
  "U'": { pos:'top',    icon:'right',plain:"Top layer: front edge slides right" },
  "U2": { pos:'top',    icon:'left', plain:"Top layer: double (180°) turn", tag:'180°' },
  "D":  { pos:'bottom', icon:'right',plain:"Bottom layer: front edge slides right" },
  "D'": { pos:'bottom', icon:'left', plain:"Bottom layer: front edge slides left" },
  "D2": { pos:'bottom', icon:'right',plain:"Bottom layer: double (180°) turn", tag:'180°' },
  "F":  { pos:'center', icon:'cw',   plain:"Front face: spins clockwise" },
  "F'": { pos:'center', icon:'ccw',  plain:"Front face: spins counter-clockwise" },
  "F2": { pos:'center', icon:'cw',   plain:"Front face: double (180°) turn", tag:'180°' },
};
const ICON_GLYPH = { up:'&#8593;', down:'&#8595;', left:'&#8592;', right:'&#8594;', cw:'&#8635;', ccw:'&#8634;' };

const FACE_INFO = [
  {k:'F', name:'Front', color:'blue',   sub:'faces you'},
  {k:'B', name:'Back',  color:'green',  sub:'faces away'},
  {k:'U', name:'Up',    color:'yellow', sub:'top layer'},
  {k:'D', name:'Down',  color:'white',  sub:'bottom layer'},
  {k:'L', name:'Left',  color:'orange', sub:'left layer'},
  {k:'R', name:'Right', color:'red',    sub:'right layer'},
];

// A few claims below were computationally verified against this engine rather
// than assumed (full method + results in commit history / session notes) —
// stripped from the learner-facing copy since "(Verified: ...)" reads as
// developer scaffolding, not a teaching aid, but noted here for maintainers:
//   Stage 3 "insert to the left": the mirror algorithm was simulated and does
//     return the cube to solved from its own matching setup, same as the
//     right-hand version.
//   Stage 4 (Yellow Cross): simulated running the formula from a mirrored-L
//     or front-back line — confirmed it does NOT make progress, so getting
//     the shape right but the rotation wrong really is a dead end, not just
//     slow, and needs a re-diagnose rather than a repeat.
//   Stage 5 (Match Top Edges) "no adjacent matching pair": simulated running
//     the formula once from the two-opposite-matches case — confirmed it does
//     NOT reliably resolve into the solvable back+right pattern, which is why
//     the learner copy no longer promises that outcome.
//   Stage 6 (Position Top Corners) "no correct corners": verified by
//     permutation-group analysis (and cross-checked against this engine) that
//     the only "zero correctly placed" states reachable at this point in a
//     legal solve are double-transpositions, and running the formula once
//     from any of them always yields exactly one correctly-placed corner —
//     never zero, never more than one.
//   Stage 7 (Orient Top Corners) "two or four, never odd": verified against
//     this engine that at odd repetition counts, the R' D' R D commutator's
//     D turn actually swaps a *different* physical corner into the working
//     slot — so an odd count isn't just "the wrong parity," it's checking a
//     different piece entirely. Only even counts return the original target
//     corner to that slot to be checked.
const STAGES = [
  { title:"White Cross", desc:"Solve the four white edges around the bottom center, matching each edge's side color to its center.",
    alg:"F2 R2", before:"R2 F2".split(' '),
    hold:"Hold the cube with white on the bottom and yellow on top — this is the orientation you'll keep all the way through Stage 6. The demo starts from a scrambled cross on purpose so you can see edges being placed, not just admired.",
    tip:'This stage is two habits, not one algorithm. <strong>First, build a daisy:</strong> find all four white edges, wherever they currently are, and bring each one up into the top layer so its white sticker points straight up — sitting next to the yellow center like the petals of a daisy. <strong>Then insert each petal:</strong> turn the top layer (<code>U</code>) until a petal\'s outer color lines up with its matching center below, then spin that face <code>180°</code> — the white edge flips down into the cross. Repeat for the other three petals in any order; inserting one never disturbs the others already placed.',
    cases:[
      { title:"A white edge is buried in the middle layer, or sitting in the bottom layer but not matching its center", body:"Turn whichever face is <em>not</em> showing the white sticker — this frees the edge without a fixed sequence to memorize. It may take one or two turns of that face before white ends up facing up in the top layer. If it lands in the top layer with white facing sideways instead of up, give that same face one more quarter turn to pop it into a proper petal." },
    ],
    checklist:["All four white edges are on the bottom, forming a plus-sign cross", "Each cross edge's side color matches the center directly below it — not just any side, its own", "Yellow center is still on top; you haven't flipped or rotated the whole cube"] },
  { title:"White Corners (First Layer)", desc:"Insert the four white corners to finish the entire first layer.",
    alg:"R U R' U'", before:"U R U' R'".split(' '),
    hold:"White layer stays on the <strong>bottom</strong> — the corners you're inserting start out loose in the top layer. Find a white corner sticker facing <strong>sideways</strong> (not straight up) in the top layer, rotate the top layer until it sits directly above its empty slot in the bottom layer, and hold the cube so that empty slot is at the front-right, on the bottom.",
    tip:'Each corner goes above the slot <strong>between its other two colors</strong> — not just any empty slot: match the corner\'s two non-white stickers to the two centers they sit between, then position that corner directly above its correct slot. Repeat <code>R U R\' U\'</code> — the "righty" trigger — until the white sticker faces <strong>down</strong> into the bottom layer. <strong>Stop as soon as it does</strong> — white on the bottom with both side colors matching their centers means the corner is solved; running the trigger further just scrambles it again. Three things trip beginners up here: (1) if the white sticker faces <strong>straight up</strong> instead of sideways, hold that corner above any still-empty slot and run the trigger once anyway — it flips the white to the side without touching your cross; (2) if a corner is already in the right slot but twisted, run the trigger once to pop it back out, then treat it as a fresh piece; (3) if the piece is stuck in the bottom layer facing the wrong way, run the trigger once to kick it up into the top layer first.',
    checklist:["The entire bottom face is solid white, no gaps", "On every side face, the top two rows both match that side's center color", "Yellow layer on top is untouched — first layer only, nothing above it has been solved yet"] },
  { title:"Second Layer Edges", desc:"Slot the four non-yellow edges into the middle layer.",
    alg:"U R U' R' U' F' U F", before:"F' U' F U R U R' U'".split(' '),
    hold:"White layer stays on the bottom, untouched, for this whole stage. Hold the cube with the target edge's slot at the front-right.",
    tip:'Match the edge\'s front-facing color to the center below it, then run the full formula to insert it to the right.',
    cases:[
      { title:"The edge needs to go left instead of right", body:'Use the mirror algorithm instead: <code>U\' L\' U L U F U\' F\'</code> — same idea, opposite side. Match the edge\'s front-facing color to the center below it, then run this to insert it to the left.' },
      { title:"No non-yellow edge is anywhere in the top layer", body:'A common stuck point — it means a wrong edge is already sitting in one of the middle slots. Run either insertion algorithm once (right or left, whichever slot is currently wrong) to eject that edge back up into the top layer, then insert it correctly using the matching algorithm above.' },
    ],
    checklist:["White face still complete — no corners knocked loose while inserting edges", "Middle row has no yellow stickers showing on any side face", "Side colors match their centers on all four side faces, in both the top two rows"] },
  { title:"Yellow Cross", desc:"Form a yellow cross on top of the cube.",
    alg:"F R U R' U' F'", before:"F U R U' R' F'".split(' '),
    hold:"White layer and second layer stay on the bottom, unchanged since Stage 1 — you never actually flip the cube. Yellow is already facing up; this is the orientation you'll keep for the rest of the solve.",
    tip:'Check your top layer against three shapes before you start — and get the <strong>rotation</strong> right, not just the shape. Spin only the top layer (never F or R) to line the pattern up: a <strong>dot</strong> (no yellow edges up at all) has no direction to match — run the formula once, then re-diagnose; an <strong>L-shape</strong> (two yellow edges touching, in a corner) needs those two yellow edges at the <strong>back and left</strong> specifically — spin the top until they land there, then run it <strong>twice</strong>; a straight <strong>line</strong> needs its two yellow edges running <strong>left-to-right</strong>, not front-to-back — spin into place, then run it just <strong>once</strong>. Getting the shape right but the rotation wrong is the single most common way this stage stalls — always re-check both the shape and its rotation after every run.',
    checklist:["Top face shows a yellow plus-sign — all four top edges are yellow-up (side colors don't matter yet)", "First two layers are still fully intact underneath", "You never turned F or R by themselves here — only the top layer, plus the full formula"] },
  { title:"Match Top Edges", desc:"Swap the front and left yellow edges so each one lines up with its matching side center (the cross stays a cross the whole time).",
    alg:"R U R' U R U2 R' U", before:"U' R U2 R' U' R U' R'".split(' '),
    hold:"Yellow layer on top. Spin the top layer until you find two edges that already match their center. Hold the cube so those two sit at the <strong>back</strong> and <strong>right</strong> — the two mismatched edges end up at the front and left, which is exactly what this formula swaps.",
    tip:'This trigger swaps only the <strong>front</strong> and <strong>left</strong> yellow edges and leaves back/right alone. If your two matching edges are already opposite each other rather than side-by-side, run it once, spin the top to re-diagnose which two now match, then run it again on whichever pair is still wrong.',
    cases:[
      { title:"No adjacent matching pair", body:'This algorithm is a single fixed swap: it always swaps whatever sits at front and left, and always leaves back and right exactly where they are — so it can only place two matches that are already sitting side-by-side. If you don\'t have that — zero matches, one match, or two matches directly opposite each other — there is no one-shot placement that solves it immediately. Run the formula once, then inspect the four side colors again before deciding what to do next.' },
    ],
    checklist:["Top still shows a solid yellow cross — this stage never breaks it", "All four top edges' side colors match their centers, not just the yellow cross shape", "First two layers untouched underneath"] },
  { title:"Position Top Corners", desc:"Cycle the last-layer corners into their correct positions (orientation comes next — colors may still be twisted).",
    alg:"R U' L' U R' U' L U", before:"U' L' U R U' L U R'".split(' '),
    hold:"Yellow layer on top. Look for any corner that's already in its correct spot (even if twisted) and hold the cube with that corner at the front-<strong>left</strong>-up.",
    tip:'Keep the one correctly-placed corner at the front-left-up the whole time — this formula leaves that exact corner untouched and cycles the other three around it. Run it once, then check: if all three now match, you\'re done; if not, run it once more and it will.',
    cases:[
      { title:"No correct corners", body:"Run the formula once from any angle, then inspect again. If you now have a correctly positioned corner, place it at front-left-up and continue as above. If not, run it once more and inspect again." },
    ],
    checklist:["Every top corner sits above the correct combination of its two side colors — it's fine if a corner still shows the wrong color on top, that's next stage", "Edges (top and below) are exactly as they were before this stage — this stage only ever moves corners", "Cube is still yellow-up; you haven't flipped it yet"] },
  { title:"Orient Top Corners & Finish", desc:"Flip the cube over, then twist each remaining corner in place until every one shows yellow on the bottom.",
    alg:"R' D' R D", before:"D' R' D R".split(' '), flip:true,
    hold:"Flip the whole cube over — the solved white layer is now on top, yellow is on the bottom. Hold a wrong-way yellow corner at the front-right-<em>bottom</em> and never rotate anything except the right layer and (between corners) the bottom layer — the top layer doesn't turn again for the rest of the solve.",
    tip:'Look for <strong>yellow facing down</strong> at the front-right-bottom corner, not up — after the flip, yellow is the color finishing on the bottom, and it\'s easy to keep habitually checking for yellow on top out of muscle memory from every earlier stage. Repeat <code>R\' D\' R D</code> <strong>two or four times, never an odd number</strong>, on that corner until it shows yellow on the bottom: each repetition twists the corner one step around its three possible orientations, so depending on which way it started twisted, it needs either 2 or 4 reps to land yellow-down — if it\'s not solved after 2, it will be after 4. Then turn <em>only the bottom layer</em> to bring the next wrong corner into that same spot and repeat — never the top, or you\'ll undo corners you already fixed. The rest of the bottom layer may look scrambled in between corners — that\'s expected, it locks together once all four are fixed. Flip the cube back over at the end to see it solved.',
    checklist:["Every corner shows yellow on the bottom (check all four before flipping back)", "Flipping the cube back over shows all six faces solid — no layer still looks scrambled", "If anything's still off after flipping back, don't force more turns — re-flip and recheck each corner before trying again"] },
];

/* =====================================================================
   STAGE CONTROLLER
   ===================================================================== */
// Quarter-turn duration per speed. Slow sits at ~1.3s/turn (the 1.2–1.4s
// range that actually reads as "slow enough to follow"). A double ("2") move
// is played as two separate quarter-turns with a distinct pause between them
// (DOUBLE_PAUSE_MS) rather than one continuous 180° sweep, so it reads as
// "turn, then turn again" instead of a single hard-to-follow blur.
// "verySlow" is only offered as a button on the full-screen finger-training
// page (the main tutorial keeps its original 3-speed picker) — kept here so
// both pages share one source of truth for timing.
const SPEED_MS = { verySlow:2000, slow:1300, medium:650, fast:340 };
const GAP_MS = { verySlow:700, slow:450, medium:260, fast:150 }; // pause after each move during auto-play
const DOUBLE_PAUSE_MS = { verySlow:900, slow:600, medium:380, fast:220 }; // pause between the two halves of a "2" move
let GLOBAL_SPEED = 'slow';

// These are common starting-point grips, not the only correct way to hold a
// turn — comfortable technique varies from cuber to cuber. The standard "home"
// grip is index fingers resting near the U layer with middle/ring fingers
// supporting from below; treat every cue here as a suggestion to try first.
const FINGER_TRICKS = {
  "R":  { hand:'Right hand', finger:'Middle finger', cue:'One common approach: push the front-right edge straight up, pivoting off the middle finger — thumb and index stay put.' },
  "R'": { hand:'Right hand', finger:'Index finger',  cue:'Hook the same edge with your index finger and pull it back down to the front.' },
  "L":  { hand:'Left hand',  finger:'Index finger',  cue:'Push the front-left edge straight down.' },
  "L'": { hand:'Left hand',  finger:'Ring finger',   cue:'Push the same edge back up to the front.' },
  "U":  { hand:'Right hand', finger:'Index / thumb', cue:'Sweep the top layer left — keep the left hand still and low on the cube.' },
  "U'": { hand:'Right hand', finger:'Index / thumb', cue:'Sweep the top layer right with the same steady left hand.' },
  "D":  { hand:'Right hand', finger:'Thumb',         cue:'A workable option: roll the bottom-front edge right without turning the whole cube over. Less universal than the other grips here — many cubers turn D with whichever hand is free instead.' },
  "D'": { hand:'Left hand',  finger:'Thumb',         cue:'Same idea, other direction: roll the bottom-front edge left. Feel free to swap hands if that\'s more natural for you.' },
  "F":  { hand:'Both hands', finger:'Thumbs',        cue:'A beginner-friendly way to start: spin the front face clockwise like a small steering wheel. As you speed up, most cubers switch to a quicker one-hand push instead.' },
  "F'": { hand:'Both hands', finger:'Thumbs',        cue:'Same steering-wheel motion in reverse, counter-clockwise — again, a good starting point rather than the fastest long-term technique.' },
};

class StageController{
  constructor(stageEl, data, index){
    this.el = stageEl;
    this.data = data;
    this.index = index;
    this.moves = data.alg.split(' ');
    this.idx = 0;
    this.playing = false;
    this.animating = false;
    this.speed = GLOBAL_SPEED;
    this.done = false;
    this.timer = null;
    this.halfTimer = null;
    this.render();
    this.wire();
  }

  render(){
    this.el.innerHTML = `
      <div class="stage-head">
        <div class="stage-num" id="num-${this.index}"><span class="check">&#10003;</span>${String(this.index+1).padStart(2,'0')}</div>
        <div class="stage-title">
          <h2>${this.data.title}</h2>
          <p>${this.data.desc}</p>
        </div>
        <div class="stage-alg-pill">${this.data.alg}</div>
      </div>
      <div class="console">
        <div class="cube-col">
          <div class="cube-viewport">
            <div class="cube-scene"></div>
            <div class="move-arrow pos-top"><span class="arrow-glyph"></span><span class="move-badge"></span></div>
            <div class="move-arrow pos-bottom"><span class="arrow-glyph"></span><span class="move-badge"></span></div>
            <div class="move-arrow pos-left"><span class="arrow-glyph"></span><span class="move-badge"></span></div>
            <div class="move-arrow pos-right"><span class="arrow-glyph"></span><span class="move-badge"></span></div>
            <div class="move-arrow pos-center"><span class="arrow-glyph"></span><span class="move-badge"></span></div>
          </div>
          <div class="transport">
            <div class="transport-row">
              <button class="tbtn icon" data-act="reset" title="Reset" aria-label="Reset stage">&#8635;</button>
              <button class="tbtn icon" data-act="prev" title="Previous move (←)" aria-label="Previous move">&#8676;</button>
              <button class="tbtn play" data-act="play" title="Play/pause (space)">&#9654; Play</button>
              <button class="tbtn icon" data-act="next" title="Next move (→)" aria-label="Next move">&#8677;</button>
            </div>
            <div class="status-line" aria-live="polite">Ready</div>
          </div>
        </div>
        <div class="movelist-col">
          <div class="movelist-head"><span class="lbl">Move Sequence</span><span class="lbl">${this.moves.length} moves</span></div>
          <div class="movelist"></div>
          <a class="ft-pill practice-link" href="finger-training.html?stage=${this.index+1}">&#9995; Practice this algorithm full-screen</a>
        </div>
      </div>
      ${this.data.hold ? `<div class="hold-tip"><strong>&#9995; Hold it like this:</strong> ${this.data.hold}</div>` : ''}
      <div class="guide-tip"><strong>Tip:</strong> ${this.data.tip}</div>
      ${this.data.cases && this.data.cases.length ? `
      <details class="cases-box">
        <summary>My cube doesn't look like the example — other starting cases</summary>
        <div class="cases-list">
          ${this.data.cases.map(c => `<div class="case-item"><div class="case-title">${c.title}</div><div class="case-body">${c.body}</div></div>`).join('')}
        </div>
      </details>` : ''}
      ${this.data.checklist && this.data.checklist.length ? `
      <div class="checklist-box">
        <div class="checklist-head">Before continuing, check:</div>
        <ul class="checklist-list">
          ${this.data.checklist.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>` : ''}
    `;

    this.sceneEl = this.el.querySelector('.cube-scene');
    this.playBtn = this.el.querySelector('[data-act="play"]');
    this.statusEl = this.el.querySelector('.status-line');
    this.numEl = this.el.querySelector('.stage-num');
    this.arrows = {
      top: this.el.querySelector('.move-arrow.pos-top'),
      bottom: this.el.querySelector('.move-arrow.pos-bottom'),
      left: this.el.querySelector('.move-arrow.pos-left'),
      right: this.el.querySelector('.move-arrow.pos-right'),
      center: this.el.querySelector('.move-arrow.pos-center'),
    };
    this.movelistEl = this.el.querySelector('.movelist');
    this.moves.forEach((m,i)=>{
      const v = MOVE_VISUAL[m];
      const row = document.createElement('div');
      row.className = 'move-row';
      row.dataset.i = i;
      row.innerHTML = `<span class="idx">${i+1}</span><span class="row-icon">${ICON_GLYPH[v.icon]}</span><span class="row-move">${m}</span><span class="row-plain">${v.plain}</span>`;
      this.movelistEl.appendChild(row);
    });

    this.cubies = this.initCube();
  }

  // Builds a fresh solved cube, then (a) physically flips it 180° if this
  // stage's algorithm is taught in a flipped hand orientation, and (b) plays
  // a silent "before" setup sequence so the demo opens on a realistic
  // pre-solve state instead of an already-solved cube.
  initCube(){
    const cubies = buildCubeDOM(this.sceneEl);
    if(this.data.flip){
      cubies.forEach(c=>{
        c.pos = rotVec(c.pos, 'x', 180);
        c.stickers = c.stickers.map(s=>({ normal: rotVec(s.normal, 'x', 180), color:s.color }));
      });
    }
    (this.data.before||[]).forEach(m => applyMoveLogic(cubies, m));
    cubies.forEach(c=>{ positionCubie(c); renderCubie(c); });
    return cubies;
  }

  wire(){
    this.el.querySelectorAll('.tbtn[data-act]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const act = btn.dataset.act;
        if(act==='play') this.togglePlay();
        if(act==='reset') this.reset();
        if(act==='next') this.stepForward(true);
        if(act==='prev') this.stepBack();
      });
    });
    this.movelistEl.querySelectorAll('.move-row').forEach(row=>{
      row.addEventListener('click', ()=>{
        const target = parseInt(row.dataset.i,10);
        this.jumpTo(target+1);
      });
    });
  }

  // Every quarter-turn (half of a "2" move included) plays at the same
  // per-speed duration — see playMove() for how a "2" move is split in two.
  duration(move){
    return SPEED_MS[this.speed];
  }

  // Total wall-clock time a move takes to finish playing, including the
  // pause between the two halves of a double ("2") move. Used to schedule
  // the next autoplay tick.
  moveTotalMs(move){
    const q = this.duration(move);
    return (move && move.includes('2'))
      ? totalMoveMs(q) * 2 + DOUBLE_PAUSE_MS[this.speed]
      : totalMoveMs(q);
  }

  // Plays one listed move. A "2" move (e.g. R2) is played as two separate
  // quarter-turns of the same face with a visible pause between them, so
  // beginners can actually see it turn twice instead of one fast 180° blur.
  // Uses its own halfTimer (not this.timer, which autoStep() uses to
  // schedule the *next* move) so the two timers never clobber each other.
  playMove(move, dur, onDone){
    clearTimeout(this.halfTimer);
    if(move && move.includes('2')){
      const face = move[0];
      animateMove(this.sceneEl, this.cubies, face, dur, ()=>{
        this.halfTimer = setTimeout(()=>{
          animateMove(this.sceneEl, this.cubies, face, dur, onDone);
        }, DOUBLE_PAUSE_MS[this.speed]);
      });
    } else {
      animateMove(this.sceneEl, this.cubies, move, dur, onDone);
    }
  }

  setSpeed(speed){
    this.speed = speed;
    // The next autoStep() tick reads this.speed fresh, so a running autoplay
    // picks up the new pacing on its very next move without needing a reset.
  }

  markComplete(){
    if(this.done) return;
    this.done = true;
    this.numEl.classList.add('done');
    updateProgress();
  }

  showArrow(move){
    Object.values(this.arrows).forEach(a=>a.classList.remove('show'));
    const v = MOVE_VISUAL[move];
    const a = this.arrows[v.pos];
    const glyph = a.querySelector('.arrow-glyph');
    glyph.innerHTML = ICON_GLYPH[v.icon];
    glyph.className = 'arrow-glyph' + (v.icon==='cw' ? ' spin-cw' : v.icon==='ccw' ? ' spin-ccw' : '');
    const badge = a.querySelector('.move-badge');
    badge.textContent = move + (v.tag ? ' · ' + v.tag : '');
    a.classList.add('show');
  }
  hideArrows(){ Object.values(this.arrows).forEach(a=>a.classList.remove('show')); }

  highlightRow(i){
    this.movelistEl.querySelectorAll('.move-row').forEach((row,k)=>{
      row.classList.toggle('active', k===i);
      row.classList.toggle('played', k<i);
    });
  }

  reset(){
    this.playing = false; clearTimeout(this.timer); clearTimeout(this.halfTimer);
    this.idx = 0; this.animating = false;
    this.cubies = this.initCube();
    this.hideArrows();
    this.highlightRow(-1);
    this.setPlayBtn('idle');
    this.statusEl.innerHTML = 'Ready';
  }

  setPlayBtn(state){
    this.playBtn.classList.remove('playing','done');
    if(state==='playing'){ this.playBtn.classList.add('playing'); this.playBtn.innerHTML = '&#10074;&#10074; Pause'; }
    else if(state==='done'){ this.playBtn.classList.add('done'); this.playBtn.innerHTML = '&#8635; Replay'; }
    else { this.playBtn.innerHTML = '&#9654; Play'; }
  }

  togglePlay(){
    if(this.idx >= this.moves.length){ this.reset(); this.playing = true; this.setPlayBtn('playing'); this.autoStep(); return; }
    // Note: only this.timer (the "trigger next move" timer) is cleared here.
    // this.halfTimer, if a double ("2") move is mid-pause between its two
    // quarter-turns, is deliberately left to finish in the background — same
    // as pausing mid-animation on any single move already does — so
    // animating/idx bookkeeping always completes and never gets stuck.
    if(this.playing){ this.playing=false; clearTimeout(this.timer); this.setPlayBtn('idle'); this.statusEl.innerHTML = 'Paused'; return; }
    this.playing = true; this.setPlayBtn('playing');
    this.autoStep();
  }

  // Autoplay is driven by a chain of setTimeout calls (not a fixed setInterval)
  // because quarter-turns and double-turns run for different lengths of time —
  // each tick schedules the next one based on the move it just played.
  autoStep(){
    if(this.animating) return;
    if(this.idx >= this.moves.length){
      this.playing=false; clearTimeout(this.timer);
      this.setPlayBtn('done'); this.hideArrows(); this.statusEl.innerHTML = '<b>Sequence complete</b>';
      this.markComplete();
      return;
    }
    const move = this.moves[this.idx];
    this.stepForward(false);
    if(this.playing){
      clearTimeout(this.timer);
      this.timer = setTimeout(()=>{ if(this.playing) this.autoStep(); }, this.moveTotalMs(move) + GAP_MS[this.speed]);
    }
  }

  stepForward(manual){
    if(this.animating || this.idx>=this.moves.length) return;
    const move = this.moves[this.idx];
    const dur = this.duration(move);
    this.showArrow(move);
    this.highlightRow(this.idx);
    this.statusEl.innerHTML = `Move <b>${this.idx+1}/${this.moves.length}</b> — <b>${move}</b>`;
    this.animating = true;
    this.playMove(move, dur, ()=>{
      this.animating = false;
      this.idx++;
      if(this.idx>=this.moves.length){
        this.hideArrows(); this.highlightRow(this.idx);
        this.statusEl.innerHTML = '<b>Sequence complete</b>';
        this.setPlayBtn('done'); this.playing=false; clearTimeout(this.timer);
        this.markComplete();
      } else if(manual){
        this.hideArrows();
      }
    });
  }

  stepBack(){
    if(this.animating || this.idx<=0) return;
    this.playing=false; clearTimeout(this.timer); clearTimeout(this.halfTimer); this.setPlayBtn('idle');
    const target = this.idx-1;
    this.jumpTo(target);
  }

  jumpTo(target){
    if(this.animating) return;
    this.playing=false; clearTimeout(this.timer); clearTimeout(this.halfTimer); this.setPlayBtn('idle');
    this.cubies = this.initCube();
    this.idx = 0;
    for(let i=0;i<target;i++){ applyMoveLogic(this.cubies, this.moves[i]); }
    this.cubies.forEach(c=>{ positionCubie(c); renderCubie(c); });
    this.idx = target;
    this.hideArrows();
    this.highlightRow(target-1);
    if(target>=this.moves.length){ this.statusEl.innerHTML = '<b>Sequence complete</b>'; this.setPlayBtn('done'); this.markComplete(); }
    else this.statusEl.innerHTML = `Ready — move <b>${target+1}/${this.moves.length}</b> next`;
  }
}

// Node/CommonJS export for the test harness (tests/engine.test.js). This
// block never runs in the browser — `module` is undefined there — so it has
// zero effect on the live site. Everything above this line is plain browser
// JS with no top-level DOM access, which is what makes this safe to require().
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    rotVec, parseMove, applyMoveLogic, makeCubies,
    FACE_AXIS, FACE_ANGLE, FACE_LAYER, MOVE_VISUAL, ICON_GLYPH, FACE_INFO,
    STAGES, SPEED_MS, GAP_MS, DOUBLE_PAUSE_MS, FINGER_TRICKS,
    prefersReducedMotion, motionTimings, totalMoveMs,
  };
}
