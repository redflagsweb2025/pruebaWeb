// playwright.config.js (CJS)
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

/**
 * FILTROS POR TAGS (opcional):
 * - RUN_TAGS="@smoke"              -> solo smoke
 * - RUN_TAGS="@smoke|@integration" -> smoke o integration
 * - RUN_EXCLUDE="@wip"             -> excluye wip
 */
const GREP = process.env.RUN_TAGS ? new RegExp(process.env.RUN_TAGS) : undefined;
const GREP_INVERT = process.env.RUN_EXCLUDE ? new RegExp(process.env.RUN_EXCLUDE) : undefined;

module.exports = defineConfig({
  testDir: './tests',

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: false,
    }],
  ],

  grep: GREP,
  grepInvert: GREP_INVERT,

 
  fullyParallel: true,                  
  workers: process.env.CI ? 2 : '50%',  
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 3_000 },

  use: {
    baseURL: process.env.UI_BASE || 'https://trello.com',  
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
