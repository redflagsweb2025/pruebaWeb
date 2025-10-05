class LoginPage {
    constructor(page) {
        this.page = page;
        
        // Selectores
        this.loginButton = 'a[href="/login"]';
        this.emailInput = '#username';
        this.continueButton = '#login-submit';
        this.passwordInput = '#password';
        this.submitButton = '#login-submit';
        this.errorMessage = '#error > .error-message';
        this.userProfile = '[data-testid="header-member-menu-button"]';
    }

    /**
     * Navegar a la página de login de Trello
     */
    async navigateToLogin() {
        await this.page.goto('https://trello.com');
        await this.page.click(this.loginButton);
        await this.page.waitForTimeout(2000);
    }

    /**
     * Ingresar email
     * @param {string} email - Email del usuario
     */
    async enterEmail(email) {
        await this.page.fill(this.emailInput, email);
        await this.page.click(this.continueButton);
        await this.page.waitForTimeout(1000);
    }

    /**
     * Ingresar contraseña
     * @param {string} password - Contraseña del usuario
     */
    async enterPassword(password) {
        await this.page.fill(this.passwordInput, password);
        await this.page.click(this.submitButton);
        await this.page.waitForTimeout(2000);
    }

    /**
     * Login completo
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     */
    async login(email, password) {
        await this.navigateToLogin();
        await this.enterEmail(email);
        await this.enterPassword(password);
    }

    /**
     * Verificar si el login fue exitoso
     * @returns {boolean} - True si el login fue exitoso
     */
    async isLoginSuccessful() {
        try {
            await this.page.waitForSelector(this.userProfile, { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Obtener mensaje de error
     * @returns {string} - Texto del mensaje de error
     */
    async getErrorMessage() {
        try {
            await this.page.waitForSelector(this.errorMessage, { timeout: 3000 });
            return await this.page.textContent(this.errorMessage);
        } catch {
            return null;
        }
    }

    /**
     * Verificar si está en la página de login
     * @returns {boolean} - True si está en la página de login
     */
    async isOnLoginPage() {
        return await this.page.isVisible(this.emailInput);
    }
}

module.exports = LoginPage;