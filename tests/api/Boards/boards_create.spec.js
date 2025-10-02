// tests/api/boards_create.spec.js
const { test } = require('../../../api.fixture.js');   // ← importa SOLO desde tu fixture
const { expect } = require('@playwright/test');
const { validateSchema } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');
const {
  createBoard,
  deleteBoard,
  createBoard_noAuth,
  createBoard_invalidAuth,
} = require('../../../src/services/boards.service.js');


test('BRD-API-POST-001: Crear tablero con name válido', async ({ board }) => {
  validateSchema(schema, board);
  expect(board.id).toBeTruthy();
  expect(board.name).toContain('PRUEBA_AÑO2000');
  
});

  test('BRD-API-POST-002: Crear tablero con name + desc + defaultLabels=false', async ({ request }) => {
    const name = 'TAB_QA_' + Date.now();
    let id;
    try {
      const res = await createBoard(request, {
        name,
        desc: 'Tablero de pruebas automatizadas',
        defaultLabels: false
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      id = body.id;

      validateSchema(schema, body);
      expect(body.name).toBe(name);
    } finally {
      if (id) await deleteBoard(request, id).catch(() => {});
    }
  });

  test('BRD-API-POST-003: Crear tablero sin token → 400/401/403', async ({ request }) => {
    const res = await createBoard_noAuth(request, { name: 'NO_TOKEN_' + Date.now() });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('BRD-API-POST-004: Crear tablero con token inválido/expirado → 401/403', async ({ request }) => {
    const res = await createBoard_invalidAuth(request, { name: 'BAD_TOKEN_' + Date.now() });
    expect([401, 403]).toContain(res.status());
  });

  test('BRD-API-POST-005: Crear tablero con name inválido (vacío) → 400/401/422', async ({ request }) => {
    const res = await createBoard(request, { name: '' });
    expect([400, 401, 422]).toContain(res.status());
  });


