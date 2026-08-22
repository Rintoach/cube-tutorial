// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   localStorage persistence — speed choice and completed-stage progress
   should survive a reload. Completion is driven directly via jumpTo() on
   the exposed controller (see script.js's window.__controllers) rather
   than waiting out a real animation — this suite is testing the SAVE/
   RESTORE behavior, not move-by-move animation, so there's no need to
   sit through it.
   ===================================================================== */

test.describe('Main tutorial — saved speed + progress', () => {
  test('speed choice persists across reload', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#globalSpeedOpts [data-speed="medium"]');
    await expect(page.locator('#globalSpeedOpts [data-speed="medium"]')).toHaveClass(/active/);

    await page.reload();
    await expect(page.locator('#globalSpeedOpts [data-speed="medium"]')).toHaveClass(/active/);
    const speed = await page.evaluate(() => window.__controllers[0].speed);
    expect(speed).toBe('medium');
  });

  test('completed stage persists across reload', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stepProgress')).toContainText('0');

    await page.evaluate(() => {
      const c = window.__controllers[0];
      c.jumpTo(c.moves.length); // instantly marks stage 1 complete, no animation wait
    });
    await expect(page.locator('#pill-0')).toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('1');

    await page.reload();
    await expect(page.locator('#pill-0')).toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('1');
  });
});

test.describe('Finger trainer — saved speed', () => {
  test('speed choice persists across reload (separate from main page)', async ({ page }) => {
    await page.goto('/finger-training.html?stage=1');
    await page.click('#trainerSpeedOpts [data-speed="verySlow"]');
    await expect(page.locator('#trainerSpeedOpts [data-speed="verySlow"]')).toHaveClass(/active/);

    await page.reload();
    await expect(page.locator('#trainerSpeedOpts [data-speed="verySlow"]')).toHaveClass(/active/);
    const speed = await page.evaluate(() => window.__trainer.speed);
    expect(speed).toBe('verySlow');
  });
});
