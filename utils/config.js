require('dotenv').config();
module.exports.cfg = {
  apiBase: process.env.API_BASE || 'https://api.trello.com/1',
  key: process.env.TRELLO_KEY,
  token: process.env.TRELLO_TOKEN,
};
