// src/api/trello_api.js
require('dotenv').config();

/** Helper para URL con auth */
const withAuth = (path) => {
  const base = process.env.API_BASE || 'https://api.trello.com/1';
  const key = process.env.TRELLO_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error('Falta TRELLO_API_KEY o TRELLO_TOKEN en .env');
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}key=${key}&token=${token}`;
};

module.exports = {
  withAuth,
};