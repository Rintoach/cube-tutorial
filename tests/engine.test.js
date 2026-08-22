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

console.log('\n=== every STAGES entry: before + alg returns to a clean solved (or solved-flipped) state ===');
STAGES.forEach((data, i) => {
  test(`Stage ${i+1} (${data.title}): before + alg -> clean solved`, () => {
    let cubies = makeCubies();
    if(data.flip) flipX(cubies);
    const reference = clone(cubies); // this stage's "solved" reference (flipped or not)
    (data.before || []).forEach(m => applyMoveLogic(cubies, m));
    data.alg.split(' ').forEach(m => applyMoveLogic(cubies, m));
    assert.ok(statesEqual(cubies, reference),
      `alg "${data.alg}" run after before "${(data.before||[]).join(' ')}" did not return to the stage's own solved reference`);
  });

  test(`Stage ${i+1} (${data.title}): "before" is a genuine scramble (not already solved)`, () => {
    let cubies = makeCubies();
    if(data.flip) flipX(cubies);
    const reference = clone(cubies);
    (data.before || []).forEach(m => applyMoveLogic(cubies, m));
    if((data.before || []).length){
      assert.ok(!statesEqual(cubies, reference), 'before-scramble left the cube already solved — demo would open on a solved cube');
    }
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
