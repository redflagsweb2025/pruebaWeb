
const { test2, expect } = require('../../../fixtures/ws.fixtures');

const { loadCsv } = require('../../../src/utils/api/csv');
const { HDR_CASES } = require('../../../src/resources/headers/workspacesheaderssinjson');
const { updateWorkspacefix, getWorkspaces } = require('../../../src/services/workspace_page');
const { expectStatus } = require('../../../src/assertions/api/workspace.assert');
const { validateErrorByKind ,resolveOrgId} = require('../../../src/utils/api/workspace.helpers');


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

  // soporta múltiples marcadores: "smoke integracion" o "smoke,integracion"
  const markers = String(marker || '')
    .split(/[,\s]+/)
    .map(m => m.trim())
    .filter(Boolean);
  const tag = markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';

  test2(
    `[PUT] ${caseId}: ${title}${reason ? ` (${reason})` : ''} (hdr=${hdrCase})${tag}`,
    async ({ request, workspace }) => {
      const exp = Number(expectedStatus);

      // Para 200 usa SIEMPRE el id del fixture
      let idToUse = resolveOrgId(orgId, workspace);
      if (exp === 200) {
        if (!workspace?.id) throw new Error('No hay ID del workspace del fixture.');
        idToUse = workspace.id;
      }

      // Ejecutar PUT
      const res = await updateWorkspacefix(request, {
        idOrName: idToUse,
        displayName: displayName || undefined,
        name: name || undefined,
        desc: desc || undefined,
        website: website || undefined, // pasa website si viene en CSV
        hdrCase,
      });

      await expectStatus(res, exp);

      if (exp === 200) {
        // GET para verificar que se guardó lo editable
        const resGet = await getWorkspaces(request, {
          idOrName: idToUse,
          hdrCase: HDR_CASES.default,
        });
        await expectStatus(resGet, 200);
        const body = await resGet.json();

        if (displayName) expect(String(body.displayName)).toBe(String(displayName));
        if (name) {
          // Trello normaliza el slug; validamos contenga el “name” saneado
          expect(String(body.name))
            .toContain(String(name).replace(/[^a-z0-9-]/gi, '').toLowerCase());
        }
        if (desc) expect(String(body.desc || '')).toBe(String(desc));

        // Nota: Trello no siempre devuelve 'website' en este endpoint;
        // si tu API lo expone, puedes validar aquí:
        // if (website) expect(String(body.website || '')).toBe(String(website));
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
