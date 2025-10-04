const { test, expect } = require('@playwright/test');
const { createWorkspace, deleteWorkspace } = require('../../../src/services/workspace_page');

let createdIds = [];

test.afterEach(async ({ request }) => {
  for (const id of createdIds.splice(0)) {
    try {
      const resDel = await deleteWorkspace(request, id);
      console.log(`DELETE ${id} → ${resDel.status()}`);
    } catch (err) {
      console.warn(`Fallo al eliminar workspace ${id}`, err);
    }
  }
});

test('POST /workspaces válido', async ({ request }) => {
  const payload = { displayName: 'WS DEMO', name: `ws-${Date.now()}` };
  const res = await createWorkspace(request, payload);
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.displayName).toBe(payload.displayName);

  // Guardar id para cleanup en afterEach
  createdIds.push(body.id);
});

test('POST /workspaces inválido', async ({ request }) => {
  const payload = { name: '' }; // inválido
  const res = await createWorkspace(request, payload);
  expect(res.status()).toBe(400);
  // no guardo id porque no se creó nada
});
