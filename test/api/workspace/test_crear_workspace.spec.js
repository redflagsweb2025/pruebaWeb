// test/api/workspace/test_workspace.spec.js
const { test, expect } = require('@playwright/test');

// services (API pura)
const {createWorkspace, getWorkspace,createWorkspaceWithHeaders, getWorkspaceWithHeaders,} = require('../../../src/services/workspace_page');

// utils
const { loadCsv } = require('../../../src/utils/api/csv');
const {HDR_CASES, materializeHeaders, expectedStatusFor } =require('../../../src/resources/headers/workspace.headers');

// payload builders (ajusta esta ruta si los tienes en otro lado)
const { buildValidFromRow,buildInvalidFromRow,} = require('../../../src/resources/payloads/workspace.payloads');

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

/* ======================================================================
   1) TESTS BASE (SIN headers dinámicos): auth por URL desde .env
   ======================================================================*/
test.describe.parallel('Workspaces API — CSV (sin headers dinámicos)', () => {
  for (const row of rows) {
    if (row.type === 'valid') {
      test(`POST /workspaces ${row.caseId} — ${row.title}`, async ({ request }, testInfo) => {
        const payload = buildValidFromRow(row, uniq(testInfo));

        // Create con servicios base (sin headers dinámicos)
        const r = await createWorkspace(request, payload);

        const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;//optiene el valor esperado del csv
        //condición ? valor_si_verdadero : valor_si_falso

        expect(r.status(), `Body: ${await safeBody(r)}`).toBe(exp);//ira al assert valida el estaus code

        if (exp >= 200 && exp < 300) {//valida status code de 200
          const body = await r.json();//captura la respuesta json si no da error 
          expect(body.displayName).toBe(payload.displayName);//verifica que el displayname que enviaste este en la respuesta 
          const prefix = trelloNormalizeSlug(payload.name);//normaliza el url del name que enviamos (slug)
          expect(body.name.startsWith(prefix)).toBe(true);//verifica que el name comienza con el prefijo que actualizo

          const g = await getWorkspace(request, body.id);//llama con el id al ws que se creo 
          expect(g.status()).toBeGreaterThanOrEqual(200);//verifica que sea 200
          expect(g.status()).toBeLessThan(300);//verifica que sea menor a 300

         
        }
      });
    }

    if (row.type === 'invalid') {//para casos de tipo invalido
      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
        async ({ request }, testInfo) => {
          const payload = buildInvalidFromRow(row, uniq(testInfo));
          const r = await createWorkspace(request, payload);
          const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;
          expect(r.status(), `Body: ${await safeBody(r)}`).toBe(exp);
        }
      );
    }
  }
});

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

            }
          }
        );
      }
    });
  }
});
