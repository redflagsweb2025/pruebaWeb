const { cfg } = require('../utils/api/config.js');
const { withAuth } = require('../utils/api/e2e.helpers');
function authParams() { return { key: cfg.key, token: cfg.token }; }


async function apiCreateList(request, { name, idBoard }) {
  const url = withAuth('/lists');
  const res = await request.post(url, { form: { name, idBoard } });
  if (!res.ok()) throw new Error(`No se pudo crear List: ${res.status()} ${await res.text()}`);
  return res.json();
}



async function createList(request, params /* { name, idBoard, pos } */) {
  return request.post(`${cfg.apiBase}/lists`, {
    params: { ...authParams(), ...params },
  });
}

async function getList(request, listId) {
  return request.get(`${cfg.apiBase}/lists/${listId}`, {
    params: authParams(),
  });
}

async function updateList(request, listId, params /* { name, pos, idBoard } */) {
  return request.put(`${cfg.apiBase}/lists/${listId}`, {
    params: { ...authParams(), ...params },
  });
}

async function deleteList(request, listId) {
  // Trello no borra listas; se cierran
  return request.put(`${cfg.apiBase}/lists/${listId}/closed`, {
    params: { ...authParams(), value: true },
  });
}

function noAuthParams() { return {}; }
function invalidAuthParams() { return { key: 'bad_key_xyz', token: 'bad_token_xyz' }; }

async function createList_noAuth(request, params) {
  return request.post(`${cfg.apiBase}/lists`, { params: { ...noAuthParams(), ...params } });
}
async function createList_invalidAuth(request, params) {
  return request.post(`${cfg.apiBase}/lists`, { params: { ...invalidAuthParams(), ...params } });
}
async function getList_noAuth(request, listId) {
  return request.get(`${cfg.apiBase}/lists/${listId}`, { params: noAuthParams() });
}
async function updateList_noAuth(request, listId, params) {
  return request.put(`${cfg.apiBase}/lists/${listId}`, { params: { ...noAuthParams(), ...params } });
}
async function deleteList_noAuth(request, listId) {
  return request.put(`${cfg.apiBase}/lists/${listId}/closed`, { params: { ...noAuthParams(), value: true } });
}
async function updateList_invalidAuth(request, listId, params) {
  return request.put(`${cfg.apiBase}/lists/${listId}`, { params: { ...invalidAuthParams(), ...params } });
}
async function deleteList_invalidAuth(request, listId) {
  return request.put(`${cfg.apiBase}/lists/${listId}/closed`, { params: { ...invalidAuthParams(), value: true } });
}

module.exports = {
  createList, getList, updateList, deleteList,
  createList_noAuth, createList_invalidAuth,
  getList_noAuth, updateList_noAuth, deleteList_noAuth,
  updateList_invalidAuth, deleteList_invalidAuth,
  apiCreateList,
};
