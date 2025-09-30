// src/resources/payloads/workspace.payloads.js
// CJS
function buildValidFromRow(row, suffix = '') {
  // columnas esperadas del CSV: displayName, name
  const display = row.displayName ? `${row.displayName} ${suffix}`.trim() : `WS ${suffix}`.trim();
  const slugBase = row.name || 'ws';
  const name = `${slugBase}-${suffix}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  return { displayName: display, name };
}

function buildInvalidFromRow(row, suffix = '') {
  // construye payload "roto" según reason o columnas vacías del CSV
  const p = {};
  if (row.displayName) p.displayName = `${row.displayName} ${suffix}`.trim();
  if (row.name) p.name = `${row.name}-${suffix}`.toLowerCase();
  // si el CSV pretende invalidar algo (e.g., slug inválido), puedes forzar:
  if (row.reason && /slug/i.test(row.reason)) p.name = `@@@${Date.now()}`; // forzar slug inválido, ajusta a tu API
  return p;
}

module.exports = { buildValidFromRow, buildInvalidFromRow };
