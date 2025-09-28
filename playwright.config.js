const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html']],
  use: {
    baseURL: process.env.API_BASE || 'https://api.trello.com/1',
    headless: true,
  },
  timeout: 30 * 1000,
  retries: 0,
});
