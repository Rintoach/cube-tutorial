// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Tier 1 content batch — Stage 5 and Stage 6 each gained a "cases" panel
   covering their previously-unhandled decision branch (no adjacent match /
   no correct corners). These assertions anchor on stable short phrases
   (matching the panel's own heading) rather than the full copy, so future
   wording polish on this text doesn't break the suite.
   ===================================================================== */

test.describe('Tier 1 content — decision-branch panels', () => {
  test('Stage 5 (Match Top Edges) has a cases panel for the no-adjacent-match branch', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-5');
    const casesBox = stage.locator('.cases-box');
    await expect(casesBox).toHaveCount(1);
    await casesBox.locator('summary').click();
    await expect(casesBox.locator('.case-title')).toContainText(/no adjacent matching pair/i);
  });

  test('Stage 6 (Position Top Corners) has a cases panel for the no-correct-corners branch', async ({ page }) => {
    await page.goto('/index.html');
    const stage = page.locator('#stage-6');
    const casesBox = stage.locator('.cases-box');
    await expect(casesBox).toHaveCount(1);
    await casesBox.locator('summary').click();
    await expect(casesBox.locator('.case-title')).toContainText(/no correct corners/i);
  });
});
