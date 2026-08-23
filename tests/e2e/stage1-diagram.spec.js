// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Stage 1's daisy-in-progress vs. complete-daisy diagram — the daisy
   method's biggest beginner stumbling block isn't the freeing move, it's
   not knowing what a finished daisy actually looks like. Reuses the same
   edgeMatchDiagram tab layout as Stage 5, just re-captioned for "petal
   placed" instead of "edge matches its center." Covers both the main
   tutorial and the full-screen trainer.
   ===================================================================== */

test.describe('Stage 1 — daisy-method diagram', () => {
  test('main tutorial shows two labeled diagrams (in progress, complete)', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-1');
    await stage.scrollIntoViewIfNeeded();
    const row = stage.locator('.edge-diagram-row');
    await expect(row).toBeVisible();
    const figures = row.locator('.edge-diagram');
    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0)).toContainText(/daisy in progress/i);
    await expect(figures.nth(1)).toContainText(/complete daisy/i);
    await expect(figures.nth(0).locator('svg')).toHaveAttribute('role', 'img');
  });

  test('other stages do not render the Stage 1 daisy diagram', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stage-2 .edge-diagram-row')).toHaveCount(0);
  });

  test('finger trainer shows the same diagram for Stage 1, hides it for other stages', async ({ page }) => {
    await page.goto('/finger-training.html?stage=1');
    await expect(page.locator('#tiDiagram .edge-diagram-row')).toBeVisible();

    await page.locator('.tr-stage-btn', { hasText: 'White Corners' }).click();
    await expect(page.locator('#tiDiagram')).toBeHidden();
  });
});
