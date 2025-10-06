const { test, expect, expectStatus, expectLatencyUnder } = require('../../../fixtures/api.fixture.js');
const { validateSchema, expectHeaderContains } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/lists/list.schema.json');
const { createBoard } = require('../../../src/services/boards.service.js');
const {
  createList, createList_noAuth, createList_invalidAuth
} = require('../../../src/services/lists.service.js');

test.describe('@api Lists - POST /lists', () => {

  test('LST-POST-001 @smoke @positive: Crear lista válida', async ({ request, cleanup }) => {
    const resB = await createBoard(request, { name: 'BOARD_' + Date.now() });
    expectStatus(resB, 200);
    const board = await resB.json();
    cleanup.trackBoard(board.id);

    const t0 = Date.now();
    const res = await createList(request, { name: 'LIST_' + Date.now(), idBoard: board.id });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectHeaderContains(res, 'content-type', /json/i);
    expectLatencyUnder(t1 - t0, 2000);

    const body = await res.json();
    validateSchema(schema, body);
    expect(body.idBoard).toBe(board.id);

    cleanup.trackList(body.id);
  });

  test('LST-POST-002 @positive: Crear con pos=top', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const res = await createList(request, { name: 'LIST_TOP_' + Date.now(), idBoard: board.id, pos: 'top' });
    expectStatus(res, 200);
    const body = await res.json();
    cleanup.trackList(body.id);
  });

  test('LST-POST-003 @positive: Crear con pos=bottom', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const res = await createList(request, { name: 'LIST_BOTTOM_' + Date.now(), idBoard: board.id, pos: 'bottom' });
    expectStatus(res, 200);
    const body = await res.json();
    cleanup.trackList(body.id);
  });

  test('LST-POST-004 @boundary: name 50 chars', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const longName = 'A'.repeat(50);
    const res = await createList(request, { name: longName, idBoard: board.id });
    expectStatus(res, 200);
    const body = await res.json();
    expect(body.name).toBe(longName);
    cleanup.trackList(body.id);
  });

  test('LST-POST-005 @i18n: name con acentos y emoji', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const name = 'Listá Éxito 🚀';
    const res = await createList(request, { name, idBoard: board.id });
    expectStatus(res, 200);
    const body = await res.json();
    expect(body.name).toBe(name);
    cleanup.trackList(body.id);
  });

  test('LST-POST-006 @idempotent: mismo name en board', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const name = 'DUPLICADA';
    const r1 = await createList(request, { name, idBoard: board.id });
    const r2 = await createList(request, { name, idBoard: board.id });
    expectStatus(r1, 200);
    expectStatus(r2, 200);
    const b1 = await r1.json(); const b2 = await r2.json();
    cleanup.trackList(b1.id); cleanup.trackList(b2.id);
  });

  test('LST-POST-007 @negative @validation: name vacío', async ({ request, makeBoard }) => {
    const board = await makeBoard();
    const res = await createList(request, { name: '', idBoard: board.id });
    expectStatus(res, [400, 422]);
  });

  test('LST-POST-008 @negative @validation: sin name', async ({ request, makeBoard }) => {
    const board = await makeBoard();
    const res = await createList(request, { idBoard: board.id });
    expectStatus(res, [400, 422]);
  });

  test('LST-POST-009 @negative @validation: sin idBoard', async ({ request }) => {
    const res = await createList(request, { name: 'SIN_BOARD' });
    expectStatus(res, [400, 422]);
  });

  test('LST-POST-010 @negative @validation: idBoard inexistente', async ({ request }) => {
    const res = await createList(request, { name: 'BAD_BOARD', idBoard: '64f000000000000000000000' });
    expectStatus(res, [400, 404,401]);
  });

  test('LST-POST-011 @negative @security: sin token', async ({ request, makeBoard }) => {
    const board = await makeBoard();
    const res = await createList_noAuth(request, { name: 'NO_TOKEN', idBoard: board.id });
    expectStatus(res, [400, 401, 403]);
  });

  test('LST-POST-012 @negative @security: token inválido', async ({ request, makeBoard }) => {
    const board = await makeBoard();
    const res = await createList_invalidAuth(request, { name: 'BAD_TOKEN', idBoard: board.id });
    expectStatus(res, [401, 403]);
  });

  test('LST-POST-013 @positive: parámetro desconocido', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const res = await createList(request, { name: 'LIST_' + Date.now(), idBoard: board.id, foo: 'bar' });
    expectStatus(res, 200);
    const body = await res.json();
    cleanup.trackList(body.id);
  });

  test('LST-POST-014 @boundary: name con espacios al borde', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const res = await createList(request, { name: '  LISTA_TRIM  ', idBoard: board.id });
    expectStatus(res, 200);
    const body = await res.json();
    cleanup.trackList(body.id);
  });

  test('LST-POST-015 @performance: latencia < 2s', async ({ request, makeBoard, cleanup }) => {
    const board = await makeBoard();
    const t0 = Date.now();
    const res = await createList(request, { name: 'LIST_LAT_' + Date.now(), idBoard: board.id });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 2000);
    const body = await res.json();
    cleanup.trackList(body.id);
  });

});