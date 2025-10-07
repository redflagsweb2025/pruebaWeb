
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

// --- Allure  ---
let allureReal;
try { ({ allure: allureReal } = require('allure-playwright')); } catch { allureReal = null; }
const allureSafe = {
  attachment: (...a) => allureReal?.attachment?.(...a),
  label:      (...a) => allureReal?.label?.(...a),
  epic:       (...a) => allureReal?.epic?.(...a),
  feature:    (...a) => allureReal?.feature?.(...a),
  story:      (...a) => allureReal?.story?.(...a),
  severity:   (...a) => allureReal?.severity?.(...a),
  tag:        (...a) => allureReal?.tag?.(...a),
  owner:      (...a) => allureReal?.owner?.(...a),
  descriptionHtml: (...a) => allureReal?.descriptionHtml?.(...a),
  step: async (t, fn) => allureReal?.step ? allureReal.step(t, fn) : (typeof fn === 'function' ? fn() : undefined),
};



// Para normalizar el url de workspaces segun el name (trello lo normaliza)

function trelloNormalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        
    .replace(/[^a-z0-9-]/g, '')  
    .replace(/-/g, '');          
}

/**
 * Valida respuesta 200 en  crear
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
 * Valida respuesta 200 de GET 
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
 * compara GET contra el payload de creación (displayName y name),
 * y opcionalmente contra el recurso creado (id y name exacto).
 */
async function validateGetWorkspaceResponseLikeCreate(
  res,
  { payload, created, schema, maxMs = 1500 } = {}
) {
  const body = await validateGetWorkspaceResponse(res, { schema, maxMs });

  
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

function tagsFrom(marker) {
  const markers = String(marker || '')
    .split(/[,\s]+/)
    .map(m => m.trim())
    .filter(Boolean);
  return markers.length ? ' ' + markers.map(m => `@${m}`).join(' ') : '';
}

// --- util: adjuntar  ---
function attach(name, data, mime = 'application/json') {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    allureSafe.attachment(name, text, mime);
  } catch {
    allureSafe.attachment(name, String(data), 'text/plain');
  }
}

// --- util: nombre de feature por método para pasarlo a allure ---
function featureFrom(method, resource = 'Workspace') {
  const m = String(method || '').toUpperCase();
  const base = String(resource || 'Workspace').trim();
  if (m === 'POST') return `Create ${base}`;
  if (m === 'GET')  return `Get ${base}`;
  if (m === 'PUT' || m === 'PATCH') return `Update ${base}`;
  if (m === 'DELETE') return `Delete ${base}`;
  return `${m || 'OP'} ${base}`;
}

/**
 *  META reusable para Allure en cualquier endpoint.
 * @param {object} row             
 * @param {string} opts.hdrCase    
 * @param {string} opts.method     
 * @param {string} [opts.resource]  
 * @param {string} [opts.epic]     
 * @param {string} [opts.feature]   
 * @param {string} [opts.owner]     
 */
function applyAllureMeta(row, {
  hdrCase,
  method,
  resource = 'Workspace',
  epic = 'Trello Workspaces',
  feature,
  owner,
} = {}) {
  // Jerarquía
  allureSafe.epic(epic);
  allureSafe.feature(feature || featureFrom(method, resource));
  allureSafe.story(`${row?.caseId || 'N/A'} — ${row?.title || 'Sin título'}`);

  // Etiquetas
  allureSafe.label('layer', 'API');
  allureSafe.label('component', resource);
  if (hdrCase) allureSafe.label('hdrCase', String(hdrCase));
  if (method)  allureSafe.label('httpMethod', String(method).toUpperCase());

  // Severidad (prioridad: row.severity → expectedStatus → row.type)
  const exp = Number(row?.expectedStatus);
  const sevCsv = String(row?.severity || '').toLowerCase();
  let sev = 'normal';
  if (['blocker','critical','normal','minor','trivial'].includes(sevCsv)) {
    sev = sevCsv;
  } else if (Number.isFinite(exp)) {
    sev = exp === 200 ? 'critical' : 'normal';
  } else if (row?.type) {
    sev = row.type === 'valid' ? 'critical' : 'normal';
  }
  allureSafe.severity(sev);

  // Tags (para filtros en Allure UI)
  String(row?.marker || '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .forEach(m => allureSafe.tag(m));

  // Owner
  const finalOwner = owner || process.env.ALLURE_OWNER;
  if (finalOwner) allureSafe.owner(finalOwner);

  // Metadata útil como aadjunto
  attach('Case Meta', {
    method: String(method || '').toUpperCase(),
    resource,
    epic,
    feature: feature || featureFrom(method, resource),
    title: row?.title,
    caseId: row?.caseId,
    type: row?.type,
    hdrCase,
    expectedStatus: row?.expectedStatus,
    severity: sev,
    markers: row?.marker,
  });
}




module.exports = {
  trelloNormalizeSlug,
  validateCreateWorkspaceResponse,
  validateGetWorkspaceResponse,
  validateGetWorkspaceResponseLikeCreate, // ← NUEVO
  validateErrorByKind,
  resolveOrgId,
  resolveOrgIdFromPlaceholders,
  tagsFrom,
  attach,
  applyAllureMeta,
  allureSafe,
  featureFrom ,
};
