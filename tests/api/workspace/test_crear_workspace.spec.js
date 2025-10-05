const { test } = require('../../../fixtures/ws.fixtures');
const { allure } = require('allure-playwright');

const { createWorkspace, getWorkspace } =
  require('../../../src/services/workspace_page');

const { loadCsv } = require('../../../src/utils/api/csv');

const { HDR_CASES, materializeHeaders, expectedStatusFor } =
  require('../../../src/resources/headers/workspace.headers');

const { buildValidFromRow, buildInvalidFromRow } =
  require('../../../src/resources/payloads/workspace/workspace.payloads');

const { expectStatus, expectStatusIn } =
  require('../../../src/assertions/api/workspace.assert');

const {
  validateCreateWorkspaceResponse,
  validateErrorByKind,
  tagsFrom,
  attach,
  applyAllureMeta,
  allureSafe ,
} = require('../../../src/utils/api/workspace.helpers');

const rows = loadCsv('src/resources/data/api/workspace.data.csv'); // cargar una sola vez
const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;
const BAD_TOKEN = 'BAD_TOKEN';

let schemaCreate;
try {
  schemaCreate = require('../../../src/resources/schemas/workspace.schemaresp.json');
} catch { /* sin esquema */ }
/*
/** Convierte "smoke integracion" o "smoke,integracion" -> " @smoke @integracion" */


test.describe.parallel('Crear Workspaces API', () => {
  if (!rows || rows.length === 0) {
    test('CSV vacío - placeholder', () => test.skip(true, 'No hay filas en el CSV'));
    return;
  }

  // ========== MATRIZ HDR_CASES ==========
  for (const hdrCase of HDR_CASES) {
    test.describe(`hdr=${hdrCase}`, () => {

      // -------- VÁLIDOS × TODAS LAS VARIANTES DE AUTH --------
      for (const row of rows) {
        if (row.type !== 'valid') continue;

        const tag = tagsFrom(row.marker);

        test(
          `Crear workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})${tag}`,
          async ({ request, cleaner }, testInfo) => {

            applyAllureMeta(row, { hdrCase, method: 'POST', resource: 'Workspace' });

            // headers “extra” (no auth). Trello usa auth por URL:
            const headers = materializeHeaders(hdrCase);

            // variantes de auth por URL
            const authOpts =
              hdrCase === 'noAuth'   ? { includeToken: false } :
              hdrCase === 'noKey'    ? { includeKey:   false } :
              hdrCase === 'badToken' ? { token: BAD_TOKEN } :
              {};

            const payload  = buildValidFromRow(row, uniq(testInfo));
            const expected = expectedStatusFor(row, hdrCase);

            await allure.step('PREP: Construir payload y headers', async () => {
              attach('Request Headers (extra)', headers);
              attach('Auth Options', authOpts);
              attach('Payload (request)', payload);
              attach('Expected Status', { expected });
            });

            // ---------- CREATE ----------
            const r = await allure.step('POST /workspaces — crear', async () => {
              const resp = await createWorkspace(request, payload, { headers, auth: authOpts });
              attach('Response Status (create)', { status: resp.status() });
              attach('Response Headers (create)', resp.headers());
              attach('Response Body (create)', await resp.text(), 'application/json');
              return resp;
            });

            // ---------- STATUS ----------
            await allure.step('VALIDATE: status de creación', async () => {
              await expectStatus(r, expected);
            });

            // Derivar "kind" para los casos que fallan por variante de auth
            const errorKind =
              hdrCase === 'noKey'   ? 'NO_KEY'
            : hdrCase === 'noAuth'  ? 'NO_TOKEN'
            : hdrCase === 'badToken'? 'GENERIC'
            : 'GENERIC';

            if (expected >= 200 && expected < 300) {
              // ---------- ÉXITO ----------
              const body = await allure.step('VALIDATE: schema + performance', async () => {
                const b = await validateCreateWorkspaceResponse(r, payload, {
                  schema: schemaCreate, // quita si no tienes esquema
                  maxMs: 1500,
                });
                attach('Parsed Body (create)', b);
                return b;
              });

              // Registrar ID para teardown automático del fixture
              await allure.step('CLEANUP: registrar id para teardown', async () => {
                attach('Created ID', { id: body.id });
                cleaner(body.id);
              });

              // ---------- GET ----------
              const g = await allure.step('GET /workspaces/:id — verificar', async () => {
                const resp = await getWorkspace(request, body.id, { headers, auth: authOpts });
                attach('Response Status (get)', { status: resp.status() });
                attach('Response Headers (get)', resp.headers());
                attach('Response Body (get)', await resp.text(), 'application/json');
                return resp;
              });

              await allure.step('VALIDATE: status GET', async () => {
                await expectStatusIn(g, [200]);
              });

            } else if (expected >= 400) {
              // ---------- ERROR TAMBIÉN EN "VÁLIDOS" POR VARIANTE HDR ----------
              await allure.step(`VALIDATE: error esperado (${errorKind})`, async () => {
                await validateErrorByKind(r, errorKind, { maxMs: 2000 });
              });
            }
          }
        );
      }

      // -------- INVÁLIDOS × SOLO DEFAULT --------
      if (hdrCase === 'default') {
        for (const row of rows) {
          if (row.type !== 'invalid') continue;

          const tagInv = tagsFrom(row.marker);

          test(
            (`POST /workspaces [INVALID] ${row.caseId || ''}${tagInv ? ' ' + tagInv : ''}`).trim(),
            async ({ request }, testInfo) => {

              //applyAllureMeta(row, 'default');
              applyAllureMeta(row, { hdrCase: 'default', method: 'POST', resource: 'Workspace' });

              const payload = buildInvalidFromRow(row, uniq(testInfo));
              const exp = Number.isFinite(Number(row.expectedStatus))
                ? Number(row.expectedStatus)
                : 400;

              await allure.step('PREP: Payload inválido', async () => {
                attach('Payload inválido (request)', payload);
                attach('Expected Status', { expected: exp });
              });

              const r = await allure.step('POST /workspaces — invalid payload', async () => {
                const resp = await createWorkspace(request, payload); // default auth
                attach('Response Status (invalid create)', { status: resp.status() });
                attach('Response Headers (invalid create)', resp.headers());
                attach('Response Body (invalid create)', await resp.text(), 'application/json');
                return resp;
              });

              await allure.step('VALIDATE: status esperado inválido', async () => {
                await expectStatus(r, exp);
              });

              // Derivar kind desde el payload inválido (sin usar row.reason)
              const needsDisplay =
                payload?.displayName === undefined ||
                (typeof payload?.displayName === 'string' && payload.displayName.trim().length === 0);

              const kind = needsDisplay ? 'DISPLAY_REQUIRED' : 'GENERIC';

              await allure.step(`VALIDATE: tipo de error (${kind})`, async () => {
                await validateErrorByKind(r, kind, { maxMs: 2000 });
              });
            }
          );
        }
      }
    });
  }
});
