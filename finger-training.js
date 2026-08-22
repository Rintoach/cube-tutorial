/* =====================================================================
   FINGER-TRAINING PAGE — mounts the shared cube-engine.js building blocks
   into a dedicated full-screen, one-stage-at-a-time practice view.
   Load cube-engine.js before this file.

   Design note: a "2" move (e.g. U2) is expanded here into two separate,
   independently-navigable steps of the SAME quarter-turn ("U" played
   twice) rather than one 180° step. That is deliberately a different
   granularity than the main tutorial's playMove() — here the whole point
   is to make every single quarter-turn its own "Move X of Y" stop, so a
   double move never reads as one confusing fast spin.
   ===================================================================== */

function stepsForAlg(alg){
  const steps = [];
  alg.split(' ').forEach(token=>{
    if(token.includes('2')){
      const face = token[0]; // bare face letter, no prime — see module note above
      steps.push({ move:face, token, part:1, of:2 });
      steps.push({ move:face, token, part:2, of:2 });
    } else {
      steps.push({ move:token, token, part:null, of:null });
    }
  });
  return steps;
}

class Trainer{
  constructor(){
    this.stageSelectEl = document.getElementById('stagePicker').querySelector('.tr-stage-list');
    this.algEl = document.getElementById('trainerAlg');
    this.badgeEl = document.getElementById('stageBadge');
    this.progressEl = document.getElementById('trainerProgress');
    this.viewportEl = document.getElementById('trainerViewport');
    this.sceneEl = document.getElementById('trainerScene');
    this.moveBadgeEl = document.getElementById('trMoveBadge');
    this.plainEl = document.getElementById('trPlain');
    this.fingerEl = document.getElementById('trFinger');
    this.resultEl = document.getElementById('trainerResult');
    this.goalEl = document.getElementById('tiGoal');
    this.holdEl = document.getElementById('tiHold');
    this.playBtn = document.querySelector('[data-act="trplay"]');
    this.arrows = {
      top: this.viewportEl.querySelector('.move-arrow.pos-top'),
      bottom: this.viewportEl.querySelector('.move-arrow.pos-bottom'),
      left: this.viewportEl.querySelector('.move-arrow.pos-left'),
      right: this.viewportEl.querySelector('.move-arrow.pos-right'),
      center: this.viewportEl.querySelector('.move-arrow.pos-center'),
    };

    this.speed = 'slow';
    this.playing = false;
    this.animating = false;
    this.timer = null;

    this.buildStagePicker();
    this.wireTransport();
    this.wireSpeed();
    this.loadStage(this.stageFromQuery(), false);
  }

  stageFromQuery(){
    const params = new URLSearchParams(location.search);
    const n = parseInt(params.get('stage'), 10);
    if(Number.isInteger(n) && n>=1 && n<=STAGES.length) return n-1;
    return 0;
  }

  buildStagePicker(){
    STAGES.forEach((d,i)=>{
      const btn = document.createElement('button');
      btn.className = 'tr-stage-btn';
      btn.dataset.i = i;
      btn.innerHTML = `<span class="n">${i+1}</span><span>${d.title}</span>`;
      btn.addEventListener('click', ()=> this.loadStage(i, true));
      this.stageSelectEl.appendChild(btn);
    });
  }

  wireSpeed(){
    document.querySelectorAll('#trainerSpeedOpts .speed-opt').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('#trainerSpeedOpts .speed-opt').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this.speed = btn.dataset.speed;
      });
    });
  }

  wireTransport(){
    // "Next" actually plays/animates the upcoming move forward — this is a
    // trainer, the whole point is to watch each turn happen. "Previous" is
    // an instant snap back (no natural "undo animation" to show), matching
    // the main tutorial's own step-back behavior.
    document.querySelector('[data-act="trprev"]').addEventListener('click', ()=>{ this.stopPlaying(); this.jumpTo(this.idx-1); });
    document.querySelector('[data-act="trnext"]').addEventListener('click', ()=>{ this.stopPlaying(); this.playStep(); });
    document.querySelector('[data-act="trreplay"]').addEventListener('click', ()=>{ this.stopPlaying(); this.replayCurrent(); });
    document.querySelector('[data-act="trplay"]').addEventListener('click', ()=> this.togglePlay());
  }

  loadStage(i, updateUrl){
    this.stopPlaying();
    this.stageIndex = i;
    this.data = STAGES[i];
    this.steps = stepsForAlg(this.data.alg);
    this.idx = 0;

    if(updateUrl){
      const url = new URL(location.href);
      url.searchParams.set('stage', i+1);
      history.replaceState(null, '', url);
    }

    this.stageSelectEl.querySelectorAll('.tr-stage-btn').forEach(b=>{
      b.classList.toggle('active', parseInt(b.dataset.i,10)===i);
    });
    this.badgeEl.textContent = `STAGE ${i+1} · ${this.data.title.toUpperCase()}`;
    this.algEl.textContent = this.data.alg;
    this.goalEl.textContent = this.data.desc;
    this.holdEl.innerHTML = this.data.hold || '—';
    this.resultEl.classList.remove('show');

    this.buildProgressDots();
    this.rebuildCube();
    this.renderStep();
  }

  buildProgressDots(){
    this.progressEl.innerHTML = '';
    this.dots = this.steps.map(()=>{
      const d = document.createElement('span');
      d.className = 'tr-dot';
      this.progressEl.appendChild(d);
      return d;
    });
    this.updateDots();
  }
  updateDots(){
    this.dots.forEach((d,i)=>{
      d.classList.toggle('done', i<this.idx);
      d.classList.toggle('current', i===this.idx);
    });
  }

  // Rebuilds a fresh cube, applies the stage's flip + "before" setup moves
  // (same realistic pre-solve state the main tutorial uses), then fast-forwards
  // (no animation) through however many steps have already been played.
  rebuildCube(){
    this.cubies = buildCubeDOM(this.sceneEl);
    if(this.data.flip){
      this.cubies.forEach(c=>{
        c.pos = rotVec(c.pos, 'x', 180);
        c.stickers = c.stickers.map(s=>({ normal: rotVec(s.normal, 'x', 180), color:s.color }));
      });
    }
    (this.data.before||[]).forEach(m => applyMoveLogic(this.cubies, m));
    for(let i=0;i<this.idx;i++){ applyMoveLogic(this.cubies, this.steps[i].move); }
    this.cubies.forEach(c=>{ positionCubie(c); renderCubie(c); });
  }

  hideArrows(){ Object.values(this.arrows).forEach(a=>a.classList.remove('show')); }
  showArrow(move, badgeText){
    this.hideArrows();
    const v = MOVE_VISUAL[move];
    const a = this.arrows[v.pos];
    const glyph = a.querySelector('.arrow-glyph');
    glyph.innerHTML = ICON_GLYPH[v.icon];
    glyph.className = 'arrow-glyph' + (v.icon==='cw' ? ' spin-cw' : v.icon==='ccw' ? ' spin-ccw' : '');
    a.querySelector('.move-badge').textContent = badgeText;
    a.classList.add('show');
  }

  renderStep(){
    if(this.idx >= this.steps.length){
      this.hideArrows();
      this.moveBadgeEl.innerHTML = '<b>Sequence complete</b>';
      this.plainEl.textContent = 'Every move in this algorithm has been played.';
      this.fingerEl.innerHTML = '';
      this.resultEl.innerHTML = `<strong>Expected result:</strong> ${this.data.desc}`;
      this.resultEl.classList.add('show');
      this.playing = false; clearTimeout(this.timer);
      this.setPlayBtn('done');
      this.updateDots();
      return;
    }
    const step = this.steps[this.idx];
    const v = MOVE_VISUAL[step.move];
    const partLabel = step.part ? ` <span class="part">turn ${step.part} of ${step.of} — ${step.token}</span>` : '';
    this.moveBadgeEl.innerHTML = `Move ${this.idx+1} of ${this.steps.length} — <b>${step.move}</b>${partLabel}`;
    this.plainEl.textContent = v.plain;
    const trick = FINGER_TRICKS[step.move];
    this.fingerEl.innerHTML = `<b>${trick.hand} · ${trick.finger}</b><span>${trick.cue}</span>`;
    this.showArrow(step.move, step.part ? `${step.move} (${step.part}/${step.of})` : step.move);
    this.resultEl.classList.remove('show');
    this.updateDots();
  }

  // Plays the CURRENT step's move forward, advancing idx on completion.
  playStep(onDone){
    if(this.animating || this.idx>=this.steps.length){ if(onDone) onDone(); return; }
    const step = this.steps[this.idx];
    this.animating = true;
    animateMove(this.sceneEl, this.cubies, step.move, SPEED_MS[this.speed], ()=>{
      this.animating = false;
      this.idx++;
      this.renderStep();
      if(onDone) onDone();
    });
  }

  // Re-plays the move that leads INTO the current position (i.e. the step
  // just completed) — for the "Replay this move" button. Silently rewinds
  // one step (reusing rebuildCube's instant fast-forward, no flicker), then
  // animates that same move forward again at the chosen speed.
  replayCurrent(){
    if(this.animating || this.idx<=0) return;
    const step = this.steps[this.idx-1];
    this.idx--;
    this.rebuildCube();
    this.animating = true;
    this.showArrow(step.move, step.part ? `${step.move} (${step.part}/${step.of})` : step.move);
    animateMove(this.sceneEl, this.cubies, step.move, SPEED_MS[this.speed], ()=>{
      this.animating = false;
      this.idx++;
      this.renderStep();
    });
  }

  jumpTo(target){
    if(this.animating) return;
    this.stopPlaying();
    target = Math.max(0, Math.min(this.steps.length, target));
    this.idx = target;
    this.rebuildCube();
    this.renderStep();
  }

  setPlayBtn(state){
    const btn = document.querySelector('[data-act="trplay"]');
    btn.classList.remove('playing','done');
    if(state==='playing'){ btn.classList.add('playing'); btn.innerHTML = '&#10074;&#10074; Pause'; }
    else if(state==='done'){ btn.classList.add('done'); btn.innerHTML = '&#8635; Replay sequence'; }
    else { btn.innerHTML = '&#9654; Play sequence'; }
  }

  stopPlaying(){ this.playing = false; clearTimeout(this.timer); this.setPlayBtn('idle'); }

  togglePlay(){
    if(this.idx >= this.steps.length){ this.jumpTo(0); this.playing = true; this.setPlayBtn('playing'); this.autoStep(); return; }
    if(this.playing){ this.stopPlaying(); return; }
    this.playing = true; this.setPlayBtn('playing');
    this.autoStep();
  }

  autoStep(){
    if(this.animating || !this.playing) return;
    if(this.idx>=this.steps.length){ this.playing=false; this.setPlayBtn('done'); return; }
    this.playStep(()=>{
      if(this.playing){
        this.timer = setTimeout(()=>{ if(this.playing) this.autoStep(); }, GAP_MS[this.speed]);
      }
    });
  }
}

new Trainer();
