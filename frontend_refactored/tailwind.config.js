/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["PixelCode", "monospace"],
        vcr: ["VCR OSD Mono", "monospace"],
      },
      colors: {
        "bg-primary": "#000000",
        panel: "#000000",
        "panel-border": "#333333",
        accent: "#29b6f6",
        "accent-dim": "#185574",
        primary: "#e94560",
        "text-muted": "#8899a6",
        white: "#ffffff",
        black: "#000000",
      },
      boxShadow: {
        glow: "0 0 10px rgba(41, 182, 246, 0.3), inset 0 0 5px rgba(41, 182, 246, 0.1)",
        "glow-strong": "0 0 15px rgba(41, 182, 246, 0.6)",
      },
    },
  },
  plugins: [],
};
