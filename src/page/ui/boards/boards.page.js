// src/pages/BoardPage.js
class BoardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async openBoard(shortUrl) {
    await this.page.goto(shortUrl);
    await this.page.waitForSelector('[data-testid="list"]');
  }

  listByName(name) {
    return this.page.locator('[data-testid="list"]').filter({
      has: this.page.getByTestId('list-name').getByText(new RegExp(`^${name}$`, 'i'))
    });
  }

  async addCardToList(listName, title, desc = '') {
    const list = this.listByName(listName);
    await list.waitFor();

    const addBtn = list.getByRole('button', { name: /add a card|añadir una tarjeta/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await list.locator('[data-testid="list-add-card-button"]').first().click();
    }

    const titleInput = this.page.locator('[data-testid="list-card-composer-textarea"]');
    await titleInput.fill(title);
    await this.page.getByRole('button', { name: /add card|añadir tarjeta/i }).click();

    if (desc) {
      await this.openCard(title);
      const descEditor = this.page.getByTestId('card-description').getByRole('textbox');
      if (await descEditor.isVisible().catch(() => false)) {
        await descEditor.fill(desc);
        const saveBtn = this.page.getByRole('button', { name: /save|guardar/i });
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
        }
      }
      await this.closeCard();
    }
  }

  cardByTitle(title) {
    return this.page.locator('[data-testid="trello-card"]').filter({ hasText: title }).first();
  }

  async openCard(title) {
    await this.cardByTitle(title).click();
    await this.page.getByTestId('card-back-title').waitFor();
  }

  async closeCard() {
    await this.page.getByTestId('CloseIcon').click();
  }

  async moveCardToList(title, targetListName) {
    await this.openCard(title);
    await this.page.getByRole('button', { name: /move|mover/i }).click();
    await this.page.locator('select[name="selectList"]').first().selectOption({ label: targetListName });
    await this.page.getByRole('button', { name: /^move|mover$/i }).click();
    await this.closeCard();
  }

  async archiveCard(title) {
    await this.openCard(title);
    await this.page.getByRole('button', { name: /archive|archivar/i }).click();
    await this.closeCard();
  }

  async attachFileToCard(title, filePath) {
    await this.openCard(title);
    const attachBtn = this.page.getByRole('button', { name: /attach|adjuntar/i });
    if (await attachBtn.isVisible().catch(() => false)) {
      await attachBtn.click();
    } else {
      await this.page.getByTestId('attachment-button').first().click();
    }
    await this.page.locator('input[type="file"]').first().setInputFiles(filePath);
    await this.page.locator('[data-testid="attachment-thumbnail"]').first().waitFor({ timeout: 15000 });
    await this.closeCard();
  }
}

module.exports = { BoardPage };
