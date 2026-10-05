#!/usr/bin/env node
/** Restore src/ui/store.ts from scripts/store.b64.{0,1,2}.
 * If local parts are corrupt, fetch known-good commit from GitHub.
 * Forces DUAL_WRITE_LEGACY=false (History-only).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const GOOD_COMMIT = "36dc83de52c372f2fb3847bedb44bcdf6956fa13";
const dir = dirname(fileURLToPath(import.meta.url));

function loadLocal() {
  return [0, 1, 2].map((i) => readFileSync(join(dir, `store.b64.${i}`), "utf8").trim()).join("");
}

function loadRemote() {
  const base = `https://raw.githubusercontent.com/stephanvoznyak-dot/spasibo-mnogo/${GOOD_COMMIT}/scripts`;
  return [0, 1, 2]
    .map((i) =>
      execFileSync("curl", ["-sL", `${base}/store.b64.${i}`], { encoding: "utf8" }).trim(),
    )
    .join("");
}

function expand(b64) {
  return inflateSync(Buffer.from(b64, "base64")).toString("utf8");
}

let text;
try {
  text = expand(loadLocal());
  console.log("[restore-store] local b64 OK");
} catch (err) {
  console.warn("[restore-store] local b64 failed, fetching", GOOD_COMMIT.slice(0, 7), err.message || err);
  text = expand(loadRemote());
  // rewrite local parts for next time
  try {
    const remote = loadRemote();
    const chunk = Math.ceil(remote.length / 3);
    for (let i = 0; i < 3; i++) {
      writeFileSync(join(dir, `store.b64.${i}`), remote.slice(i * chunk, (i + 1) * chunk));
    }
    console.log("[restore-store] rewrote local store.b64.* from", GOOD_COMMIT.slice(0, 7));
  } catch {
    /* non-fatal */
  }
}

text = text.replace(
  /export const DUAL_WRITE_LEGACY = true;/,
  "/** History is source of truth; legacy acts store optional. */\nexport const DUAL_WRITE_LEGACY = false;",
);
text = text.replace(
  /^([ \t]*)(await putActs?\([^;]+;)/gm,
  (m, ind, call) => (m.includes("DUAL_WRITE") ? m : `${ind}if (DUAL_WRITE_LEGACY) ${call}`),
);
text = text.replace(/if \(DUAL_WRITE_LEGACY\) if \(DUAL_WRITE_LEGACY\)/g, "if (DUAL_WRITE_LEGACY)");

mkdirSync(join(dir, "../src/ui"), { recursive: true });
writeFileSync(join(dir, "../src/ui/store.ts"), text);
console.log("OK store.ts", text.length, "DUAL_WRITE_LEGACY=false");
