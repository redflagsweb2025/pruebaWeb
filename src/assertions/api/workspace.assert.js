// src/assertions/api/workspace.assert.js
const { expect } = require('@playwright/test');

function expectStatusOK(res) {
  const code = res.status();
  expect(code, `HTTP status esperado 2xx, recibido: ${code} → body: ${safeBody(res)}`).toBeGreaterThanOrEqual(200);
  expect(code).toBeLessThan(300);
}

async function safeBody(res) {
  try { return JSON.stringify(await res.json()); }
  catch { return '<no-json>'; }
}

module.exports = { expectStatusOK };


