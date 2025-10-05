const { LoginPage } = require('./src/page/ui/login');

// En tu test
test('Login exitoso en Trello', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('tu_email@ejemplo.com', 'tu_contraseña');
    
    expect(await loginPage.isLoginSuccessful()).toBe(true);
});