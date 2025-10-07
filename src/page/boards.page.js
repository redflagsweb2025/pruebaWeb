
const {
  SELECTORS,
  listByName: _listByName,
  cardByTitle: _cardByTitle,
  cardInList: _cardInList,
  isCardDetailOpen: _isCardDetailOpen,
  closeCard: _closeCard,
  tryFileChooserClick,
  setOnAnyFileInput,
  absPath,
  reEscape,
} = require('../utils/ui/boards.helpers');

class BoardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.boardShell   = page.locator(SELECTORS.boardShell);
    this.cardDetail   = page.locator(SELECTORS.cardDetailAny);
    this.cardCloseBtn = page.locator(SELECTORS.cardCloseBtn);
  }

  // ---------- Board ----------
  async openBoard(shortUrl) {
    await this.page.goto(shortUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/trello\.com\/b\//, { timeout: 5000 }).catch(() => {});
    await this.boardShell.first().waitFor({ timeout: 5000 });
  }

  // ---------- Helpers delegados ----------
  listByName(name) { return _listByName(this.page, name); }
  cardByTitle(title) { return _cardByTitle(this.page, title); }
  cardInList(listName, title) { return _cardInList(this.page, listName, title); }
  async _isCardDetailOpen(expectedTitle) { return _isCardDetailOpen(this.page, this.cardDetail, expectedTitle); }
  async closeCard() { return _closeCard(this.page, this.cardCloseBtn); }

  // ---------- Tarjetas ----------
  async addCardToList(listName, title, desc = '') {
    const list = this.listByName(listName).first();
    await list.waitFor({ timeout: 5000 });

    const addBtn = list.getByRole('button', { name: /add a card|añadir una tarjeta/i }).first();
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    else await list.locator('[data-testid="list-add-card-button"]').first().click();

    await this.page.locator('[data-testid="list-card-composer-textarea"]').fill(title);

    const confirm = this.page.getByRole('button', { name: /add card|añadir tarjeta/i }).first()
      .or(this.page.locator('[data-testid="list-card-composer-add-card-button"]').first());
    await confirm.click();

    await this.cardByTitle(title).waitFor({ timeout: 5000 });
    await this.page.waitForTimeout(200);

    if (desc) {
      await this.openCard(title);
      const descEditor = this.page.getByTestId('card-description').getByRole('textbox').first();
      if (!(await descEditor.isVisible().catch(() => false))) {
        const editBtn = this.page.getByRole('button', { name: /edit|editar/i }).first();
        if (await editBtn.isVisible().catch(() => false)) await editBtn.click();
      }
      if (await descEditor.isVisible().catch(() => false)) {
        await descEditor.fill(desc);
        const saveBtn = this.page.getByRole('button', { name: /save|guardar/i }).first();
        if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click();
      }
      await this.closeCard();
    }
  }

  async openCard(title) {
    const card = this.cardByTitle(title);
    await card.waitFor({ timeout: 5000 });
    await card.scrollIntoViewIfNeeded();

    const link = card.locator('a[data-testid="card-name"], a[href*="/c/"]').first();
    const href = await link.getAttribute('href').catch(() => null);
    if (href) {
      const url = href.startsWith('http') ? href : `https://trello.com${href}`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    } else {
      await link.click().catch(() => {});
      if (!(await this._isCardDetailOpen())) await link.dblclick().catch(() => {});
      if (!(await this._isCardDetailOpen())) await this.page.keyboard.press('Enter').catch(() => {});
    }

    const start = Date.now();
    while (Date.now() - start < 15000) {
      if (/\/c\/[A-Za-z0-9]+/i.test(this.page.url())) break;
      if (await this.cardDetail.first().isVisible({ timeout: 300 }).catch(() => false)) break;
      await this.page.waitForTimeout(200);
    }
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  // ---------- Mover ----------
  async moveCardToList(title, targetListName) {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);

    let moveBtn = this.page.getByTestId('card-back-move-card-button').first();
    if (!(await moveBtn.isVisible({ timeout: 1200 }).catch(() => false))) {
      const actions = this.page.getByRole('button', { name: /acciones|actions/i }).first();
      if (await actions.isVisible().catch(() => false)) await actions.click();
      moveBtn = this.page.getByTestId('card-back-move-card-button').first();
    }
    await moveBtn.click();

    // Dialog de mover (cubre testid y texto ES/EN) — sin el "]" erróneo
    const dialog = this.page.getByRole('dialog').filter({
      has: this.page.locator('[data-testid="move-card-popover-move-button"]'),
    }).first().or(
      this.page.getByRole('dialog').filter({
        has: this.page.getByRole('button', { name: /^(mover|move)$/i }),
      }).first()
    );

    await dialog.waitFor({ timeout: 5000 });

    const inputContainer = dialog.getByTestId('move-card-popover-select-list-destination-select--input-container').first();
    await inputContainer.click().catch(() => {});
    const input = dialog.locator('#move-card-list-select, input[data-testid="move-card-list-select"]').first();

    let usedDirectInput = false;
    if (await input.isVisible({ timeout: 800 }).catch(() => false)) {
      await input.fill('');
      await input.type(targetListName, { delay: 25 });
      usedDirectInput = true;
    } else {
      const combo = dialog.getByRole('combobox').first();
      if (await combo.isVisible({ timeout: 1000 }).catch(() => false)) {
        await combo.click();
        await this.page.keyboard.press('Control+A').catch(() => {});
        await this.page.keyboard.type(targetListName, { delay: 25 });
      } else {
        const nativeSelect = dialog.locator('select[name="selectList"]').first();
        await nativeSelect.waitFor({ timeout: 4000 });
        await nativeSelect.selectOption({ label: targetListName });
      }
    }

    if (usedDirectInput) {
      let listbox = null;
      const listboxId = await input.getAttribute('aria-controls').catch(() => null);
      if (listboxId) listbox = dialog.locator(`#${listboxId}`);
      if (!listbox) listbox = dialog.getByRole('listbox').first();
      const opt = listbox.getByRole('option', { name: new RegExp(`^${reEscape(targetListName)}$`, 'i') }).first();
      if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) await opt.click();
      else { await this.page.keyboard.press('ArrowDown').catch(() => {}); await this.page.keyboard.press('Enter').catch(() => {}); }
    }

    let confirm = dialog.getByTestId('move-card-popover-move-button').first()
      .or(dialog.getByRole('button', { name: /^mover|move$/i }).first());
    await confirm.click();

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(300);
    await this.closeCard();

    const moved = this.cardInList(targetListName, title);
    try {
      await moved.scrollIntoViewIfNeeded().catch(() => {});
      await moved.waitFor({ timeout: 15000 });
    } catch {
      // fallback: drag & drop
      const source = this.cardByTitle(title);
      const targetList = this.listByName(targetListName).first();
      const dropZone = targetList.locator('[data-testid="list-cards"], [data-testid="list"]').first();
      await source.waitFor({ timeout: 5000 });
      await dropZone.waitFor({ timeout: 5000 });
      await this.page.dragAndDrop(await source.selector(), await dropZone.selector()).catch(() => {});
      await this.page.waitForLoadState('networkidle').catch(() => {});
      await moved.waitFor({ timeout: 5000 });
    }
  }

  // ---------- Archivar ----------
  async archiveCard(title) {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);
    let archiveBtn = this.page.getByTestId('card-back-archive-button').first();
    if (!(await archiveBtn.isVisible({ timeout: 1200 }).catch(() => false))) {
      const actions = this.page.getByRole('button', { name: /acciones|actions/i }).first();
      if (await actions.isVisible().catch(() => false)) await actions.click();
      archiveBtn = this.page.getByTestId('card-back-archive-button').first();
    }
    await archiveBtn.click();
    await this.closeCard();
  }

  // ---------- Portada ----------
  async setCardCoverImage(title, filePath) {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);

    let coverBtn = this.page.getByRole('button', { name: /^portada$|^cover$/i }).first();
    if (!(await coverBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      coverBtn = this.page.getByTestId('card-back-cover-button').first();
    }
    await coverBtn.click();

    const coverDlg = this.page.getByRole('dialog', { name: /portada|cover/i }).first()
      .or(this.page.getByRole('dialog').first());
    await coverDlg.waitFor({ timeout: 5000 }).catch(() => {});

    const uploadBtn = coverDlg.getByRole('button', { name: /subir|cargar|upload|choose file/i }).first();
    let used = false;
    if (await uploadBtn.isVisible({ timeout: 700 }).catch(() => false)) {
      used = await tryFileChooserClick(this.page, uploadBtn, filePath);
    }
    if (!used) {
      let fileInput = coverDlg.locator(SELECTORS.fileImage).first();
      if (!(await fileInput.count().catch(() => 0))) fileInput = coverDlg.locator(SELECTORS.fileAny).first();
      if (await fileInput.count()) await setOnAnyFileInput(coverDlg, filePath);
      else await setOnAnyFileInput(this.page, filePath);
    }

    await this.page.waitForTimeout(600);
    await this.closeCard();
  }

  async setCardCoverColor(title, colorName = 'green') {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);
    let coverBtn = this.page.getByRole('button', { name: /^portada$|^cover$/i }).first();
    if (!(await coverBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      coverBtn = this.page.getByTestId('card-back-cover-button').first();
    }
    await coverBtn.click();

    const coverDlg = this.page.getByRole('dialog', { name: /portada|cover/i }).first()
      .or(this.page.getByRole('dialog').first());
    await coverDlg.waitFor({ timeout: 5000 }).catch(() => {});

    const palette = coverDlg.getByTestId('color-palette').first().or(coverDlg.getByRole('radiogroup'));
    const opt = palette.getByRole('radio', { name: new RegExp(colorName, 'i') }).first()
      .or(palette.locator(`[data-color*="${colorName}"]`).first());
    await opt.click().catch(() => {});
    await this.closeCard();
  }

  // ---------- Adjuntar ----------
  async attachFileToCard(title, filePath) {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);
    const modal = this.page.getByRole('dialog').first();

    const existing = modal.locator(SELECTORS.fileAny).first();
    if (await existing.count().catch(() => 0)) {
      await existing.setInputFiles(absPath(filePath));
    } else {
      const attachBtn = modal.getByRole('button', { name: /adjuntar|attach|attachment/i }).first()
        .or(modal.getByText(/adjuntar|attachment|attach/i).locator('..').getByRole('button').first());

      let used = await tryFileChooserClick(this.page, attachBtn, filePath, 3000);
      if (!used) {
        await attachBtn.click().catch(() => {});
        const fromComputer = modal.getByRole('menuitem', { name: /computadora|computer/i }).first()
          .or(modal.getByRole('button', { name: /computadora|computer/i }).first());
        if (await fromComputer.isVisible({ timeout: 800 }).catch(() => false)) {
          used = await tryFileChooserClick(this.page, fromComputer, filePath, 3000);
          if (!used) await fromComputer.click().catch(() => {});
        }
        if (!used) {
          await setOnAnyFileInput(modal, filePath).catch(async () => {
            await setOnAnyFileInput(this.page, filePath);
          });
        }
      }
    }

    await modal.locator(SELECTORS.attachmentAny).first().waitFor({ state: 'visible', timeout: 5000 });
    await this.closeCard();
  }
}

module.exports = { BoardPage };
