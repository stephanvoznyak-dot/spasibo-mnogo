#!/usr/bin/env node
/**
 * Full iOS / Xcode preparation for «Спасибо много».
 * Run on macOS with Xcode installed:
 *
 *   node scripts/setup-ios.mjs
 *   # or
 *   npm run setup:ios
 *
 * Steps:
 *  1. Ensure @capacitor/ios is present
 *  2. Build standalone web assets into android-www/
 *  3. npx cap add ios (if ios/ is missing)
 *  4. Patch Info.plist with camera / photo library usage strings
 *  5. npx cap sync ios
 *  6. Print next steps (open Xcode, set Team)
 */

import { existsSync } from "node:fs";
import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isMac = process.platform === "darwin";

function run(cmd, args, opts = {}) {
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`\nCommand failed with exit code ${r.status}: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

function runNpmScript(script) {
  run("npm", ["run", script]);
}

async function ensureCapacitorIos() {
  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  const has =
    pkg.dependencies?.["@capacitor/ios"] ||
    pkg.devDependencies?.["@capacitor/ios"];
  if (!has) {
    console.log("\n→ Installing @capacitor/ios…");
    run("npm", ["install", "@capacitor/ios@^8.5.2", "--save-dev", "--no-audit", "--no-fund"]);
  }
}

const CAMERA_KEYS = {
  NSCameraUsageDescription:
    "Приложению требуется доступ к камере для сканирования QR-кодов актов обязательств.",
  NSPhotoLibraryUsageDescription:
    "Приложению может потребоваться доступ к фото для выбора снимка QR-кода.",
  NSPhotoLibraryAddUsageDescription:
    "Приложению может потребоваться сохранение снимков QR-кодов.",
};

function findInfoPlists() {
  const candidates = [
    join(root, "ios", "App", "App", "Info.plist"),
    join(root, "ios", "App", "Info.plist"),
  ];
  return candidates.filter((p) => existsSync(p));
}

function plistHasKey(content, key) {
  return content.includes(`<key>${key}</key>`);
}

function injectPlistKeys(content) {
  let updated = content;
  const insertions = [];

  for (const [key, value] of Object.entries(CAMERA_KEYS)) {
    if (!plistHasKey(updated, key)) {
      insertions.push(
        `\t<key>${key}</key>\n\t<string>${value}</string>`
      );
    }
  }

  if (insertions.length === 0) {
    return { content: updated, changed: false };
  }

  const block = insertions.join("\n") + "\n";

  // Insert before the closing </dict> of the root (last </dict> before </plist>)
  const plistClose = updated.lastIndexOf("</plist>");
  if (plistClose === -1) {
    throw new Error("Info.plist: missing </plist>");
  }
  const beforePlist = updated.slice(0, plistClose);
  const dictClose = beforePlist.lastIndexOf("</dict>");
  if (dictClose === -1) {
    throw new Error("Info.plist: missing </dict>");
  }

  updated =
    updated.slice(0, dictClose) + block + updated.slice(dictClose);
  return { content: updated, changed: true };
}

async function patchInfoPlists() {
  const paths = findInfoPlists();
  if (paths.length === 0) {
    console.warn(
      "\n⚠ Info.plist not found under ios/. Run this script again after `npx cap add ios`."
    );
    return;
  }
  for (const p of paths) {
    const raw = await readFile(p, "utf8");
    const { content, changed } = injectPlistKeys(raw);
    if (changed) {
      await writeFile(p, content, "utf8");
      console.log(`\n✓ Patched camera permissions in ${p.replace(root + "/", "")}`);
    } else {
      console.log(`\n✓ Camera permissions already present in ${p.replace(root + "/", "")}`);
    }
  }
}

async function main() {
  console.log("=== Setup iOS for «Спасибо много» ===");
  console.log(`Root: ${root}`);
  console.log(`Platform: ${process.platform}`);

  if (!isMac) {
    console.warn(
      "\n⚠ This script is intended to run on macOS with Xcode.\n" +
        "  On this OS it will still build web assets and attempt cap commands,\n" +
        "  but `cap add ios` / Xcode open require a Mac."
    );
  }

  // 1. Dependencies for iOS platform package
  await ensureCapacitorIos();

  // 2. Web assets (webDir = android-www)
  console.log("\n→ Building standalone web assets…");
  runNpmScript("build:standalone");

  const webDir = join(root, "android-www");
  const indexHtml = join(webDir, "index.html");
  try {
    await access(indexHtml);
    console.log("✓ android-www/index.html ready");
  } catch {
    console.error("✗ android-www/index.html missing after build:standalone");
    process.exit(1);
  }

  // 3. Add iOS platform if missing
  const iosDir = join(root, "ios");
  if (!existsSync(iosDir)) {
    console.log("\n→ Adding iOS platform (SPM, Capacitor 8 default)…");
    run("npx", ["cap", "add", "ios"]);
  } else {
    console.log("\n✓ ios/ already exists — skip cap add");
  }

  // 4. Permissions in Info.plist
  await patchInfoPlists();

  // 5. Sync native project with web assets + plugins
  console.log("\n→ Syncing Capacitor iOS…");
  run("npx", ["cap", "sync", "ios"]);

  // Re-patch after sync in case template was refreshed
  await patchInfoPlists();

  console.log(`
=== iOS project is ready ===

Next steps in Xcode:
  1. Open project:
       npx cap open ios
     or: npm run cap:open:ios

  2. Select target «App» → Signing & Capabilities
       • Choose your Team
       • Bundle Identifier: org.normalproject.journal (or your own)

  3. General → Minimum Deployments: iOS 15.0+

  4. Run on Simulator or a physical iPhone

Camera usage strings were written to Info.plist automatically.
If Xcode still asks for a Team, that is the only remaining manual step.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
