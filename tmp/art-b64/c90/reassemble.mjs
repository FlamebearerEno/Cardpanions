import fs from "fs";
import path from "path";
const dir = process.argv[2] || "tmp/art-b64/c90";
const out = process.argv[3] || "tmp/art-b64";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
fs.mkdirSync(out, { recursive: true });
for (const { file, parts, size } of manifest) {
  const buf = Buffer.concat(parts.map(p => fs.readFileSync(path.join(dir, p))));
  if (buf.length !== size) throw new Error(`${file} size ${buf.length} != ${size}`);
  fs.writeFileSync(path.join(out, file), buf);
  console.log("ok", file, buf.length);
}
