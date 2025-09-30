// workspace.fixture.js (CJS)
const { test: base, expect } = require('@playwright/test');
const { createWorkspace, deleteWorkspace } = require('./src/services/workspace_page'); // ajusta la ruta según tu árbol

const test = base.extend({
  workspace: async ({ request }, use) => {
    // Crear workspace de prueba
    const nameSuffix = Date.now();
    const payload = {
      displayName: `WS_TEST_${nameSuffix}`,
      name: `ws-test-${nameSuffix}`
    };

    const resCreate = await createWorkspace(request, payload);
    if (resCreate.status() !== 200) {
      throw new Error('❌ No se pudo crear el workspace. Status: ' + resCreate.status());
    }
    const workspace = await resCreate.json();

    // Pasar el workspace al test
    await use(workspace);

    // Eliminar workspace al finalizar
    const resDel = await deleteWorkspace(request, workspace.id);
    if (resDel.status() !== 200) {
      console.warn(`⚠️ No se pudo eliminar el workspace ${workspace.id}. Status: ${resDel.status()}`);
    }
  },
});

// Exporta test y expect
module.exports = { test, expect };