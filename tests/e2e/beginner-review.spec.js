// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Beginner-focused review pass: page order (troubleshooting after the
   lessons, collapsed by default), a persistent per-stage orientation
   badge (only Stage 7 flips it, with a warning), and Stage 1's "this
   isn't one fixed formula" goal-flow + alg note. See cube-engine.js's
   STAGES[0] (goalFlow/algNote) and render() (.orient-badge) for the data.
   ===================================================================== */

test.describe('Page order — troubleshooting after the lessons', () => {
  test('"Help if you\'re stuck" sits after #stages and starts collapsed', async ({ page }) => {
    await page.goto('/index.html');
    const help = page.locator('#impossiblecube');
    await expect(help).toHaveJSProperty('open', false);

    // DOM order: #stages must come before #impossiblecube.
    const order = await page.evaluate(() => {
      const stages = document.getElementById('stages');
      const help = document.getElementById('impossiblecube');
      const pos = stages.compareDocumentPosition(help);
      return !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);

    // Content is still there for search/tests even while collapsed.
    await expect(help).toContainText(/one flipped edge/i);
  });

  test('expanding the summary reveals the recovery guidance', async ({ page }) => {
    await page.goto('/index.html');
    const help = page.locator('#impossiblecube');
    await help.locator('summary').click();
    await expect(help).toHaveJSProperty('open', true);
    await expect(help).toContainText(/how to recover/i);
  });
});

test.describe('Persistent orientation badge', () => {
  test('normal stages show the default hold, Stage 7 shows the flip warning', async ({ page }) => {
    await page.goto('/index.html');

    const stage1Badge = page.locator('#stage-1 .orient-badge');
    await expect(stage1Badge).toContainText(/white centre: bottom/i);
    await expect(stage1Badge).toContainText(/yellow centre: top/i);
    await expect(stage1Badge).not.toHaveClass(/flip/);

    const stage7Badge = page.locator('#stage-7 .orient-badge');
    await expect(stage7Badge).toHaveClass(/flip/);
    await expect(stage7Badge).toContainText(/now flip the whole cube/i);
    await expect(stage7Badge).toContainText(/white centre: top/i);
    await expect(stage7Badge).toContainText(/yellow centre: bottom/i);
  });

  test('every stage shows an orientation badge', async ({ page }) => {
    await page.goto('/index.html');
    for (let i = 1; i <= 7; i++) {
      await expect(page.locator(`#stage-${i} .orient-badge`)).toBeVisible();
    }
  });
});

test.describe('Stage 1 — guided goal, not a fixed formula', () => {
  test('shows the daisy goal-flow strip above the console', async ({ page }) => {
    await page.goto('/index.html');
    const flow = page.locator('#stage-1 .goal-flow');
    await expect(flow).toBeVisible();
    const steps = flow.locator('.goal-flow-step');
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toContainText(/build the daisy/i);
    await expect(steps.nth(3)).toContainText(/check the white cross/i);
  });

  test('the alg pill has a clarifying note; other stages do not show one', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#stage-1 .alg-note')).toContainText(/not a fixed formula/i);
    await expect(page.locator('#stage-2 .goal-flow')).toHaveCount(0);
    await expect(page.locator('#stage-2 .alg-note')).toHaveCount(0);
  });
});
