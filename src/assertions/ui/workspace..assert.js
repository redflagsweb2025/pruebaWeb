const { expect } = require('@playwright/test');

class WorkspaceAssertion {
    constructor(page) {
        this.page = page;
    }

    /**
     * Verifica que la página del workspace esté cargada correctamente
     */
    async verifyWorkspacePageIsLoaded() {
        // Verificar que el título de la página contenga "Trello"
        await expect(this.page).toHaveTitle(/Trello/);
        
        // Verificar que elementos clave del workspace estén visibles
        await expect(this.page.locator('[data-testid="workspace-boards-section"]')).toBeVisible();
        await expect(this.page.locator('[data-testid="workspace-header"]')).toBeVisible();
        
        console.log('✓ Página del workspace cargada correctamente');
    }

    /**
     * Verifica que el header del workspace sea visible
     */
    async verifyWorkspaceHeaderIsVisible(workspaceName) {
        // Verificar que el nombre del workspace esté visible
        const workspaceNameLocator = this.page.locator('[data-testid="workspace-name"]');
        await expect(workspaceNameLocator).toBeVisible();
        
        if (workspaceName) {
            await expect(workspaceNameLocator).toContainText(workspaceName);
        }
        
        console.log('✓ Header del workspace visible');
    }

    /**
     * Verifica que la sección de tableros del workspace esté visible
     */
    async verifyBoardsSectionIsVisible() {
        await expect(this.page.locator('[data-testid="workspace-boards-section"]')).toBeVisible();
        await expect(this.page.locator('text=Tableros')).toBeVisible();
        
        console.log('✓ Sección de tableros visible');
    }

    /**
     * Verifica que exista al menos un tablero en el workspace
     */
    async verifyAtLeastOneBoardExists() {
        const boards = this.page.locator('[data-testid="board-card"]');
        await expect(boards.first()).toBeVisible();
        
        const boardCount = await boards.count();
        console.log(`✓ Se encontraron ${boardCount} tableros en el workspace`);
    }

    /**
     * Verifica que el botón de crear nuevo tablero esté visible
     */
    async verifyCreateBoardButtonIsVisible() {
        await expect(this.page.locator('[data-testid="create-board-tile"]')).toBeVisible();
        await expect(this.page.locator('text=Crear tablero nuevo')).toBeVisible();
        
        console.log('✓ Botón de crear tablero visible');
    }

    /**
     * Verifica que el menú de configuración del workspace esté disponible
     */
    async verifyWorkspaceSettingsMenuIsAccessible() {
        await expect(this.page.locator('[data-testid="workspace-settings-button"]')).toBeVisible();
        
        console.log('✓ Menú de configuración del workspace disponible');
    }

    /**
     * Verifica todos los elementos principales del workspace
     */
    async verifyCompleteWorkspaceUI(workspaceName = null) {
        await this.verifyWorkspacePageIsLoaded();
        await this.verifyWorkspaceHeaderIsVisible(workspaceName);
        await this.verifyBoardsSectionIsVisible();
        await this.verifyCreateBoardButtonIsVisible();
        await this.verifyWorkspaceSettingsMenuIsAccessible();
        
        console.log('✓ Todas las verificaciones del workspace completadas exitosamente');
    }

    /**
     * Verifica que se muestre el workspace correcto basado en la URL
     */
    async verifyCorrectWorkspaceIsDisplayed(workspaceId) {
        // Verificar que la URL contenga el ID del workspace
        await expect(this.page).toHaveURL(new RegExp(`workspace/${workspaceId}`));
        
        console.log(`✓ Workspace correcto mostrado (ID: ${workspaceId})`);
    }

    /**
     * Verifica que los miembros del workspace sean visibles
     */
    async verifyWorkspaceMembersAreVisible() {
        await expect(this.page.locator('[data-testid="workspace-members"]')).toBeVisible();
        
        console.log('✓ Miembros del workspace visibles');
    }
}

module.exports = WorkspaceAssertion;