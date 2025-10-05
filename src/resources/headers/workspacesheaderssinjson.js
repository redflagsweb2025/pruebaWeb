require('dotenv').config();

/**
 * Variantes de headers/auth. Para Trello, key y token normalmente van como query params,
 * pero mantenemos una abstracción por si quieres moverlos a headers en algún proxy.
 */
const HDR_CASES = {
  default: 'default',
  noToken: 'noToken',
  badToken: 'badToken',
  noKey: 'noKey',
};

function materializeAuthParams(hdrCase = HDR_CASES.default) {
  const key = process.env.API_KEY || '';
  const token = process.env.API_TOKEN || '';

  const params = new URLSearchParams();

  // Key
  if (hdrCase !== HDR_CASES.noKey) {
    if (!key) throw new Error('Falta TRELLO_KEY en .env');
    params.set('key', key);
  }

  // Token
  if (hdrCase === HDR_CASES.default) {
    if (!token) throw new Error('Falta TRELLO_TOKEN en .env');
    params.set('token', token);
  } else if (hdrCase === HDR_CASES.badToken) {
    params.set('token', 'TOKEN_INCORRECTO_123');
  } // noToken => no seteamos token

  return params;
}

module.exports = {
  HDR_CASES,
  materializeAuthParams,
};
