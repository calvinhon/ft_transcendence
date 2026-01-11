import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      "/api": {
        target: "https://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  assetsInclude: ["**/*.ttf"],
});
