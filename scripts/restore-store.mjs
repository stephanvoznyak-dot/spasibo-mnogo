#!/usr/bin/env node
/** Restore src/ui/store.ts from compressed parts. Run from repo root:
 *   node scripts/restore-store.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const dir = dirname(fileURLToPath(import.meta.url));
const b64 = [0, 1, 2].map((i) => readFileSync(join(dir, `store.b64.${i}`), "utf8")).join("");
const buf = inflateSync(Buffer.from(b64, "base64"));
mkdirSync(join(dir, "../src/ui"), { recursive: true });
writeFileSync(join(dir, "../src/ui/store.ts"), buf);
console.log("OK store.ts", buf.length);
