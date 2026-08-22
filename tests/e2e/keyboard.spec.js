// @ts-check
const { test, expect } = require('@playwright/test');

/* =====================================================================
   Keyboard shortcuts — Space/←/→/R/1-2-3 on both pages. Each page also
   gets one negative test: shortcuts must NOT fire while a text field has
   focus (so a future text input on the page can't be hijacked), but MUST
   still fire with a button focused (a keyboard user who just clicked Play
   should be able to press Space/arrows next without re-focusing anything).
   ===================================================================== */

test.describe('Main tutorial — keyboard shortcuts', () => {
  test('ArrowRight steps forward, "2" sets Medium speed', async ({ page }) => {
    await page.goto('/index.html');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !window.__controllers[0].animating && window.__controllers[0].idx === 1,
      null, { timeout: 10_000 });

    await page.keyboard.press('2');
    await expect(page.locator('#globalSpeedOpts [data-speed="medium"]')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__controllers[0].speed)).toBe('medium');
  });

  test('shortcuts still work with a button focused, but not with a text input focused', async ({ page }) => {
    await page.goto('/index.html');

    // a button has focus (clicking one focuses it) — arrow key should still work
    await page.locator('#stage-1 [data-act="reset"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !window.__controllers[0].animating && window.__controllers[0].idx === 1,
      null, { timeout: 10_000 });

    // reset, then focus a temporary text input and confirm the shortcut is ignored
    await page.evaluate(() => window.__controllers[0].reset());
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'test-only-input';
      document.body.appendChild(input);
      input.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200); // nothing should happen — just confirm no change
    expect(await page.evaluate(() => window.__controllers[0].idx)).toBe(0);
    await page.evaluate(() => document.getElementById('test-only-input').remove());
  });
});

test.describe('Finger trainer — keyboard shortcuts', () => {
  test('ArrowRight steps forward, Space toggles play/pause', async ({ page }) => {
    await page.goto('/finger-training.html?stage=1');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !window.__trainer.animating && window.__trainer.idx === 1,
      null, { timeout: 10_000 });

    await page.keyboard.press(' ');
    await page.waitForFunction(() => window.__trainer.playing === true, null, { timeout: 5_000 });
    await page.keyboard.press(' ');
    expect(await page.evaluate(() => window.__trainer.playing)).toBe(false);
  });

  test('shortcut ignored while a text input is focused', async ({ page }) => {
    await page.goto('/finger-training.html?stage=1');
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'test-only-input';
      document.body.appendChild(input);
      input.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__trainer.idx)).toBe(0);
    await page.evaluate(() => document.getElementById('test-only-input').remove());
  });
});
