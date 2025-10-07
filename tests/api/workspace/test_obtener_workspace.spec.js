
const { test2, expect } = require('../../../fixtures/ws.fixtures');
const { allure } = require('allure-playwright');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { getWorkspaces, getWorkspaceWithoutId } = require('../../../src/services/workspace.service');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const {
  validateGetWorkspaceResponse,
  validateErrorByKind,
  resolveOrgIdFromPlaceholders,
  attach,
  applyAllureMeta,
} = require('../../../src/utils/api/workspace.helpers');

let schema200;
try {
  schema200 = require('../../../src/resources/schemas/workspace.schemaresp.json');
} catch { /* sin esquema */ }

const rows = loadCsv('src/resources/data/api/getworkspaces.data.csv');



for (const row of rows) {
  const {
    caseId,
    title,
    hdrCase = HDR_CASES.default,
    orgId = '',
    expectedStatus = '200',
    reason = '',
    marker
  } = row;

  const markers = String(marker || '')
    .split(/[,\s]+/)
    .map(m => m.trim())
    .filter(Boolean);
  const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

  test2(
   
    `[GET] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`,
    async ({ request, workspace }) => {
      applyAllureMeta(row, { hdrCase, method: 'GET', resource: 'Workspace' });
      const exp = Number(expectedStatus);

      
      let resolvedOrgId = resolveOrgIdFromPlaceholders(orgId, workspace);

      await allure.step('PREP: Resolver identificador', async () => {
        
        if (exp === 200) {
          if (!workspace || (!workspace.name && !workspace.id)) {
            throw new Error('No hay workspace del fixture (revisa KEY/TOKEN e import del fixture).');
          }
          resolvedOrgId = workspace?.name || workspace?.id;
        }
        attach('Resolved orgId', { resolvedOrgId, csvOrgId: orgId });
        attach('Workspace Fixture (preview)', {
          id: workspace?.id,
          name: workspace?.name
        });
      });

      let res;

      
      if (caseId === 'WS-API-APIRG-GET-004' || !resolvedOrgId) {
        res = await allure.step('GET /organization (sin id) — endpoint incorrecto', async () => {
          const r = await getWorkspaceWithoutId(request, { hdrCase });
          attach('Response Status (GET wrong endpoint)', { status: r.status() });
          attach('Response Headers (GET wrong endpoint)', r.headers());
          attach('Response Body (GET wrong endpoint)', await r.text(), 'application/json');
          return r;
        });
      } else {
        res = await allure.step(`GET /organizations/${resolvedOrgId} — por idOrName`, async () => {
          const r = await getWorkspaces(request, { idOrName: resolvedOrgId, hdrCase });
          attach('Response Status (GET)', { status: r.status() });
          attach('Response Headers (GET)', r.headers());
          attach('Response Body (GET)', await r.text(), 'application/json');
          return r;
        });

        
        if (exp === 200 && res.status() === 400) {
          const txt = await res.text().catch(() => '');
          if (/invalid id/i.test(txt) && workspace) {
            const alt = resolvedOrgId === workspace.name ? workspace.id : workspace.name;
            if (alt) {
              await allure.step(`Fallback GET con alternativo (${alt})`, async () => {
                const r2 = await getWorkspaces(request, { idOrName: alt, hdrCase });
                attach('Response Status (GET fallback)', { status: r2.status() });
                attach('Response Headers (GET fallback)', r2.headers());
                attach('Response Body (GET fallback)', await r2.text(), 'application/json');
                res = r2; 
                resolvedOrgId = alt;
              });
            }
          }
        }
      }

      
      await allure.step('VALIDATE: Status esperado', async () => {
        await expectStatus(res, exp);
      });

      
      if (exp === 200) {
        await allure.step('VALIDATE: Schema + respuestas', async () => {
          await validateGetWorkspaceResponse(res, { schema: schema200, maxMs: 2000 });
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
