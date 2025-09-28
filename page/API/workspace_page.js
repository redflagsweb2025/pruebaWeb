
const { expect } = require('@playwright/test');

class WorkspacePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators "resilientes":
    this.boardsSection = page.locator('[data-testid="workspace-boards-page"], [data-testid="home-team-boards"]');
    this.createBoardTile = page.locator(
      '[data-testid="create-board-tile"], [data-testid="header-create-board-button"]'
    );
    this.searchBoardsInput = page.locator(
      '[data-testid="workspace-boards-filter-input"], input[placeholder*="Buscar"], input[placeholder*="Search"]'
    );
    this.membersTab = page.locator(
      '[data-testid="workspace-members-tab"], [data-testid="team-members-tab"], [data-testid="members-tab"]'
    );
    this.settingsButton = page.locator(
      '[data-testid="workspace-settings-button"], [data-testid="team-settings-button"]'
    );
    this.inviteOpenBtn = page.getByRole('button', { name: /invitar|invite/i });
    this.inviteEmailInput = page.locator(
      '[data-testid="invite-dialog"] input[type="email"], [data-testid="add-members-input"] input[type="email"], input[type="email"]'
    );
    this.inviteSubmitBtn = page.getByRole('button', { name: /enviar invitación|send invite|invitar/i });
  }

  /**
   * Abre el workspace por slug (ej: 'mi-equipo-qa').
   * URL típica: https://trello.com/w/<workspaceSlug>
   */
  async open(workspaceSlug) {
    await this.page.goto(`/w/${workspaceSlug}`);
    await expect(this.boardsSection).toBeVisible();
  }

  /**
   * Devuelve un locator para el tile de un board por título.
   */
  boardTileByTitle(title) {
    // Varias opciones para encontrar el tile por el texto del título
    return this.page
      .locator(
        '[data-testid="board-tile"], a.board-tile, [data-testid="board-link"]'
      )
      .filter({ hasText: title })
      .first();
  }

  /**
   * Buscar tableros por texto en el buscador del workspace.
   */
  async searchBoards(text) {
    if (await this.searchBoardsInput.count()) {
      await this.searchBoardsInput.fill('');
      await this.searchBoardsInput.fill(text);
    }
  }

  /**
   * Abrir un board por su título.
   */
  async openBoard(title) {
    const tile = this.boardTileByTitle(title);
    await expect(tile).toBeVisible();
    await tile.click();
    // Un board abierto suele tener el header con el nombre del tablero
    await expect(this.page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible();
  }

  /**
   * Crear un board dentro del workspace.
   * Nota: Trello muestra un modal. Los testIDs exactos pueden variar.
   */
  async createBoard({ name, visibility = 'Private', background = 'Default' }) {
    await this.createBoardTile.first().click();

    // Campos del modal (usa selectores amplios + textos):
    const nameInput = this.page.locator('input[placeholder*="Board title"], input[placeholder*="Título"], input[type="text"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);

    // Visibilidad (si aparece)
    const visibilityBtn = this.page.getByRole('button', { name: /visibility|visibilidad|public|privado|equipo/i });
    if (await visibilityBtn.count()) {
      await visibilityBtn.first().click();
      const opt = this.page.getByRole('menuitem', { name: new RegExp(visibility, 'i') });
      if (await opt.count()) await opt.first().click();
    }

    // Confirmar creación
    const createBtn = this.page.getByRole('button', { name: /create board|crear tablero|create/i });
    await createBtn.first().click();

    // Esperar que abra el board recién creado
    await expect(this.page.getByRole('heading', { name: new RegExp(name, 'i') })).toBeVisible();
  }

  /**
   * Abrir la pestaña Miembros del workspace.
   */
  async openMembers() {
    // Algunos layouts requieren ir a "Miembros" o "Members"
    if (await this.membersTab.count()) {
      await this.membersTab.first().click();
    } else {
      // Fallback: ir por Settings y desde ahí a Members si aplica
      if (await this.settingsButton.count()) {
        await this.settingsButton.first().click();
      }
    }
  }

  /**
   * Invitar un miembro al workspace (o al board si estás dentro).
   */
  async inviteMember(email) {
    // Abre modal de invitación si no está visible
    if (!(await this.inviteEmailInput.count())) {
      await this.inviteOpenBtn.first().click();
    }
    await expect(this.inviteEmailInput.first()).toBeVisible();
    await this.inviteEmailInput.first().fill(email);
    await this.inviteSubmitBtn.first().click();

    // Una confirmación típica es un toast o desaparecer el modal
    await this.page.waitForTimeout(500); // pequeño buffer
  }
}

module.exports = { WorkspacePage };
