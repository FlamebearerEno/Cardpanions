const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEST = {
  companions: path.join(ROOT, "public/art/companions"),
  cards: path.join(ROOT, "public/art/cards"),
  ui: path.join(ROOT, "public/art/ui"),
  floors: path.join(ROOT, "public/art/floors"),
  docs: path.join(ROOT, "docs/art"),
};

const SEARCH_ROOTS = [
  path.join(ROOT, "uploads"),
  path.join(ROOT, "Uploads"),
  "/uploads",
  "/tmp/uploads",
  "/tmp/attachments",
  path.join(process.env.HOME || "/home/ubuntu", "uploads"),
  "/cursor/stores/user",
  "/opt/cursor/uploads",
  path.join(ROOT, "chrome"),
  path.join(ROOT, "uploads/chrome"),
];

const CARD_IDS = [
  "opening_jab",
  "guarded_point",
  "straight_claim",
  "trap_clause",
  "loud_correct",
  "comeback_line",
  "swagger_hook",
  "exact_count",
  "sideways_cut",
  "finisher_bite",
  "bitter_balm",
  "contrarian_echo",
  "warm_up",
  "steady_breath",
  "read_ahead",
  "amp_next",
  "deny",
  "second_thought",
  "raise_stakes",
  "overreach_riff",
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function snake(s) {
  return s
    .replace(/\.png$/i, "")
    .replace(/\.webp$/i, "")
    .replace(/\.jpg$/i, "")
    .replace(/\.jpeg$/i, "")
    .replace(/\.md$/i, "")
    .replace(/\.json$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  ${path.relative(ROOT, dest)}  ←  ${src}`);
}

function main() {
  const files = [];
  for (const root of SEARCH_ROOTS) files.push(...walk(root));
  // Also scan workspace for exported pngs that aren't already in public/art.
  for (const p of walk(ROOT)) {
    if (p.includes("/node_modules/") || p.includes("/.git/") || p.includes("/.next/")) {
      continue;
    }
    if (p.includes("/public/art/")) continue;
    files.push(p);
  }

  const unique = [...new Set(files)];
  const pngs = unique.filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
  const docs = unique.filter((f) => /PROMPT_BIBLE|MANIFEST\.json|EXPORT_NOTES/i.test(path.basename(f)));

  console.log(`Found ${pngs.length} images, ${docs.length} docs in search roots.`);

  let copied = 0;
  for (const src of pngs) {
    const base = path.basename(src);
    const key = snake(base);
    let dest = null;

    if (key.startsWith("companion_rival_") || key.startsWith("companion_")) {
      const n = key.match(/(\d+)/)?.[1];
      dest = path.join(DEST.companions, n ? `companion_rival_${n.padStart(2, "0")}.png` : base);
    } else if (key.startsWith("ui_") || /\/chrome\//.test(src)) {
      const name = key.startsWith("ui_") ? `${key}.png` : `ui_${key}.png`;
      dest = path.join(DEST.ui, name.replace(/\.png\.png$/, ".png"));
    } else if (key.includes("floor") || key.includes("the_door") || key.includes("door")) {
      dest = path.join(DEST.floors, "floor_01_the_door.png");
    } else if (key.startsWith("take_") || key.startsWith("riff_")) {
      dest = path.join(DEST.cards, `${key}.png`);
    } else {
      for (const id of CARD_IDS) {
        if (key === id || key.endsWith(`_${id}`) || key === `amp` && id === "amp_next") {
          const kind = [
            "warm_up",
            "steady_breath",
            "read_ahead",
            "amp_next",
            "deny",
            "second_thought",
            "raise_stakes",
            "overreach_riff",
          ].includes(id)
            ? "riff"
            : "take";
          dest = path.join(DEST.cards, `${kind}_${id}.png`);
          break;
        }
      }
    }

    if (!dest) continue;
    copy(src, dest);
    copied += 1;
  }

  const ampNext = path.join(DEST.cards, "riff_amp_next.png");
  const ampAlias = path.join(DEST.cards, "riff_amp.png");
  if (fs.existsSync(ampAlias) && !fs.existsSync(ampNext)) {
    copy(ampAlias, ampNext);
    copied += 1;
  } else if (fs.existsSync(ampNext) && !fs.existsSync(ampAlias)) {
    copy(ampNext, ampAlias);
    copied += 1;
  }

  const grit = path.join(DEST.companions, "companion_rival_03.png");
  const vex = path.join(DEST.companions, "companion_rival_01.png");
  if (fs.existsSync(vex) && !fs.existsSync(grit)) {
    copy(vex, grit);
    copied += 1;
  }

  for (const src of docs) {
    copy(src, path.join(DEST.docs, path.basename(src)));
    copied += 1;
  }

  console.log(`Copied ${copied} files.`);
  if (copied === 0) {
    console.error("No Creative assets found. Expected uploads/ (or chrome/) with take_*.png / riff_*.png / companion_rival_*.png.");
    process.exitCode = 2;
  }
}

main();
