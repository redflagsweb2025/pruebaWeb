// Helpers de verificación (puros, sin lógica de acciones)
const { SELECTORS } = require('../../utils/ui/boards.helpers');

async function expectCardHasAttachment(page, cardLocator, nameRegex = /.*/i) {
  // Abre detalle si es un link (opcional: el test podría ya estar en detalle)
  const modal = page.getByRole('dialog').first();

  // Si ya estamos en /c/ mantener; si no, puedes abrir el card antes de llamar este assert.
  // Espera que exista cualquier adjunto
  const any = modal.locator(SELECTORS.attachmentAny).first();
  await any.waitFor({ state: 'visible', timeout: 15000 });

  // Si se requiere validar nombre:
  if (nameRegex) {
    const byName = modal.locator(
      '[data-testid="attachment-name"],.attachment-thumbnail-details,.attachment-name,a[href*="/attachments/"]'
    ).filter({ hasText: nameRegex }).first();
    await byName.waitFor({ state: 'visible', timeout: 5000 });
  }
}

async function expectCardHasCoverOnBoard(page, cardLocator) {
  // Estar en el board (si estás en /c/ haz goBack antes en tu PageObject)
  await cardLocator.waitFor({ timeout: 8000 });
  await cardLocator.locator(SELECTORS.coverOnCard).first().waitFor({ timeout: 8000 });
}

module.exports = {
  expectCardHasAttachment,
  expectCardHasCoverOnBoard,
};
