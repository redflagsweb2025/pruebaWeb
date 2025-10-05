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
  // Puedes conservar el reporter HTML; agregamos Allure además:
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,      // captura steps
      suiteTitle: false, // respeta tus describe() como suites
    }],
  ],
  // Filtros por tags desde ENV (se aplican a títulos con @smoke, @integration, etc.)
  grep: GREP,
  grepInvert: GREP_INVERT,

  use: {
    baseURL: process.env.BASE_URL || 'https://trello.com',
    fullyParallel: true,
    workers: '50%',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Recomendado en CI
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000, // 60s por test; ajusta a tu API
  expect: { timeout: 5_000 },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
