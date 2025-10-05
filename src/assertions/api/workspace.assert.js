// src/assertions/workspace_assert.js
const { expect } = require('@playwright/test');          
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });
const addDraft4 = require('ajv-draft-04');
/** Devuelve el body de forma segura para logs */
async function safeBody(res) {
  try {
    const ct = (res.headers()['content-type'] || '').toLowerCase();
    if (ct.includes('application/json')) {
      const j = await res.json();
      return JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return '<no-readable-body>';
  }
}

/** Valida status code exacto */
async function expectStatus(res, expected) {
  const got = res.status();
  expect(
    got,
    `Esperado ${expected}, recibido ${got} → body: ${await safeBody(res)}`
  ).toBe(Number(expected));
}

/** Valida que el status esté en una lista permitida (útil para teardowns) */
async function expectStatusIn(res, allowedCodes = [200, 204, 404]) {
  const got = res.status();
  expect(
    allowedCodes,
    `Esperado uno de [${allowedCodes.join(', ')}], recibido ${got} → body: ${await safeBody(res)}`
  ).toContain(got);
}

/** Valida header específico (texto exacto o RegExp) */
function expectHeader(res, name, matcher) {
  const headers = res.headers();
  const key = Object.keys(headers).find(k => k.toLowerCase() === String(name).toLowerCase());
  const got = key ? headers[key] : undefined;

  if (matcher instanceof RegExp) {
    expect(
      got,
      `Header "${name}" no coincide con ${matcher}. Recibido: ${got}`
    ).toMatch(matcher);
  } else {
    expect(
      got,
      `Header "${name}" esperado "${matcher}". Recibido: ${got}`
    ).toBe(String(matcher));
  }
}

/** Valida que la respuesta sea JSON (Content-Type) */
function expectJsonContentType(res) {
  const ct = (res.headers()['content-type'] || '').toLowerCase();
  expect(ct, `Content-Type no es JSON. Recibido: ${ct}`).toMatch(/application\/json/);
}

/** Valida el tiempo de latencia en ms (tú mides afuera y pasas el valor) */
function expectLatencyMs(elapsedMs, maxMs) {
  expect(
    elapsedMs,
    `Latencia ${elapsedMs}ms excede el máximo permitido ${maxMs}ms`
  ).toBeLessThanOrEqual(Number(maxMs));
}

/** Valida que el body JSON tenga un campo id (string/number no vacío) */
async function expectBodyHasId(res, idField = 'id') {
  expectJsonContentType(res);
  const body = await res.json();
  const id = body?.[idField];

  const ok =
    (typeof id === 'string' && id.trim().length > 0) ||
    (typeof id === 'number' && Number.isFinite(id));

  expect(ok, `Body no contiene ${idField} válido → body: ${JSON.stringify(body)}`).toBe(true);
}

/** Valida un body contra un esquema AJV */
function expectSchema(body, schema, opts = {}) {
  const validate = ajv.compile(schema);
  const ok = validate(body);
  if (!ok) {
    const msg = (validate.errors || [])
      .map(e => `${e.instancePath || '/'} ${e.message}`)
      .join('; ');
    expect(ok, `Esquema inválido: ${msg}\nBody: ${JSON.stringify(body)}`).toBe(true);
  }
}
function __readElapsedMs(res) {
  const t = typeof res.timing === 'function' ? res.timing() : null;
  return (t && typeof t.startTime === 'number' && typeof t.endTime === 'number')
    ? Math.max(0, Math.round(t.endTime - t.startTime))
    : undefined;
}

/** Común a errores: status, headers básicos, latencia */
async function assertCommonError(res, expectedStatus, { maxMs = 2000, contentTypePattern } = {}) {
  await expectStatus(res, expectedStatus);
  expectHeader(res, 'date', /.+/i);
  expectHeader(res, 'content-type', contentTypePattern || /(application\/json|text\/plain|text\/html)/i);
  const elapsed = __readElapsedMs(res);
  if (typeof elapsed === 'number') expectLatencyMs(elapsed, maxMs);
  return elapsed;
}

/** 401 sin KEY → debe contener "invalid key" (text/plain o JSON) */
async function assertErrNoKeyInvalidKey(res, { maxMs = 2000 } = {}) {
  await assertCommonError(res, 401, { maxMs, contentTypePattern: /(application\/json|text\/plain)/i });
  const ct = (res.headers()['content-type'] || '').toLowerCase();
  const bodyText = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
  if (!/invalid key/i.test(bodyText)) {
    throw new Error(`Se esperaba "invalid key" en la respuesta. Recibido: ${bodyText}`);
  }
}

/** 401 sin TOKEN → JSON { "message": "missing scopes" } */
async function assertErrNoTokenMissingScopes(res, { maxMs = 2000 } = {}) {
  await assertCommonError(res, 401, { maxMs, contentTypePattern: /application\/json/i });
  expectJsonContentType(res);
  const body = await res.json();
  if (String(body?.message).toLowerCase() !== 'missing scopes') {
    throw new Error(`"message" distinto a "missing scopes". Body: ${JSON.stringify(body)}`);
  }
}

/** 400 por display ausente o vacío → JSON con { message, error } esperados */
async function assertErrDisplayRequired(res, { maxMs = 2000 } = {}) {
  await assertCommonError(res, 400, { maxMs, contentTypePattern: /application\/json/i });
  expectJsonContentType(res);
  const body = await res.json();
  const expectedMsg = 'Display Name must be at least 1 character';
  const okMsg = String(body?.message) === expectedMsg;
  const okErr = String(body?.error || '').toUpperCase() === 'ERROR';
  if (!okMsg || !okErr) {
    throw new Error(
      `Body inválido. Esperado {message:"${expectedMsg}", error:"ERROR"}. Recibido: ${JSON.stringify(body)}`
    );
  }
}

/** 404 por método HTTP → NO debe filtrar token/key en body */
async function assertErrWrongMethodNoTokenLeak(res, { maxMs = 2000, forbiddenSubstrings = [] } = {}) {
  await assertCommonError(res, 404, { maxMs, contentTypePattern: /(text\/plain|text\/html|application\/json)/i });
  const ct = (res.headers()['content-type'] || '').toLowerCase();
  const bodyText = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
  for (const secret of (forbiddenSubstrings || []).filter(Boolean)) {
    if (bodyText.includes(secret)) {
      throw new Error(`Se detectó filtración de secreto en 404: "${secret}" dentro del body.`);
    }
  }
}

module.exports = {
  // ...lo que ya exportabas,
  // helpers
  safeBody,
  // asserts existentes
  expectStatus,
  expectStatusIn,
  expectHeader,
  expectJsonContentType,
  expectLatencyMs,
  expectBodyHasId,
  expectSchema,
  // NUEVOS asserts de error
  assertCommonError,
  assertErrNoKeyInvalidKey,
  assertErrNoTokenMissingScopes,
  assertErrDisplayRequired,
  assertErrWrongMethodNoTokenLeak,
};