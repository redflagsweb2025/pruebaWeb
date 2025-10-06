const { test, expect, expectStatus, expectLatencyUnder } = require('../../../fixtures/api.fixture.js');
const { validateSchema } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/lists/list.schema.json');
const {
  updateList, updateList_noAuth, updateList_invalidAuth, getList
} = require('../../../src/services/lists.service.js');
const { createBoard, deleteBoard } = require('../../../src/services/boards.service.js');

test.describe('@api Lists - PUT /lists/{id}', () => {

  test('LST-PUT-001 @smoke @positive: renombrar lista', async ({ request, makeList }) => {
    const list = await makeList({ name: 'LIST_OLD' });
    const newName = 'LIST_NEW_' + Date.now();
    const res = await updateList(request, list.id, { name: newName });
    expectStatus(res, 200);
    const body = await res.json();
    validateSchema(schema, body);
    expect(body.name).toBe(newName);
  });
  
  test('LST-PUT-002 @positive: cambiar pos=top', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { pos: 'top' });
    expectStatus(res, 200);
  });

  test('LST-PUT-003 @positive: cambiar pos=bottom', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { pos: 'bottom' });
    expectStatus(res, 200);
  });

  test('LST-PUT-004 @consistency: mover lista a otro board', async ({ request, makeList, cleanup }) => {
    const list = await makeList();
    const resB = await createBoard(request, { name: 'NEW_BOARD_' + Date.now() });
    expectStatus(resB, 200);
    const board = await resB.json();
    cleanup.trackBoard(board.id);

    const resU = await updateList(request, list.id, { idBoard: board.id });
    expectStatus(resU, 200);
    const updated = await resU.json();
    validateSchema(schema, updated);
    expect(updated.idBoard).toBe(board.id);
  });

  test('LST-PUT-005 @idempotent: mismo name', async ({ request, makeList }) => {
    const list = await makeList({ name: 'STATIC' });
    const res = await updateList(request, list.id, { name: 'STATIC' });
    expectStatus(res, 200);
  });

  test('LST-PUT-006 @boundary: name 50 chars', async ({ request, makeList }) => {
    const list = await makeList();
    const newName = 'X'.repeat(50);
    const res = await updateList(request, list.id, { name: newName });
    expectStatus(res, 200);
  });

  test('LST-PUT-007 @i18n: name con emoji', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { name: 'LIST_🚀' });
    expectStatus(res, 200);
  });

  test('LST-PUT-008 @negative @validation: name vacío', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { name: '' });
    expectStatus(res, [400, 422]);
  });

  test('LST-PUT-009 @negative @validation: board inexistente', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { idBoard: '64f000000000000000000000' });
    expectStatus(res, [400, 404]);
  });

  test('LST-PUT-010 @negative @security: sin token', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList_noAuth(request, list.id, { name: 'NO_TOKEN' });
    expectStatus(res, [400, 401, 403]);
  });

  test('LST-PUT-011 @negative @security: token inválido', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList_invalidAuth(request, list.id, { name: 'BAD' });
    expectStatus(res, [401, 403]);
  });

  test('LST-PUT-012 @negative @validation: pos inválido', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { pos: '???' });
    expectStatus(res, [400, 422]);
  });

  test('LST-PUT-013 @schema: campo desconocido ignorado', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { foo: 'bar' });
    expectStatus(res, 200);
  });

  test('LST-PUT-014 @boundary: name con espacios', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await updateList(request, list.id, { name: '   LIST_TRIM   ' });
    expectStatus(res, 200);
  });

  test('LST-PUT-015 @performance: latencia < 1500ms', async ({ request, makeList }) => {
    const list = await makeList();
    const t0 = Date.now();
    const res = await updateList(request, list.id, { name: 'LIST_LAT_' + Date.now() });
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 1500);
  });

});