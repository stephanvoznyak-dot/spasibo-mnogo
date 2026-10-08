#!/usr/bin/env node
/**
 * Build public/downloads: HTML (standalone), source zip, iOS zip.
 * APK is copied if a gradle output exists.
 */
import { spawnSync } from "node:child_process";
import { mkdir, copyFile, access, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "downloads");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed`);
  }
}

const PY_ZIP = `
import os, sys, zipfile
root, dest, *extras = sys.argv[1:]
skip_dirs = {
  "node_modules", ".git", "android-www", "dist", ".output", ".tanstack",
  "screenshots", "artifacts", ".gradle", "build", ".idea", ".nitro", ".vercel",
}
skip_names = {"normal-project.apk", "normal-project-src.zip", "normal-project-ios.zip"}
mode = extras[0] if extras else "src"
z = zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED)
if mode == "ios":
    for folder in ("ios",):
        p = os.path.join(root, folder)
        if not os.path.isdir(p):
            sys.exit(0)
        for dirpath, dirnames, filenames in os.walk(p):
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]
            for fn in filenames:
                fp = os.path.join(dirpath, fn)
                z.write(fp, os.path.relpath(fp, root))
    for extra in ("IOS_BUILD.md", "capacitor.config.ts"):
        fp = os.path.join(root, extra)
        if os.path.isfile(fp):
            z.write(fp, extra)
else:
    for dirpath, dirnames, filenames in os.walk(root):
        rel = os.path.relpath(dirpath, root)
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        if rel.startswith("public/downloads") or rel.startswith("android/app/build") or rel.startswith("android/build"):
            dirnames[:] = []
            continue
        for fn in filenames:
            if fn.endswith(".apk") or fn in skip_names:
                continue
            fp = os.path.join(dirpath, fn)
            z.write(fp, os.path.relpath(fp, root))
z.close()
print("wrote", dest, "files", len(z.namelist()) if False else "")
`;

async function pyZip(dest, mode) {
  await writeFile("/tmp/pack-zip.py", PY_ZIP);
  run("python3", ["/tmp/pack-zip.py", root, dest, mode]);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  run(process.execPath, [join(root, "scripts/restore-store.mjs")]);
  run("npm", ["run", "build:standalone"]);

  const htmlSrc = join(root, "android-www/standalone.html");
  await copyFile(htmlSrc, join(outDir, "normal-project.html"));

  const apkCandidates = [
    join(root, "android/app/build/outputs/apk/debug/app-debug.apk"),
    join(root, "android/app/build/outputs/apk/release/app-release.apk"),
  ];
  for (const apk of apkCandidates) {
    try {
      await access(apk);
      await copyFile(apk, join(outDir, "normal-project.apk"));
      console.log("APK:", apk);
      break;
    } catch {
      /* keep existing apk if any */
    }
  }

  await rm(join(outDir, "normal-project-src.zip"), { force: true });
  await pyZip(join(outDir, "normal-project-src.zip"), "src");

  try {
    await access(join(root, "ios"));
    await rm(join(outDir, "normal-project-ios.zip"), { force: true });
    await pyZip(join(outDir, "normal-project-ios.zip"), "ios");
    console.log("iOS zip written");
  } catch {
    console.log("ios/ missing — skip iOS zip");
  }

  console.log("downloads ready in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
