// src/api/trello_api.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');


/** Helper para URL con auth */
const withAuth = (path) => {
  const base = process.env.API_BASE || 'https://api.trello.com/1';
  const key = process.env.TRELLO_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error('Falta TRELLO_API_KEY o TRELLO_TOKEN en .env');
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}key=${key}&token=${token}`;
};

/**
 * Devuelve una ruta de imagen para portada.
 * - Usa src/resources/images/invierno.jpg si existe.
 * - Si no, genera assets/cover-demo.png (1x1 PNG válido) y devuelve esa ruta.
 * @returns {string} Ruta absoluta del archivo imagen.
 */
function ensureCoverImage() {
  const candidate = path.resolve('src', 'resources', 'images', 'invierno.jpg');
  if (fs.existsSync(candidate)) return candidate;

  const assetsDir = path.resolve('assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const fallback = path.resolve(assetsDir, 'cover-demo.png');
  if (!fs.existsSync(fallback)) {
    const png1x1 = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000150a0a4e50000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(fallback, png1x1);
  }
  return fallback;
}




module.exports = {
  ensureCoverImage,
  withAuth,
};

