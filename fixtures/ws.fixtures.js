// fixtures/cleanup.fixture.js
const { test: base, expect } = require('@playwright/test');
const { deleteWorkspace , createWorkspacefix, deleteWorkspacefix } = require('../src/services/workspace.service');

const test = base.extend({
  cleaner: async ({ request }, use, testInfo) => {
    const created = new Set();

    const track = (id) => { if (id) created.add(id); };

    await use(track);

    // 🔥 Teardown: borrar cada workspace creado por el test
    for (const id of created) {
      try {
        const resDel = await deleteWorkspace(request, id);
        const code = resDel.status();
        const msg = `[TEARDOWN] ${testInfo.title} → DELETE ${id} → ${code}`;
        if (code === 200 || code === 204) {
          console.log('\x1b[32m%s\x1b[0m', msg); // verde OK
        } else {
          console.warn('\x1b[33m%s\x1b[0m', msg); // amarillo WARNING
          try { console.warn('Body:', (await resDel.text()).slice(0, 200)); } catch {}
        }
      } catch (e) {
        console.error(`[TEARDOWN ERROR] ${testInfo.title} → ${id}`, e);
      }
    }
  },
});
// sufijo único para evitar colisiones entre workers
function uniq(testInfo) {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${testInfo.workerIndex}`;
}

const test2 = base.extend({
  /**
   * Crea un workspace temporal y lo elimina al finalizar el test.
   * Expone: workspace = { id, name, displayName, raw }
   */
  workspace: async ({ request }, use, testInfo) => {
    const u = uniq(testInfo);

    const payload = {
      displayName: `WS_AUT_${u}`,
      // Trello “limpia” los guiones en "name", así que lo dejamos sin espacios/ñ/acentos:
      name: `wsaut${u}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
      desc: 'Workspace temporal para pruebas automáticas',
    };

    const resCreate = await createWorkspacefix(request, payload);
    const status = resCreate.status();
    const body = await resCreate.json().catch(() => ({}));

    // si tu framework ya tiene expectStatus/expectJson, puedes usarlos aquí
    expect(status, `Create WS falló. Body: ${await resCreate.text()}`).toBe(200);

    const created = {
      id: body.id,
      name: body.name,
      displayName: body.displayName,
      raw: body,
    };

    // poner a disposición del test
    try {
      await use(created);
    } finally {
      // cleanup robusto: aceptar 200 o 404 (si ya se borró antes)
      if (created?.id) {
        try {
          const resDel = await deleteWorkspacefix(request, { idOrName: created.id });
          const sc = resDel.status();
          if (!(sc === 200 || sc === 404)) {
            console.warn(`[CLEANUP] DELETE org ${created.id} devolvió ${sc}:`, await resDel.text());
          }
        } catch (e) {
          console.warn(`[CLEANUP] Error borrando org ${created.id}:`, e);
        }
      }
    }
  },
});

module.exports = { test, expect ,test2};
