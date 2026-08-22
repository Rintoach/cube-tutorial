// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   prefers-reduced-motion — animateMove() (cube-engine.js) collapses the
   lift/settle phases and caps the turn itself when this is on, checked
   live via matchMedia rather than only in CSS. This test emulates the OS
   preference and confirms a move both completes correctly AND finishes
   fast — proving the timings actually changed, not just that the move
   eventually works (which the non-reduced-motion tests already cover).
   ===================================================================== */

test.describe('Reduced motion — animateMove() honors the OS preference', () => {
  test('a move on the main tutorial completes well under normal-speed timing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    // Slow-speed default is ~1.3s/turn normally (LIFT_MS+durationMs+SETTLE_MS+20
    // = 120+1300+150+20 = 1590ms); reduced motion should finish in a fraction
    // of that. 600ms gives comfortable margin above the ~200ms reduced path
    // without being anywhere near the normal-speed duration.
    // Uses Stage 2 (alg "R U R' U'") rather than Stage 1: Stage 1's first move
    // is a double move ("F2"), which the main tutorial plays as two animateMove()
    // calls separated by a fixed DOUBLE_PAUSE_MS gap — a deliberate, purely-
    // temporal pacing choice that's out of scope for the animateMove()-level
    // reduced-motion fix, and would push a single "Next" past this budget.
    const start = Date.now();
    await page.click('#stage-2 [data-act="next"]');
    await page.waitForFunction(() => !window.__controllers[1].animating && window.__controllers[1].idx === 1,
      null, { timeout: 5_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(600);
  });

  test('a move on the finger trainer completes well under normal-speed timing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/finger-training.html?stage=1');
    const start = Date.now();
    await page.click('[data-act="trnext"]');
    await page.waitForFunction(() => !window.__trainer.animating && window.__trainer.idx === 1,
      null, { timeout: 5_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(600);
  });

  test('without reduced motion, the same move takes noticeably longer (sanity check)', async ({ page }) => {
    await page.goto('/index.html');
    const start = Date.now();
    await page.click('#stage-1 [data-act="next"]');
    await page.waitForFunction(() => !window.__controllers[0].animating && window.__controllers[0].idx === 1,
      null, { timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThan(1000);
  });
});
