// src/assertions/workspace_assert.js
const { expect } = require('@playwright/test');           // ✅ faltaba
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

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

module.exports = {
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
};
