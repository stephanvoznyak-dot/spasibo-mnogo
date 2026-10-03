import { build } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { mkdir, copyFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  configFile: false,
  root,
  plugins: [tailwindcss(), react(), viteSingleFile()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: "android-www",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: resolve(root, "standalone.html"),
    },
  },
});

await mkdir(resolve(root, "public/downloads"), { recursive: true });
await copyFile(resolve(root, "android-www/standalone.html"), resolve(root, "android-www/index.html"));
await copyFile(resolve(root, "android-www/standalone.html"), resolve(root, "public/downloads/normal-project.html"));
await rm(resolve(root, "android-www/downloads"), { recursive: true, force: true });
console.log("standalone html written");
