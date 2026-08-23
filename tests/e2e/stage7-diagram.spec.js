// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Stage 7's hold/D-turn-only diagram pair and numbered corner workflow —
   a beginner previously had one paragraph of prose to hold the "never
   spin the whole cube between corners" rule in their head. Covers both
   the main tutorial and the full-screen trainer (which reuses the same
   diagramHTML/workflow from STAGES data).
   ===================================================================== */

test.describe('Stage 7 — hold/turn diagram and corner workflow', () => {
  test('main tutorial shows two labeled diagrams (hold position, D-turn only)', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-7');
    await stage.scrollIntoViewIfNeeded();
    const row = stage.locator('.edge-diagram-row');
    await expect(row).toBeVisible();
    const figures = row.locator('.edge-diagram');
    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0)).toContainText(/front-right corner/i);
    await expect(figures.nth(1)).toContainText(/never rotate the whole cube/i);
    await expect(figures.nth(0).locator('svg')).toHaveAttribute('role', 'img');
  });

  test('main tutorial shows the numbered per-corner workflow', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-7');
    await stage.scrollIntoViewIfNeeded();
    const box = stage.locator('.workflow-box');
    await expect(box).toBeVisible();
    const items = box.locator('.workflow-list li');
    await expect(items).toHaveCount(5);
    await expect(items.nth(0)).toContainText(/front-right-bottom/i);
    await expect(items.nth(1)).toContainText(/never an odd number/i);
  });

  test('other stages do not render the Stage 7 diagram or workflow', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stage-5 .workflow-box')).toHaveCount(0);
    await expect(page.locator('#stage-6 .workflow-box')).toHaveCount(0);
    await expect(page.locator('#stage-6 .edge-diagram-row')).toHaveCount(0);
  });

  test('finger trainer shows the same diagram and workflow for Stage 7, hides for other stages', async ({ page }) => {
    await page.goto('/finger-training.html?stage=7');
    await expect(page.locator('#tiDiagram .edge-diagram-row')).toBeVisible();
    await expect(page.locator('#tiWorkflow .workflow-list li')).toHaveCount(5);

    await page.locator('.tr-stage-btn', { hasText: 'White Cross' }).click();
    await expect(page.locator('#tiDiagram')).toBeHidden();
    await expect(page.locator('#tiWorkflow')).toBeHidden();
  });
});
