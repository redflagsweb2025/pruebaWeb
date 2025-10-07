// tests/api/workspace/test_eliminar_workspace.spec.js
const { test2, expect } = require('../../../fixtures/ws.fixtures');
const { allure } = require('allure-playwright');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { deleteWorkspacefix, getWorkspaces } = require('../../../src/services/workspace.service');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const { validateErrorByKind, resolveOrgId ,applyAllureMeta,attach} = require('../../../src/utils/api/workspace.helpers');

const rows = loadCsv('src/resources/data/api/deleteworkspaces.data.csv');


for (const row of rows) {
  const {
    caseId,
    title,
    hdrCase = HDR_CASES.default,
    orgId = '',
    expectedStatus = '200',
    reason = '',
    marker,
  } = row;

  const markers = String(marker || '')
    .split(/[,\s]+/)
    .map(m => m.trim())
    .filter(Boolean);
  const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

  test2(
    `[DEL] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`,
    async ({ request, workspace }) => {
      applyAllureMeta(row, { hdrCase, method: 'DELETE', resource: 'Workspace' });

      const exp = Number(expectedStatus);

      
      let idToUse = resolveOrgId(orgId, workspace);
      if (exp === 200) {
        if (!workspace?.id) throw new Error('No hay ID del workspace del fixture.');
        idToUse = workspace.id;
      }

      await allure.step('PREP: Resolver ID objetivo y contexto', async () => {
        attach('Workspace Fixture', workspace);
        attach('ID a eliminar', { idToUse });
        attach('Header Case', { hdrCase });
      });

      // ---------- DELETE ----------
      const res = await allure.step('DELETE /workspaces/:id — eliminar', async () => {
        const r = await deleteWorkspacefix(request, { idOrName: idToUse, hdrCase });
        attach('Response Status (DELETE)', { status: r.status() });
        attach('Response Headers (DELETE)', r.headers());
        attach('Response Body (DELETE)', await r.text(), 'application/json');
        return r;
      });

      await allure.step('VALIDATE: Status esperado (DELETE)', async () => {
        await expectStatus(res, exp);
      });

      if (exp === 200) {
        
        const resGet = await allure.step('GET /workspaces/:id — verificar no existencia', async () => {
          const g = await getWorkspaces(request, { idOrName: idToUse, hdrCase: HDR_CASES.default });
          attach('Response Status (GET post-delete)', { status: g.status() });
          attach('Response Body (GET post-delete)', await g.text(), 'application/json');
          return g;
        });

        await allure.step('VALIDATE: GET post-delete devuelve 404/400', async () => {
          expect([404, 400]).toContain(resGet.status()); // Trello a veces 400 "invalid id"
        });

      } else {
        await allure.step(`VALIDATE: Error esperado (${reason || 'GENERIC'})`, async () => {
          await validateErrorByKind(res, reason, {
            token: process.env.TRELLO_TOKEN || process.env.API_TOKEN,
            key: process.env.TRELLO_KEY || process.env.API_KEY,
            maxMs: 2500,
          });
        });
      }
    }
  );
}
