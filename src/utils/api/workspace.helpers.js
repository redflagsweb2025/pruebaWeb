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

// const { trelloNormalizeSlug } = require('../../src/utils/slug');

function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // espacios -> guiones
    .replace(/[^a-z0-9-]/g, '')  // solo permitidos
    .replace(/-/g, '');          // Trello elimina guiones en "name"
}

/**
 * Valida respuesta 200 de CREATE (POST /organizations)
 */
async function validateCreateWorkspaceResponse(res, payload, { schema, maxMs = 1500 } = {}) {
  expectJsonContentType(res);
  expectHeader(res, 'content-type', /application\/json/i);

  const t = typeof res.timing === 'function' ? res.timing() : null;
  const elapsedMs =
    (t && typeof t.startTime === 'number' && typeof t.endTime === 'number')
      ? Math.max(0, Math.round(t.endTime - t.startTime))
      : undefined;
  if (typeof elapsedMs === 'number') {
    expectLatencyMs(elapsedMs, maxMs);
  }

  await expectBodyHasId(res, 'id');

  if (schema) {
    const bodyForSchema = await res.json();
    expectSchema(bodyForSchema, schema);
  }

  const body = await res.json();

  if (payload?.displayName !== undefined) {
    if (String(body.displayName) !== String(payload.displayName)) {
      throw new Error(
        `displayName distinto. Esperado "${payload.displayName}" | Recibido "${body.displayName}"`
      );
    }
  }

  if (payload?.name !== undefined) {
    const expectedPrefix = trelloNormalizeSlug(payload.name);
    if (!String(body.name).startsWith(expectedPrefix)) {
      throw new Error(`El campo "name" = "${body.name}" NO inicia con "${expectedPrefix}"`);
    }
  }

  return body;
}

/**
 * Valida respuesta 200 de GET (/organizations/{idOrName})
 * Shape básico + (opcional) schema.
 */
async function validateGetWorkspaceResponse(res, { schema, maxMs = 1500 } = {}) {
  expectJsonContentType(res);
  expectHeader(res, 'content-type', /application\/json/i);

  const t = typeof res.timing === 'function' ? res.timing() : null;
  const elapsedMs =
    (t && typeof t.startTime === 'number' && typeof t.endTime === 'number')
      ? Math.max(0, Math.round(t.endTime - t.startTime))
      : undefined;
  if (typeof elapsedMs === 'number') {
    expectLatencyMs(elapsedMs, maxMs);
  }

  const body = await res.json();
  if (schema) {
    expectSchema(body, schema);
  } else {
    if (!body || typeof body !== 'object') throw new Error('JSON inválido en respuesta GET workspace');
    if (!body.id) throw new Error('Falta campo id');
    if (!body.name) throw new Error('Falta campo name (slug)');
    if (!body.displayName) throw new Error('Falta campo displayName');
  }
  return body;
}

/**
 * Igual que el create: compara GET contra el payload de creación (displayName y slug),
 * y opcionalmente contra el recurso creado (id y name exacto).
 * - payload: el usado en POST (para validar normalización del slug)
 * - created: { id, name, displayName } del POST por si quieres igualdad estricta
 */
async function validateGetWorkspaceResponseLikeCreate(
  res,
  { payload, created, schema, maxMs = 1500 } = {}
) {
  const body = await validateGetWorkspaceResponse(res, { schema, maxMs });

  // Comparar con payload original (misma lógica que create)
  if (payload?.displayName !== undefined) {
    if (String(body.displayName) !== String(payload.displayName)) {
      throw new Error(
        `GET.displayName distinto a payload. Esperado "${payload.displayName}" | Recibido "${body.displayName}"`
      );
    }
  }
  if (payload?.name !== undefined) {
    const expectedPrefix = trelloNormalizeSlug(payload.name);
    if (!String(body.name).startsWith(expectedPrefix)) {
      throw new Error(
        `GET.name "${body.name}" NO inicia con slug normalizado "${expectedPrefix}"`
      );
    }
  }

  // Comparar con lo que devolvió el POST
  if (created?.id !== undefined) {
    if (String(body.id) !== String(created.id)) {
      throw new Error(`GET.id distinto al creado. Esperado "${created.id}" | Recibido "${body.id}"`);
    }
  }
  if (created?.name !== undefined) {
    if (String(body.name) !== String(created.name)) {
      throw new Error(
        `GET.name distinto al creado. Esperado "${created.name}" | Recibido "${body.name}"`
      );
    }
  }
  if (created?.displayName !== undefined) {
    if (String(body.displayName) !== String(created.displayName)) {
      throw new Error(
        `GET.displayName distinto al creado. Esperado "${created.displayName}" | Recibido "${body.displayName}"`
      );
    }
  }

  return body;
}

/**
 * Mapea razones de error usadas en CSV -> asserts específicos (POST/GET)
 */
async function validateErrorByKind(res, reason, { token, key, maxMs = 2000 } = {}) {
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

  const status = typeof res.status === 'function' ? res.status() : 400;
  await assertCommonError(res, status, { maxMs });
}

 function resolveOrgId(orgIdFromCsv, workspace) {
  return String(orgIdFromCsv ?? '')
    .replace(/{{\s*WORKSPACE_ID\s*}}/gi, String(workspace?.id ?? ''))
    .trim()
    .replace(/^["']|["']$/g, '');
}
 function resolveOrgIdFromPlaceholders(orgIdFromCsv, workspace) {
  let s = String(orgIdFromCsv ?? '').trim().replace(/^["']|["']$/g, '');
  if (!s) return s;

  s = s
    .replace(/{{\s*WORKSPACE_ID\s*}}/gi, String(workspace?.id ?? ''))
    .replace(/{{\s*WORKSPACE_SLUG\s*}}/gi, String(workspace?.name ?? ''))
    .replace(/{{\s*ORG_ID_VALIDO\s*}}/gi, String(workspace?.id ?? workspace?.name ?? ''))
    .trim();

  if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') s = '';
  return s;
}

module.exports = {
  trelloNormalizeSlug,
  validateCreateWorkspaceResponse,
  validateGetWorkspaceResponse,
  validateGetWorkspaceResponseLikeCreate, // ← NUEVO
  validateErrorByKind,
  resolveOrgId,
  resolveOrgIdFromPlaceholders,
};
