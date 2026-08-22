// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Main tutorial page (index.html) — transport controls + stage switching.
   Covers: Next, Previous, Replay, Pause, stage switching (from the user's
   explicit test list). Stage 1's algorithm is "F2 R2" — two double moves —
   which also makes it a natural regression check for the double-move
   pause bug this project hit before (pausing mid-"2"-move used to clear
   the wrong timer and leave the controller stuck forever).

   These tests read window.__controllers[i] (exposed by script.js) instead
   of guessing animation durations from wall-clock time — it's the same
   state the UI itself renders from, so waiting on it can't flake the way
   a fixed setTimeout would.
   ===================================================================== */

test.describe('Main tutorial — Stage 1 transport controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stage-1 .status-line')).toHaveText('Ready');
  });

  test('Next steps forward one move at a time', async ({ page }) => {
    const stage = page.locator('#stage-1');
    await stage.locator('[data-act="next"]').click();
    await page.waitForFunction(() => {
      const c = window.__controllers[0];
      return !c.animating && c.idx === 1;
    }, null, { timeout: 10_000 });
    await expect(stage.locator('.status-line')).toContainText('Move 1/2');

    await stage.locator('[data-act="next"]').click();
    await page.waitForFunction(() => {
      const c = window.__controllers[0];
      return !c.animating && c.idx === 2;
    }, null, { timeout: 10_000 });
    await expect(stage.locator('.status-line')).toContainText('Sequence complete');
  });

  test('Previous steps back after Next', async ({ page }) => {
    const stage = page.locator('#stage-1');
    await stage.locator('[data-act="next"]').click();
    await page.waitForFunction(() => !window.__controllers[0].animating && window.__controllers[0].idx === 1,
      null, { timeout: 10_000 });

    await stage.locator('[data-act="prev"]').click();
    await expect.poll(() => page.evaluate(() => window.__controllers[0].idx)).toBe(0);
    // jumpTo(0) reports "Ready — move 1/2 next" (distinct from the initial,
    // never-touched "Ready" state) — it still knows what's queued up next.
    await expect(stage.locator('.status-line')).toContainText('Ready');
    await expect(stage.locator('.status-line')).toContainText('1/2');
  });

  test('Play then Pause mid double-move does not get stuck, Play resumes to completion', async ({ page }) => {
    const stage = page.locator('#stage-1');
    const playBtn = stage.locator('[data-act="play"]');

    await playBtn.click(); // starts autoplay through F2 R2
    // Pause partway through — specifically while the FIRST move (F2, a
    // double move) is still animating, which is exactly the scenario the
    // earlier halfTimer/timer-clobbering bug broke.
    await page.waitForTimeout(400);
    await playBtn.click(); // pause
    await expect(stage.locator('.status-line')).toHaveText('Paused');

    // Give the in-flight halfTimer time to finish naturally in the
    // background (it must — pausing must never leave `animating` stuck true).
    await page.waitForFunction(() => window.__controllers[0].animating === false, null, { timeout: 10_000 });

    await playBtn.click(); // resume
    await page.waitForFunction(() => {
      const c = window.__controllers[0];
      return !c.playing && c.idx === 2;
    }, null, { timeout: 15_000 });
    await expect(stage.locator('.status-line')).toContainText('Sequence complete');
  });

  test('Replay restarts the sequence from the beginning once complete', async ({ page }) => {
    const stage = page.locator('#stage-1');
    const playBtn = stage.locator('[data-act="play"]');

    await playBtn.click();
    await page.waitForFunction(() => {
      const c = window.__controllers[0];
      return !c.playing && c.idx === 2;
    }, null, { timeout: 15_000 });
    await expect(playBtn).toHaveText(/Replay/);

    await playBtn.click(); // Play button now acts as Replay
    await page.waitForFunction(() => window.__controllers[0].playing === true, null, { timeout: 5_000 });
    await expect.poll(() => page.evaluate(() => window.__controllers[0].idx)).toBeLessThan(2);

    await page.waitForFunction(() => {
      const c = window.__controllers[0];
      return !c.playing && c.idx === 2;
    }, null, { timeout: 15_000 });
    await expect(stage.locator('.status-line')).toContainText('Sequence complete');
  });
});

test.describe('Main tutorial — stage switching', () => {
  test('clicking a step pill scrolls to and activates the matching stage', async ({ page }) => {
    await page.goto('/index.html');
    // pill-4 -> stage-5 (pills are 0-indexed ids, stages are 1-indexed)
    await page.locator('#pill-4').click();
    await expect(page.locator('#stage-5')).toBeInViewport();
    await expect(page.locator('#stage-5 .stage-alg-pill')).toHaveText("R U R' U R U2 R' U");
  });
});
