// src/services/workspace_page.js
require('dotenv').config();

const RAW_BASE = process.env.API_BASE_URL || process.env.BASE_URL || 'https://api.trello.com';
const BASE_URL = RAW_BASE.replace(/\/+$/, '');
const API_KEY = process.env.API_KEY || '';
const API_TOKEN = process.env.API_TOKEN || '';

// ================== helpers internos ==================
function authQS({ includeKey = true, includeToken = true, key = API_KEY, token = API_TOKEN } = {}) {
  const parts = [];
  if (includeKey) parts.push(`key=${encodeURIComponent(key)}`);
  if (includeToken) parts.push(`token=${encodeURIComponent(token)}`);
  return parts.join('&');
}

function sanitizeHeadersForUrlAuth(hdrs = {}) {
  const out = { ...(hdrs || {}) };
  delete out.Authorization;
  delete out['authorization'];
  delete out['X-API-Key'];
  delete out['x-api-key'];
  return out;
}

// ================== CREATE (con opciones) ==================
async function createWorkspace(request, payload, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs = authQS(auth);
  const url = `${BASE_URL}/1/organizations${qs ? `?${qs}` : ''}`;

  const data = {
    displayName: payload.displayName,
    name: payload.name,
    desc: payload.desc || ''
  };

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  if (!finalHeaders['Content-Type'])
    finalHeaders['Content-Type'] = 'application/json';

  // 📘 Logging opcional (ayuda a depurar el teardown)
  console.log(`[CREATE] ${payload.displayName} → URL: ${url}`);

  return request.post(url, {
    headers: finalHeaders,
    data
  });
}

// ================== DELETE (sin cambios) ==================
async function deleteWorkspace(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs = authQS(auth);
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  console.log(`[DELETE] ${idOrSlug} → URL: ${url}`);
  return request.delete(url, { headers: finalHeaders });
}

// ================== GET (igual) ==================
async function getWorkspace(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs = authQS(auth);
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  return request.get(url, { headers: finalHeaders });
}

// ================== EXPORTS ==================
module.exports = {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  authQS,
  sanitizeHeadersForUrlAuth
};
