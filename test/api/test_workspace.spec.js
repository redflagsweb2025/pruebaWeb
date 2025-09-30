// test/api/test_workspace.spec.js
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const { createWorkspace, getWorkspace, deleteWorkspace } =
  require('../../src/services/workspace_page');

const { expectStatusOK } =
  require('../../src/assertions/api/workspace.assert');

const { loadCsv } =
  require('../../src/utils/api/csv');

const { buildValidFromRow, buildInvalidFromRow } =
  require('../../src/resources/payloads/workspace.payloads');

// CSV
const csvPath = path.join(__dirname, '../../src/resources/data/api/workspace.data.csv');
if (!fs.existsSync(csvPath)) throw new Error(`CSV no encontrado en: ${csvPath}`);
const rows = loadCsv(csvPath);

// sufijo mínimo para evitar duplicados
const uniq = (info) => `${Date.now()}-${info.workerIndex}-${info.retry}`;

// ver cuerpo en errores
async function safeBody(res) {
  try { return JSON.stringify(await res.json()); }
  catch { try { return await res.text(); } catch { return '<no-json>'; } }
}

// Normaliza un slug como lo devuelve Trello (sin guiones, minúsculas, solo [a-z0-9])
function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // espacios -> guiones
    .replace(/[^a-z0-9-]/g, '') // permitidos
    .replace(/-/g, '');         // Trello quita los guiones en `name`
}

test.describe.parallel('Workspaces API - CSV parametrizado ', () => {
  if (!rows || rows.length === 0) {
    test('CSV vacío - placeholder', async () => {
      test.skip(true, 'No hay filas en el CSV');
    });
    return;
  }

  for (const row of rows) {
    const expected = Number(row.expectedStatus);

    // =========================

    //        [VALID]
    // =========================
    if (row.type === 'valid') {
      test(`POST /workspaces ${row.caseId} — ${row.title}`, async ({ request }, testInfo) => {
       console.log(`⏩ Ejecutando: ${row.caseId} — ${row.title}`);
        const suffix = uniq(testInfo);
        const payload = buildValidFromRow(row, suffix);

        // Create
        const r = await createWorkspace(request, payload);
        if (!(r.status() >= 200 && r.status() < 300)) {
          console.error('CREATE body:', await safeBody(r));
        }
        expectStatusOK(r);
        const body = await r.json();

        expect(body.displayName).toBe(payload.displayName);

        // Trello normaliza el slug; no compares exacto
        const expectedPrefix = trelloNormalizeSlug(payload.name);
        expect(
          body.name.startsWith(expectedPrefix),
          `El name devuelto "${body.name}" no empieza con el prefijo normalizado "${expectedPrefix}"`
        ).toBe(true);

        // Get
        const g = await getWorkspace(request, body.id);
        expectStatusOK(g);

        // Delete (best-effort)
        try {
          const d = await deleteWorkspace(request, body.id);
          const code = d.status();
          const ok = (code >= 200 && code < 300) || code === 404 || code === 405;
          expect(ok, `DELETE devolvió ${code}`).toBe(true);
        } catch (e) {
          console.warn('DELETE workspace falló (ignorado en cleanup):', e?.message || e);
        }
      });
    }

    // =========================
    //       [INVALID]
    // =========================
    if (row.type === 'invalid') {
      test(
        `POST /workspaces [INVALID] ${row.caseId || ''} ${row.reason ? `(${row.reason})` : ''}`.trim(),
        async ({ request }, testInfo) => {
          const suffix = uniq(testInfo);
          const payload = buildInvalidFromRow(row, suffix);

          const r = await createWorkspace(request, payload);
          // Trello crea igual aunque falte name o sea inválido ⇒ 200 OK
          const exp = Number.isFinite(expected) ? expected : 200;
          if (r.status() !== exp) {
            console.error('INVALID body:', await safeBody(r));
          }
          expect(
            r.status(),
            `Esperado ${exp}, recibido ${r.status()} → body: ${await safeBody(r)}`
          ).toBe(exp);
        }
      );
    }

    // =========================
    //     [DUPLICATE]
    // =========================
    if (row.type === 'duplicate') {
      test(`POST /workspaces [DUPLICATE] ${row.caseId || ''}`.trim(), async ({ request }, testInfo) => {
        const suffix = uniq(testInfo);
        const baseName = `${(row.name || 'ws-dupe')}-${suffix}`.toLowerCase();

        // Primer create
        const r1 = await createWorkspace(request, {
          displayName: `${row.displayName || 'Workspace'} ${suffix}`,
          name: baseName
        });
        expectStatusOK(r1);
        const b1 = await r1.json();

        // Segundo create (mismo baseName)
        const r2 = await createWorkspace(request, {
          displayName: `${row.displayName || 'Workspace'} ${suffix} bis`,
          name: baseName
        });
        // Trello no falla, crea otro ⇒ 2xx
        expectStatusOK(r2);
        const b2 = await r2.json();

        const basePrefix = trelloNormalizeSlug(baseName);
        expect(b1.name.startsWith(basePrefix)).toBe(true);
        expect(b2.name.startsWith(basePrefix)).toBe(true);
        // IDs distintos ⇒ se creó otro recurso
        expect(b2.id).not.toBe(b1.id);

        // cleanup best-effort
        try {
          const d = await deleteWorkspace(request, b1.id);
          const code = d.status();
          const ok = (code >= 200 && code < 300) || code === 404 || code === 405;
          expect(ok, `DELETE devolvió ${code}`).toBe(true);
        } catch (e) {
          console.warn('DELETE workspace (b1) falló (ignorado en cleanup):', e?.message || e);
        }
      });
    }
  }
});
