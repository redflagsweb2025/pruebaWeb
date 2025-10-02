const { test, expect, expectStatus } = require('../../../api.fixture.js');
const { validateSchema } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');

const {
  updateBoard, getBoard,
  updateBoard_noAuth, updateBoard_invalidAuth
} = require('../../../src/services/boards.service.js');

test('BRD-API-PUT-001: Actualizar name y desc válidos', async ({ request, makeBoard }) => {
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

test('BRD-API-PUT-002: Actualizar sin token', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_noAuth(request, board.id, { name: 'NO_TOKEN' });
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-PUT-003: Actualizar con token inválido', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_invalidAuth(request, board.id, { name: 'BAD_TOKEN' });
  expectStatus(res, [401, 403]);
});

test('BRD-API-PUT-004: Actualizar con parámetros inválidos (name vacío)', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard(request, board.id, { name: '' });
  expectStatus(res, [400, 401, 422]);
});

test('BRD-API-PUT-005: Actualizar sin permiso (simulado)', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await updateBoard_invalidAuth(request, board.id, { name: 'NO_PERM' });
  expectStatus(res, [401, 403]);
});
