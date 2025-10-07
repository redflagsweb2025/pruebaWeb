require('dotenv').config();

const matrix = require('../data/api/workspace.data.json'); 


const HDR_CASES = Object.keys(matrix); 


//funcion crea headers y llama al json y reemeplaza los datos segun el campo del json
function materializeHeaders(hdrCase) {
  const tpl = matrix[hdrCase] || {};
  const API_KEY   = process.env.TRELLO_KEY   || '';
  const API_TOKEN = process.env.TRELLO_TOKEN || '';
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
  if (hdrCase === 'noKey')    return 401; 
  if (hdrCase === 'badToken') return 401;
  return 200;
}

module.exports = { HDR_CASES, materializeHeaders, expectedStatusFor };



