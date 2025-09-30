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
});
