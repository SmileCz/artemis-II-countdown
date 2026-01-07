import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // nasazení na rootu domény artemis.gearground.cloud
  base: "/",
  // důležité: aby /api/ll2/... fungovalo i při `npm run dev` (Vite server)
  server: {
    proxy: {
      "/api/ll2": {
        target: "https://ll.thespacedevs.com/2.3.0",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ll2\/?/, "/"),
      },
    },
  },
});
