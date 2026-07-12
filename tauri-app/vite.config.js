import { rm } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

function pruneDsmdxBundlePlugin() {
  return {
    name: "prune-dsmdx-bundle",
    async closeBundle() {
      const dsmdxDistDir = path.resolve(__dirname, "dist", "dsmdx");
      const removablePaths = [
        ".git",
        ".gitignore",
        "README.md",
        "TODO.md",
        "docs",
        "package-lock.json",
        "package.json",
        "scripts",
        "tests",
      ];

      await Promise.all(
        removablePaths.map((target) =>
          rm(path.join(dsmdxDistDir, target), { recursive: true, force: true }),
        ),
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [pruneDsmdxBundlePlugin()],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1421,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
