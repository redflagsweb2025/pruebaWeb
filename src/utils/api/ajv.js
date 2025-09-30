const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function validateWithSchema(schema, data) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  const errorsText = ajv.errorsText(validate.errors, { separator: '\n' });
  return { valid, errorsText };
}

module.exports = { validateWithSchema };
