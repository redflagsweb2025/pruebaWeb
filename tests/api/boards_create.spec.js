const { test, expect } = require('@playwright/test');
const { createBoard, getBoard, deleteBoard } =
  require('../../src/services/api/boards.service.js');
const { validateSchema, expectStatusOK } =
  require('../../src/assertions/api/assertions.js');

const data = require('../../resources/data/api/boards.data.json');
const schema = require('../../schemas/api/boards/createBoard.schema.json');

test('BRD-API-POST-001: Crear tablero con name válido', async ({ request }) => {
  const name = `${data.valid.name}${Date.now()}`;

  const resCreate = await createBoard(request, { name });
  expectStatusOK(resCreate);
  const body = await resCreate.json();
  validateSchema(schema, body);
  expect(body.name).toBe(name);

  const resGet = await getBoard(request, body.id);
  expectStatusOK(resGet);

  const resDel = await deleteBoard(request, body.id);
  expect(resDel.status()).toBe(200);
});
