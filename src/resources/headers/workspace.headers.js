const fs = require('fs');
const path = require('path');

function loadHeaderCases(jsonPath) {
  const abs = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(jsonPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);
  return data;
}

function resolveEnvPlaceholders(headersObj) {
  if (!headersObj) return {};
  const out = {};
  for (const [k, v] of Object.entries(headersObj)) {
    if (typeof v === 'string') {
      out[k] = v
        .replace('{{API_KEY}}', process.env.API_KEY || '')
        .replace('{{API_TOKEN}}', process.env.API_TOKEN || '');
    } else {
      out[k] = v;
    }
  }
  // elimina pares vacíos (por si falta una env)
  for (const [k, v] of Object.entries(out)) {
    if (v === '' || v == null) delete out[k];
  }
  return out;
}

module.exports = { loadHeaderCases, resolveEnvPlaceholders };
