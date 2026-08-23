// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Stage 5's adjacent/opposite/no-match diagnosis diagram — a beginner
   previously had to infer these three branches from text alone. Covers
   both the main tutorial and the full-screen trainer (which reuses the
   same diagramHTML from STAGES data).
   ===================================================================== */

test.describe('Stage 5 — edge-match diagnosis diagram', () => {
  test('main tutorial shows three labeled diagrams (adjacent, opposite, no match)', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-5');
    await stage.scrollIntoViewIfNeeded();
    const row = stage.locator('.edge-diagram-row');
    await expect(row).toBeVisible();
    const figures = row.locator('.edge-diagram');
    await expect(figures).toHaveCount(3);
    await expect(figures.nth(0)).toContainText(/adjacent match/i);
    await expect(figures.nth(1)).toContainText(/opposite match/i);
    await expect(figures.nth(2)).toContainText(/no match/i);
    // each diagram is a real SVG with an accessible label, not just decoration
    await expect(figures.nth(0).locator('svg')).toHaveAttribute('role', 'img');
  });

  test('other stages do not render the edge-match diagram', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stage-4 .edge-diagram-row')).toHaveCount(0);
    await expect(page.locator('#stage-6 .edge-diagram-row')).toHaveCount(0);
  });

  test('finger trainer shows the same diagram for Stage 5, hides it for other stages', async ({ page }) => {
    await page.goto('/finger-training.html?stage=5');
    await expect(page.locator('#tiDiagram .edge-diagram-row')).toBeVisible();

    await page.locator('.tr-stage-btn', { hasText: 'White Cross' }).click();
    await expect(page.locator('#tiDiagram')).toBeHidden();
  });
});
