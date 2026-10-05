#!/usr/bin/env node
/**
 * Product-only dev server (no TanStack Start / Nitro / PGLite).
 * Entry: standalone.html → src/standalone.tsx → ui/screens
 */
import { createServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Expand Canon store before serve
const restore = resolve(root, "scripts/restore-store.mjs");
if (existsSync(restore)) {
  try {
    execFileSync(process.execPath, [restore], { cwd: root, stdio: "inherit" });
  } catch (e) {
    console.warn("[dev:app] restore-store:", e.message || e);
  }
}

const server = await createServer({
  configFile: false,
  root,
  plugins: [tailwindcss(), react()],
  resolve: { tsconfigPaths: true },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 8080,
    strictPort: false,
  },
  build: {
    rollupOptions: { input: resolve(root, "standalone.html") },
  },
});

await server.listen();
server.printUrls();
console.log("[dev:app] standalone — product path (no app-builder shell)");
