import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // možnost přepsat přes .env (VITE_LL2_TARGET), jinak:
  // dev -> lldev, prod -> ll
  const LL2_TARGET =
    env.VITE_LL2_TARGET ||
    (mode === "development"
      ? "https://lldev.thespacedevs.com/2.3.0"
      : "https://ll.thespacedevs.com/2.3.0");
  const NASA_TARGET = env.VITE_NASA_TARGET || "https://www.nasa.gov";
  const CHANGES_TARGET = env.VITE_CHANGES_TARGET || "http://127.0.0.1:8787";

  return {
    plugins: [react()],
    base: "/",
    server: {
      proxy: {
        "/api/ll2": {
          target: LL2_TARGET,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/ll2\/?/, "/"),
        },
        "/api/nasa": {
          target: NASA_TARGET,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/nasa\/?/, "/"),
        },
        "/api/changes": {
          target: CHANGES_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
