tests/workspace.spec.js
const { test, expect } = require('@playwright/test');
const {WorkspacePage} = require('../../page/API/workspace_page');

test.describe('Trello Workspace', () => {
  const WORKSPACE_SLUG = 'redflags5'; 

 test('crear y abrir un tablero', async ({ page }) => {
   const ws = new WorkspacePage(page);
   await ws.open(WORKSPACE_SLUG);

   const boardName = `Tablero QA ${Date.now()}`;
   await ws.createBoard({ name: boardName, visibility: 'Private' });

    // Volver al workspace para listar y abrir por tile (opcional)
   await ws.open(WORKSPACE_SLUG);
   await ws.searchBoards(boardName);
   await ws.openBoard(boardName);
 });

  test('invitar un miembro (desde workspace o board)', async ({ page }) => {
   const ws = new WorkspacePage(page);
   await ws.open(WORKSPACE_SLUG);
   await ws.openMembers();
   await ws.inviteMember('correo@example.com');
    // Aqui se puede verificar un toast o estado de invitación si tu UI lo muestra.
   await expect(page).toHaveURL(/trello\.com/);
  });
});

// En tus archivos de prueba
const WorkspaceData = require('./src/resources/data/ui/workspace/workspace.data.js');
const WorkspaceConstants = require('./src/resources/data/ui/workspace/workspace.constants.js');

// Usar los datos
const newWorkspace = WorkspaceData.getNewWorkspaceData();
const marketingWorkspace = WorkspaceData.getWorkspaceByType('marketing');
const editData = WorkspaceData.getEditWorkspaceData();

// Usar constantes
console.log(WorkspaceConstants.WORKSPACE_TYPES.MARKETING);
console.log(WorkspaceConstants.PERMISSION_LEVELS.ADMIN);
