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

          /* // cleanup best-effort
          try {
            const d = await deleteWorkspace(request, body.id);//elimina por el id
            const code = d.status();//obtiene el status
            const ok = (code >= 200 && code < 300) || code === 404 || code === 405;//verifica que salga 200 400 o 405
            expect(ok, `DELETE devolvió ${code}`).toBe(true);//pide que el valor sea true o sea ok si no devuelve el mensaje
          } catch (e) {
            console.warn('DELETE falló (ignorado):', e?.message || e);
          } */
        }
      });
    }

    if (row.type === 'invalid') {//
      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
        async ({ request }, testInfo) => {//
          const payload = buildInvalidFromRow(row, uniq(testInfo));//
          const r = await createWorkspace(request, payload);//
          const exp = Number.isFinite(Number(row.expectedStatus)) ? Number(row.expectedStatus) : 200;//
          expect(r.status(), `Body: ${await safeBody(r)}`).toBe(exp);//
        }
      );
    }
  }
});

test.describe.parallel('Workspaces API — CSV × Headers parametrizado', () => {//crear workspace con ehaders dinamicos y payloads de csv
  if (!rows || rows.length === 0) {//lee las filas que no este vacio 
    test('CSV vacío - placeholder', async () => {//nombre del test 
      test.skip(true, 'No hay filas en el CSV');//hace skip al test cuando no encuentra el csv
    });
    return;
  }

  // ========== MATRIZ: mismas filas del CSV × variantes de headers ==========
  for (const hdrCase of HDR_CASES) {//ejecutara todo lo que vea HDR cases 
    test.describe(`hdr=${hdrCase}`, () => {//crea un grupo de tet cases por cada header
      for (const row of rows) {//lee las filas
        if (row.type !== 'valid') continue; // auth se valida sobre casos válidos

        test(`POST /workspaces ${row.caseId} — ${row.title} (hdr=${hdrCase})`,//titulo con tipo deheader
          async ({ request }, testInfo) => {//

            // headers “extra” desde tu JSON (Authorization/X-API-Key se sanitizan en el service)
            const headers = materializeHeaders(hdrCase);//le da formato al url

            // Cómo “romper” o variar la auth EN LA URL:
            const authOpts =//contruye los casos para quitar los headers para cad caso
              hdrCase === 'noAuth'   ? { includeToken: false } :// sin token
              hdrCase === 'noKey'    ? { includeKey:   false } ://sin key api
              hdrCase === 'badToken' ? { token: 'BAD_TOKEN_EXAMPLE' } ://ingresar al env token invalido
              {}; // default

            const payload  = buildValidFromRow(row, uniq(testInfo));//crea el payload con nombre unico
            const expected = expectedStatusFor(row, hdrCase);//me devulve el status code que deberia tener cada caso

            // Create (variantes con headers + auth por URL)
            const r = await createWorkspaceWithHeaders(request, payload, {//crea el request
              headers,//con los headers
              auth: authOpts,//con autphos
            });

            expect(
              r.status(),//obtiene el status de request
              `Esperado ${expected}, recibido ${r.status()} → body: ${await safeBody(r)}`//
            ).toBe(expected);//valida el staus code

            if (expected >= 200 && expected < 300) {//si es 200 
              const body = await r.json();//dame la respuesta json del request
              // Validaciones mínimas del OK
              expect(body.displayName).toBe(payload.displayName);//valida que el display este en el body de respuesta
              const expectedPrefix = trelloNormalizeSlug(payload.name);//sac el name que se mando 
              expect(body.name.startsWith(expectedPrefix)).toBe(true);//valida que en el body de respuesta este el name 

              // Get
              const g = await getWorkspaceWithHeaders(request, body.id, {//verifica que se haya creado
                headers,
                auth: authOpts,
              });
              expect(g.status()).toBeGreaterThanOrEqual(200);//tiene que ser mayor o igual a 200 o menor a 300
              expect(g.status()).toBeLessThan(300);

              // Cleanup best-effort
              try {
                const d = await deleteWorkspaceWithHeaders(request, body.id, {//elimina con los mismo headers 
                  headers,
                  auth: authOpts,
                });
                const code = d.status();
                const ok = (code >= 200 && code < 300) || code === 404 || code === 405;//valida que se haya hecho el request no que se haya borrado
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
  test.describe('payload inválido (hdr=default)', () => {//crea un grupo de test cases 
    for (const row of rows) {//lee filas
      if (row.type !== 'invalid') continue;//solo con invalid

      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),//crea titulos 
        async ({ request }, testInfo) => {//por logica
          const headers = materializeHeaders('default');//
          const payload = buildInvalidFromRow(row, uniq(testInfo));//
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
