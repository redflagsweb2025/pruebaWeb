const { test2, expect } = require('../../../fixtures/ws.fixtures');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { deleteWorkspacefix, getWorkspaces } = require('../../../src/services/workspace_page');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const { validateErrorByKind,resolveOrgId } = require('../../../src/utils/api/workspace.helpers');

const rows = loadCsv('src/resources/data/api/deleteworkspaces.data.csv');

for (const row of rows) {
const { caseId, title, hdrCase = HDR_CASES.default, orgId = '', expectedStatus = '200', reason = '', marker } = row;
  const markers = String(marker || '')
    .split(/[,\s]+/)          // separa por espacio o coma
    .map(m => m.trim())
    .filter(Boolean);
   const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

    test2(`[DEL] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`, async ({ request, workspace }) => {
    const exp = Number(expectedStatus);

    // Para 200 usa SIEMPRE el id del fixture
    let idToUse = resolveOrgId(orgId, workspace);
    if (exp === 200) {
      if (!workspace?.id) throw new Error('No hay ID del workspace del fixture.');
      idToUse = workspace.id;
    }

    // Ejecutar DELETE
    const res = await deleteWorkspacefix(request, { idOrName: idToUse, hdrCase });
    await expectStatus(res, exp);

    if (exp === 200) {
      // Verifica que ya no exista (GET → 404)
      const resGet = await getWorkspaces(request, { idOrName: idToUse, hdrCase: HDR_CASES.default });
      expect([404, 400]).toContain(resGet.status()); // Trello a veces devuelve 400 "invalid id" tras borrar
    } else {
      await validateErrorByKind(res, reason, {
        token: process.env.TRELLO_TOKEN || process.env.API_TOKEN,
        key: process.env.TRELLO_KEY || process.env.API_KEY,
        maxMs: 2500,
      });
    }
  });
}
