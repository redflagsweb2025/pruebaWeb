const { SELECTORS } = require('../../utils/ui/boards.helpers');
//-------Verificar si es visible el modal del card
async function expectCardHasAttachment(page, cardLocator, nameRegex = /.*/i) {
  
  const modal = page.getByRole('dialog').first();

  const any = modal.locator(SELECTORS.attachmentAny).first();
  await any.waitFor({ state: 'visible', timeout: 5000 });

  // Si se requiere validar nombre:
  if (nameRegex) {
    const byName = modal.locator(
      '[data-testid="attachment-name"],.attachment-thumbnail-details,.attachment-name,a[href*="/attachments/"]'
    ).filter({ hasText: nameRegex }).first();
    await byName.waitFor({ state: 'visible', timeout: 5000 });
  }
}
//------verificar la portada 
async function expectCardHasCoverOnBoard(page, cardLocator) {
  
  await cardLocator.waitFor({ timeout: 5000 });
  await cardLocator.locator(SELECTORS.coverOnCard).first().waitFor({ timeout: 8000 });
}

module.exports = {
  expectCardHasAttachment,
  expectCardHasCoverOnBoard,
};
