#!/usr/bin/env node
/** Restore src/ui/store.ts from known-good compressed payload.
 * Always fetches commit 36dc83d (local store.b64.* may be truncated by API).
 * Forces DUAL_WRITE_LEGACY=false (History-only).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const GOOD_COMMIT = "36dc83de52c372f2fb3847bedb44bcdf6956fa13";
const dir = dirname(fileURLToPath(import.meta.url));

function loadRemote() {
  const base = `https://raw.githubusercontent.com/stephanvoznyak-dot/spasibo-mnogo/${GOOD_COMMIT}/scripts`;
  return [0, 1, 2]
    .map((i) =>
      execFileSync("curl", ["-sL", `${base}/store.b64.${i}`], { encoding: "utf8" }).trim(),
    )
    .join("");
}

let text = inflateSync(Buffer.from(loadRemote(), "base64")).toString("utf8");

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
console.log("OK store.ts", text.length, "DUAL_WRITE_LEGACY=false (from", GOOD_COMMIT.slice(0, 7) + ")");
