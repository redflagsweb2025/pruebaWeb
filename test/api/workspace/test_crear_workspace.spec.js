// test/api/workspace/test_workspace.spec.js
const { test, expect } = require('@playwright/test');

// services (refactor: una sola firma con options)
const { createWorkspace, getWorkspace, deleteWorkspace } =
  require('../../../src/services/workspace_page');

// utils
const { loadCsv } = require('../../../src/utils/api/csv');

// headers/auth (solo para decidir variantes de auth y headers “extra”)
const {
  HDR_CASES,
  materializeHeaders,   // si quieres meter headers no relacionados a auth
  expectedStatusFor     // decide el status esperado según fila × hdrCase
} = require('../../../src/resources/headers/workspace.headers');

// builders
const {
  buildValidFromRow,
  buildInvalidFromRow,
} = require('../../../src/resources/payloads/workspace.payloads');

// (opcional) asserts reutilizables si ya creaste el módulo
const {
  // helpers
  safeBody,
  // asserts
  expectStatus,
  expectStatusIn,
  expectHeader,
  expectJsonContentType,
  expectLatencyMs,
  expectBodyHasId,
  expectSchema,
} = require('../../../src/assertions/api/workspace.assert');

// ----------------- helpers locales -----------------
const rows = loadCsv('src/resources/data/api/workspace.data.csv'); // una sola vez

const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;
function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // espacios -> guiones (tu prefijo)
    .replace(/[^a-z0-9-]/g, '') // solo permitidos
    .replace(/-/g, '');         // Trello finalmente elimina guiones en "name"
}

// ======================================================================
// 1) TESTS BASE (casos del CSV usando auth por URL default, sin headers dinámicos)
// ======================================================================
test.describe.parallel('Workspaces API — CSV (default auth por URL)', () => {
  for (const row of rows) {
    if (row.type === 'valid') {
      test(`POST /workspaces ${row.caseId} — ${row.title}`, async ({ request }, testInfo) => {
        const payload = buildValidFromRow(row, uniq(testInfo));
        const r = await createWorkspace(request, payload); // default: key/token del .env en la URL

        const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;
        await expectStatus(r, exp);

        if (exp >= 200 && exp < 300) {
          // Validaciones mínimas de OK
          await expectBodyHasId(r);
          const body = await r.json();
          expect(body.displayName).toBe(payload.displayName);

          const expectedPrefix = trelloNormalizeSlug(payload.name);
          expect(body.name.startsWith(expectedPrefix)).toBe(true);

          // GET
          const g = await getWorkspace(request, body.id);
          await expectStatusIn(g, [200]); // 200 OK esperado
        }
      });
    }

    if (row.type === 'invalid') {
      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
        async ({ request }, testInfo) => {
          const payload = buildInvalidFromRow(row, uniq(testInfo));
          const r = await createWorkspace(request, payload); // default auth
          const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;
          await expectStatus(r, exp);
        }
      );
    }
  }
});

// ======================================================================
// 2) TESTS CSV × Headers/Auth parametrizado (noAuth, noKey, badToken, default)
// ======================================================================
test.describe.parallel('Workspaces API — CSV × Headers/Auth parametrizado', () => {
  if (!rows || rows.length === 0) {
    test('CSV vacío - placeholder', () => test.skip(true, 'No hay filas en el CSV'));
    return;
  }

  for (const hdrCase of HDR_CASES) {
    test.describe(`hdr=${hdrCase}`, () => {
      for (const row of rows) {
        if (row.type !== 'valid') continue; // autenticación se valida típicamente sobre casos válidos

        test(`POST /workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})`,
          async ({ request }, testInfo) => {

            // headers “extra” (no auth) desde tu JSON; Trello usa auth por URL:
            const headers = materializeHeaders(hdrCase);

            // variantes de auth por URL
            const authOpts =
              hdrCase === 'noAuth'   ? { includeToken: false } :
              hdrCase === 'noKey'    ? { includeKey:   false } :
              hdrCase === 'badToken' ? { token: 'BAD_TOKEN_EXAMPLE' } :
              {}; // default

            const payload  = buildValidFromRow(row, uniq(testInfo));
            const expected = expectedStatusFor(row, hdrCase);

            const r = await createWorkspace(request, payload, { headers, auth: authOpts });

            await expect(
              r.status(),
              `Esperado ${expected}, recibido ${r.status()} → body: ${await safeBody(r)}`
            ).toBe(expected);

            if (expected >= 200 && expected < 300) {
              await expectBodyHasId(r);
              const body = await r.json();

              expect(body.displayName).toBe(payload.displayName);
              const expectedPrefix = trelloNormalizeSlug(payload.name);
              expect(body.name.startsWith(expectedPrefix)).toBe(true);

              // GET con las mismas variantes
              const g = await getWorkspace(request, body.id, { headers, auth: authOpts });
              await expectStatusIn(g, [200]);
            }
          }
        );
      }
    });
  }
});

// ======================================================================
// 3) Limpieza opcional por test (si creaste algo y quieres borrarlo sí o sí)
//    *Puedes moverlo a un fixture; a continuación un ejemplo inline por claridad.
// ======================================================================
test.afterEach(async ({ request }, testInfo) => {
  // Si guardas IDs creados en testInfo.attachments o en variables compartidas, elimínalos aquí.
  // Ejemplo (pseudo): for(const id of createdIds.splice(0)) { await deleteWorkspace(request, id); }
  // Como no estamos guardando los IDs globalmente en este snippet, omitimos la limpieza aquí.
});
