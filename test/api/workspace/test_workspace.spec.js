// test/api/workspace/test_workspace.spec.js
const { test, expect } = require('@playwright/test');

// services (API pura)
const {
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
  createWorkspaceWithHeaders,
  getWorkspaceWithHeaders,
  deleteWorkspaceWithHeaders,
} = require('../../../src/services/workspace_page');

// utils
const { loadCsv } = require('../../../src/utils/api/csv');
const {HDR_CASES, materializeHeaders, expectedStatusFor } =
  require('../../../src/resources/headers/workspace.headers');

// payload builders (ajusta esta ruta si los tienes en otro lado)
const {
  buildValidFromRow,
  buildInvalidFromRow,
} = require('../../../src/resources/payloads/workspace.payloads');

// ----------------- helpers locales -----------------
const rows = loadCsv('src/resources/data/api/workspace.data.csv'); // 📌 declara UNA sola vez

const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;
async function safeBody(res) {
  try { return JSON.stringify(await res.json()); }
  catch {
    try { return await res.text(); } catch { return '<no-json>'; }
  }
}
function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // espacios -> guiones
    .replace(/[^a-z0-9-]/g, '') // solo permitidos
    .replace(/-/g, '');         // Trello elimina guiones en "name"
}
// ---------------------------------------------------

test.describe.parallel('Workspaces API — CSV × Headers parametrizado', () => {
  if (!rows || rows.length === 0) {
    test('CSV vacío - placeholder', async () => {
      test.skip(true, 'No hay filas en el CSV');
    });
    return;
  }

  // ========== MATRIZ: mismas filas del CSV × variantes de headers ==========
  for (const hdrCase of HDR_CASES) {
    test.describe(`hdr=${hdrCase}`, () => {
      for (const row of rows) {
        if (row.type !== 'valid') continue; // auth se valida sobre casos válidos

        test(`POST /workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})`,
          async ({ request }, testInfo) => {

            // headers “extra” desde tu JSON (Authorization/X-API-Key se sanitizan en el service)
            const headers = materializeHeaders(hdrCase);

            // Cómo “romper” o variar la auth EN LA URL:
            const authOpts =
              hdrCase === 'noAuth'   ? { includeToken: false } :
              hdrCase === 'noKey'    ? { includeKey:   false } :
              hdrCase === 'badToken' ? { token: 'BAD_TOKEN_EXAMPLE' } :
              {}; // default

            const payload  = buildValidFromRow(row, uniq(testInfo));
            const expected = expectedStatusFor(row, hdrCase);

            // Create (variantes con headers + auth por URL)
            const r = await createWorkspaceWithHeaders(request, payload, {
              headers,
              auth: authOpts,
            });

            expect(
              r.status(),
              `Esperado ${expected}, recibido ${r.status()} → body: ${await safeBody(r)}`
            ).toBe(expected);

            if (expected >= 200 && expected < 300) {
              const body = await r.json();

              // Validaciones mínimas del OK
              expect(body.displayName).toBe(payload.displayName);
              const expectedPrefix = trelloNormalizeSlug(payload.name);
              expect(body.name.startsWith(expectedPrefix)).toBe(true);

              // Get
              const g = await getWorkspaceWithHeaders(request, body.id, {
                headers,
                auth: authOpts,
              });
              expect(g.status()).toBeGreaterThanOrEqual(200);
              expect(g.status()).toBeLessThan(300);

              // Cleanup best-effort
              try {
                const d = await deleteWorkspaceWithHeaders(request, body.id, {
                  headers,
                  auth: authOpts,
                });
                const code = d.status();
                const ok = (code >= 200 && code < 300) || code === 404 || code === 405;
                expect(ok, `DELETE devolvió ${code}`).toBe(true);
              } catch (e) {
                console.warn('DELETE workspace falló (ignorado):', e?.message || e);
              }
            }
          }
        );
      }
    });
  }

  // ========== NEGATIVOS DE PAYLOAD (solo con headers default) ==========
  test.describe('payload inválido (hdr=default)', () => {
    for (const row of rows) {
      if (row.type !== 'invalid') continue;

      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
        async ({ request }, testInfo) => {
          const headers = materializeHeaders('default');
          const payload = buildInvalidFromRow(row, uniq(testInfo));
          const r = await createWorkspaceWithHeaders(request, payload, {
            headers,
            auth: {}, // default → key/token desde .env en la URL
          });

          const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;
          expect(
            r.status(),
            `Esperado ${exp}, recibido ${r.status()} → body: ${await safeBody(r)}`
          ).toBe(exp);
        }
      );
    }
  });
});
