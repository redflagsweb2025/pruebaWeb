// src/page/ui/boards/utils.js
const path = require('path');

const reEscape = (s) => String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const absPath = (p) => (path.isAbsolute(p) ? p : path.resolve(p));

// Selectores centralizados (reusables)
const SELECTORS = {
  boardShell: [
    '[data-testid="board"]',
    '[data-testid="list"]',
    '[data-test-id="board-header"]',
    '[data-testid="board-header"]'
  ].join(', '),

  cardDetailAny: [
    '[data-testid="card-back"]',
    '[data-testid="card-detail-window"]',
    '#layer-manager-card-back',
    '[data-testid="layer-manager-card-back"]',
    '[data-testid="card-back-title"]',
    '[data-testid="card-back-name"]',
    '[role="dialog"] [data-testid="card-back-name"]',
    '[role="dialog"][data-testid="card-detail-window"]'
  ].join(', '),

  cardCloseBtn: [
    '[data-testid="CloseIcon"]',
    '[data-testid="PopoverDialogCloseButton"]',
    '[aria-label="Close"]',
    '[aria-label="Cerrar"]',
    'button:has(svg[aria-label="Close"])'
  ].join(', '),

  list: '[data-testid="list"]',
  listName: '[data-testid="list-name"]',

  card: '[data-testid="trello-card"]',
  cardName: 'a[data-testid="card-name"], [data-testid="card-name"]',

  coverBtnRole: 'button[name=/^portada$|^cover$/i]',
  coverBtnTestId: '[data-testid="card-back-cover-button"]',

  coverDialogByName: { role: 'dialog', name: /portada|cover/i },

  fileAny: 'input[type="file"]',
  fileImage: 'input[type="file"][accept*="image"]',

  attachmentAny: [
    '[data-testid="attachment-thumbnail"]',
    '[data-testid="attachment-name"]',
    'a.attachment-thumbnail-name',
    '[class*="AttachmentName"]',
    'a[href*="/attachments/"]'
  ].join(', '),

  // portada en card (vista board)
  coverOnCard: [
    '[data-testid="card-cover"]',
    '[class*="card-cover"]',
    '.card-cover',
    'img[src*="attachments"]',
    'div[style*="background-image"]'
  ].join(', '),
};

// --- Utils de archivos ---
async function tryFileChooserClick(page, button, filePath, timeout = 2500) {
  try {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser', { timeout }),
      button.click()
    ]);
    await fc.setFiles(absPath(filePath));
    return true;
  } catch { return false; }
}

async function setOnAnyFileInput(scope, filePath, timeout = 5000) {
  const input = scope.locator('input[type="file"]').first();
  await input.waitFor({ state: 'attached', timeout });
  await input.setInputFiles(absPath(filePath));
}

// --- Helpers de Board (locators puros y utilidades de card-back) ---
function listByName(page, name) {
  const safe = reEscape(name);
  return page.locator(SELECTORS.list).filter({
    has: page.getByTestId('list-name')
      .locator('*, :scope')
      .filter({ hasText: new RegExp(`^${safe}$`, 'i') }),
  });
}

function cardByTitle(page, title) {
  const safe = reEscape(title);
  return page.locator(SELECTORS.card).filter({
    has: page.locator(SELECTORS.cardName).filter({ hasText: new RegExp(`^${safe}$`, 'i') }),
  }).first();
}

function cardInList(page, listName, title) {
  const list = listByName(page, listName).first();
  const safeTitle = reEscape(title);
  return list.locator(SELECTORS.card).filter({
    has: page.locator(SELECTORS.cardName).filter({ hasText: new RegExp(`^${safeTitle}$`, 'i') }),
  }).first();
}

/**
 * ¿El detalle de tarjeta está abierto? (opcionalmente valida el título)
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} cardDetailAnyLocator
 * @param {string=} expectedTitle
 */
async function isCardDetailOpen(page, cardDetailAnyLocator, expectedTitle) {
  const visible = await cardDetailAnyLocator.first().isVisible({ timeout: 300 }).catch(() => false);
  const urlOpen = /\/c\/[A-Za-z0-9]+/i.test(page.url());
  if (!(visible || urlOpen)) return false;
  if (!expectedTitle) return true;

  const titleNode = page.locator('[data-testid="card-back-name"], [data-testid="card-back-title"]').first();
  let txt = (await titleNode.textContent().catch(() => ''))?.trim() || '';
  if (!txt) {
    const input = page.locator(
      '[data-testid="card-back-name-input"] input, input[aria-label="Card name"], textarea[aria-label="Card name"]'
    ).first();
    txt = (await input.inputValue().catch(() => ''))?.trim() || '';
  }
  return new RegExp(reEscape(expectedTitle), 'i').test(txt);
}

/**
 * Cierra el card-back (modal/drawer) y vuelve al board si quedó en /c/…
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} closeBtnLocator
 */
async function closeCard(page, closeBtnLocator) {
  if (await closeBtnLocator.first().isVisible({ timeout: 800 }).catch(() => false)) {
    await closeBtnLocator.first().click().catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
  if (/\/c\//.test(page.url())) {
    await page.goBack().catch(() => {});
  }
  await page.locator('[role="dialog"]').first()
    .waitFor({ state: 'detached', timeout: 5000 })
    .catch(() => {});
}

module.exports = {
  // utils base
  reEscape,
  absPath,
  tryFileChooserClick,
  setOnAnyFileInput,
  SELECTORS,

  // helpers de board
  listByName,
  cardByTitle,
  cardInList,
  isCardDetailOpen,
  closeCard,
};
