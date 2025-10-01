// fixtures/workspace.fixture.js
const { test: base, expect } = require('@playwright/test');
const { createWorkspace, deleteWorkspace } = require('./src/services/workspace_page');

const hdrMatrix = require('../../src/resources/data/api/headers.matrix.json');
const LOG_NS = '[workspace-fixture]';
const ts = () => new Date().toISOString();

const test = base.extend({
  // nota: añadimos "testInfo" como 3er argumento del fixture
  workspace: async ({ request }, use, testInfo) => {
    const logs = [];
    const push = (level, msg, meta) => {
      const line = `${level} ${ts()} ${LOG_NS} ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      logs.push(line);
      console.log(line); // en terminal solo se mostrará si corres con --verbose o si el test falla
    };

    await testInfo.step('INICIO fixture: crear workspace', async () => {
      const nameSuffix = Date.now();
      const payload = { displayName: `WS_TEST_${nameSuffix}`, name: `ws-test-${nameSuffix}` };

      const resCreate = await createWorkspace(request, payload);
      const statusCreate = resCreate.status();

      if (statusCreate !== 200) {
        push('ERROR', 'No se pudo crear el workspace', { status: statusCreate, payload });
        throw new Error('❌ No se pudo crear el workspace. Status: ' + statusCreate);
      }

      const workspace = await resCreate.json();
      push('INFO', 'Workspace creado', { id: workspace.id, name: workspace.name });

      // Entregar el recurso al test
      await use(workspace);

      // Teardown
      await testInfo.step('FIN fixture: eliminar workspace', async () => {
        try {
          const resDel = await deleteWorkspace(request, workspace.id);
          const statusDel = resDel.status();
          if (statusDel !== 200) {
            push('WARN', 'No se pudo eliminar el workspace', { id: workspace.id, status: statusDel });
          } else {
            push('INFO', 'Workspace eliminado OK', { id: workspace.id });
          }
        } catch (err) {
          push('WARN', 'Excepción al eliminar workspace', { id: workspace.id, error: String(err) });
        }
      });
    });

    // Adjuntar el log al reporte (visible SIEMPRE en el HTML report)
    await testInfo.attach('workspace-fixture.log', {
      body: logs.join('\n'),
      contentType: 'text/plain',
    });
  },
});



function materializeHeaders(hdrCase) {
  const tpl = hdrMatrix[hdrCase] || {};
  const TOKEN = process.env.TRELLO_TOKEN || '';
  // Reemplaza ${TOKEN} en cualquier valor
  const out = {};
  for (const [k, v] of Object.entries(tpl)) {
    out[k] = typeof v === 'string' ? v.replace('${TOKEN}', TOKEN) : v;
  }
  return out;
}


module.exports = { test, expect,materializeHeaders };
