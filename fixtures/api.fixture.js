// api.fixture.js (CJS) — registra TODOS los fixtures usados en tus specs
const { test: base, expect } = require('@playwright/test');
const { createBoard, deleteBoard } = require('../src/services/boards.service.js');
const { createList, deleteList } = require('../src/services/lists.service.js');

// ===== Helpers de assertions reutilizables =====
function expectStatus(response, expected) {
  const st = response.status();
  if (Array.isArray(expected)) {
    if (!expected.includes(st)) throw new Error(`Esperado uno de ${expected}, llegó ${st}\nBody: ${response.text()}`);
  } else {
    if (st !== expected) throw new Error(`Esperado ${expected}, llegó ${st}\nBody: ${response.text()}`);
  }
}
function expectLatencyUnder(latencyMs, thresholdMs) {
  if (latencyMs > thresholdMs) {
    throw new Error(`Latencia ${latencyMs}ms supera el umbral de ${thresholdMs}ms`);
  }
}

// ===== Registro de fixtures =====
const test = base.extend({
  // --- Boards ---
  board: async ({ request }, use) => {
    const resCreate = await createBoard(request, { name: 'PRUEBA_AÑO2000' + Date.now() });
    if (resCreate.status() !== 200) throw new Error('No se pudo crear el tablero. Status: ' + resCreate.status());
    const board = await resCreate.json();

    await use(board);

    const resDel = await deleteBoard(request, board.id);
    if (resDel.status() !== 200) {
      console.warn(`⚠️ No se pudo eliminar el tablero ${board.id}. Status: ${resDel.status()}`);
    }
  },

  boardId: async ({ request }, use) => {
    const res = await createBoard(request, { name: 'PRUEBA_FIX_ID_' + Date.now() });
    if (res.status() !== 200) throw new Error('No se pudo crear board (boardId). Status: ' + res.status());
    const board = await res.json();
    try {
      await use(board.id);
    } finally {
      await deleteBoard(request, board.id).catch(() => {});
    }
  },

  makeBoard: async ({ request }, use) => {
    const createdIds = [];
    async function makeBoardFn(params = {}) {
      const name = params.name || ('TMP_' + Date.now());
      const res = await createBoard(request, { name, ...params });
      if (res.status() !== 200) throw new Error('No se pudo crear TMP board. Status: ' + res.status());
      const board = await res.json();
      createdIds.push(board.id);
      return board;
    }
    try {
      await use(makeBoardFn);
    } finally {
      for (const id of createdIds) await deleteBoard(request, id).catch(() => {});
    }
  },

  // --- Lists ---
  // Crea un board contenedor + una lista, y limpia ambos al final
  list: async ({ request }, use) => {
    const resB = await createBoard(request, { name: 'BOARD_FOR_LIST_' + Date.now() });
    if (resB.status() !== 200) throw new Error('No se pudo crear board para lista');
    const board = await resB.json();

    const resL = await createList(request, { name: 'LIST_' + Date.now(), idBoard: board.id });
    if (resL.status() !== 200) {
      await deleteBoard(request, board.id).catch(() => {});
      throw new Error('No se pudo crear lista');
    }
    const list = await resL.json();

    // exponemos la lista (y su boardId)
    await use({ ...list, idBoard: board.id });

    // teardown
    await deleteList(request, list.id).catch(() => {});
    await deleteBoard(request, board.id).catch(() => {});
  },

  // Devuelve función para crear N listas en un board temporal (cleanup automático)
  makeList: async ({ request }, use) => {
    const resB = await createBoard(request, { name: 'BOARD_TMP_' + Date.now() });
    if (resB.status() !== 200) throw new Error('No se pudo crear board tmp');
    const board = await resB.json();

    const listIds = [];
    async function makeListFn(params = {}) {
      const resL = await createList(request, { idBoard: board.id, name: params.name || ('LIST_' + Date.now()), ...params });
      if (resL.status() !== 200) throw new Error('No se pudo crear lista tmp');
      const list = await resL.json();
      listIds.push(list.id);
      return { ...list, idBoard: board.id };
    }

    try {
      await use(makeListFn);
    } finally {
      for (const id of listIds) await deleteList(request, id).catch(() => {});
      await deleteBoard(request, board.id).catch(() => {});
    }
  },
  cleanup: async ({ request }, use) => {
    const toDelete = { boards: [], lists: [] };

    const api = {
      trackBoard: (id) => toDelete.boards.push(id),
      trackList: (id) => toDelete.lists.push(id),
    };

    await use(api);

    // Primero listas (archiva), luego boards
    for (const id of toDelete.lists) {
      try { await deleteList(request, id); } catch {}
    }
    for (const id of toDelete.boards) {
      try { await deleteBoard(request, id); } catch {}
    }
  },
});

module.exports = { test, expect, expectStatus, expectLatencyUnder };
