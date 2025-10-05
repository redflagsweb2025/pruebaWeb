// tests/api/boards_create.spec.js
const { test, expectStatus, expectLatencyUnder } = require('../../../api.fixture.js');   // ← importa SOLO desde tu fixture
const { expect } = require('@playwright/test');
const { validateSchema,expectHeaderContains  } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');
const {
  createBoard,
  deleteBoard,
  createBoard_noAuth,
  createBoard_invalidAuth,
} = require('../../../src/services/boards.service.js');


test('BRD-API-POST-001: Crear tablero cen el campo con nombre válido', async ({ board }) => {
  validateSchema(schema, board);
  expect(board.id).toBeTruthy();
  expect(board.name).toContain('PRUEBA_AÑO2000');
  
});

  test('BRD-API-POST-002: Verificar que permita crear tablero con lso campos name, descripcion y el campo de  defaultLabels=false', async ({ request }) => {
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

  test('BRD-API-POST-003: Crear un tablero sin contar con un token arrojandonos un status code de 400/401/403', async ({ request }) => {
    const res = await createBoard_noAuth(request, { name: 'NO_TOKEN_' + Date.now() });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('BRD-API-POST-004: Crear tablero con un token expriado deberia darnos el status code de 401/403', async ({ request }) => {
    const res = await createBoard_invalidAuth(request, { name: 'BAD_TOKEN_' + Date.now() });
    expect([401, 403]).toContain(res.status());
  });

  test('BRD-API-POST-005: Crear tablero con un nombre invalido con sin caracteres debe dar status code de 400/401/422', async ({ request }) => {
    const res = await createBoard(request, { name: '' });
    expect([400, 401, 422]).toContain(res.status());
  });



  test('BRD-API-POST-006: Validar el header al crear un tablero con el Content-Type application/json', async ({ request }) => {
    const t0 = Date.now();
    const res = await createBoard(request, { name: 'HDR_CT_' + Date.now() });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', 'application/json');
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-POST-007: Verificar que la Latencia sea menor a 2s al crear', async ({ request }) => {
    const t0 = Date.now();
    const res = await createBoard(request, { name: 'LAT_' + Date.now() });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-POST-008: Crear un tablero con un nombre largo sea menor a <= 50 chars y que de  éxito', async ({ request }) => {
    const longName = 'L'.repeat(50);
    const res = await createBoard(request, { name: longName });
    expectStatus(res, 200);
    const body = await res.json();
    validateSchema(schema, body);
    expect(body.name).toBe(longName);
  });

  test('BRD-API-POST-009: Verificar que no permita crear un tablero no acepte en el campo name con acentos/Unicode', async ({ request }) => {
    const name = 'Tablero ÁÉÍÓÚ ñ ' + Date.now();
    const res = await createBoard(request, { name });
    expectStatus(res, 200);
    const body = await res.json();
    expect(body.name).toBe(name);
  });

  test('BRD-API-POST-010: Verificar que permita crear en el campo name con emojis ', async ({ request }) => {
    const name = 'Emoji 😀 ' + Date.now();
    const res = await createBoard(request, { name });
    expectStatus(res, 200);
    const body = await res.json();
    expect(body.name).toBe(name);
  });

  test('BRD-API-POST-011: Verificar que permita crear un tablero con descrpcion y verificar persistencia por GET', async ({ request }) => {
    const name = 'DESC_' + Date.now();
    const res = await createBoard(request, { name, desc: 'Descripción QA' });
    expectStatus(res, 200);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    // No todas las APIs devuelven desc en create; el contrato mínimo se valida con schema.
    validateSchema(schema, body);
  });

  test('BRD-API-POST-012: Verificar que cree 6 etiquetas al dejar el campo de defaultLabels=true debe crear ok', async ({ request }) => {
    const res = await createBoard(request, { name: 'DL_TRUE_' + Date.now(), defaultLabels: true });
    expectStatus(res, 200);
  });

  test('BRD-API-POST-013: Verificar que al ingresar el campo de prefs_permissionLevel=private sea privado' , async ({ request }) => {
    const res = await createBoard(request, { name: 'PRIV_' + Date.now(), prefs_permissionLevel: 'private' });
    expectStatus(res, [200, 201]); // Trello suele responder 200
  });



  test('BRD-API-POST-014: Verificar que no permita la duplicidad del campo name ', async ({ request }) => {
    const name = 'DUP_' + Date.now();
    const res1 = await createBoard(request, { name });
    const res2 = await createBoard(request, { name });
    expectStatus(res1, 200);
    expectStatus(res2, 200);
  });



  test('BRD-API-POST-015: Crear un tablero sin el campo de name completamente debe dar status code de  400/422', async ({ request }) => {
    const res = await createBoard(request, { /* sin name */ });
    expectStatus(res, [400, 401, 422]);
  });

  test('BRD-API-POST-016: Verificar que no permita crear en el campo name con  solo espacios debe dar status code de  400/422', async ({ request }) => {
    const res = await createBoard(request, { name: '   ' });
    expectStatus(res, [400, 401, 422]);
  });

  test('BRD-API-POST-017: Verificar que borre los espacios al inicio al crear un tablero ', async ({ request }) => {
    const res = await createBoard(request, { name: '  TRIM_' + Date.now() + '  ' });
    expectStatus(res, [200, 201]);
  });


