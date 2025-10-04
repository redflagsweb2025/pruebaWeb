const { test: base, expect } = require('@playwright/test');
const { createBoard, deleteBoard } = require('./src/services/boards.service.js');

// Extiende los fixtures
const test = base.extend({
  /**
   * board: crea un tablero y lo elimina al finalizar.
   * El spec recibe el objeto completo del board.
   */
  board: async ({ request }, use) => {
    const resCreate = await createBoard(request, { name: 'PRUEBA_AÑO2000' + Date.now() });
    if (resCreate.status() !== 200) {
      throw new Error('No se pudo crear el tablero. Status: ' + resCreate.status());
    }
    const board = await resCreate.json();

    await use(board);

    const resDel = await deleteBoard(request, board.id);
    if (resDel.status() !== 200) {
      console.warn(`⚠️ No se pudo eliminar el tablero ${board.id}. Status: ${resDel.status()}`);
    }
  },

  /**
   * boardId: crea un tablero y devuelve solo el id.
   * Se elimina automáticamente al finalizar.
   */
  boardId: async ({ request }, use) => {
    const resCreate = await createBoard(request, { name: 'PRUEBA_FIX_ID_' + Date.now() });
    if (resCreate.status() !== 200) {
      throw new Error('No se pudo crear el tablero (boardId). Status: ' + resCreate.status());
    }
    const board = await resCreate.json();
    try {
      await use(board.id);
    } finally {
      await deleteBoard(request, board.id).catch(() => {});
    }
  },

  /**
   * makeBoard: devuelve una función para crear boards dentro del test.
   * Todos los boards creados se eliminan al final del test automáticamente.
   */
  makeBoard: async ({ request }, use) => {
    const createdIds = [];
    async function makeBoardFn(params = {}) {
      const name = params.name || ('TMP_' + Date.now());
      const res = await createBoard(request, { name, ...params });
      if (res.status() !== 200) {
        throw new Error('No se pudo crear TMP board. Status: ' + res.status());
      }
      const board = await res.json();
      createdIds.push(board.id);
      return board;
    }
    try {
      await use(makeBoardFn);
    } finally {
      for (const id of createdIds) {
        await deleteBoard(request, id).catch(() => {});
      }
    }
  },
});

/**
 * Assertion utilitaria para status codes.
 * Permite pasar un valor único o un array de valores esperados.
 */
function expectStatus(response, expected) {
  const st = response.status();
  if (Array.isArray(expected)) {
    if (!expected.includes(st)) {
      throw new Error(`Esperado uno de ${expected}, llegó ${st}`);
    }
  } else {
    if (st !== expected) {
      throw new Error(`Esperado ${expected}, llegó ${st}`);
    }
  }
}
function expectLatencyUnder(latencyMs, thresholdMs) {
  if (latencyMs > thresholdMs) {
    throw new Error(`Latencia ${latencyMs}ms supera el umbral de ${thresholdMs}ms`);
  }
}

module.exports = { test, expect, expectStatus, expectLatencyUnder };

