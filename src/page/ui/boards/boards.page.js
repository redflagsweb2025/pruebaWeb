// src/page/ui/boards/boards.page.js
const path = require('path');

const reEscape = (s) => String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class BoardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Cascarón del tablero
    this.boardShell = page.locator(
      [
        '[data-testid="board"]',
        '[data-testid="list"]',
        '[data-test-id="board-header"]',
        '[data-testid="board-header"]'
      ].join(', ')
    );

    // Cualquier “card back” visible (modal o drawer)
    this.cardDetailAny = page.locator(
      [
        '[data-testid="card-back"]',
        '[data-testid="card-detail-window"]',
        '#layer-manager-card-back',
        '[data-testid="layer-manager-card-back"]',
        '[data-testid="card-back-title"]',
        '[data-testid="card-back-name"]',
        '[role="dialog"] [data-testid="card-back-name"]',
        '[role="dialog"][data-testid="card-detail-window"]'
      ].join(', ')
    );

    // Botón cerrar del card back
    this.cardCloseBtn = page.locator(
      [
        '[data-testid="CloseIcon"]',
        '[data-testid="PopoverDialogCloseButton"]',
        '[aria-label="Close"]',
        '[aria-label="Cerrar"]',
        'button:has(svg[aria-label="Close"])'
      ].join(', ')
    );
  }

  // ---------- Board ----------
  async openBoard(shortUrl) {
    await this.page.goto(shortUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/trello\.com\/b\//, { timeout: 20000 }).catch(() => {});
    await this.boardShell.first().waitFor({ timeout: 20000 });
  }

  // ---------- Helpers ----------
  listByName(name) {
    const safe = reEscape(name);
    return this.page
      .locator('[data-testid="list"]')
      .filter({
        has: this.page
          .getByTestId('list-name')
          .locator('*, :scope')
          .filter({ hasText: new RegExp(`^${safe}$`, 'i') }),
      });
  }

  cardByTitle(title) {
    const safe = reEscape(title);
    return this.page
      .locator('[data-testid="trello-card"]')
      .filter({
        has: this.page
          .locator('a[data-testid="card-name"], [data-testid="card-name"]')
          .filter({ hasText: new RegExp(`^${safe}$`, 'i') }),
      })
      .first();
  }

  // Tarjeta con título exacto dentro de lista con nombre exacto
  cardInList(listName, title) {
    const safeList = reEscape(listName);
    const safeTitle = reEscape(title);

    const list = this.page.locator('[data-testid="list"]').filter({
      has: this.page
        .getByTestId('list-name')
        .locator('*, :scope')
        .filter({ hasText: new RegExp(`^${safeList}$`, 'i') }),
    }).first();

    return list
      .locator('[data-testid="trello-card"]')
      .filter({
        has: this.page
          .locator('a[data-testid="card-name"], [data-testid="card-name"]')
          .filter({ hasText: new RegExp(`^${safeTitle}$`, 'i') }),
      })
      .first();
  }

  async _isCardDetailOpen(expectedTitle) {
    const visible = await this.cardDetailAny.first().isVisible({ timeout: 300 }).catch(() => false);
    const urlOpen = /\/c\/[A-Za-z0-9]+/i.test(this.page.url());
    if (!(visible || urlOpen)) return false;
    if (!expectedTitle) return true;

    // Lee el título (texto o input)
    const titleNode = this.page
      .locator('[data-testid="card-back-name"], [data-testid="card-back-title"]')
      .first();

    let txt = (await titleNode.textContent().catch(() => ''))?.trim() || '';
    if (!txt) {
      const titleInput = this.page
        .locator(
          [
            '[data-testid="card-back-name-input"] input',
            'input[aria-label="Card name"]',
            'textarea[aria-label="Card name"]'
          ].join(', ')
        )
        .first();
      txt = (await titleInput.inputValue().catch(() => ''))?.trim() || '';
    }
    return new RegExp(reEscape(expectedTitle), 'i').test(txt);
  }

  async closeCard() {
    // Cierra modal/drawer
    if (await this.cardCloseBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await this.cardCloseBtn.first().click().catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    // Si estamos en /c/..., volver atrás
    if (/\/c\//.test(this.page.url())) {
      await this.page.goBack().catch(() => {});
    }
    await this.page.locator('[role="dialog"]').first()
      .waitFor({ state: 'detached', timeout: 5000 })
      .catch(() => {});
  }

  // ---------- Tarjetas ----------
  async addCardToList(listName, title, desc = '') {
    const list = this.listByName(listName);
    await list.first().waitFor({ timeout: 15000 });

    const addBtn = list.getByRole('button', { name: /add a card|añadir una tarjeta/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await list.locator('[data-testid="list-add-card-button"]').first().click();
    }

    await this.page.locator('[data-testid="list-card-composer-textarea"]').fill(title);

    const confirm = this.page.getByRole('button', { name: /add card|añadir tarjeta/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    } else {
      await this.page
        .locator('[data-testid="list-card-composer-add-card-button"]')
        .first()
        .click();
    }

    await this.cardByTitle(title).waitFor({ timeout: 10000 });
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
    await card.waitFor({ timeout: 15000 });
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

    // Espera corta a modal/drawer o /c/...
    const start = Date.now();
    while (Date.now() - start < 15000) {
      if (/\/c\/[A-Za-z0-9]+/i.test(this.page.url())) break;
      if (await this.cardDetailAny.first().isVisible({ timeout: 300 }).catch(() => false)) break;
      await this.page.waitForTimeout(200);
    }
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  // ---------- Mover ----------
  async moveCardToList(title, targetListName) {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);

    // Abre “Mover”
    let moveBtn = this.page.getByTestId('card-back-move-card-button').first();
    if (!(await moveBtn.isVisible({ timeout: 1200 }).catch(() => false))) {
      const actions = this.page.getByRole('button', { name: /acciones|actions/i }).first();
      if (await actions.isVisible().catch(() => false)) await actions.click();
      moveBtn = this.page.getByTestId('card-back-move-card-button').first();
    }
    await moveBtn.click();

    // Dialog de mover
    const dialog = this.page
      .getByRole('dialog')
      .filter({
        has: this.page.locator(
          '[data-testid="move-card-popover-move-button"], button:has-text("Mover"), button:has-text("Move")'
        ),
      })
      .first();
    await dialog.waitFor({ timeout: 10000 });

    // Input del selector de lista
    const inputContainer = dialog
      .getByTestId('move-card-popover-select-list-destination-select--input-container')
      .first();
    await inputContainer.click().catch(() => {});

    const input = dialog.locator('#move-card-list-select, input[data-testid="move-card-list-select"]').first();
    let usedDirectInput = false;

    if (await input.isVisible({ timeout: 800 }).catch(() => false)) {
      await input.fill('');
      await input.type(targetListName, { delay: 25 });
      usedDirectInput = true;
    } else {
      // Fallback: combobox genérico
      const combo = dialog.getByRole('combobox').first();
      if (await combo.isVisible({ timeout: 1000 }).catch(() => false)) {
        await combo.click();
        await this.page.keyboard.press('Control+A').catch(() => {});
        await this.page.keyboard.type(targetListName, { delay: 25 });
      } else {
        // Último fallback: select nativo
        const nativeSelect = dialog.locator('select[name="selectList"]').first();
        await nativeSelect.waitFor({ timeout: 4000 });
        await nativeSelect.selectOption({ label: targetListName });
      }
    }

    // Selección exacta si aplica listbox
    if (usedDirectInput) {
      let listbox = null;
      const listboxId = await input.getAttribute('aria-controls').catch(() => null);
      if (listboxId) listbox = dialog.locator(`#${listboxId}`);
      if (!listbox) listbox = dialog.getByRole('listbox').first();

      const opt = listbox
        .getByRole('option', { name: new RegExp(`^${reEscape(targetListName)}$`, 'i') })
        .first();

      if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
        await opt.click();
      } else {
        await this.page.keyboard.press('ArrowDown').catch(() => {});
        await this.page.keyboard.press('Enter').catch(() => {});
      }
    }

    // Confirmar
    let confirm = dialog.getByTestId('move-card-popover-move-button').first();
    if (!(await confirm.isVisible({ timeout: 600 }).catch(() => false))) {
      confirm = dialog.getByRole('button', { name: /^mover|move$/i }).first();
    }
    await confirm.click();

    // Verificación en la lista destino
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(300);
    await this.closeCard();

    const moved = this.cardInList(targetListName, title);
    try {
      await moved.scrollIntoViewIfNeeded().catch(() => {});
      await moved.waitFor({ timeout: 15000 });
    } catch {
      // Fallback: drag & drop directo
      const source = this.cardByTitle(title);
      const targetList = this.listByName(targetListName).first();
      const dropZone = targetList.locator('[data-testid="list-cards"], [data-testid="list"]').first();

      await source.waitFor({ timeout: 8000 });
      await dropZone.waitFor({ timeout: 8000 });

      await this.page.dragAndDrop(
        await source.selector(),
        await dropZone.selector()
      ).catch(() => {});

      await this.page.waitForLoadState('networkidle').catch(() => {});
      await moved.waitFor({ timeout: 15000 });
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

    // Botón “Portada”
    let coverBtn = this.page.getByRole('button', { name: /^portada$|^cover$/i }).first();
    if (!(await coverBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      coverBtn = this.page.getByTestId('card-back-cover-button').first();
    }
    await coverBtn.click();

    // Diálogo de portada
    const coverDlg = this.page.getByRole('dialog', { name: /portada|cover/i }).first();
    await coverDlg.waitFor({ timeout: 8000 }).catch(() => {});

    // Input file para portada
    const fileInput = coverDlg.locator('input[type="file"][accept*="image"]').first();
    await fileInput.setInputFiles(path.isAbsolute(filePath) ? filePath : path.resolve(filePath));

    // Espera preview
    await this.page.waitForTimeout(800);
    await this.closeCard();
  }

  async setCardCoverColor(title, colorName = 'green') {
    if (!(await this._isCardDetailOpen(title))) await this.openCard(title);

    let coverBtn = this.page.getByRole('button', { name: /^portada$|^cover$/i }).first();
    if (!(await coverBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      coverBtn = this.page.getByTestId('card-back-cover-button').first();
    }
    await coverBtn.click();

    const coverDlg = this.page.getByRole('dialog', { name: /portada|cover/i }).first();
    await coverDlg.waitFor({ timeout: 8000 }).catch(() => {});

    // Paleta de colores
    const palette = coverDlg.getByTestId('color-palette').first()
      .or(coverDlg.getByRole('radiogroup'));

    const opt = palette
      .getByRole('radio', { name: new RegExp(colorName, 'i') })
      .first()
      .or(palette.locator(`[data-color*="${colorName}"]`).first());

    await opt.click().catch(() => {});
    await this.closeCard();
  }

  // ---------- Adjuntar archivo (NUEVO) ----------
  /**
   * Adjunta un archivo a la tarjeta (título exacto).
   * Soporta UI en ES/EN y flujos alternos (botón "Adjuntar"/"Attach",
   * menú "Desde tu computadora"/"Computer", o input[type=file] directo).
   * @param {string} title
   * @param {string} filePath
   */
  async attachFileToCard(title, filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

  // Abre el detalle de la tarjeta si no está abierto
  if (!(await this._isCardDetailOpen(title))) {
    await this.openCard(title);
  }

  const modal = this.page.getByRole('dialog').first();

  // 1) Si ya hay un input[type=file] en DOM, úsalo directo (no requiere visibilidad)
  const existingAnyFileInput = modal.locator('input[type="file"]').first();
  if (await existingAnyFileInput.count().catch(() => 0)) {
    // adjunto sin exigir visible
    await existingAnyFileInput.setInputFiles(abs);
  } else {
    // 2) Click en "Adjuntar"/"Attach"
    const attachBtn =
      modal.getByRole('button', { name: /adjuntar|attach|attachment/i }).first()
        .or(modal.getByText(/adjuntar|attachment|attach/i).locator('..').getByRole('button').first());

    // Preferimos capturar el filechooser si el botón lo dispara
    let usedFileChooser = false;
    try {
      const [fc] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 3000 }),
        attachBtn.click()
      ]);
      await fc.setFiles(abs);
      usedFileChooser = true;
    } catch {
      // Si no hubo filechooser, continuamos
      await attachBtn.click().catch(() => {});
    }

    if (!usedFileChooser) {
      // 3) Si aparece menú, elige "Desde tu computadora"/"Computer"
      const fromComputer =
        modal.getByRole('menuitem', { name: /computadora|computer/i }).first()
          .or(modal.getByRole('button', { name: /computadora|computer/i }).first());

      if (await fromComputer.isVisible({ timeout: 800 }).catch(() => false)) {
        // de nuevo, intentamos con filechooser
        try {
          const [fc2] = await Promise.all([
            this.page.waitForEvent('filechooser', { timeout: 3000 }),
            fromComputer.click()
          ]);
          await fc2.setFiles(abs);
          usedFileChooser = true;
        } catch {
          await fromComputer.click().catch(() => {});
        }
      }

      if (!usedFileChooser) {
        // 4) Fallback final: buscar cualquier input file (aunque esté oculto) y setear
        //    - Primero en el modal
        let fileInput = modal.locator('input[type="file"]').first();
        if (!(await fileInput.count().catch(() => 0))) {
          //    - Si no, en toda la página
          fileInput = this.page.locator('input[type="file"]').first();
        }
        // esperamos que esté adjunto (no visible)
        await fileInput.waitFor({ state: 'attached', timeout: 5000 });
        await fileInput.setInputFiles(abs);
      }
    }
  }

  // 5) Espera confirmación visual de que hay un adjunto (nombre/thumbnail)
  const attachmentAppeared = modal.locator(
    [
      '[data-testid="attachment-thumbnail"]',
      '[data-testid="attachment-name"]',
      'a.attachment-thumbnail-name',
      'a[href*="/attachments/"]',
      '[class*="AttachmentName"]'
    ].join(', ')
  ).first();
  await attachmentAppeared.waitFor({ state: 'visible', timeout: 15000 });

  // (Opcional) cerrar el detalle
  await this.closeCard();
}

// Verifica que la tarjeta tenga al menos un adjunto cuyo nombre haga match
async expectCardHasAttachment(title, nameRegex = /.*/i) {
  if (!(await this._isCardDetailOpen(title))) {
    await this.openCard(title);
  }
  const modal = this.page.getByRole('dialog').first();

  // Espera a que aparezca cualquier adjunto
  const item = modal.locator(
    [
      '[data-testid="attachment-thumbnail"]',
      '[data-testid="attachment-name"]',
      'a.attachment-thumbnail-name',
      '[class*="AttachmentName"]',
      'a[href*="/attachments/"]'
    ].join(', ')
  ).first();
  await item.waitFor({ state: 'visible', timeout: 15000 });

  // Busca por nombre
  const nameNode = modal.locator(
    [
      '[data-testid="attachment-name"]',
      '.attachment-thumbnail-details',
      '.attachment-name',
      'a[href*="/attachments/"]'
    ].join(', ')
  ).filter({ hasText: nameRegex }).first();

  await nameNode.waitFor({ state: 'visible', timeout: 5000 });

  // Cierra el card-back para continuar el flujo
  await this.closeCard();
}


// Adjunta un archivo a la tarjeta (robusto: comentario → acciones → input global)
async attachFileToCardInComment(title, filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

  // Abre el detalle si no está
  if (!(await this._isCardDetailOpen(title))) {
    await this.openCard(title);
  }
  const modal = this.page.getByRole('dialog').first();

  // ---- helpers locales
  const tryFileChooserClick = async (btn) => {
    try {
      const [fc] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 2500 }),
        btn.click()
      ]);
      await fc.setFiles(abs);
      return true;
    } catch { return false; }
  };

  const trySetOnAnyInput = async () => {
    // primero en modal, luego global
    let input = modal.locator('input[type="file"]').first();
    if (!(await input.count().catch(() => 0))) {
      input = this.page.locator('input[type="file"]').first();
    }
    await input.waitFor({ state: 'attached', timeout: 5000 });
    await input.setInputFiles(abs);
    return true;
  };

  // ---- Estrategia A: editor de comentarios (si existe)
  try {
    // foco en el editor (distintas variantes)
    const commentBox =
      modal.getByRole('textbox', { name: /escribe un comentario|write a comment/i }).first()
        .or(modal.locator('[data-testid="comment-composer"] [contenteditable="true"]').first())
        .or(modal.locator('[aria-label="Editor"] [contenteditable="true"]').first())
        .or(modal.locator('[contenteditable="true"]').first());

    if (await commentBox.count()) {
      await commentBox.click().catch(() => {});
      // toolbar variantes (no siempre data-testid fijo)
      const toolbar =
        modal.locator('[data-testid="ak-editor-main-toolbar"]').first()
          .or(modal.locator('[aria-label="Editor"] [role="toolbar"]').first())
          .or(modal.locator('[role="toolbar"]').first());

      // botón de adjuntar en toolbar o cercano
      const attachBtn =
        toolbar.locator('button[aria-label="Attach and insert link"]').first()
          .or(toolbar.getByRole('button', { name: /attach and insert link|adjuntar|insertar vínculo|attachment/i }).first())
          .or(modal.getByRole('button', { name: /attach and insert link|adjuntar|insertar vínculo|attachment/i }).first());

      if (await attachBtn.count()) {
        if (await tryFileChooserClick(attachBtn)) {
          // listo → verificación
          const chip = modal.locator(
            '[data-testid="attachment-thumbnail"],[data-testid="attachment-name"],.attachment-thumbnail-details,a[href*="/attachments/"]'
          ).first();
          await chip.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
          // publicar comentario si hay botón
          const saveBtn = modal.getByRole('button', { name: /guardar|save|añadir comentario|add comment/i }).first();
          if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click().catch(() => {});
          await this.closeCard();
          return;
        }
      }
    }
  } catch (_) { /* seguimos con B */ }

  // ---- Estrategia B: botón "Adjuntar" del card-back (acciones/attachments)
  try {
    const attachActionBtn =
      modal.getByRole('button', { name: /adjuntar|attach|attachment/i }).first()
        .or(modal.locator('button:has-text("Adjuntar"),button:has-text("Attach")').first());

    if (await attachActionBtn.count()) {
      if (!(await tryFileChooserClick(attachActionBtn))) {
        // quizá abre menú "Desde tu computadora/Computer"
        const fromComputer =
          modal.getByRole('menuitem', { name: /computadora|computer/i }).first()
            .or(modal.getByRole('button',   { name: /computadora|computer/i }).first());

        if (await fromComputer.isVisible({ timeout: 800 }).catch(() => false)) {
          if (!(await tryFileChooserClick(fromComputer))) {
            await fromComputer.click().catch(() => {});
          }
        }
        // si no hubo filechooser en ninguno, set en cualquier input
        await trySetOnAnyInput();
      }

      // verificación: aparece el attachment
      const appeared = modal.locator(
        '[data-testid="attachment-thumbnail"],[data-testid="attachment-name"],.attachment-thumbnail-details,a[href*="/attachments/"]'
      ).first();
      await appeared.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      await this.closeCard();
      return;
    }
  } catch (_) { /* seguimos con C */ }

  // ---- Estrategia C: último recurso → cualquier input[type=file] en DOM
  await trySetOnAnyInput();

  const appeared = modal.locator(
    '[data-testid="attachment-thumbnail"],[data-testid="attachment-name"],.attachment-thumbnail-details,a[href*="/attachments/"]'
  ).first();
  await appeared.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await this.closeCard();
}

// Verifica que la tarjeta tenga portada al volver al board
async expectCardHasCover(title) {
  // Si estamos en /c/... volvemos al board
  if (/\/c\//.test(this.page.url())) {
    await this.page.goBack().catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  // Localiza la tarjeta por su título
  const card = this.cardByTitle(title);
  await card.waitFor({ timeout: 8000 });

  // La portada suele renderizar como imagen/thumbnail o bg-image
  const coverOnCard = card.locator(
    [
      '[data-testid="card-cover"]',
      '[class*="card-cover"]',
      '.card-cover',
      'img[src*="attachments"]',
      'div[style*="background-image"]'
    ].join(', ')
  ).first();

  await coverOnCard.waitFor({ timeout: 8000 });
}



}

module.exports = { BoardPage };
