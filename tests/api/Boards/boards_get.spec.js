const { test, expect, expectStatus } = require('../../../api.fixture.js');
const { validateSchema } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');

const {
  createBoard, getBoard, deleteBoard,
  getBoard_noAuth, getBoard_invalidAuth, getBoards_collection
} = require('../../../src/services/boards.service.js');

test('BRD-API-GET-001: Obtener tablero existente', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard(request, board.id);
  expectStatus(res, 200);
  const body = await res.json();
  validateSchema(schema, body);
  expect(body.id).toBe(board.id);
});

test('BRD-API-GET-002: Obtener sin token', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard_noAuth(request, board.id);
  expectStatus(res, [400, 401, 403]);
});

test('BRD-API-GET-003: Obtener con boardId inexistente', async ({ request }) => {
  const fakeId = '64f000000000000000000000';
  const res = await getBoard(request, fakeId);
  expectStatus(res, [400, 404]);
});

test('BRD-API-GET-004: Endpoint incorrecto (sin {id})', async ({ request }) => {
  const res = await getBoards_collection(request);
  expectStatus(res, [400, 404, 405]);
});

test('BRD-API-GET-005: Validar esquema de respuesta', async ({ request, makeBoard }) => {
  const board = await makeBoard();
  const res = await getBoard(request, board.id);
  expectStatus(res, 200);
  const body = await res.json();
  validateSchema(schema, body);
});
