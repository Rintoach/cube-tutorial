#!/usr/bin/env node
/* =====================================================================
   ENGINE UNIT TESTS — plain Node, zero dependencies.
   Run with: node tests/engine.test.js  (or `npm run test:engine`)

   These test the CUBE LOGIC itself (rotation math, move application,
   the STAGES data), independent of any DOM/animation code — the fast,
   deterministic layer beneath the Playwright UI tests in tests/e2e/.
   Catches: a wrong algorithm, a wrong "before" setup scramble, a stage's
   flip not round-tripping, or a "2" move that doesn't equal two quarter
   turns — exactly the class of bug this project has hit before (Stage 7's
   U-vs-D mixup, Stage 2's up-vs-down wording) but at the data layer,
   before it ever reaches a beginner.
   ===================================================================== */
const assert = require('assert');
const path = require('path');

const {
  rotVec, parseMove, applyMoveLogic, makeCubies, STAGES,
} = require(path.join(__dirname, '..', 'cube-engine.js'));

let pass = 0, fail = 0;
const failures = [];

function test(name, fn){
  try{
    fn();
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  }catch(err){
    fail++;
    failures.push({ name, err });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${err.message}`);
  }
}

function clone(cubies){
  return cubies.map(c => ({ pos:[...c.pos], stickers: c.stickers.map(s => ({ normal:[...s.normal], color:s.color })) }));
}
function normalize(cubies){
  // stable sort by position so two cube states can be deep-compared regardless of array order
  return clone(cubies).sort((a,b) => a.pos.join(',') < b.pos.join(',') ? -1 : 1);
}
function statesEqual(a, b){
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function invert(seq){
  return seq.slice().reverse().map(m=>{
    if(m.includes('2')) return m;
    return m.includes("'") ? m.replace("'", '') : m + "'";
  });
}
function flipX(cubies){
  cubies.forEach(c=>{
    c.pos = rotVec(c.pos, 'x', 180);
    c.stickers = c.stickers.map(s => ({ normal: rotVec(s.normal, 'x', 180), color: s.color }));
  });
}

console.log('=== rotVec / parseMove sanity ===');
test('four quarter turns of R return to identity', () => {
  let v = [1, 1, 1];
  for(let i=0;i<4;i++) v = rotVec(v, 'x', -90);
  assert.deepStrictEqual(v, [1,1,1]);
});
test("R and R' are inverses", () => {
  let cubies = makeCubies();
  applyMoveLogic(cubies, 'R'); applyMoveLogic(cubies, "R'");
  assert.ok(statesEqual(cubies, makeCubies()), 'R then R\' did not return to solved');
});
test('U2 parses as a 180° turn regardless of any prime', () => {
  assert.strictEqual(parseMove('U2').angle, 180);
});

console.log('\n=== stage goal predicates (identity-free: check whichever piece currently sits in each slot) ===');
/* -----------------------------------------------------------------------
   Each demo must end with ONLY that stage's own goal achieved — not a
   fully-solved cube regardless of stage. A stage whose "before" is just
   invert(alg) trivially cancels back to solved once alg runs, which is
   pedagogically misleading (Stage 3's demo, say, would "solve" the whole
   cube rather than just the second layer). Rule: Stages 1-6 must reach
   their own goal AND must NOT be fully solved; Stage 7 must be fully
   solved. See tests/e2e/content.spec.js for the matching UI-level checks.
   ----------------------------------------------------------------------- */
function keyOf(pos){ return pos.map(Math.round).join(','); }
function pieceAt(cubies, posKey){ return cubies.find(c => keyOf(c.pos) === posKey); }
function stickerColor(cubie, normalKey){
  const s = cubie.stickers.find(s => keyOf(s.normal) === normalKey);
  return s ? s.color : null;
}
// `ref` is this stage's own solved reference (flipped first if data.flip) — never the
// plain unflipped makeCubies(), or Stage 7 (which flips the whole cube) would compare
// against the wrong orientation and every piece would look "wrong".
function matchesSolved(cubie, posKey, ref){
  const refPiece = pieceAt(ref, posKey);
  return cubie.stickers.every(s => refPiece.stickers.some(rs => keyOf(rs.normal)===keyOf(s.normal) && rs.color===s.color));
}
const D_EDGE_IDS = ['0,-1,1','0,-1,-1','1,-1,0','-1,-1,0'];
const D_CORNER_IDS = ['1,-1,1','1,-1,-1','-1,-1,1','-1,-1,-1'];
const M_EDGE_IDS = ['1,0,1','1,0,-1','-1,0,1','-1,0,-1'];
const U_EDGE_IDS = ['0,1,1','0,1,-1','1,1,0','-1,1,0'];
const U_CORNER_IDS = ['1,1,1','1,1,-1','-1,1,1','-1,1,-1'];

function isFullySolved(cubies, ref){
  return cubies.every(c => matchesSolved(c, keyOf(c.pos), ref));
}
function whiteCrossDone(cubies, ref){
  return D_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref));
}
function firstLayerDone(cubies, ref){
  if(!whiteCrossDone(cubies, ref)) return false;
  return D_CORNER_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref));
}
function secondLayerDone(cubies, ref){
  if(!firstLayerDone(cubies, ref)) return false;
  return M_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref));
}
function yellowCrossDoneStrict(cubies, ref){
  if(!secondLayerDone(cubies, ref)) return false;
  return U_EDGE_IDS.every(id => stickerColor(pieceAt(cubies, id), '0,1,0') === 'yellow');
}
function topEdgesMatched(cubies, ref){
  if(!yellowCrossDoneStrict(cubies, ref)) return false;
  return U_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref));
}
function topCornersPositioned(cubies, ref){
  if(!topEdgesMatched(cubies, ref)) return false;
  return U_CORNER_IDS.every(id => {
    const occ = pieceAt(cubies, id);
    const nonYellowHere = new Set(occ.stickers.filter(s=>s.color!=='yellow').map(s=>s.color));
    const refPiece = pieceAt(ref, id);
    const expected = new Set(refPiece.stickers.filter(s=>s.color!=='yellow').map(s=>s.color));
    if(nonYellowHere.size !== expected.size) return false;
    for(const c of nonYellowHere) if(!expected.has(c)) return false;
    return true;
  });
}
const STAGE_GOALS = [whiteCrossDone, firstLayerDone, secondLayerDone, yellowCrossDoneStrict, topEdgesMatched, topCornersPositioned];

console.log('\n=== every STAGES entry: before + alg reaches that stage\'s own goal, not a fully-solved cube (except Stage 7) ===');
STAGES.forEach((data, i) => {
  test(`Stage ${i+1} (${data.title}): "before" is a genuine scramble (not already solved)`, () => {
    let cubies = makeCubies();
    if(data.flip) flipX(cubies);
    const reference = clone(cubies);
    (data.before || []).forEach(m => applyMoveLogic(cubies, m));
    if((data.before || []).length){
      assert.ok(!statesEqual(cubies, reference), 'before-scramble left the cube already solved — demo would open on a solved cube');
    }
  });

  if(i < 6){
    test(`Stage ${i+1} (${data.title}): before + alg meets this stage's own goal`, () => {
      let cubies = makeCubies();
      if(data.flip) flipX(cubies);
      const ref = clone(cubies);
      (data.before || []).forEach(m => applyMoveLogic(cubies, m));
      data.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
      assert.ok(STAGE_GOALS[i](cubies, ref), `alg "${data.alg}" run after before "${(data.before||[]).join(' ')}" did not reach this stage's own goal`);
    });
    test(`Stage ${i+1} (${data.title}): before + alg does NOT end fully solved`, () => {
      let cubies = makeCubies();
      if(data.flip) flipX(cubies);
      const ref = clone(cubies);
      (data.before || []).forEach(m => applyMoveLogic(cubies, m));
      data.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
      assert.ok(!isFullySolved(cubies, ref), 'demo ended on a fully-solved cube — beginners would think this one stage solved everything');
    });
  } else {
    test(`Stage ${i+1} (${data.title}): before + alg -> fully solved`, () => {
      let cubies = makeCubies();
      if(data.flip) flipX(cubies);
      const ref = clone(cubies);
      (data.before || []).forEach(m => applyMoveLogic(cubies, m));
      data.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
      assert.ok(isFullySolved(cubies, ref), 'Stage 7 (the final stage) must end on a fully-solved cube');
    });
  }

  // A stage's alternate starting cases (e.g. Stage 3's insert-left, played
  // via the "Starting case" picker) must independently satisfy the exact
  // same rule as the stage's own default: reach this stage's goal without
  // ending fully solved. Nothing about the picker UI should let a variant
  // skip this validation.
  (data.variants || []).forEach(variant => {
    test(`Stage ${i+1} variant "${variant.key}" (${variant.label}): before + alg meets this stage's own goal, not fully solved`, () => {
      let cubies = makeCubies();
      if(data.flip) flipX(cubies);
      const ref = clone(cubies);
      (variant.before || []).forEach(m => applyMoveLogic(cubies, m));
      variant.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
      assert.ok(STAGE_GOALS[i](cubies, ref), `variant "${variant.key}": alg "${variant.alg}" run after before "${(variant.before||[]).join(' ')}" did not reach this stage's own goal`);
      assert.ok(!isFullySolved(cubies, ref), `variant "${variant.key}" ended on a fully-solved cube`);
    });
    test(`Stage ${i+1} variant "${variant.key}": "before" is a genuine scramble (not already solved)`, () => {
      let cubies = makeCubies();
      if(data.flip) flipX(cubies);
      const reference = clone(cubies);
      (variant.before || []).forEach(m => applyMoveLogic(cubies, m));
      assert.ok(!statesEqual(cubies, reference), `variant "${variant.key}" before-scramble left the cube already solved`);
    });
  });
});

console.log('\n=== "2" moves: verify a bare face applied twice == the "2" move applied once ===');
STAGES.forEach((data, i) => {
  data.alg.split(' ').filter(m => m.includes('2')).forEach(move => {
    test(`Stage ${i+1}: "${move}" == same face played twice (two quarter-turns)`, () => {
      const face = move[0];
      let viaDouble = makeCubies();
      applyMoveLogic(viaDouble, move);
      let viaTwoQuarters = makeCubies();
      applyMoveLogic(viaTwoQuarters, face);
      applyMoveLogic(viaTwoQuarters, face);
      assert.ok(statesEqual(viaDouble, viaTwoQuarters),
        `${move} in one shot does not match ${face} applied twice — the trainer's step-splitting and the main tutorial's playMove() double-split both rely on this being true`);
    });
  });
});

console.log('\n=== inverse round-trips for every stage\'s alg (generic group property) ===');
STAGES.forEach((data, i) => {
  test(`Stage ${i+1}: alg followed by its own inverse returns to solved`, () => {
    let cubies = makeCubies();
    if(data.flip) flipX(cubies);
    const reference = clone(cubies);
    data.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
    invert(data.alg.split(' ')).forEach(m => applyMoveLogic(cubies, m));
    assert.ok(statesEqual(cubies, reference), 'alg + invert(alg) did not return to solved');
  });
});

console.log(`\n${pass} passed, ${fail} failed`);
if(fail > 0){
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.err.message}`));
  process.exit(1);
}
