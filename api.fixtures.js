// fixtures/cleanup.fixture.js
const { test: base, expect } = require('@playwright/test');
const { deleteWorkspace } = require('../../src/services/workspace_page');

const test = base.extend({
  // Guarda IDs creados por el test y los borra al final
  cleaner: async ({ request }, use, testInfo) => {
    const created = new Set();

    // API para el test: registrar IDs
    const track = (id) => { if (id) created.add(id); };

    await use(track);

    // Teardown
    for (const id of created) {
      try {
        const resDel = await deleteWorkspace(request, id);
        const code = resDel.status();
        const msg = `[TEARDOWN] ${testInfo.title} → DELETE ${id} → ${code}`;
        if (code === 200 || code === 204) {
          console.log('\x1b[32m%s\x1b[0m', msg);
        } else {
          console.warn('\x1b[33m%s\x1b[0m', msg);
          try { console.warn('Body:', (await resDel.text()).slice(0, 200)); } catch {}
        }
      } catch (e) {
        console.error(`[TEARDOWN ERROR] ${testInfo.title} → ${id}`, e);
      }
    }
  },
});

module.exports = { test, expect };
