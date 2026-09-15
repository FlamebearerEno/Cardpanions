import fs from 'fs';
import path from 'path';
const dir = process.argv[2] || 'tmp/art-b64';
for (const name of fs.readdirSync(dir).filter(n => n.startsWith('bundle_') && n.endsWith('.json'))) {
  const bundle = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  for (const [dest, b64] of Object.entries(bundle)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    console.log('wrote', dest);
  }
}
