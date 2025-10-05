// ✅ Usa el fixture con teardown individual por test
const { test } = require('../../../api.fixtures');

// services (API Trello refactor)
const { createWorkspace, getWorkspace /*, deleteWorkspace*/ } =
  require('../../../src/services/workspace_page');

// utils
const { loadCsv } = require('../../../src/utils/api/csv');

// headers/auth (variantes de auth y headers “extra”)
const { HDR_CASES, materializeHeaders, expectedStatusFor } =
  require('../../../src/resources/headers/workspace.headers');

// builders
const { buildValidFromRow, buildInvalidFromRow } =
  require('../../../src/resources/payloads/workspace/workspace.payloads');

// asserts usados aquí
const { expectStatus, expectStatusIn } =
  require('../../../src/assertions/api/workspace.assert');

// helpers (éxito + errores)
const {
  validateCreateWorkspaceResponse,
  validateErrorByKind, // <-- asegúrate que lo exporte tu workspace.helpers.js
} = require('../../../src/utils/api/workspace.helpers');

// ----------------- helpers locales -----------------
const rows = loadCsv('src/resources/data/api/workspace.data.csv'); // cargar una sola vez
const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;
const BAD_TOKEN = process.env.BAD_TOKEN;

// (opcional) esquema si lo tienes
let schemaCreate;
try {
  schemaCreate = require('../../../src/resources/schemas/workspace.schemaresp.json');
} catch { /* sin esquema */ }

// ======================================================================
// ÚNICO SUITE: CSV × Headers/Auth parametrizado
// - Válidos: corren con TODOS los HDR_CASES (incluyendo 'default')
// - Inválidos: corren SOLO con 'default'
// ======================================================================
test.describe.parallel('Crear Workspaces API ', () => {
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

        test(
          `Crear workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})`,
          async ({ request, cleaner }, testInfo) => {

            // headers “extra” (no auth). Trello usa auth por URL:
            const headers = materializeHeaders(hdrCase);

            // variantes de auth por URL
            const authOpts =
              hdrCase === 'noAuth'   ? { includeToken: false } :
              hdrCase === 'noKey'    ? { includeKey:   false } :
              hdrCase === 'badToken' ? { token: BAD_TOKEN } :
              {}; // default

            const payload  = buildValidFromRow(row, uniq(testInfo));
            const expected = expectedStatusFor(row, hdrCase);

            const r = await createWorkspace(request, payload, { headers, auth: authOpts });

            // ---------- STATUS ----------
            await expectStatus(r, expected);

            // Derivar "kind" para los casos que fallan por variante de auth
            const errorKind =
              hdrCase === 'noKey'   ? 'NO_KEY'
            : hdrCase === 'noAuth'  ? 'NO_TOKEN'
            : hdrCase === 'badToken'? 'GENERIC' // crea un assert específico cuando tengas el body exacto
            : 'GENERIC';

            if (expected >= 200 && expected < 300) {
              // ---------- ÉXITO ----------
              const body = await validateCreateWorkspaceResponse(r, payload, {
                schema: schemaCreate, // quita si no tienes esquema
                maxMs: 1500,
              });

              // Registrar ID para teardown automático del fixture
              cleaner(body.id);

              // ---------- GET ----------
              const g = await getWorkspace(request, body.id, { headers, auth: authOpts });
              await expectStatusIn(g, [200]);

            } else if (expected >= 400) {
              // ---------- ERROR TAMBIÉN EN "VÁLIDOS" POR VARIANTE HDR ----------
              await validateErrorByKind(r, errorKind, { maxMs: 2000 });
            }
          }
        );
      }

      // -------- INVÁLIDOS × SOLO DEFAULT --------
      if (hdrCase === 'default') {
        for (const row of rows) {
          if (row.type !== 'invalid') continue;

          test(
            `POST /workspaces [INVALID] ${row.caseId || ''}`.trim(),
            async ({ request }, testInfo) => {
              const payload = buildInvalidFromRow(row, uniq(testInfo));
              const r = await createWorkspace(request, payload); // default auth

              const exp = Number.isFinite(Number(row.expectedStatus))
                ? Number(row.expectedStatus)
                : 400;

              await expectStatus(r, exp);

              // Derivar kind desde el payload inválido (sin usar row.reason)
              const needsDisplay =
                payload?.displayName === undefined ||
                (typeof payload?.displayName === 'string' && payload.displayName.trim().length === 0);

              const kind = needsDisplay ? 'DISPLAY_REQUIRED' : 'GENERIC';

              await validateErrorByKind(r, kind, { maxMs: 2000 });
            }
          );
        }
      }
    });
  }
});
