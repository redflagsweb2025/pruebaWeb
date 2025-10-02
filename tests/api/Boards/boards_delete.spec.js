const { test, expectStatus } = require('../../../api.fixture.js');
const {
  createBoard, deleteBoard, getBoard,
  deleteBoard_noAuth, deleteBoard_invalidAuth
} = require('../../../src/services/boards.service.js');

test('BRD-API-DEL-001: Eliminar tablero (éxito; luego GET → 404)', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const resD = await deleteBoard(request, board.id);
  expectStatus(resD, 200);

  const resG = await getBoard(request, board.id);
  expectStatus(resG, [400, 404]);
});

test('BRD-API-DEL-002: Eliminar sin token', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_noAuth(request, board.id);
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-DEL-003: Eliminar con token inválido', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_invalidAuth(request, board.id);
  expectStatus(res, [401, 403]);
});

test('BRD-API-DEL-004: Eliminar sin permiso (simulado)', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await deleteBoard_invalidAuth(request, board.id);
  expectStatus(res, [401, 403]);
});

test('BRD-API-DEL-005: Eliminar inexistente o doble delete', async ({ request }) => {
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
