
const { test2, expect } = require('../../../fixtures/ws.fixtures');
const { allure } = require('allure-playwright');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { updateWorkspacefix, getWorkspaces } = require('../../../src/services/workspace.service');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const { validateErrorByKind, resolveOrgId,attach ,applyAllureMeta} = require('../../../src/utils/api/workspace.helpers');


const rows = loadCsv('src/resources/data/api/updatews.data.csv');

for (const row of rows) {
  const {
    caseId,
    title,
    hdrCase = HDR_CASES.default,
    orgId = '',
    displayName,
    name,
    desc,
    website,
    expectedStatus = '200',
    reason = '',
    marker,
  } = row;

  // Tags @smoke / @integration
  const markers = String(marker || '')
    .split(/[,\s]+/)
    .map(m => m.trim())
    .filter(Boolean);
  const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

  test2(
    `[PUT] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`,
    async ({ request, workspace }) => {
      applyAllureMeta(row, { hdrCase, method: 'PUT', resource: 'Workspace' });


      const exp = Number(expectedStatus);

      
      let idToUse = resolveOrgId(orgId, workspace);
      if (exp === 200) {
        if (!workspace?.id) throw new Error('No hay ID del workspace del fixture.');
        idToUse = workspace.id;
      }

      const payload = {
        idOrName: idToUse,
        displayName: displayName || undefined,
        name: name || undefined,
        desc: desc || undefined,
        website: website || undefined,
        hdrCase,
      };

      await allure.step('PREP: Construir payload y contexto', async () => {
        attach('Payload (request)', payload);
        attach('Workspace Fixture', workspace);
      });

      // ---------- PUT ----------
      const res = await allure.step('PUT /workspace — actualizar', async () => {
        const response = await updateWorkspacefix(request, payload);
        attach('Response Status (PUT)', { status: response.status() });
        attach('Response Headers (PUT)', response.headers());
        attach('Response Body (PUT)', await response.text(), 'application/json');
        return response;
      });

      await allure.step('VALIDATE: Status esperado', async () => {
        await expectStatus(res, exp);
      });

      if (exp === 200) {
        // ---------- GET ----------
        const resGet = await allure.step('GET /workspace/:id — verificar actualización', async () => {
          const g = await getWorkspaces(request, {
            idOrName: idToUse,
            hdrCase: HDR_CASES.default,
          });
          attach('Response Status (GET)', { status: g.status() });
          attach('Response Body (GET)', await g.text(), 'application/json');
          return g;
        });

        await allure.step('VALIDATE: Status GET', async () => {
          await expectStatus(resGet, 200);
        });

        const body = await resGet.json();

        await allure.step('VALIDATE: Campos actualizados', async () => {
          if (displayName) {
            expect(String(body.displayName)).toBe(String(displayName));
          }
          if (name) {
            expect(String(body.name)).toContain(
              String(name).replace(/[^a-z0-9-]/gi, '').toLowerCase()
            );
          }
          if (desc) expect(String(body.desc || '')).toBe(String(desc));
          attach('Body final (GET)', body);
        });

      } else {
        await allure.step('VALIDATE: Error esperado', async () => {
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
