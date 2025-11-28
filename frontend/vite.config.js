import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  assetsInclude: ["**/*.glb"],
  plugins: [tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
        login: "login.html",
        register: "register.html",
        forgotPassword: "forgot-password.html",
        mainMenu: "main-menu.html",
        playConfig: "play-config.html",
        game: "game.html",
        settings: "settings.html",
        profile: "profile.html",
        localPlayerLoginModal: "local-player-login-modal.html",
        localPlayerRegisterModal: "local-player-register-modal.html",
        base: "base.html",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
