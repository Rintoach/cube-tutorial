// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Print/quick-reference page — a compact one-page cheat sheet (notation,
   standard hold, all seven formulas, golden rules) meant to be printed or
   glanced at while physically holding the cube. Content is pulled live
   from cube-engine.js's STAGES/FACE_INFO data, so these checks mostly
   confirm the mounting script actually wires that data in, plus that the
   print stylesheet hides screen-only chrome.
   ===================================================================== */

test.describe('Quick reference / print page', () => {
  test('shows all 7 stage formulas and titles pulled from STAGES', async ({ page }) => {
    await page.goto('/cheatsheet.html');
    const rows = page.locator('#csStageBody tr');
    await expect(rows).toHaveCount(7);
    await expect(rows.nth(0)).toContainText('White Cross');
    await expect(rows.nth(0)).toContainText('F2');
    await expect(rows.nth(6)).toContainText('Orient Top Corners & Finish');
    await expect(rows.nth(6)).toContainText("R' D' R D");
  });

  test('shows the 6-face notation glossary', async ({ page }) => {
    await page.goto('/cheatsheet.html');
    const items = page.locator('#csNotationGrid .cs-notation-item');
    await expect(items).toHaveCount(6);
    await expect(page.locator('#csNotationGrid')).toContainText('F');
    await expect(page.locator('#csNotationGrid')).toContainText('R');
  });

  test('states the golden rules, including the impossible-cube pointer', async ({ page }) => {
    await page.goto('/cheatsheet.html');
    const rules = page.locator('.cs-rules-list');
    await expect(rules).toContainText(/only the bottom \(d\) layer/i);
    await expect(rules).toContainText(/impossible cube/i);
  });

  test('nav and print button are hidden in print media, content remains', async ({ page }) => {
    await page.goto('/cheatsheet.html');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('nav.stepnav')).toBeHidden();
    await expect(page.locator('.cs-section').first()).toBeVisible();
  });

  test('print button calls window.print()', async ({ page }) => {
    await page.goto('/cheatsheet.html');
    let printCalled = false;
    await page.exposeFunction('__printCalled', () => { printCalled = true; });
    await page.evaluate(() => { window.print = () => window.__printCalled(); });
    await page.locator('#printBtn').click();
    expect(printCalled).toBe(true);
  });

  test('main tutorial links to the print reference page', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('a[href="cheatsheet.html"]')).toBeVisible();
  });
});
