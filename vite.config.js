import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  root: "frontend/app",
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
      defaults: resolve(rootDir, "frontend/app/defaults.js"),
      fretboard: resolve(rootDir, "frontend/fretboard/index.js"),
      "shared-fretboard": resolve(rootDir, "frontend/app/widgets/fretboard_widget.js"),
      "shared-fretboard-layout": resolve(rootDir, "frontend/app/widgets/fretboard_layout.js"),
      "fretboard-layout": resolve(rootDir, "frontend/app/scales/fretboard_layout.js"),
      "scales-layout": resolve(rootDir, "frontend/app/scales/scales_layout.js"),
      "scales-page": resolve(rootDir, "frontend/app/scales/scales_page.js")
    }
  },
  build: {
    outDir: "../../build/test/frontend/app",
    emptyOutDir: true,
    manifest: true
  }
});
