
// test/helpers/validate_workspace_create.js
const {
  expectHeader,
  expectJsonContentType,
  expectLatencyMs,
  expectBodyHasId,
  expectSchema,
   assertErrNoKeyInvalidKey,
  assertErrNoTokenMissingScopes,
  assertErrDisplayRequired,
  assertErrWrongMethodNoTokenLeak,
  assertCommonError,
} = require('../../../src/assertions/api/workspace.assert');
//const { trelloNormalizeSlug } = require('../../src/utils/slug'); // donde lo tengas

function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // espacios -> guiones
    .replace(/[^a-z0-9-]/g, '') // solo permitidos
    .replace(/-/g, '');         // Trello elimina guiones en "name"
}

async function validateCreateWorkspaceResponse(res, payload, { schema, maxMs = 1500 } = {}) {
  // 1) Content-Type JSON
  expectJsonContentType(res);

  // 2) Headers útiles (puedes ajustar/añadir más)
  expectHeader(res, 'content-type', /application\/json/i);
  // Ejemplos adicionales (ajusta según lo que devuelva Trello)
  // expectHeader(res, 'cache-control', /no-cache|max-age/i);
  // expectHeader(res, 'server', /cloudflare|trello|nginx/i);

  // 3) Latencia (mídela afuera y pásala como res.elapsedMs si prefieres)
  // Si no pasas elapsed medido, intenta estimar desde timing()
  const t = typeof res.timing === 'function' ? res.timing() : null;
  const elapsedMs =
    (t && typeof t.startTime === 'number' && typeof t.endTime === 'number')
      ? Math.max(0, Math.round(t.endTime - t.startTime))
      : undefined;
  if (typeof elapsedMs === 'number') {
    expectLatencyMs(elapsedMs, maxMs);
  }

  // 4) Body con id
  await expectBodyHasId(res, 'id');

  // 5) Validación de esquema (si lo proporcionas)
  if (schema) {
    const bodyForSchema = await res.json();
    expectSchema(bodyForSchema, schema);
  }

  // 6) Asserts funcionales específicos (sin usar expect directo en el test)
  const body = await res.json();

  // displayName igual al enviado
  if (payload?.displayName !== undefined) {
    if (String(body.displayName) !== String(payload.displayName)) {
      throw new Error(
        `displayName distinto. Esperado "${payload.displayName}" | Recibido "${body.displayName}"`
      );
    }
  }

  // name inicia con el slug normalizado del payload.name
  if (payload?.name !== undefined) {
    const expectedPrefix = trelloNormalizeSlug(payload.name);
    if (!String(body.name).startsWith(expectedPrefix)) {
      throw new Error(
        `El campo "name" = "${body.name}" NO inicia con "${expectedPrefix}"`
      );
    }
  }

  // Devuelve el body para que lo uses (p.ej., registrar en cleaner)
  return body;
}
async function validateErrorByReason(res, reason, { token, key, maxMs = 2000 } = {}) {
  const R = String(reason || '').trim().toUpperCase();

  if (R.includes('SIN KEY')) {
    await assertErrNoKeyInvalidKey(res, { maxMs });
    return;
  }
  if (R.includes('SIN TOKEN')) {
    await assertErrNoTokenMissingScopes(res, { maxMs });
    return;
  }
  if (
    R.includes('SIN DISPLAY') ||
    R.includes('DISPLAY VACIO') ||
    R.includes('DISPLAY VACÍO') ||
    R.includes('CON DISPLAY VACIO')
  ) {
    await assertErrDisplayRequired(res, { maxMs });
    return;
  }
  if (R.includes('OTRO METODO') || R.includes('OTRO MÉTODO') || R.includes('HTTP')) {
    await assertErrWrongMethodNoTokenLeak(res, { maxMs, forbiddenSubstrings: [token, key] });
    return;
  }

  // Fallback genérico si llega un caso nuevo sin mapeo:
  await assertCommonError(res, res.status?.() ?? 400, { maxMs });
}



module.exports = { trelloNormalizeSlug ,validateCreateWorkspaceResponse,validateErrorByReason};