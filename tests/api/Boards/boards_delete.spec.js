const { test, expectStatus, expectLatencyUnder  } = require('../../../api.fixture.js');
const { expectHeaderContains } = require('../../../src/assertions/api/assertions.js');
const {
  createBoard, deleteBoard, getBoard,
  deleteBoard_noAuth, deleteBoard_invalidAuth
} = require('../../../src/services/boards.service.js');

test('BRD-API-DEL-001: Eliminar tablero ', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const resD = await deleteBoard(request, board.id);
  expectStatus(resD, 200);

  const resG = await getBoard(request, board.id);
  expectStatus(resG, [400, 404]);
});

test('BRD-API-DEL-002: Verificar que no permita Eliminar un tablero pero sin token arrojandonos un status code de 400', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_noAuth(request, board.id);
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-DEL-003: Verificar que no permita Eliminar un tablero pero con un  token inválido', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_invalidAuth(request, board.id);
  expectStatus(res, [401, 403]);
});

test('BRD-API-DEL-004: Verificar que no permita Eliminar sin permiso ', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_invalidAuth(request, board.id);
  expectStatus(res, [401, 403]);
});

test('BRD-API-DEL-005: Verificar que no permita Eliminar un tablero inexistente o doble delete', async ({ request }) => {
  const fakeId = '64f000000000000000000000';
  const resFake = await deleteBoard(request, fakeId);
  expectStatus(resFake, [400, 404]);

  const resC = await createBoard(request, { name: 'DEL_DOUBLE_' + Date.now() });
  const board = await resC.json();

  const res1 = await deleteBoard(request, board.id);
  expectStatus(res1, 200);

  const res2 = await deleteBoard(request, board.id);
  expectStatus(res2, [400, 404]);
});

  test('BRD-API-DEL-006:verificar que tenga  Header Content-Type JSON', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await deleteBoard(request, b.id);
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', /json|text/i); 
  });

  test('BRD-API-DEL-007: Verificar que se elimine un tablero con una Latencia < 2s', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await deleteBoard(request, b.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 2000);
  });

  test('BRD-API-DEL-008: verificar que al hacer DELETE y luego GET de un tablero debe darnos un error de  404/400', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    expectStatus(await deleteBoard(request, b.id), 200);
    const res = await getBoard(request, b.id);
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-DEL-009: Al eliminar un tablero y hacer clic en DELETE dos veces debe darnos un error de status code de 400/404', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    expectStatus(await deleteBoard(request, b.id), 200);
    const res2 = await deleteBoard(request, b.id);
    expectStatus(res2, [400, 404]);
  });

  test('BRD-API-DEL-010: Verificar que al hacer DELETE con id muy largo debe dar un error de  400/404', async ({ request }) => {
    const res = await deleteBoard(request, 'x'.repeat(60));
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-DEL-011: Verificar que no permita eliminar al hacer clic en DELETE con id con espacios arroja status code de 400/404', async ({ request }) => {
    const res = await deleteBoard(request, '  bad id  ');
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-DEL-012: Verificar que al hacer en DELETE se pueda recrear con el con mismo name → 200', async ({ request }) => {
    const name = 'DEL_RECREATE_' + Date.now();
    const resC = await createBoard(request, { name });
    const b = await resC.json();
    expectStatus(await deleteBoard(request, b.id), 200);
    const resC2 = await createBoard(request, { name });
    expectStatus(resC2, 200);
  });

  test('BRD-API-DEL-013: Validar que no deje recursos huérfanos sobre el tablero inexistente', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    expectStatus(await deleteBoard(request, b.id), 200);
    const resCheck = await getBoard(request, b.id);
    expectStatus(resCheck, [400, 404]);
  });


  test('BRD-API-DEL-014: Verificar que al hacer clic en DELETE este con latencia estable', async ({ request, makeBoard }) => {
    for (let i = 0; i < 3; i++) {
      const b = await makeBoard();
      const t0 = Date.now();
      const res = await deleteBoard(request, b.id);
      const t1 = Date.now();
      expectStatus(res, 200);
      expectLatencyUnder(t1 - t0, 2000);
    }
  });

  test('BRD-API-DEL-015: Verificar que al hacer clic en DELETE nos arroje el status y body ', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const res = await deleteBoard(request, b.id);
    expectStatus(res, 200);
  });

  test('BRD-API-DEL-016:Verificar que al hacer clicn de DELETE de board ya inexistente nos arroje los status code de 400/404', async ({ request }) => {
    const fakeId = '64f000000000000000000000';
    const res = await deleteBoard(request, fakeId);
    expectStatus(res, [400, 404]);
  });

  test('BRD-API-DEL-020:Verificar que al hacer clic DELETE performance con headers se elimine', async ({ request, makeBoard }) => {
    const b = await makeBoard();
    const t0 = Date.now();
    const res = await deleteBoard(request, b.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', /json|text/i);
    expectLatencyUnder(t1 - t0, 2000);
  });

