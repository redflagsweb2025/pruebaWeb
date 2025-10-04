// En tu archivo de test
const { test } = require('@playwright/test');
const WorkspaceAssertion = require('./src/assertion/ui/workspace/workspace.assertion');

test('Verificar UI del workspace de Trello', async ({ page }) => {
    // Navegar al workspace
    await page.goto('https://trello.com/workspace/mi-workspace');
    
    // Crear instancia de las aserciones
    const workspaceAssertion = new WorkspaceAssertion(page);
    
    // Ejecutar verificaciones
    await workspaceAssertion.verifyCompleteWorkspaceUI('Mi Workspace');
    await workspaceAssertion.verifyAtLeastOneBoardExists();
    await workspaceAssertion.verifyCorrectWorkspaceIsDisplayed('mi-workspace');
});