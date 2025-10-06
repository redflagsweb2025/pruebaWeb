// tests/e2e/trello.e2e.spec.js
const { test, expect } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// ⬇️ Faker: carga compatible ESM/CJS
let faker;

// Page Objects
const { LoginPage } = require('../../../src/page/ui/login/login.page');
const { BoardPage } = require('../../../src/page/ui/boards/boards.page');

// Services
const { apiCreateWorkspace, apiDeleteWorkspace } = require('../../../src/services/workspace_page');
const { apiCreateBoard, apiGetBoard } = require('../../../src/services/boards.service');
const { apiCreateList } = require('../../../src/services/lists.services');

dotenv.config();

test.beforeAll(async () => {
  try {
    ({ faker } = await import('@faker-js/faker')); // ESM (v9/10)
  } catch {
    ({ faker } = require('@faker-js/faker'));       // CJS (v8)
  }
});

test('E2E visible: login → (API) workspace/board/listas → (UI) tarjetas → teardown → logout', async ({ page, request, context }) => {
  // Solo requiere estas dos del .env
  const email = process.env.TRELLO_EMAIL;
  const password = process.env.TRELLO_PASSWORD;
  expect(email && password, 'Define TRELLO_EMAIL y TRELLO_PASSWORD en tu .env').toBeTruthy();

  // Defaults internos (no dependen de .env)
  const now = Date.now();
  const WS_DISPLAY = 'E2E Workspace';
  const WS_SLUG = `e2e-ws-${now}`;
  const BOARD_NAME = 'E2E Board';
  const LIST_A = 'Pendiente';
  const LIST_B = 'Hecho';

  // IDs + shortUrl
  let workspaceId, boardId, boardShortUrl;

  // 1) API: crear todo
  await test.step('API: Crear Workspace', async () => {
    const ws = await apiCreateWorkspace(request, { displayName: WS_DISPLAY, name: WS_SLUG });
    workspaceId = ws.id;
    expect(workspaceId).toBeTruthy();
  });

  await test.step('API: Crear Board', async () => {
    const brd = await apiCreateBoard(request, { name: BOARD_NAME, idOrganization: workspaceId });
    boardId = brd.id;
    expect(boardId).toBeTruthy();
  });

  await test.step('API: Crear Listas', async () => {
    const l1 = await apiCreateList(request, { name: LIST_A, idBoard: boardId });
    const l2 = await apiCreateList(request, { name: LIST_B, idBoard: boardId });
    expect(l1.id).toBeTruthy();
    expect(l2.id).toBeTruthy();
  });

  await test.step('API: Obtener shortUrl del Board', async () => {
    const b = await apiGetBoard(request, boardId);
    boardShortUrl = b.shortUrl;
    expect(boardShortUrl).toBeTruthy();
  });

  // 2) UI: Login (➡️ directo al tablero usando continueTo)
  const login = new LoginPage(page);
  await test.step('UI: Login', async () => {
    await login.login(email, password, { continueTo: boardShortUrl });
  });

  // 3) UI: Abrir Board (por si no redirigió)
  const board = new BoardPage(page);
  await test.step('UI: Abrir Board', async () => {
    await board.openBoard(boardShortUrl);
  });

  // 4) UI: Crear tarjetas (faker) en lista A
  const fakeCards = Array.from({ length: 5 }).map(() => ({
    title: faker.commerce.productName(),
    desc: faker.commerce.productDescription(),
  }));

  await test.step('UI: Crear tarjetas con datos aleatorios', async () => {
    for (const c of fakeCards) {
      await board.addCardToList(LIST_A, c.title, c.desc);
    }
  });

  // 5) UI: Mover una tarjeta a lista B
  const toMove = fakeCards[0].title;
  await test.step(`UI: Mover tarjeta "${toMove}" → "${LIST_B}"`, async () => {
    await board.moveCardToList(toMove, LIST_B);
    const moved = page
      .locator('[data-testid="list"]')
      .filter({ hasText: new RegExp(`^${LIST_B}$`, 'i') })
      .locator('[data-testid="trello-card"]')
      .filter({ hasText: toMove })
      .first();
    await expect(moved).toBeVisible();
  });

  // 6) UI: Archivar otra tarjeta
  const toArchive = fakeCards[1].title;
  await test.step(`UI: Archivar tarjeta "${toArchive}"`, async () => {
    await board.archiveCard(toArchive);
    await expect(
      page.locator('[data-testid="trello-card"]').filter({ hasText: toArchive }).first()
    ).toHaveCount(0);
  });

  // 7) UI: Adjuntar archivo a otra tarjeta
  const toAttach = fakeCards[2].title;
  await test.step(`UI: Adjuntar archivo en tarjeta "${toAttach}"`, async () => {
    const samplePath = path.resolve('assets', 'sample.txt');
    if (!fs.existsSync(samplePath)) {
      fs.mkdirSync('assets', { recursive: true });
      fs.writeFileSync(samplePath, 'Archivo de prueba para adjuntar en Trello.\n', 'utf8');
    }
    await board.attachFileToCard(toAttach, samplePath);
  });

  // 8) Teardown total + logout
  await test.step('TEARDOWN: Borrar Workspace por API (service)', async () => {
    if (workspaceId) await apiDeleteWorkspace(request, workspaceId);
  });

  await test.step('UI: Logout (cerrar sesión)', async () => {
    await login.logoutIfPossible();
    await context.clearCookies().catch(() => {});
  });
});
