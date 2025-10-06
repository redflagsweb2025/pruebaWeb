const { withAuth } = require('../../src/utils/api/e2e');

async function apiCreateList(request, { name, idBoard }) {
  const url = withAuth('/lists');
  const res = await request.post(url, { form: { name, idBoard } });
  if (!res.ok()) throw new Error(`No se pudo crear List: ${res.status()} ${await res.text()}`);
  return res.json();
}


module.exports = {
  apiCreateList,
};
