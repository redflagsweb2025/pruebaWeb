// src/services/workspace_page.js
require('dotenv').config();

const RAW_BASE   = process.env.API_BASE_URL || process.env.BASE_URL || 'https://api.trello.com';
const BASE_URL   = RAW_BASE.replace(/\/+$/, '');
const API_KEY    = process.env.API_KEY   || '';
const API_TOKEN  = process.env.API_TOKEN || '';

// Auth por URL (puedes desactivar key/token o sobreescribirlos)
function authQS({ includeKey = true, includeToken = true, key = API_KEY, token = API_TOKEN } = {}) {
  const parts = [];
  if (includeKey)   parts.push(`key=${encodeURIComponent(key)}`);
  if (includeToken) parts.push(`token=${encodeURIComponent(token)}`);
  return parts.join('&');
}

// Quita encabezados de auth si estás usando auth por URL
function sanitizeHeadersForUrlAuth(hdrs = {}) {
  const out = { ...(hdrs || {}) };
  delete out.Authorization;
  delete out['authorization'];
  delete out['X-API-Key'];
  delete out['x-api-key'];
  return out;
}

/* ================== BASICO (usa .env) ================== */
async function createWorkspace(request, payload) {
  const url = `${BASE_URL}/1/organizations?${authQS()}`;
  const body = {
    displayName: payload.displayName,
    name: payload.name,
    desc: payload.desc || ''
  };
  return request.post(url, {
    headers: { 'Content-Type': 'application/json' },
    data: body
  });
}

async function getWorkspace(request, idOrSlug) {
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS()}`;
  return request.get(url);
}

async function deleteWorkspace(request, idOrSlug) {
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS()}`;
  return request.delete(url);
}

/* ====== VARIANTE: headers extra + overrides de auth (URL) ====== */
async function createWorkspaceWithHeaders(request, payload, options = {}) {
  const { headers = {}, auth = {} } = options;
  const url = `${BASE_URL}/1/organizations?${authQS(auth)}`;

  const body = {
    displayName: payload.displayName,
    name: payload.name,
    desc: payload.desc || ''
  };

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';

  return request.post(url, {
    headers: finalHeaders,
    data: body
  });
}

async function getWorkspaceWithHeaders(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS(auth)}`;
  return request.get(url, { headers: sanitizeHeadersForUrlAuth(headers) });
}

async function deleteWorkspaceWithHeaders(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS(auth)}`;
  return request.delete(url, { headers: sanitizeHeadersForUrlAuth(headers) });
}

module.exports = {
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
  createWorkspaceWithHeaders,
  getWorkspaceWithHeaders,
  deleteWorkspaceWithHeaders,
  authQS
};
