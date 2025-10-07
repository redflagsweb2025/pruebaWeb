// src/services/workspace_page.js
require('dotenv').config();
const { materializeAuthParams } = require('../resources/headers/workspacesheaderssinjson');
const { withAuth } = require('../utils/api/e2e.helpers');


const RAW_BASE = process.env.API_BASE || 'https://api.trello.com/1';
const BASE_URL = RAW_BASE.replace(/\/+$/, '');
const API_KEY = process.env.TRELLO_KEY || '';
const API_TOKEN = process.env.TRELLO_TOKEN || '';

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
  const url = `${BASE_URL}/organizations${qs ? `?${qs}` : ''}`;

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
  const url = `${BASE_URL}/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  console.log(`[DELETE] ${idOrSlug} → URL: ${url}`);
  return request.delete(url, { headers: finalHeaders });
}

// ================== GET (igual) ==================
async function getWorkspace(request, idOrSlug, options = {}) {
  const { headers = {}, auth = {} } = options;
  const qs = authQS(auth);
  const url = `${BASE_URL}/organizations/${encodeURIComponent(idOrSlug)}${qs ? `?${qs}` : ''}`;

  const finalHeaders = sanitizeHeadersForUrlAuth(headers);
  return request.get(url, { headers: finalHeaders });
}

// ================== EXPORTS ==================


async function getWorkspaces(request, { idOrName, hdrCase = 'default' } = {}) {
  const qp = materializeAuthParams(hdrCase);

  // endpoint válido requiere orgId en la ruta
  const url = `${BASE_URL}/organizations/${encodeURIComponent(idOrName)}?${qp.toString()}`;
  return await request.get(url);
}



/**
 * GET incorrecto (sin {orgId} en la ruta) -> /organizations
 * Para el caso WS-API-APIRG-GET-004
 */
async function getWorkspaceWithoutId(request, { hdrCase = 'default' } = {}) {
  const { materializeAuthParams } = require('../resources/headers/workspacesheaderssinjson');
  const BASE = process.env.TRELLO_BASE || process.env.API_BASE || 'https://api.trello.com/1';
  const qp = materializeAuthParams(hdrCase);
  // endpoint mal escrito a propósito (singular) para forzar 404
  const url = `${BASE}/organization?${qp.toString()}`;
  return await request.get(url);
}


async function createWorkspacefix(request, { displayName, name, desc = '', hdrCase = 'default' } = {}) {
  const qp = materializeAuthParams(hdrCase);
  const url = `${BASE_URL}/organizations?${qp.toString()}`;
  // Trello acepta campos como x-www-form-urlencoded o query; usamos form:
  return await request.post(url, {
    form: { displayName, name, desc },
  });
}

// ---------- DELETE ----------
async function deleteWorkspacefix(request, { idOrName, hdrCase = 'default' } = {}) {
  const qp = materializeAuthParams(hdrCase);
  const url = `${BASE_URL}/organizations/${encodeURIComponent(idOrName)}?${qp.toString()}`;
  return await request.delete(url);
}

// ---------- UPDATE (PUT) ----------
async function updateWorkspacefix(
  request,
  { idOrName, displayName, name, desc, website, hdrCase = 'default' } = {}
) {
  const qp = materializeAuthParams(hdrCase);
  const url = `${BASE_URL}/organizations/${encodeURIComponent(idOrName)}?${qp.toString()}`;

  // Solo manda campos presentes (evita ReferenceError y sobreescrituras con "undefined")
  const form = {};
  if (displayName !== undefined) form.displayName = displayName;
  if (name !== undefined)        form.name        = name;
  if (desc !== undefined)        form.desc        = desc;
  if (website !== undefined)     form.website     = website;

  return await request.put(url, { form });
}

/** Crea Workspace (Organization) para e2e*/
async function apiCreateWorkspace(request, { displayName, name }) {
  const url = withAuth('/organizations');
  const res = await request.post(url, { form: { displayName, name } });
  if (!res.ok()) throw new Error(`No se pudo crear Workspace: ${res.status()} ${await res.text()}`);
  return res.json();
}

/** Elimina Workspace (borra boards, listas, tarjetas) para e2e */
async function apiDeleteWorkspace(request, idWorkspace) {
  const url = withAuth(`/organizations/${idWorkspace}`);
  const res = await request.delete(url);
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`No se pudo borrar Workspace: ${res.status()} ${await res.text()}`);
  }
  return true;
}

module.exports = {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  authQS,
  sanitizeHeadersForUrlAuth,
  getWorkspaces,
  getWorkspaceWithoutId,
  createWorkspacefix,
  deleteWorkspacefix,
  updateWorkspacefix,
  apiDeleteWorkspace,
  apiCreateWorkspace,
};
