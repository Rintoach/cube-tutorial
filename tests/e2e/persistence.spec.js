// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   localStorage persistence — speed choice and completed-stage progress
   should survive a reload. Completion is driven by checking the "My cube
   matches this goal" confirm checkbox (see cube-engine.js's markComplete/
   unmarkComplete) rather than by the demo sequence finishing — finishing
   the demo only proves the animation reached the goal, not the learner's
   own physical cube, so it no longer marks a stage done by itself.
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

  test('finishing the demo alone does NOT mark a stage complete', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stepProgress')).toContainText('0');

    await page.evaluate(() => {
      const c = window.__controllers[0];
      c.jumpTo(c.moves.length); // demo reaches "Sequence complete" — no animation wait
    });
    const stage1 = page.locator('#stage-1');
    await expect(stage1.locator('.status-line')).toContainText('Sequence complete');
    await expect(page.locator('#pill-0')).not.toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('0');
  });

  test('checking "My cube matches this goal" marks the stage complete and persists', async ({ page }) => {
    await page.goto('/index.html');
    const confirmCheck = page.locator('#stage-1 .confirm-check');
    await confirmCheck.check();

    await expect(page.locator('#pill-0')).toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('1');

    await page.reload();
    await expect(page.locator('#pill-0')).toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('1');
    // the checkbox itself should restore checked too, not just the pill
    await expect(page.locator('#stage-1 .confirm-check')).toBeChecked();
  });

  test('unchecking the confirm box un-marks the stage', async ({ page }) => {
    await page.goto('/index.html');
    const confirmCheck = page.locator('#stage-1 .confirm-check');
    await confirmCheck.check();
    await expect(page.locator('#pill-0')).toHaveClass(/done/);

    await confirmCheck.uncheck();
    await expect(page.locator('#pill-0')).not.toHaveClass(/done/);
    await expect(page.locator('#stepProgress')).toContainText('0');
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
