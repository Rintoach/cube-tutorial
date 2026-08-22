// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/* =====================================================================
   Playwright config for the site's E2E suite (tests/e2e/*.spec.js).
   These tests exercise the site as a real browser would — clicking the
   transport buttons, waiting for CSS-driven cube animations, following
   deep links — as opposed to tests/engine.test.js, which checks the pure
   cube-logic layer with no browser/DOM involved at all. Run both with
   `npm test`, or the E2E half alone with `npm run test:e2e`.

   No production framework is being introduced here: the site itself is
   still plain static HTML/CSS/JS. `webServer` below just serves that
   static folder over http:// (via tests/e2e/serve.js, a ~20-line script
   with no dependencies) so relative paths, `?stage=N` query parsing, and
   fetch-like behavior all match how GitHub Pages actually serves it —
   closer to production than opening the files directly as file:// URLs.
   ===================================================================== */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Normally unset — Playwright launches the browser it downloaded via
        // `npx playwright install`. Some CI/sandboxed environments instead
        // pre-install a Chromium at a fixed path and can't reach the network
        // to fetch Playwright's own copy; setting this env var there points
        // the browser launch at that pre-installed binary instead.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'node tests/e2e/serve.js',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
