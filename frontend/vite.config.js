import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const rootDir = import.meta.dirname;
const repoRoot = resolve(rootDir, "..");

export default defineConfig(({ mode }) => {
  const isDebugBuild = mode === "debug";

  return {
    root: resolve(rootDir, "app"),
    publicDir: false,
    plugins: [
      react(),
      {
        name: "remove-dev-import-map",
        transformIndexHtml(html) {
          return html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, "");
        }
      }
    ],
    resolve: {
      alias: {
        "https://esm.sh/react@18": "react",
        "https://esm.sh/react-dom@18/client": "react-dom/client",
        defaults: resolve(rootDir, "app/defaults.js"),
        fretboard: resolve(rootDir, "fretboard/index.js"),
        "shared-fretboard": resolve(rootDir, "app/widgets/fretboard_widget.js"),
        "shared-fretboard-layout": resolve(rootDir, "app/widgets/fretboard_layout.js"),
        "fretboard-layout": resolve(rootDir, "fretboard/fretboard_layout.js"),
        "scales-layout": resolve(rootDir, "app/scales/scales_layout.js"),
        "scales-page": resolve(rootDir, "app/scales/scales_page.js")
      }
    },
    build: {
      outDir: resolve(repoRoot, "build/test/frontend/app"),
      emptyOutDir: true,
      manifest: true,
      minify: !isDebugBuild,
      sourcemap: isDebugBuild,
      cssMinify: !isDebugBuild
    }
  };
});
