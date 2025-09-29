const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv); // habilita formatos como "uri", "email", etc.

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

module.exports = { expectStatusOK, validateSchema };
