const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv); // formatos como "uri", "email", etc.

function expectStatusOK(response) {
  const st = response.status();
  if (st !== 200) {
    throw new Error(`Esperado 200, llegó ${st}\nBody: ${response.text()}`);
  }
}

function validateSchema(schema, payload) {
  const validate = ajv.compile(schema);
  const ok = validate(payload);
  if (!ok) {
    throw new Error('Schema inválido: ' + JSON.stringify(validate.errors, null, 2));
  }
}

/**
 * ✅ Faltaba definir esta función
 * Permite validar un solo status (número) o una lista de permitidos (array).
 */
function expectStatus(response, expected) {
  const st = response.status();
  if (Array.isArray(expected)) {
    if (!expected.includes(st)) {
      throw new Error(`Esperado uno de ${expected}, llegó ${st}\nBody: ${response.text()}`);
    }
  } else {
    if (st !== expected) {
      throw new Error(`Esperado ${expected}, llegó ${st}\nBody: ${response.text()}`);
    }
  }
}

/**
 * Valida que un header exista y contenga un valor (string) o cumpla un regex.
 */
function expectHeaderContains(response, headerName, expected) {
  const headers = response.headers();
  const value = headers[headerName.toLowerCase()];
  if (!value) throw new Error(`Header "${headerName}" no presente`);
  if (expected instanceof RegExp) {
    if (!expected.test(value)) {
      throw new Error(`Header "${headerName}"="${value}" no hace match con ${expected}`);
    }
  } else {
    if (!String(value).includes(String(expected))) {
      throw new Error(`Header "${headerName}"="${value}" no contiene "${expected}"`);
    }
  }
}

module.exports = { expectStatusOK, validateSchema, expectStatus, expectHeaderContains };
