const { test, expect, expectStatus, expectLatencyUnder } = require('../../../fixtures/api.fixture.js');
const { validateSchema, expectHeaderContains } = require('../../../src/assertions/api/assertions.js');
//const schema = require('../../../src/resources/schemas/list.schema.json
const schema = require('../../../src/resources/schemas/list.schema.json');
const { getList, getList_noAuth, updateList, deleteList } = require('../../../src/services/lists.service.js');

test.describe('@api Lists - GET /lists/{id}', () => {

  test('LST-GET-001 @smoke @positive: obtener lista existente', async ({ request, makeList }) => {
    const list = await makeList();
    const t0 = Date.now();
    const res = await getList(request, list.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 1000);
    const body = await res.json();
    validateSchema(schema, body);
  });

  test('LST-GET-002 @consistency: GET devuelve name correcto', async ({ request, makeList }) => {
    const list = await makeList({ name: 'LISTA_CONSIS' });
    const res = await getList(request, list.id);
    const body = await res.json();
    expect(body.name).toBe('LISTA_CONSIS');
  });

  test('LST-GET-003 @idempotent: GET 3 veces seguido', async ({ request, makeList }) => {
    const list = await makeList();
    for (let i = 0; i < 3; i++) {
      const res = await getList(request, list.id);
      expectStatus(res, 200);
    }
  });

  test('LST-GET-004 @negative @security: sin token', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await getList_noAuth(request, list.id);
    expectStatus(res, [400, 401, 403]);
  });

  test('LST-GET-005 @negative @validation: id inexistente', async ({ request }) => {
    const res = await getList(request, '64f000000000000000000000');
    expectStatus(res, [400, 404]);
  });

  test('LST-GET-006 @negative @validation: id inválido', async ({ request }) => {
    const res = await getList(request, '???');
    expectStatus(res, [400, 404]);
  });

  test('LST-GET-007 @boundary @i18n: caracteres especiales', async ({ request, makeList }) => {
    const list = await makeList({ name: 'QA_🚀' });
    const res = await getList(request, list.id);
    const body = await res.json();
    expect(body.name).toBe('QA_🚀');
  });

  test('LST-GET-008 @performance: latencia < 1s', async ({ request, makeList }) => {
    const list = await makeList();
    const t0 = Date.now();
    const res = await getList(request, list.id);
    const t1 = Date.now();
    expectStatus(res, 200);
    expectLatencyUnder(t1 - t0, 1000);
  });

  test('LST-GET-009 @schema: validar campos mínimos', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await getList(request, list.id);
    const body = await res.json();
    validateSchema(schema, body);
  });

  test('LST-GET-010 @header: content-type correcto', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await getList(request, list.id);
    expectHeaderContains(res, 'content-type', /json/i);
  });

  test('LST-GET-011 @consistency: después de update refleja cambio', async ({ request, makeList }) => {
    const list = await makeList();
    await updateList(request, list.id, { name: 'UPDATED' });
    const res = await getList(request, list.id);
    const body = await res.json();
    expect(body.name).toBe('UPDATED');
  });

  test('LST-GET-012 @validation: id con espacios', async ({ request }) => {
    const res = await getList(request, '   ');
    expectStatus(res, [400, 404]);
  });

  test('LST-GET-013 @schema: tipos correctos', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await getList(request, list.id);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(typeof body.closed).toBe('boolean');
  });

  test('LST-GET-014 @consistency: GET luego DELETE → closed=true', async ({ request, makeList }) => {
    const list = await makeList();
    await deleteList(request, list.id);
    const res = await getList(request, list.id);
    const body = await res.json();
    expect(body.closed).toBe(true);
  });

  test('LST-GET-015 @header: headers case-insensitive', async ({ request, makeList }) => {
    const list = await makeList();
    const res = await getList(request, list.id);
    const headers = res.headers();
    expect((headers['Content-Type'] || headers['content-type'])).toMatch(/json/i);
  });

});