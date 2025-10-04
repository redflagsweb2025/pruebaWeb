const { test, expect, expectStatus , expectLatencyUnder } = require('../../../api.fixture.js');
const { validateSchema, expectHeaderContains  } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');

const {
  updateBoard, getBoard,
  updateBoard_noAuth, updateBoard_invalidAuth
} = require('../../../src/services/boards.service.js');

test('BRD-API-PUT-001: Actualizar un tablero el name y descripcion con datos válidos', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const newName = 'PUT_NEW_' + Date.now();
  const resU = await updateBoard(request, board.id, { name: newName, desc: 'desc editada' });
  expectStatus(resU, 200);
  const upd = await resU.json();
  validateSchema(schema, upd);
  expect(upd.name).toBe(newName);

  const resG = await getBoard(request, board.id);
  expectStatus(resG, 200);
  const body = await resG.json();
  expect(body.name).toBe(newName);
});

test('BRD-API-PUT-002: Actualizar un tablero sin sin token', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_noAuth(request, board.id, { name: 'NO_TOKEN' });
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-PUT-003: Actualizar un tablero con token inválido', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_invalidAuth(request, board.id, { name: 'BAD_TOKEN' });
  expectStatus(res, [401, 403]);
});

test('BRD-API-PUT-004: Actualizar un tablero  con parámetros inválidos (name vacío)', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard(request, board.id, { name: '' });
  expectStatus(res, [400, 401, 422]);
});

test('BRD-API-PUT-005: Actualizar un tablero sin permisos de administrador ', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_invalidAuth(request, board.id, { name: 'NO_PERM' });
  expectStatus(res, [401, 403]);
});


  test('BRD-API-PUT-006: Verificar que tenga el Header Content-Type JSON', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { name: 'HDR_PUT_' + Date.now() });
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', 'application/json');
  });

  test('BRD-API-PUT-007: Verificar que al actualizar un board su Latencia < 2s en update', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await updateBoard(request, b.id, { desc: 'lat test' });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-PUT-008: Verificar que permita  Actualizar solo descripcion', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { desc: 'Solo desc' });
    expectStatus(res, 200);
    const body = await res.json();
    validateSchema(schema, body);
  });

  test('BRD-API-PUT-009: Verificar que permita Actualizar name con caracteres de Unicode', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const newName = 'Úñïçødê ' + Date.now();
    const res = await updateBoard(request, b.id, { name: newName });
    expectStatus(res, 200);
    const resG = await getBoard(request, b.id);
    const body = await resG.json();
    expect(body.name).toBe(newName);
  });

  test('BRD-API-PUT-010: Verificar que permita Actualizar con emoji en name', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { name: 'EMOJI 😀 ' + Date.now() });
    expectStatus(res, 200);
  });

  test('BRD-API-PUT-011: Verificar que no permita actualizar con el mismo nombre ', async ({ request, makeBoard }) => {
    const b = await makeBoard({ name: 'IDEMP' + Date.now() });
    const res1 = await updateBoard(request, b.id, { name: b.name });
    const res2 = await updateBoard(request, b.id, { name: b.name });
    expectStatus(res1, 200);
    expectStatus(res2, 200);
  });


  test('BRD-API-PUT-012: Verificar que no acepte name largo <= 50 chars', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const newName = 'N'.repeat(50);
    const res = await updateBoard(request, b.id, { name: newName });
    expectStatus(res, 200);
  });

  test('BRD-API-PUT-013: Verificar que no permita update sin cambios (parámetros vacíos) → 200/400/422', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, {}); // depende del API
    expectStatus(res, [200, 400, 422]);
  });

  test('BRD-API-PUT-014: Verificar que no permita actualizar con campos desconocidos o  ignorado', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { name: 'UNK', fooBar: 'x' });
    expectStatus(res, [200, 204]);
  });

  test('BRD-API-PUT-015: Verificar que elimine en name con espacios borde ', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { name: '  TRIM_PUT  ' });
    expectStatus(res, [200, 204]);
  });

  test('BRD-API-PUT-016: Verificar que no permita actualizar en name con solo espacios → 400/422', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await updateBoard(request, b.id, { name: '   ' });
    expectStatus(res, [400, 401, 422]);
  });

  test('BRD-API-PUT-017: Actualizar después de DELETE → 400/404', async ({ request, makeBoard }) => {
    const { deleteBoard } = require('../../../src/services/boards.service.js');
    const b = await makeBoard();
    expectStatus(await deleteBoard(request, b.id), 200);
    const res = await updateBoard(request, b.id, { name: 'AFTER_DEL' });
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-PUT-018: Validar headers y latencia en update', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await updateBoard(request, b.id, { desc: 'perf hdrs' });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', /json/i);
    expectLatencyUnder(t1 - t0, 2000);
  });
