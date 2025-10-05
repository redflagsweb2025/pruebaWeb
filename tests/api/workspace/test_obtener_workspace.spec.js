
const { test2, expect } = require('../../../fixtures/ws.fixtures');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { getWorkspaces, getWorkspaceWithoutId } = require('../../../src/services/workspace_page');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const {
  validateGetWorkspaceResponse,
  validateErrorByKind,
  resolveOrgIdFromPlaceholders,
} = require('../../../src/utils/api/workspace.helpers');

let schema200;
try {
  schema200 = require('../../../src/resources/schemas/workspace.schemaresp.json');
} catch { /* sin esquema */ }

const rows = loadCsv('src/resources/data/api/getworkspaces.data.csv');

for (const row of rows) {
  const { caseId, title, hdrCase = HDR_CASES.default, orgId = '', expectedStatus = '200', reason = '', marker } = row;
  const markers = String(marker || '')
    .split(/[,\s]+/)          // separa por espacio o coma
    .map(m => m.trim())
    .filter(Boolean);
   const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

    test2(`[DEL] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`, async ({ request, workspace }) => {
      
      const exp = Number(expectedStatus);

      // 1) Resolver orgId desde CSV/placeholders y limpiar comillas
      let resolvedOrgId = resolveOrgIdFromPlaceholders(orgId, workspace);

      // 2) Para 200 usa preferentemente SLUG; si no hay, cae a ID
      if (exp === 200) {
        if (!workspace || (!workspace.name && !workspace.id)) {
          throw new Error('No hay workspace del fixture (revisa KEY/TOKEN e import del fixture).');
        }
        resolvedOrgId = workspace?.name || workspace?.id;
      }

      console.log(`[${caseId}] id usado: ${resolvedOrgId}`);

      // 3) Hacer la llamada correcta según el caso
      let res;
      if (caseId === 'WS-API-APIRG-GET-004' || !resolvedOrgId) {
        // endpoint incorrecto (sin {orgId}); en el servicio usa /organization (singular) para forzar 404
        res = await getWorkspaceWithoutId(request, { hdrCase });
      } else {
        res = await getWorkspaces(request, { idOrName: resolvedOrgId, hdrCase });

        // Fallback: si esperábamos 200 y vino 400 "invalid id", intenta con el otro identificador (id<->slug)
        if (exp === 200 && res.status() === 400) {
          const txt = await res.text().catch(() => '');
          if (/invalid id/i.test(txt) && workspace) {
            const alt = resolvedOrgId === workspace.name ? workspace.id : workspace.name;
            if (alt) {
              console.warn(`[${caseId}] 400 invalid id con "${resolvedOrgId}", probando fallback "${alt}"`);
              res = await getWorkspaces(request, { idOrName: alt, hdrCase });
              // actualiza para logs/asertos si hace falta
              resolvedOrgId = alt;
            }
          }
        }
      }

      // 4) Status esperado
      await expectStatus(res, exp);

      // 5) Validaciones según positivo/negativo
      if (exp === 200) {
        await validateGetWorkspaceResponse(res, { schema: schema200, maxMs: 2000 });
      } else {
        await validateErrorByKind(res, reason, {
          token: process.env.TRELLO_TOKEN || process.env.API_TOKEN,
          key: process.env.TRELLO_KEY || process.env.API_KEY,
          maxMs: 2500,
        });
      }
    }
  );
}
