import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** 本番SPAの入口・出力先・Application Frameworkから独立したTheme検討用Spike。 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  server: { host: "127.0.0.1", port: 5189, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
