const { cfg } = require('../utils/api/config.js');
const { withAuth } = require('../utils/api/e2e.helpers.js');



/** Crea List en un Board */
async function apiCreateBoard(request, { name, idOrganization }) {
  const url = withAuth('/boards');
  const res = await request.post(url, { form: { name, idOrganization, defaultLists: 'false' } });
  if (!res.ok()) throw new Error(`No se pudo crear Board: ${res.status()} ${await res.text()}`);
  return res.json();
}
/** Obtiene datos de Board (shortUrl para UI) */
async function apiGetBoard(request, idBoard) {
  const url = withAuth(`/boards/${idBoard}`);
  const res = await request.get(url);
  if (!res.ok()) throw new Error(`No se pudo obtener Board: ${res.status()} ${await res.text()}`);
  return res.json();
}




function authParams() { return { key: cfg.key, token: cfg.token }; }
async function createBoard(request, params) {
  return request.post(`${cfg.apiBase}/boards`, { params: { ...authParams(), ...params } });
}
async function getBoard(request, id) {
  return request.get(`${cfg.apiBase}/boards/${id}`, { params: authParams() });
}
async function updateBoard(request, id, params) {
  return request.put(`${cfg.apiBase}/boards/${id}`, { params: { ...authParams(), ...params } });
}
async function deleteBoard(request, id) {
  return request.delete(`${cfg.apiBase}/boards/${id}`, { params: authParams() });
}

// ⬇️ NUEVO: helpers solo para NEGATIVOS (sin token / token inválido) y endpoint incorrecto
function noAuthParams() { return {}; }
function invalidAuthParams() { return { key: 'bad_key_xyz', token: 'bad_token_xyz' }; }

// POST sin token
async function createBoard_noAuth(request, params) {
  return request.post(`${cfg.apiBase}/boards`, { params: { ...noAuthParams(), ...params } });
}
// POST token inválido
async function createBoard_invalidAuth(request, params) {
  return request.post(`${cfg.apiBase}/boards`, { params: { ...invalidAuthParams(), ...params } });
}

// GET sin token
async function getBoard_noAuth(request, id) {
  return request.get(`${cfg.apiBase}/boards/${id}`, { params: noAuthParams() });
}
// PUT sin token
async function updateBoard_noAuth(request, id, params) {
  return request.put(`${cfg.apiBase}/boards/${id}`, { params: { ...noAuthParams(), ...params } });
}
// DELETE sin token
async function deleteBoard_noAuth(request, id) {
  return request.delete(`${cfg.apiBase}/boards/${id}`, { params: noAuthParams() });
}

// PUT token inválido
async function updateBoard_invalidAuth(request, id, params) {
  return request.put(`${cfg.apiBase}/boards/${id}`, { params: { ...invalidAuthParams(), ...params } });
}
// DELETE token inválido
async function deleteBoard_invalidAuth(request, id) {
  return request.delete(`${cfg.apiBase}/boards/${id}`, { params: invalidAuthParams() });
}
// GET token inválido
async function getBoard_invalidAuth(request, id) {
  return request.get(`${cfg.apiBase}/boards/${id}`, { params: invalidAuthParams() });
}

// GET colección (endpoint incorrecto para el caso BRD-API-GET-004)
async function getBoards_collection(request) {
  return request.get(`${cfg.apiBase}/boards`, { params: authParams() });
}

module.exports = {
  // existentes
  createBoard, getBoard, updateBoard, deleteBoard,
  // nuevos para negativos / ruta incorrecta
  createBoard_noAuth, createBoard_invalidAuth,
  getBoard_noAuth, getBoard_invalidAuth,
  updateBoard_noAuth, updateBoard_invalidAuth,
  deleteBoard_noAuth, deleteBoard_invalidAuth,
  getBoards_collection,
  apiCreateBoard,
  apiGetBoard
};