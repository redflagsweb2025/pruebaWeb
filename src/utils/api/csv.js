const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function resolveCsvPath(inputPath) {
  if (!inputPath) throw new Error('loadCsv: inputPath requerido');

  if (path.isAbsolute(inputPath)) return inputPath;

  const p1 = path.resolve(process.cwd(), inputPath);
  if (fs.existsSync(p1)) return p1;

  // 👇 SUBIR 4 NIVELES: src/utils/api → src/utils → src → raíz
  const projectRoot = path.resolve(__dirname, '../../../..');
  const p2 = path.resolve(projectRoot, inputPath);
  if (fs.existsSync(p2)) return p2;

  const p3 = path.resolve(__dirname, inputPath);
  if (fs.existsSync(p3)) return p3;

  throw new Error(
    `loadCsv: archivo no encontrado: "${inputPath}"\nIntenté:\n- ${p1}\n- ${p2}\n- ${p3}`
  );
}

function loadCsv(inputPath) {
  const abs = resolveCsvPath(inputPath);
  const raw = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

module.exports = { loadCsv };
