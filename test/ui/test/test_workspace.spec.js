// tests/workspace.spec.js
const { test, expect } = require('@playwright/test');
const { TrelloWorkspacePage } = require('../pages/TrelloWorkspacePage');

test.describe('Trello Workspace', () => {
  const WORKSPACE_SLUG = 'tu-workspace-slug'; // ej: 'equipo-qa'

  test('crear y abrir un tablero', async ({ page }) => {
    const ws = new TrelloWorkspacePage(page);
    await ws.open(WORKSPACE_SLUG);

    const boardName = `Tablero QA ${Date.now()}`;
    await ws.createBoard({ name: boardName, visibility: 'Private' });

    // Volver al workspace para listar y abrir por tile (opcional)
    await ws.open(WORKSPACE_SLUG);
    await ws.searchBoards(boardName);
    await ws.openBoard(boardName);
  });

  test('invitar un miembro (desde workspace o board)', async ({ page }) => {
    const ws = new TrelloWorkspacePage(page);
    await ws.open(WORKSPACE_SLUG);
    await ws.openMembers();
    await ws.inviteMember('correo@example.com');
    // Aquí podrías verificar un toast o estado de invitación si tu UI lo muestra.
    await expect(page).toHaveURL(/trello\.com/);
  });
});
