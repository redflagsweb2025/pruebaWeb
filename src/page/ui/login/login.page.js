// src/page/ui/login/login.page.js
class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Atlassian login
    this.username = page.locator('input#username');
    this.password = page.locator('input#password');
    this.submit   = page.locator('#login-submit');

    // Trello legacy
    this.userLegacy   = page.locator('input#user');
    this.continueTrel = page.locator('#login');

    // Avatar (varias variantes de test id)
    this.avatar = page.locator(
      '[data-testid="header-member-menu-button"], [data-test-id="header-member-menu-button"]'
    );

    // Botones de cookies (Trello/Atlassian, ES/EN)
    this.cookiesBtn = page
      .getByRole('button', { name: /accept all cookies|aceptar todas las cookies|aceptar|accept/i })
      .first();
  }

  async acceptCookiesIfAny() {
    try {
      if (await this.cookiesBtn.isVisible({ timeout: 1500 })) {
        await this.cookiesBtn.click();
      }
    } catch {}
  }

  async login(email, password, { continueTo } = {}) {
    const target = continueTo || 'https://trello.com';

    // 1) Ir primero al destino (board/home). Si no hay sesión, Trello redirige a Atlassian.
    await this.page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();

    // ¿Ya estamos loggeados en Trello?
    if (await this._waitAvatar(3000)) return;

    // ¿Nos mandaron a Atlassian directamente?
    if (this._isAtlassian(this.page.url())) {
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    // 2) Forzar Trello /login (esto suele redirigir a Atlassian con continue back a Trello)
    await this.page.goto('https://trello.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();

    // Trello legacy
    if (await this.userLegacy.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.userLegacy.fill(email);
      await this.continueTrel.click();
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    // Atlassian normal
    if (this._isAtlassian(this.page.url())) {
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    // 3) Último intento: ir a Atlassian con continue explícito al board/home
    const atlUrl =
      'https://id.atlassian.com/login?application=trello&continue=' +
      encodeURIComponent(target);
    await this.page.goto(atlUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();

    if (await this.userLegacy.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.userLegacy.fill(email);
      await this.continueTrel.click();
    }
    await this._doAtlassianFlow(email, password);
    if (await this._waitAvatar(20000)) return;

    throw new Error('No se encontró formulario de login ni flujo authorize → Trello');
  }

  _isAtlassian(url) {
    return /id\.atlassian\.com/i.test(url);
  }

  async _doAtlassianFlow(email, password) {
    // Puede aparecer primero authorize (pantalla en blanco), esperamos jump a /login o a trello
    await this._waitAuthorizeRedirect();

    // username → continue
    if (await this.username.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.username.fill(email);
      await this.submit.click();
    }

    // password → submit
    if (await this.password.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.password.fill(password);
      await this.submit.click();
    }

    // Tras login, atlassian redirige a trello (home/board)
    await this._waitAuthorizeRedirect();
  }

  async _waitAuthorizeRedirect() {
    // Si estamos en authorize, espera salto a trello.com
    if (/id\.atlassian\.com\/login\/authorize/i.test(this.page.url())) {
      await this.page.waitForURL(/trello\.com/i, { timeout: 20000 }).catch(() => {});
    }
  }

  async _waitAvatar(timeout = 5000) {
    try {
      await this.acceptCookiesIfAny();
      await this.avatar.waitFor({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  async logoutIfPossible() {
    try {
      if (await this.avatar.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.avatar.click();
        const logoutItem = this.page.getByRole('menuitem', { name: /log out|cerrar sesión/i });
        await logoutItem.click();
        const confirm = this.page.getByRole('button', { name: /log out|cerrar sesión/i });
        if (await confirm.isVisible({ timeout: 1200 }).catch(() => false)) {
          await confirm.click();
        }
      }
    } catch {}
  }
}

module.exports = { LoginPage };

