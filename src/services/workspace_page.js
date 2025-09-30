/* const BASE_URL = process.env.BASE_URL;

async function createWorkspace(request, payload, { headers } = {}) {
  return await request.post(`${BASE_URL}/workspaces`, {
    headers,
    data: payload
  });
}

async function getWorkspace(request, id, { headers } = {}) {
  return await request.get(`${BASE_URL}/workspaces/${id}`, { headers });
}

async function deleteWorkspace(request, id, { headers } = {}) {
  return await request.delete(`${BASE_URL}/workspaces/${id}`, { headers });
}

module.exports = { createWorkspace, getWorkspace, deleteWorkspace };
 */
// src/services/workspace_page.js
require('dotenv').config();

const BASE_URL = (process.env.BASE_URL || 'https://api.trello.com').replace(/\/+$/, '');
const API_KEY = process.env.API_KEY;
const API_TOKEN = process.env.API_TOKEN;

function authQS() {
  return `key=${encodeURIComponent(API_KEY)}&token=${encodeURIComponent(API_TOKEN)}`;
}

// Crear Workspace (Organization en Trello)
async function createWorkspace(request, payload) {
  const url = `${BASE_URL}/1/organizations?${authQS()}`;
  // Trello permite params en body también
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

// Obtener Workspace (por id o slug)
async function getWorkspace(request, idOrSlug) {
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS()}`;
  return request.get(url);
}

// ⚠️ Trello no tiene DELETE real de organizations.
// Esto devolverá 404/405 normalmente → úsalo solo como cleanup “best effort”.
async function deleteWorkspace(request, idOrSlug) {
  const url = `${BASE_URL}/1/organizations/${encodeURIComponent(idOrSlug)}?${authQS()}`;
  return request.delete(url);
}

module.exports = {
  createWorkspace,
  getWorkspace,
  deleteWorkspace
};