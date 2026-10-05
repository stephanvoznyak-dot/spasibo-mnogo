#!/usr/bin/env node
import { inflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
const b64 = [
  "eNrVPGtvHMlx3/krWovAmL1bLh++2JelJIbW0ZZi8ayTdDkYAiEPd5vkhLMzq5lZrWgeAVly4gR3gL8Y+RAgAYLkByi2ZOtOj/sLu3/BvyRV1a/qeSxfkpHogONMT3V1dXVVdVV19UbDUZoV4kj0MxkWUhyL3SwditYvx3kRJo"
].join("");
const buf = inflateSync(Buffer.from(b64, "base64"));
mkdirSync("src/ui", { recursive: true });
writeFileSync("src/ui/store.ts", buf);
console.log("OK store.ts", buf.length);
