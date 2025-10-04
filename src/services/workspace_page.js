// src/services/workspace_page.js
// src/services/workspace_page.js
require('dotenv').config();

const RAW_BASE  = process.env.API_BASE_URL || process.env.BASE_URL || 'https://api.trello.com';
const BASE_URL  = RAW_BASE.replace(/\/+$/, '');
const API_KEY   = process.env.API_KEY   || '';
const API_TOKEN = process.env.API_TOKEN || '';

/** Construye key/token en la URL según el caso de autenticación */
function authQS({
  includeKey = true,
  includeToken = true,
  key   = API_KEY,
  token = API_TOKEN
} = {}) {
  const parts = [];
  if (includeKey)   parts.push(`key=${encodeURIComponent(key)}`);
  if (includeToken) parts.push(`token=${encodeURIComponent(token)}`);
  return parts.join('&');
}

/** Quita cabeceras de auth (Trello usa auth por URL) */
function sanitizeHeadersForUrlAuth(hdrs = {}) {
  const out = { ...(hdrs || {}) };
  delete out.Authorization;
  delete out.authorization;
  delete out['X-API-Key'];
  delete out['x-api-key'];
  return out;
}

/**
 * Crea un workspace (organization)
 * @param {APIRequestContext} request - fixture de Playwright
 * @param {{displayName?: string, name?: string, desc?: string}} payload
 * @param {{ headers?: object, auth?: { includeKey?: boolean, includeToken?: boolean, key?: string, token?: string } }} options
 */
async function createWorkspace(request, payload, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs  = authQS(auth);
  const url = `${BASE_URL}/1/organizations${qs ? `?${qs}` : ''}`;

  const data = {
    displayName: payload.displayName,
    name: payload.name,
    desc: payload.desc || ''
  };

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';

  return request.post(url, {
    headers: finalHeaders,
    data
  });
}

/**
 * Obtiene un workspace por id o slug
 */
async function getWorkspace(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs  = authQS(auth);
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;
  return request.get(url, { headers: sanitizeHeadersForUrlAuth(headers) });
}

/**
 * Elimina un workspace por id o slug
 */
async function deleteWorkspace(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs  = authQS(auth);
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;
  return request.delete(url, { headers: sanitizeHeadersForUrlAuth(headers) });
}

module.exports = {
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
  authQS,
  sanitizeHeadersForUrlAuth
};
