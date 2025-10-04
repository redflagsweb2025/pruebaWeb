const { test, expect } = require('@playwright/test');

// services (refactor: una sola firma con options)
const { createWorkspace, getWorkspace } =
  require('../../../src/services/workspace_page');

// utils
const { loadCsv } = require('../../../src/utils/api/csv');

// headers/auth (variantes de auth y headers “extra”)
const {
  HDR_CASES,
  materializeHeaders,   // headers no relacionados a auth (User-Agent, Correlation-Id, etc.)
  expectedStatusFor     // status esperado según fila × hdrCase
} = require('../../../src/resources/headers/workspace.headers');

// builders
const {buildValidFromRow , buildInvalidFromRow } = require('../../../src/resources/payloads/workspace.payloads');

// asserts reutilizables
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
  expectSchema
} = require('../../../src/assertions/api/workspace.assert');

// ----------------- helpers locales -----------------
const rows = loadCsv('src/resources/data/api/workspace.data.csv'); // cargar una sola vez

const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;

// normaliza el "name" para comparar prefijo con lo que Trello genera
function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // espacios -> guiones (tu prefijo original)
    .replace(/[^a-z0-9-]/g, '') // solo permitidos
    .replace(/-/g, '');         // Trello elimina guiones en "name"
}

// ======================================================================
// ÚNICO SUITE: CSV × Headers/Auth parametrizado (Opción A)
// - Válidos: corren con TODOS los HDR_CASES (incluyendo 'default')
// - Inválidos: corren SOLO con 'default'
// ======================================================================
test.describe.parallel('Workspaces API — CSV × Headers/Auth parametrizado ', () => {
  if (!rows || rows.length === 0) {
    test('CSV vacío - placeholder', () => test.skip(true, 'No hay filas en el CSV'));
    return;
  }

  for (const hdrCase of HDR_CASES) {
    test.describe(`hdr=${hdrCase}`, () => {

      // -------- VÁLIDOS × TODAS LAS VARIANTES DE AUTH --------
      for (const row of rows) {
        if (row.type !== 'valid') continue;

        test(`POST /workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})`,
          async ({ request }, testInfo) => {

            // headers “extra” (no auth). Trello usa auth por URL:
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
              // displayName recibido = enviado
              expect(body.displayName).toBe(payload.displayName);

              // name generado debe empezar con el prefijo normalizado
              const expectedPrefix = trelloNormalizeSlug(payload.name);
              expect(
                body.name.startsWith(expectedPrefix),
                `El name '${body.name}' no inicia con '${expectedPrefix}'`
              ).toBe(true);

              // GET con mismas variantes de auth
              const g = await getWorkspace(request, body.id, { headers, auth: authOpts });
              await expectStatusIn(g, [200]);
            }
          }
        );
      }

      // -------- INVÁLIDOS × SOLO DEFAULT --------
      // (evita ruido de 401 por auth y enfoca validaciones de payload)
      if (hdrCase === 'default') {
        for (const row of rows) {
          if (row.type !== 'invalid') continue;

          test(
            `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
            async ({ request }, testInfo) => {
              const payload = buildInvalidFromRow(row, uniq(testInfo));

              const r = await createWorkspace(request, payload); // default auth por URL desde .env

              const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;
              await expectStatus(r, exp);
            }
          );
        }
      }
    });
  }
});

// Limpieza post-test: si guardas IDs creados globalmente, elimínalos aquí o usa un fixture con scope:'test'.
// test.afterEach(async ({ request }) => { ... });
