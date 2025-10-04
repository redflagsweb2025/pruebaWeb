const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function loadCsv(inputPath) {
  const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
  const raw = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}
module.exports = { loadCsv };

