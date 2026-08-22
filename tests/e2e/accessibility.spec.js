// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Accessibility markup — icon-only controls need an aria-label (their
   visible content is a single glyph, not read as a name by itself), and
   text that changes on its own (move status, progress count) needs
   aria-live so a screen-reader user hears the update without having to
   go looking for it.
   ===================================================================== */

test.describe('Main tutorial — accessibility markup', () => {
  test('icon-only transport buttons have aria-label; status text is aria-live', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-1');
    await expect(stage.locator('[data-act="reset"]')).toHaveAttribute('aria-label', /.+/);
    await expect(stage.locator('[data-act="prev"]')).toHaveAttribute('aria-label', /.+/);
    await expect(stage.locator('[data-act="next"]')).toHaveAttribute('aria-label', /.+/);
    await expect(stage.locator('.status-line')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#stepProgress')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('Finger trainer — accessibility markup', () => {
  test('icon-only transport buttons have aria-label; move/result text is aria-live', async ({ page }) => {
    await page.goto('/finger-training.html?stage=1');
    await expect(page.locator('[data-act="trprev"]')).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('[data-act="trreplay"]')).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('[data-act="trnext"]')).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('#trMoveBadge')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#trainerResult')).toHaveAttribute('aria-live', 'polite');
  });
});
