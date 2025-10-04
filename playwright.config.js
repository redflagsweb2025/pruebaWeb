<<<<<<< HEAD
const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html'],['allure-playwright']],
  use: {
    baseURL: process.env.API_BASE || 'https://api.trello.com/1',
    headless: true,
  },
  timeout: 30 * 1000,
  retries: 0,
=======
// playwright.config.js (CJS)
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './test',                 // o './test' según tu carpeta
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://trello.com',
    fullyParallel: true,        // tests dentro del archivo en paralelo
    workers: '50%',             // o 4, 6, etc.
    headless: true,
    screenshot: 'only-on-failure',

    
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    //storageState: 'auth/trello.json'  // sesión guardada (ver paso 3)
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
>>>>>>> cd4cadfd646838c0699f7932bb594c261cc6aab0
});
