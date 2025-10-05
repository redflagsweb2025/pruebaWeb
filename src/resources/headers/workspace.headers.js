// src/resources/headers/workspace.headers.js
require('dotenv').config();

const matrix = require('../data/api/workspace.data.json'); // ← ruta desde /resources/headers → /resources/data/api

// ← debe ser un ARRAY
const HDR_CASES = Object.keys(matrix); // ["default","noAuth","noKey","badToken"]


//funcion crea headers y llama al json y reemeplaza los datos segun el campo del json
function materializeHeaders(hdrCase) {
  const tpl = matrix[hdrCase] || {};
  const API_KEY   = process.env.API_KEY   || '';
  const API_TOKEN = process.env.API_TOKEN || '';
  const out = {};
  for (const [k, v] of Object.entries(tpl)) {
    out[k] = typeof v === 'string'
      ? v.replace('{{API_KEY}}', API_KEY).replace('{{API_TOKEN}}', API_TOKEN)
      : v;
  }
  return out;
}
//define los status code que se espera de los casos de headers 
function expectedStatusFor(row, hdrCase) {
  const csvExp = Number(row.expectedStatus);
  if (hdrCase === 'default') 
    return Number.isFinite(csvExp) ? csvExp : 200;
  if (hdrCase === 'noAuth')   return 401;
  if (hdrCase === 'noKey')    return 401; // cambia a 400 si tu backend lo hace así
  if (hdrCase === 'badToken') return 401;
  return 200;
}

module.exports = { HDR_CASES, materializeHeaders, expectedStatusFor };
