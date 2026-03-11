const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const content = fs.readFileSync(envPath, 'utf8');

console.log('File length:', content.length);
console.log('Contains BLOB_READ_WRITE:', content.includes('BLOB_READ_WRITE'));

const lines = content.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^\s*BLOB_READ_WRITE_TOKEN\s*=\s*(.+?)\s*$/);
  if (m) {
    console.log('Found at line', i + 1, 'match:', m[1].slice(0, 30) + '...');
    const val = m[1].trim().replace(/^["']|["']\s*$/g, '');
    console.log('Extracted length:', val.length);
    break;
  }
}
