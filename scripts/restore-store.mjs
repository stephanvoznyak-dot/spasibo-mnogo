#!/usr/bin/env node
/** Restore src/ui/store.ts from compressed parts. Run from repo root:
 *   node scripts/restore-store.mjs
 * After expand, forces History-only (DUAL_WRITE_LEGACY=false).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const dir = dirname(fileURLToPath(import.meta.url));
const b64 = [0, 1, 2].map((i) => readFileSync(join(dir, `store.b64.${i}`), "utf8")).join("");
let text = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
text = text.replace(
  /export const DUAL_WRITE_LEGACY = true;/,
  "/** History is source of truth; legacy acts store optional. */\nexport const DUAL_WRITE_LEGACY = false;",
);
// Gate unconditional putAct/putActs if not already gated
text = text.replace(
  /^([ \t]*)(await putActs?\([^;]+;)/gm,
  (m, ind, call) => (m.includes("DUAL_WRITE") ? m : `${ind}if (DUAL_WRITE_LEGACY) ${call}`),
);
text = text.replace(/if \(DUAL_WRITE_LEGACY\) if \(DUAL_WRITE_LEGACY\)/g, "if (DUAL_WRITE_LEGACY)");
mkdirSync(join(dir, "../src/ui"), { recursive: true });
writeFileSync(join(dir, "../src/ui/store.ts"), text);
console.log("OK store.ts", text.length, "DUAL_WRITE_LEGACY=false");
