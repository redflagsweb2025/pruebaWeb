class WorkspacePage {
    constructor(page) {
        this.page = page;
        
        // Selectores para elementos del workspace
        this.workspaceHeader = '.board-header';
        this.workspaceName = '.board-header-btn-text';
        this.createBoardButton = '[data-testid="create-board-tile"]';
        this.boardTile = '.board-tile';
        this.boardTitle = '.board-tile-details-name';
        this.menuButton = '.board-header-btn[aria-label="Menu"]';
        this.closeBoardOption = '.board-menu-navigation-item-link.js-close-board';
        this.confirmCloseButton = '[data-testid="close-board-confirm-button"]';
        this.deleteBoardOption = '.board-menu-navigation-item-link.js-delete';
        this.confirmDeleteButton = '[data-testid="close-board-delete-board-confirm-button"]';
    }

    /**
     * Navegar a un workspace específico
     * @param {string} workspaceId - ID del workspace
     */
    async navigateToWorkspace(workspaceId) {
        await this.page.goto(`https://trello.com/b/${workspaceId}`);
        await this.page.waitForSelector(this.workspaceHeader);
    }

    /**
     * Obtener el nombre del workspace actual
     * @returns {string} - Nombre del workspace
     */
    async getWorkspaceName() {
        return await this.page.textContent(this.workspaceName);
    }

    /**
     * Crear un nuevo tablero en el workspace
     * @param {string} boardName - Nombre del tablero
     */
    async createNewBoard(boardName) {
        await this.page.click(this.createBoardButton);
        await this.page.fill('[data-testid="create-board-title-input"]', boardName);
        await this.page.click('[data-testid="create-board-submit-button"]');
        await this.page.waitForSelector(this.workspaceHeader);
    }

    /**
     * Abrir un tablero existente por nombre
     * @param {string} boardName - Nombre del tablero a abrir
     */
    async openBoard(boardName) {
        const boardSelector = `${this.boardTile}:has-text("${boardName}")`;
        await this.page.click(boardSelector);
        await this.page.waitForSelector(this.workspaceHeader);
    }

    /**
     * Obtener la lista de tableros en el workspace
     * @returns {Array} - Array con nombres de tableros
     */
    async getBoardList() {
        const boardElements = await this.page.$$(this.boardTitle);
        const boardNames = [];
        
        for (const element of boardElements) {
            const name = await element.textContent();
            boardNames.push(name.trim());
        }
        
        return boardNames;
    }

    /**
     * Cerrar un tablero
     */
    async closeCurrentBoard() {
        await this.page.click(this.menuButton);
        await this.page.click(this.closeBoardOption);
        await this.page.click(this.confirmCloseButton);
        await this.page.waitForTimeout(2000); // Esperar a que se cierre
    }

    /**
     * Eliminar permanentemente un tablero
     */
    async deleteCurrentBoard() {
        await this.closeCurrentBoard();
        await this.page.click(this.deleteBoardOption);
        await this.page.click(this.confirmDeleteButton);
        await this.page.waitForTimeout(2000); // Esperar a que se elimine
    }

    /**
     * Verificar si un tablero existe en el workspace
     * @param {string} boardName - Nombre del tablero a verificar
     * @returns {boolean} - True si existe, false si no
     */
    async boardExists(boardName) {
        const boards = await this.getBoardList();
        return boards.includes(boardName);
    }

    /**
     * Tomar screenshot del workspace
     * @param {string} screenshotName - Nombre del screenshot
     */
    async takeScreenshot(screenshotName) {
        await this.page.screenshot({ path: `screenshots/${screenshotName}.png` });
    }
}

module.exports = WorkspacePage;