// Resize the source logo into optimized PNGs for favicon + UI use.
// Source: public/logo.png (any size)
// Outputs:
//   public/logo.png            -> 512x512 (UI logo, replaces source)
//   src/app/icon.png           -> 256x256 (Next.js auto favicon)
//   src/app/apple-icon.png     -> 180x180 (Apple touch icon)
//
// Usage: pnpm icons:resize  (or)  npm run icons:resize

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SRC = path.join(root, "public", "logo.png");
const SRC_BACKUP = path.join(root, "public", "logo.original.png");

const TARGETS = [
  { out: path.join(root, "public", "logo.png"), size: 512 },
  { out: path.join(root, "src", "app", "icon.png"), size: 256 },
  { out: path.join(root, "src", "app", "apple-icon.png"), size: 180 },
];

async function main() {
  // Verify source exists
  try {
    await fs.access(SRC);
  } catch {
    console.error(`Source not found: ${SRC}`);
    console.error("Save your logo as public/logo.png first.");
    process.exit(1);
  }

  // Backup the original once (only if backup doesn't exist yet)
  try {
    await fs.access(SRC_BACKUP);
    console.log("Backup already exists, skipping.");
  } catch {
    await fs.copyFile(SRC, SRC_BACKUP);
    console.log(`Backup created -> ${path.relative(root, SRC_BACKUP)}`);
  }

  // Read original from backup so re-running doesn't compound resizes
  const buf = await fs.readFile(SRC_BACKUP);

  // Strip light/white background: make near-white pixels transparent
  // with a soft falloff so anti-aliased edges blend cleanly.
  const transparent = await stripWhiteBackground(buf);
  console.log("Background removed (white -> transparent)");

  for (const { out, size } of TARGETS) {
    await fs.mkdir(path.dirname(out), { recursive: true });
    await sharp(transparent)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, palette: true })
      .toFile(out);
    const { size: bytes } = await fs.stat(out);
    console.log(
      `  ${path.relative(root, out).padEnd(36)} ${size}x${size}  ${(bytes / 1024).toFixed(1)} KB`
    );
  }

  console.log("\nDone. Refresh browser to see updated icons.");
}

/**
 * Make near-white pixels transparent. Uses a soft alpha falloff between
 * SOFT_LO and SOFT_HI luminance values to keep anti-aliased edges smooth.
 */
async function stripWhiteBackground(buf) {
  const SOFT_LO = 200; // below this, fully opaque
  const SOFT_HI = 245; // above this, fully transparent

  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.max(r, g, b);

    if (lum >= SOFT_HI) {
      data[i + 3] = 0;
    } else if (lum > SOFT_LO) {
      const t = (lum - SOFT_LO) / (SOFT_HI - SOFT_LO); // 0..1
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
    }
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
