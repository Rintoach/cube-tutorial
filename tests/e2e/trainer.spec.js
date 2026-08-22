// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Finger-training page (finger-training.html) — deep linking + the
   trainer's "2" move step-splitting.

   Stage 5's algorithm is "R U R' U R U2 R' U" (8 tokens, one of them a
   "2" move). stepsForAlg() in finger-training.js deliberately expands a
   "2" token into two separate single-quarter-turn steps (a different
   granularity than the main tutorial's playMove(), which plays a "2" as
   two turns within ONE step) — see the comment at the top of that file.
   So stage 5 should produce 9 navigable steps: 7 plain tokens + U2's 2.
   ===================================================================== */

test.describe('Finger trainer — deep link', () => {
  test('?stage=5 loads Stage 5 directly', async ({ page }) => {
    await page.goto('/finger-training.html?stage=5');
    await expect(page.locator('#stageBadge')).toContainText('STAGE 5');
    await expect(page.locator('#trainerAlg')).toHaveText("R U R' U R U2 R' U");
    await expect(page.locator('.tr-stage-btn.active .n')).toHaveText('5');
  });
});

test.describe('Finger trainer — "2" move step count', () => {
  test('Stage 5\'s U2 expands into two separate steps (9 steps total)', async ({ page }) => {
    await page.goto('/finger-training.html?stage=5');

    const stepCount = await page.evaluate(() => window.__trainer.steps.length);
    expect(stepCount).toBe(9);

    // the progress-dot rail renders one dot per step, so it should match too
    await expect(page.locator('.tr-dot')).toHaveCount(9);

    // the two U2-derived steps should each be a bare "U" turn, tagged as
    // turn 1 of 2 / 2 of 2 of the original "U2" token
    const uSteps = await page.evaluate(() => window.__trainer.steps.filter(s => s.token === 'U2'));
    expect(uSteps).toEqual([
      { move: 'U', token: 'U2', part: 1, of: 2 },
      { move: 'U', token: 'U2', part: 2, of: 2 },
    ]);
  });

  test('Next advances through both halves of the U2 step, Previous steps back', async ({ page }) => {
    await page.goto('/finger-training.html?stage=5');
    // the U2 token is the 6th token (index 5) of 8 tokens, and every earlier
    // token is a single step, so its two halves land at trainer step idx 5 and 6
    await page.evaluate(() => window.__trainer.jumpTo(5));
    await expect(page.locator('#trMoveBadge')).toContainText('turn 1 of 2');

    await page.locator('[data-act="trnext"]').click();
    await page.waitForFunction(() => !window.__trainer.animating && window.__trainer.idx === 6, null, { timeout: 10_000 });
    await expect(page.locator('#trMoveBadge')).toContainText('turn 2 of 2');

    await page.locator('[data-act="trprev"]').click();
    await expect.poll(() => page.evaluate(() => window.__trainer.idx)).toBe(5);
    await expect(page.locator('#trMoveBadge')).toContainText('turn 1 of 2');
  });
});
