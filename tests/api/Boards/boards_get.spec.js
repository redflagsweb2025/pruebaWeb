const { test, expect, expectStatus, expectLatencyUnder  } = require('../../../api.fixture.js');
const { validateSchema , expectHeaderContains  } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');

const {
  createBoard, getBoard, deleteBoard,
  getBoard_noAuth, getBoard_invalidAuth, getBoards_collection
} = require('../../../src/services/boards.service.js');

test('BRD-API-GET-001: Obtener un tablero existente', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard(request, board.id);
  expectStatus(res, 200);
  const body = await res.json();
  validateSchema(schema, body);
  expect(body.id).toBe(board.id);
});

test('BRD-API-GET-002: Obtener un tablero sin token', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard_noAuth(request, board.id);
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-GET-003: Obtener un tablero de un  boardId inexistente', async ({ request }) => {
  const fakeId = '64f000000000000000000000';
  const res = await getBoard(request, fakeId);
  expectStatus(res, [400, 404]);
});

test('BRD-API-GET-004: Verificar que no muestre nada al equivocarse en un Endpoint incorrecto (sin {id})', async ({ request }) => {
  const res = await getBoards_collection(request);
  expectStatus(res, [400, 404, 405]);
});

test('BRD-API-GET-005: Verificar que arroje esquema de respuesta', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard(request, board.id);
  expectStatus(res, 200);
  const body = await res.json();
  validateSchema(schema, body);
});


  test('BRD-API-GET-006: Verificar que al ver un tablero tenga el Header Content-Type JSON', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await getBoard(request, b.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', 'application/json');
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-GET-007: Verificar que la visualización sea su Latencia < 2s', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await getBoard(request, b.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-GET-008: Verificar que un tablero no tenga Coincidencia exacta de id y name', async ({ request, makeBoard }) => {
    const b = await makeBoard({ name: 'GET_MATCH_' + Date.now() });
    const res = await getBoard(request, b.id);
    expectStatus(res, 200);
    const body = await res.json();
    validateSchema(schema, body);
    expect(body.id).toBe(b.id);
    expect(body.name).toBe(b.name);
  });

  test('BRD-API-GET-009: Verificar que al Obtener un tablero tras actualizar  se visualice los cambios', async ({ request, makeBoard }) => {
    const { updateBoard } = require('../../../src/services/boards.service.js');
    const b = await makeBoard({ name: 'GET_UPD_' + Date.now() });
    const newName = 'GET_UPD_NEW_' + Date.now();
    const resU = await updateBoard(request, b.id, { name: newName });
    expectStatus(resU, 200);
    const res = await getBoard(request, b.id);
    const body = await res.json();
    expect(body.name).toBe(newName);
  });

  test('BRD-API-GET-011: Verificar que al obtener un tablero se tenga los Campos mínimos presentes en schema', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await getBoard(request, b.id);
    const body = await res.json();
    validateSchema(schema, body);
  });


  test('BRD-API-GET-012: Verificar que se obtenga un tablero con un name con unicode se recupera intacto', async ({ request }) => {
    const name = 'Ñandú ' + Date.now();
    const resC = await createBoard(request, { name });
    expectStatus(resC, 200);
    const b = await resC.json();
    try {
      const res = await getBoard(request, b.id);
      const body = await res.json();
      expect(body.name).toBe(name);
    } finally {
      const { deleteBoard } = require('../../../src/services/boards.service.js');
      await deleteBoard(request, b.id).catch(()=>{});
    }
  });

  test('BRD-API-GET-013: GET Verificar que se meustre un tablero al hacer dos veces clic en get repetido ', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res1 = await getBoard(request, b.id);
    const res2 = await getBoard(request, b.id);
    expectStatus(res1, 200);
    expectStatus(res2, 200);
  });

  test('BRD-API-GET-014: Verificar que no se muestre un tablero  tras DELETE debe fallar', async ({ request, makeBoard }) => {
    const { deleteBoard } = require('../../../src/services/boards.service.js');
    const b = await makeBoard();
    expectStatus(await deleteBoard(request, b.id), 200);
    const res = await getBoard(request, b.id);
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-GET-015: Verificar que no se visualice al ingresar un GET con id muy largo o inexistente', async ({ request }) => {
    const res = await getBoard(request, 'x'.repeat(60));
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-GET-016: Verificar qe al visualizar con id con espacios nos de status code de  400/404', async ({ request }) => {
    const res = await getBoard(request, '  bad id  ');
    expectStatus(res, [400, 404]);
  });


  test('BRD-API-GET-017: Validar tiempo estable en varias lecturas (<2s)', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      const res = await getBoard(request, b.id);
      const t1 = Date.now();
      expectStatus(res, 200);
      expectLatencyUnder(t1 - t0, 2000);
    }
  });

