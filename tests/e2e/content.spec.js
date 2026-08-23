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

/* =====================================================================
   Stage completion checklists — a "Before continuing, check:" panel after
   every stage's tip/cases, so a learner has a concrete gate to check their
   real cube against before moving on, instead of just trusting the demo.
   ===================================================================== */
test.describe('Stage completion checklists', () => {
  test('every stage on the main tutorial renders a checklist panel with at least one item', async ({ page }) => {
    await page.goto('/index.html');
    for(let i=1;i<=7;i++){
      const box = page.locator(`#stage-${i} .checklist-box`);
      await expect(box).toHaveCount(1);
      await expect(box.locator('.checklist-head')).toContainText(/before continuing/i);
      await expect(box.locator('.checklist-list li').first()).toBeVisible();
    }
  });
});

/* =====================================================================
   Trainer decision-branch help — the full-screen trainer used to show only
   Goal/Hold/moves, hiding the same "cases" guidance the main tutorial has
   for the exact same stages. It should now appear (and only when that
   stage actually has cases to show).
   ===================================================================== */
test.describe('Finger trainer — reuses the main tutorial\'s cases panels', () => {
  test('Stage 3 (has two cases) shows a populated, initially-collapsed cases panel', async ({ page }) => {
    await page.goto('/finger-training.html?stage=3');
    const casesBox = page.locator('#tiCasesBox');
    await expect(casesBox).toBeVisible();
    await expect(casesBox).toHaveJSProperty('open', false);
    await casesBox.locator('summary').click();
    await expect(casesBox.locator('.case-title').first()).toContainText(/needs to go left instead of right/i);
  });

  test('Stage 2 (has no cases) hides the cases panel entirely', async ({ page }) => {
    await page.goto('/finger-training.html?stage=2');
    await expect(page.locator('#tiCasesBox')).toBeHidden();
  });
});

/* =====================================================================
   "Impossible cube?" help card — explains the three malformed states a
   normal (turns-only) solve can never produce or reach, so a beginner
   stuck on one of these knows to stop repeating formulas and look at the
   physical cube instead.
   ===================================================================== */
test.describe('Impossible-cube help card', () => {
  test('main tutorial explains the three unreachable-by-turning states', async ({ page }) => {
    await page.goto('/index.html');
    const section = page.locator('#impossiblecube');
    await expect(section).toContainText(/one flipped edge/i);
    await expect(section).toContainText(/one twisted corner/i);
    await expect(section).toContainText(/one swapped pair/i);
  });

  test('gives a concrete, non-vague recovery instruction (not just "keep trying")', async ({ page }) => {
    await page.goto('/index.html');
    const section = page.locator('#impossiblecube');
    await expect(section).toContainText(/how to recover/i);
    // must name an actual physical fix, not just tell the learner to keep going
    await expect(section).toContainText(/(pry|pop|push it (back|straight) in)/i);
    await expect(section).toContainText(/restart this tutorial/i);
  });
});
