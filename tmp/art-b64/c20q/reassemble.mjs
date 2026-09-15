#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'MANIFEST.json'), 'utf8'));
const outDir = path.join(__dirname, '..'); // tmp/art-b64/

const bundles = new Map();
for (const p of man.parts) {
  const m = p.part.match(/^(bundle_\d+\.json)\.p(\d+)$/);
  if (!m) throw new Error('bad part name ' + p.part);
  const [, bundle, idx] = m;
  if (!bundles.has(bundle)) bundles.set(bundle, []);
  bundles.get(bundle).push({ idx: parseInt(idx, 10), ...p });
}

for (const [bundle, parts] of bundles) {
  parts.sort((a, b) => a.idx - b.idx);
  const bufs = [];
  for (const p of parts) {
    for (const q of p.q) {
      const fp = path.join(__dirname, q.name);
      if (!fs.existsSync(fp)) throw new Error('missing ' + q.name);
      const b = fs.readFileSync(fp);
      if (b.length !== q.size) throw new Error(`size ${q.name}: got ${b.length} want ${q.size}`);
      const sha = crypto.createHash('sha1').update(b).digest('hex');
      if (sha !== q.sha1) throw new Error(`sha1 ${q.name}`);
      bufs.push(b);
    }
  }
  const data = Buffer.concat(bufs);
  const exp = man.bundles?.[bundle];
  if (exp) {
    if (data.length !== exp.size) throw new Error(`bundle size ${bundle}`);
    const sha = crypto.createHash('sha1').update(data).digest('hex');
    if (sha !== exp.sha1) throw new Error(`bundle sha1 ${bundle}`);
  }
  fs.writeFileSync(path.join(outDir, bundle), data);
  console.log('wrote', bundle, data.length);
}
console.log('done bundles', bundles.size);
