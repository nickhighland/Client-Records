import { rm, readdir, readFile, writeFile } from "node:fs/promises";
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

function externalizeInlineScriptsPlugin() {
  return {
    name: 'externalize-inline-scripts',
    async closeBundle() {
      await pruneDsmdxBundlePlugin().closeBundle();
      const visit = async directory => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) { await visit(file); continue; }
          if (!entry.name.endsWith('.html')) continue;
          const html = await readFile(file, 'utf8');
          let index = 0;
          const scripts = [];
          const updated = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attributes, code) => {
            if (/\bsrc\s*=/.test(attributes) || !code.trim() || /type\s*=\s*["']application\//i.test(attributes)) return tag;
            const name = `${entry.name}.inline-${++index}.js`;
            scripts.push(writeFile(path.join(directory, name), code));
            return `<script${attributes} src="./${name}"></script>`;
          });
          await Promise.all(scripts);
          if (updated !== html) await writeFile(file, updated);
        }
      };
      await visit(path.resolve(__dirname, 'dist'));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [externalizeInlineScriptsPlugin()],
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
