// src/resources/payloads/workspace.payloads.js
// CJS

//funcion para payloads validos y agregar sufijos 
function buildValidFromRow(row, suffix = '') {
  // columnas esperadas del CSV: displayName, name
  const display = row.displayName ? `${row.displayName} ${suffix}`.trim() : `WS ${suffix}`.trim();//crea el nombre del name 
  const slugBase = row.name || 'ws';
  const name = `${slugBase}-${suffix}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');//le agrega un sifijo al name 
  return { displayName: display, name };
}


//Funcion para crear payload vacio o casos invalido
function buildInvalidFromRow(row, suffix = '') {//construye tu payload
  // construye payload "roto" según reason o columnas vacías del CSV
  const p = {};
  if (row.displayName) //valida que no este vaciio
    p.displayName = `${row.displayName} ${suffix}`.trim();

  if (row.name) 
    p.name = `${row.name}-${suffix}`.toLowerCase();
  // si el CSV pretende invalidar algo (e.g., slug inválido), puedes forzar:
  if (row.reason && /slug/i.test(row.reason)) p.name = `@@@${Date.now()}`; // forzar slug inválido, ajusta a tu API
  return p;
}

module.exports = { buildValidFromRow, buildInvalidFromRow };
