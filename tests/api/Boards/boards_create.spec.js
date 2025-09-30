// tests/api/boards_create.spec.js
const { test } = require('../../../api.fixture.js');   // ← importa SOLO desde tu fixture
const { expect } = require('@playwright/test');
const { validateSchema } = require('../../../src/assertions/api/assertions.js');
const schema = require('../../../src/resources/schemas/api/boards/createBoard.schema.json');

test('BRD-API-POST-001: Crear tablero con name válido', async ({ board }) => {
  validateSchema(schema, board);
  expect(board.id).toBeTruthy();
  expect(board.name).toContain('PRUEBA_AÑO2000');
  
});
