#!/usr/bin/env node
/** Run from repo root: node scripts/restore-store.mjs */
import { inflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
const b64 = [
  "SEE_FILE_IN_ARTIFACTS"
].join("");
const buf = inflateSync(Buffer.from(b64, "base64"));
mkdirSync("src/ui", { recursive: true });
writeFileSync("src/ui/store.ts", buf);
console.log("restored store.ts", buf.length);
