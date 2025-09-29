// board.fixture.js (CJS)
const { test: base, expect } = require('@playwright/test');
const { createBoard, deleteBoard } = require('./src/services/boards.service.js'); // ajusta si tu ruta difiere

const test = base.extend({
  board: async ({ request }, use) => {
    const resCreate = await createBoard(request, { name: 'PRUEBA_AÑO2000' + Date.now() });
    if (resCreate.status() !== 200) {
      throw new Error('No se pudo crear el tablero. Status: ' + resCreate.status());
    }
    const board = await resCreate.json();

    await use(board); // <-- tu spec recibe { board }

    const resDel = await deleteBoard(request, board.id);
    if (resDel.status() !== 200) {
      console.warn(`⚠️ No se pudo eliminar el tablero ${board.id}. Status: ${resDel.status()}`);
    }
  },
});

// Exporta test Y expect para evitar dobles imports
module.exports = { test, expect };
