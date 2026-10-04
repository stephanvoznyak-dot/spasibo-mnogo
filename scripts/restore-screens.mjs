#!/usr/bin/env node
import { inflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
const b64 = [
  "PLACEHOLDER"
].join("");
const buf = inflateSync(Buffer.from(b64, "base64"));
writeFileSync("src/ui/screens.tsx", buf);
console.log("restored screens.tsx", buf.length);
