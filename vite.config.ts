import type { Plugin } from "vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Expand src/ui/store.ts from scripts/store.b64.* before compile. */
function restoreStorePlugin(): Plugin {
  return {
    name: "restore-store",
    async buildStart() {
      const script = join(process.cwd(), "scripts", "restore-store.mjs");
      if (!existsSync(script)) return;
      try {
        await execFileAsync(process.execPath, [script], { cwd: process.cwd() });
        console.log("[restore-store] src/ui/store.ts ready");
      } catch (err) {
        console.warn("[restore-store] skipped:", err);
      }
    },
  };
}

/** Product path: standalone.html. Prefer `npm run dev:app` / `build:standalone`. */
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [restoreStorePlugin(), tailwindcss(), viteReact()],
  build: {
    rollupOptions: {
      input: join(process.cwd(), "standalone.html"),
    },
  },
});
