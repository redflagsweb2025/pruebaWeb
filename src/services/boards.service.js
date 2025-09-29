const { cfg } = require('../utils/api/config.js');

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

module.exports = { createBoard, getBoard, updateBoard, deleteBoard };
