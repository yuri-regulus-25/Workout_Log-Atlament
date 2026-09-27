import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 開発時だけ既存AFへ転送する。本番は同一originのAFとSPA fallbackをホストが提供する。
export default defineConfig({
  plugins: [react()],
  // monorepo内の別アプリや遅延ロード依存からも同一のReactを解決する。
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    proxy: {
      "/api": {
        target: process.env.VESRIA_AF_ORIGIN || "http://127.0.0.1:5180",
        changeOrigin: true,
      },
    },
  },
  build: { outDir: "dist", sourcemap: true },
});
