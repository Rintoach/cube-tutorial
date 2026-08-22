// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Each stage's demo must end showing ONLY that stage's own goal achieved
   — never a fully-solved cube, since a beginner would otherwise think one
   stage's formula solved the whole puzzle. The one exception is Stage 7,
   the final stage, which legitimately does end fully solved.

   This is the UI-level counterpart to the goal-predicate tests in
   tests/engine.test.js (which check the same rule against the pure cube
   logic, with no browser involved). Here we actually click Play on each
   stage's real demo, wait for the animation to finish, then read the
   live `cubies` array the page rendered from — window.__controllers[i]
   (exposed by script.js) — so this test would catch a regression the
   logic-only test wouldn't: e.g. an accidental `before`/`alg` mismatch
   wired into the wrong controller at mount time.
   ===================================================================== */

function keyOf(pos){ return pos.map(Math.round).join(','); }

// Same identity-free predicate logic as tests/engine.test.js, evaluated
// here as a plain string so it can run inside page.evaluate().
const PREDICATE_SRC = `
  function keyOf(pos){ return pos.map(Math.round).join(','); }
  function pieceAt(cubies, posKey){ return cubies.find(c => keyOf(c.pos) === posKey); }
  function stickerColor(cubie, normalKey){
    const s = cubie.stickers.find(s => keyOf(s.normal) === normalKey);
    return s ? s.color : null;
  }
  function matchesSolved(cubie, posKey, ref){
    const refPiece = pieceAt(ref, posKey);
    return cubie.stickers.every(s => refPiece.stickers.some(rs => keyOf(rs.normal)===keyOf(s.normal) && rs.color===s.color));
  }
  const D_EDGE_IDS = ['0,-1,1','0,-1,-1','1,-1,0','-1,-1,0'];
  const D_CORNER_IDS = ['1,-1,1','1,-1,-1','-1,-1,1','-1,-1,-1'];
  const M_EDGE_IDS = ['1,0,1','1,0,-1','-1,0,1','-1,0,-1'];
  const U_EDGE_IDS = ['0,1,1','0,1,-1','1,1,0','-1,1,0'];
  const U_CORNER_IDS = ['1,1,1','1,1,-1','-1,1,1','-1,1,-1'];
  function isFullySolved(cubies, ref){ return cubies.every(c => matchesSolved(c, keyOf(c.pos), ref)); }
  function whiteCrossDone(cubies, ref){ return D_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref)); }
  function firstLayerDone(cubies, ref){ if(!whiteCrossDone(cubies, ref)) return false; return D_CORNER_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref)); }
  function secondLayerDone(cubies, ref){ if(!firstLayerDone(cubies, ref)) return false; return M_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref)); }
  function yellowCrossDoneStrict(cubies, ref){ if(!secondLayerDone(cubies, ref)) return false; return U_EDGE_IDS.every(id => stickerColor(pieceAt(cubies, id), '0,1,0') === 'yellow'); }
  function topEdgesMatched(cubies, ref){ if(!yellowCrossDoneStrict(cubies, ref)) return false; return U_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref)); }
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
  // var (not const) so this binding survives past the eval() call site in sloppy
  // mode — let/const create a scope private to the eval call even when not strict.
  var STAGE_GOALS = [whiteCrossDone, firstLayerDone, secondLayerDone, yellowCrossDoneStrict, topEdgesMatched, topCornersPositioned];
`;

const STAGE_TITLES = [
  'White Cross', 'White Corners (First Layer)', 'Second Layer Edges',
  'Yellow Cross', 'Match Top Edges', 'Position Top Corners', 'Orient Top Corners & Finish',
];

test.describe('Stage demos end on that stage\'s own goal, not a fully-solved cube (Stage 7 excepted)', () => {
  for(let i = 0; i < 7; i++){
    test(`Stage ${i+1} (${STAGE_TITLES[i]})`, async ({ page }) => {
      await page.goto('/index.html');
      const stage = page.locator(`#stage-${i+1}`);
      await stage.scrollIntoViewIfNeeded();
      await stage.locator('[data-act="play"]').click();
      await page.waitForFunction((idx) => {
        const c = window.__controllers[idx];
        return c && !c.playing && c.idx === c.moves.length;
      }, i, { timeout: 20_000 });

      const result = await page.evaluate(({ idx, predicateSrc, stageIdx }) => {
        // eslint-disable-next-line no-eval
        eval(predicateSrc);
        const controller = window.__controllers[idx];
        const cubies = controller.cubies;
        // Build this stage's own solved reference the same way initCube() does:
        // a fresh solved cube, flipped first if this stage flips. makeCubies/rotVec
        // are plain top-level functions in cube-engine.js (a non-module script), so
        // they're already on window in the page itself.
        let ref = window.makeCubies();
        if(controller.data.flip){
          ref.forEach(c => {
            c.pos = window.rotVec(c.pos, 'x', 180);
            c.stickers = c.stickers.map(s => ({ normal: window.rotVec(s.normal, 'x', 180), color: s.color }));
          });
        }
        const solved = isFullySolved(cubies, ref);
        const goal = stageIdx < 6 ? STAGE_GOALS[stageIdx](cubies, ref) : null;
        return { solved, goal };
      }, { idx: i, predicateSrc: PREDICATE_SRC, stageIdx: i });

      if(i < 6){
        expect(result.goal, `Stage ${i+1} demo did not reach its own goal after Play finished`).toBe(true);
        expect(result.solved, `Stage ${i+1} demo ended fully solved — should only meet its own stage goal`).toBe(false);
      } else {
        expect(result.solved, 'Stage 7 (the final stage) must end fully solved').toBe(true);
      }
    });
  }
});
