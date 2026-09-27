import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/** ProductionのEntry・出力先・AF proxyとは独立したローカルSpike。 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  server: { host: "127.0.0.1", port: 5188, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
