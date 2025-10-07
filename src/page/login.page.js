// src/page/ui/login/login.page.js
class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ----- Frame del widget Atlassian (cuando existe) -----
    this.authFrame = page.frameLocator(
      'iframe#aid-auth-widget, iframe[name="aid-auth-widget"], iframe[title*="Atlassian account"]'
    );

    // ----- Selectores ACCESIBLES (ROOT) -----
    this.usernameRoot = page.getByLabel(/correo|email/i);
    this.passwordRoot = page.getByLabel(/contraseñ|password/i);
    this.continueRoot = page.getByRole('button', { name: /continu(ar|e)/i });
    this.loginBtnRoot = page.getByRole('button', { name: /iniciar sesi[oó]n|log in|continu(ar|e)/i });

    // ----- Selectores ACCESIBLES (FRAME) -----
    this.usernameFrame = this.authFrame.getByLabel(/correo|email/i);
    this.passwordFrame = this.authFrame.getByLabel(/contraseñ|password/i);
    this.continueFrame = this.authFrame.getByRole('button', { name: /continu(ar|e)/i });
    this.loginBtnFrame = this.authFrame.getByRole('button', { name: /iniciar sesi[oó]n|log in|continu(ar|e)/i });

    // ----- Fallbacks EXACTOS (según tus capturas) -----
    // ROOT
    this.usernameRootExact = page.locator('input#username-uid1, input[name="username"][type="email"]');
    this.passwordRootExact = page.locator('input#password, input[name="password"][type="password"]');
    this.submitRootExact   = page.locator('button#login-submit'); // "Continuar" / "Iniciar sesión"
    // FRAME
    this.usernameFrameExact = this.authFrame.locator('input#username-uid1, input[name="username"][type="email"]');
    this.passwordFrameExact = this.authFrame.locator('input#password, input[name="password"][type="password"]');
    this.submitFrameExact   = this.authFrame.locator('button#login-submit');

    // Trello legacy (rara vez)
    this.userLegacy   = page.locator('input#user');
    this.continueTrel = page.locator('#login, button#login');

    // Avatar (varias variantes conocidas)
    this.avatar = page.locator([
      '[data-testid="header-member-menu-button"]',
      '[data-test-id="header-member-menu-button"]',
      '[aria-label="Open member menu"]',
      '[aria-label="Abrir menú de miembro"]',
      '[data-testid="header-member-button"]',
      '[data-test-id="header-member-button"]',
    ].join(', '));

    // Cookies (ES/EN)
    this.cookiesBtn = page
      .getByRole('button', { name: /accept all cookies|aceptar todas las cookies|aceptar|accept/i })
      .first();

    // Account picker / “Continuar como …”
    this.accountPickerBtnRoot  = page.getByRole('button', { name: /continuar como|continue as/i });
    this.accountPickerBtnFrame = this.authFrame.getByRole('button', { name: /continuar como|continue as/i });

    this.tryAnotherAccountRoot  = page.getByRole('link', { name: /usar otra cuenta|use another account/i });
    this.tryAnotherAccountFrame = this.authFrame.getByRole('link', { name: /usar otra cuenta|use another account/i });

    // Link “Log in with Atlassian” (vista Trello login)
    this.loginWithAtlassian = page.getByRole('link', { name: /log in with atlassian|iniciar sesión con atlassian/i });
  }

  async #dbg(step) {
    try {
      console.log(`[LOGIN] ${step} → ${this.page.url()}`);
      const t = await this.page.title().catch(() => '');
      console.log(`[LOGIN] title: ${t}`);
    } catch {}
  }

  async acceptCookiesIfAny() {
    try {
      if (await this.cookiesBtn.isVisible({ timeout: 1200 })) {
        await this.cookiesBtn.click();
      }
    } catch {}
  }

  // --- helpers para elegir ROOT vs FRAME dinámicamente ---
  async #inFrame() {
    try {
      const f = this.page.locator(
        'iframe#aid-auth-widget, iframe[name="aid-auth-widget"], iframe[title*="Atlassian account"]'
      );
      return (await f.count()) > 0;
    } catch { return false; }
  }
  async #ensureAuthFrame(timeout = 5000) {
    await this.page.waitForSelector(
      'iframe#aid-auth-widget, iframe[name="aid-auth-widget"], iframe[title*="Atlassian account"]',
      { timeout }
    ).catch(() => {});
    console.log('[LOGIN] inFrame?', await this.#inFrame());
  }

  async #username()   { return (await this.#inFrame()) ? this.usernameFrame   : this.usernameRoot; }
  async #password()   { return (await this.#inFrame()) ? this.passwordFrame   : this.passwordRoot; }
  async #continueBtn(){ return (await this.#inFrame()) ? this.continueFrame   : this.continueRoot; }
  async #loginBtn()   { return (await this.#inFrame()) ? this.loginBtnFrame   : this.loginBtnRoot; }
  async #acctPicker() { return (await this.#inFrame()) ? this.accountPickerBtnFrame : this.accountPickerBtnRoot; }
  async #tryAnother() { return (await this.#inFrame()) ? this.tryAnotherAccountFrame : this.tryAnotherAccountRoot; }

  // Fallbacks exactos dinámicos
  async #usernameExact() { return (await this.#inFrame()) ? this.usernameFrameExact : this.usernameRootExact; }
  async #passwordExact() { return (await this.#inFrame()) ? this.passwordFrameExact : this.passwordRootExact; }
  async #submitExact()   { return (await this.#inFrame()) ? this.submitFrameExact   : this.submitRootExact; }

  async login(email, password, { continueTo } = {}) {
    const target = continueTo || 'https://trello.com';

    await this.page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();
    await this.#dbg('goto target');

    if (await this._waitAvatar(3000)) return;

    if (this._isAtlassian(this.page.url())) {
      await this.#dbg('atlassian detected (phase A)');
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    await this.page.goto('https://trello.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();
    await this.#dbg('goto trello/login');

    if (await this.loginWithAtlassian.isVisible({ timeout: 1200 }).catch(() => false)) {
      await this.loginWithAtlassian.click();
      await this.#dbg('click "login with Atlassian"');
    }

    if (await this.userLegacy.isVisible({ timeout: 1200 }).catch(() => false)) {
      await this.userLegacy.fill(email);
      await this.continueTrel.click();
      await this.#dbg('legacy filled + continue');
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    if (this._isAtlassian(this.page.url())) {
      await this.#dbg('atlassian detected (phase B)');
      await this._doAtlassianFlow(email, password);
      if (await this._waitAvatar(20000)) return;
    }

    const atlUrl = 'https://id.atlassian.com/login?application=trello&continue=' + encodeURIComponent(target);
    await this.page.goto(atlUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.acceptCookiesIfAny();
    await this.#dbg('goto id.atlassian/login?continue=trello');

    if (await this.userLegacy.isVisible({ timeout: 1200 }).catch(() => false)) {
      await this.userLegacy.fill(email);
      await this.continueTrel.click();
      await this.#dbg('legacy on id.atlassian');
    }

    await this._doAtlassianFlow(email, password);
    if (await this._waitAvatar(25000)) return;

    // DIAGNÓSTICO: screenshot antes de fallar
    try {
      const fs = require('fs'); const path = require('path');
      const dir = path.resolve('test-artifacts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await this.page.screenshot({ path: path.join(dir, `login-fail-${Date.now()}.png`), fullPage: true });
    } catch {}
    await this.#dbg('FINAL FAIL');
    throw new Error('No se encontró formulario de login ni flujo authorize → Trello');
  }

  _isAtlassian(url) {
    return /(id|auth)\.atlassian\.com/i.test(url);
  }

  // --------- Flujo Atlassian con soporte de iframe ----------
  async _doAtlassianFlow(email, password) {
    await this._waitAuthorizeRedirectOrForm(30000);
    await this.#dbg('after _waitAuthorizeRedirectOrForm');
    await this.#ensureAuthFrame(8000); // detecta iframe si aparece

    // Account picker (si aparece)
    const acct = await this.#acctPicker();
    if (await acct.isVisible({ timeout: 1200 }).catch(() => false)) {
      await acct.click();
      await this.#dbg('account picker clicked');
      await this._waitAuthorizeRedirectOrForm(10000);
    }

    // “Usar otra cuenta” (si aparece)
    const tryAnother = await this.#tryAnother();
    if (await tryAnother.isVisible({ timeout: 1200 }).catch(() => false)) {
      await tryAnother.click();
      await this.#dbg('try another account');
    }

    // Paso 1: Email + Continuar (accesible → exacto)
    const user = await this.#username();
    const userEx = await this.#usernameExact();
    const cont = await this.#continueBtn();
    const contEx = await this.#submitExact();

    if (await user.isVisible({ timeout: 5000 }).catch(() => false) ||
        await userEx.isVisible({ timeout: 500 }).catch(() => false)) {
      await user.fill(email).catch(async () => { await userEx.fill(email); });
      await cont.click().catch(async () => { await contEx.click(); });
      await this.#dbg('email filled + continue');
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }

    // Paso 2: Password + Iniciar sesión (mismo botón #login-submit)
    const pass = await this.#password();
    const passEx = await this.#passwordExact();
    const loginAcc = await this.#loginBtn();
    const loginEx  = await this.#submitExact();

    const passVisible = await pass.isVisible({ timeout: 5000 }).catch(() => false) ||
                        await passEx.isVisible({ timeout: 500 }).catch(() => false);
    if (passVisible) {
      await pass.fill(password).catch(async () => { await passEx.fill(password); });

      const clicked = await loginAcc.click({ trial: true }).then(() => true).catch(() => false);
      if (clicked) await loginAcc.click();
      else await loginEx.click();

      await this.#dbg('password filled + submit');
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }

    // Espera salto a Trello o forzar
    await this._waitAuthorizeRedirectOrForm(30000);
    await this.#dbg('post-submit wait');
    if (!/trello\.com/i.test(this.page.url())) {
      await this.page.goto('https://trello.com', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.#dbg('force goto trello.com');
    }
  }

  async _waitAuthorizeRedirectOrForm(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const url = this.page.url();

      if (/trello\.com/i.test(url)) return;

      const inFrame = await this.#inFrame();
      const userVis = inFrame
        ? await this.usernameFrame.isVisible({ timeout: 500 }).catch(() => false)
        : await this.usernameRoot.isVisible({ timeout: 500 }).catch(() => false);
      const passVis = inFrame
        ? await this.passwordFrame.isVisible({ timeout: 500 }).catch(() => false)
        : await this.passwordRoot.isVisible({ timeout: 500 }).catch(() => false);
      if (userVis || passVis) return;

      // authorize/oidc
      if (/(id|auth)\.atlassian\.com\/.*(oauth|oidc|authorize)/i.test(url)) {
        try {
          await this.page.waitForURL(/(trello\.com|id\.atlassian\.com\/login)/i, { timeout: 5000 });
          return;
        } catch {}
      }

      await this.page.waitForTimeout(300);
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
  const page = this.page;

  // 1) Si no estamos logueados, nada que hacer
  const isLogged = await this._waitAvatar(1500);
  if (!isLogged) return;

  // 2) Abrir el menú del miembro (avatar)
  try {
    await this.avatar.click({ timeout: 3000 });
  } catch {
    // Fallbacks conocidos de botón de avatar
    const avatarBtn = page.locator([
      '[data-testid="header-member-menu-button"]',
      '[data-test-id="header-member-menu-button"]',
      '[aria-label="Open member menu"]',
      '[aria-label="Abrir menú de miembro"]',
      '[data-testid="header-member-button"]',
      '[data-test-id="header-member-button"]',
    ].join(', ')).first();
    await avatarBtn.click({ timeout: 3000 });
  }

  // 3) Esperar el popover del menú
  const popover = page.locator('[data-testid="account-menu-popover-content"]').first();
  await popover.waitFor({ timeout: 5000 }).catch(() => {}); // a veces no tiene testid pero igual sirve

  // 4) Click en "Cerrar sesión"
  //    Preferimos el data-testid exacto que se ve en tu captura
  let clicked = false;
  const logoutBtnByTestid = page.locator('button[data-testid="account-menu-logout"]').first();
  if (await logoutBtnByTestid.isVisible({ timeout: 1000 }).catch(() => false)) {
    await logoutBtnByTestid.click();
    clicked = true;
  }

  // Fallback por texto (ES/EN)
  if (!clicked) {
    const logoutByText = page.getByRole('button', { name: /cerrar sesi[óo]n|log out/i }).first()
      .or(page.locator('button:has-text("Cerrar sesión"), button:has-text("Log out")').first());
    if (await logoutByText.isVisible({ timeout: 1500 }).catch(() => false)) {
      await logoutByText.click();
      clicked = true;
    }
  }

  // 5) Confirmación (algunas UIs piden confirmar)
  const confirm = page.getByRole('button', { name: /cerrar sesi[óo]n|log out/i }).first();
  if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
    await confirm.click().catch(() => {});
  }

  // 6) Esperar redirección a login/Atlassian o que desaparezca el avatar
  try {
    await Promise.race([
      page.waitForURL(/(id\.atlassian\.com|trello\.com\/login)/i, { timeout: 5000 }),
      this.avatar.waitFor({ state: 'detached', timeout: 5000 }),
    ]);
    return;
  } catch {
    // Fallback duro: ir a /logout y forzar
    await page.goto('https://trello.com/logout', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForURL(/(id\.atlassian\.com|trello\.com\/login)/i, { timeout: 5000 }).catch(() => {});
  }
}

}

module.exports = { LoginPage };
