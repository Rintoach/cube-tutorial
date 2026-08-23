// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Stage 3's "Starting case" picker — the insert-left case used to be
   describable only in a text panel ("cases-box"); a learner could read
   the mirror algorithm but never watch it played on the cube. Picking
   "Insert left" now swaps the whole demo (algorithm pill, move list,
   hold instructions, and the cube/animation itself) to that case.
   ===================================================================== */

test.describe('Stage 3 — Starting case picker (insert right / insert left)', () => {
  test('defaults to Insert right; switching to Insert left swaps alg pill, hold text, and move count', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-3');
    await stage.scrollIntoViewIfNeeded();

    const picker = stage.locator('.variant-picker');
    await expect(picker).toBeVisible();
    const rightOpt = picker.locator('.variant-opt', { hasText: 'Insert right' });
    const leftOpt = picker.locator('.variant-opt', { hasText: 'Insert left' });
    await expect(rightOpt).toHaveClass(/active/);
    await expect(leftOpt).not.toHaveClass(/active/);
    await expect(stage.locator('.stage-alg-pill')).toHaveText("U R U' R' U' F' U F");
    await expect(stage.locator('.hold-tip')).toContainText(/front-right/i);

    await leftOpt.click();

    await expect(leftOpt).toHaveClass(/active/);
    await expect(rightOpt).not.toHaveClass(/active/);
    await expect(stage.locator('.stage-alg-pill')).toHaveText("U' L' U L U F U' F'");
    await expect(stage.locator('.hold-tip')).toContainText(/front-.*left/i);
    // move list rebuilt for the new (differently-worded) algorithm
    await expect(stage.locator('.movelist .move-row')).toHaveCount(8);
    await expect(stage.locator('.status-line')).toHaveText('Ready');
  });

  test('Insert left demo plays to a genuinely different, still-valid end state', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-3');
    await stage.scrollIntoViewIfNeeded();
    await stage.locator('.variant-opt', { hasText: 'Insert left' }).click();

    await stage.locator('[data-act="play"]').click();
    await page.waitForFunction((idx) => {
      const c = window.__controllers[idx];
      return c && !c.playing && c.idx === c.moves.length;
    }, 2, { timeout: 20_000 });

    const result = await page.evaluate((idx) => {
      const controller = window.__controllers[idx];
      const cubies = controller.cubies;
      function keyOf(pos){ return pos.map(Math.round).join(','); }
      function pieceAt(cs, posKey){ return cs.find(c => keyOf(c.pos) === posKey); }
      function matchesSolved(cubie, posKey, ref){
        const refPiece = pieceAt(ref, posKey);
        return cubie.stickers.every(s => refPiece.stickers.some(rs => keyOf(rs.normal)===keyOf(s.normal) && rs.color===s.color));
      }
      const D_EDGE_IDS = ['0,-1,1','0,-1,-1','1,-1,0','-1,-1,0'];
      const D_CORNER_IDS = ['1,-1,1','1,-1,-1','-1,-1,1','-1,-1,-1'];
      const M_EDGE_IDS = ['1,0,1','1,0,-1','-1,0,1','-1,0,-1'];
      const ref = window.makeCubies();
      const firstLayerDone = D_EDGE_IDS.concat(D_CORNER_IDS).every(id => matchesSolved(pieceAt(cubies, id), id, ref));
      const secondLayerDone = firstLayerDone && M_EDGE_IDS.every(id => matchesSolved(pieceAt(cubies, id), id, ref));
      const isFullySolved = cubies.every(c => matchesSolved(c, keyOf(c.pos), ref));
      return { secondLayerDone, isFullySolved };
    }, 2);

    expect(result.secondLayerDone, 'Insert-left demo did not reach second-layer-done').toBe(true);
    expect(result.isFullySolved, 'Insert-left demo ended fully solved').toBe(false);
  });
});
