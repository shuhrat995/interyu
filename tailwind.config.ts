import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        panel: "#111731",
        panel2: "#171f3f",
        line: "#273052",
        ink: "#e6ebff",
        mut: "#9aa6cc",
        acc: "#6d8cff",
        ok: "#4ade80",
        bad: "#f87171",
        warn: "#fbbf24"
      }
    }
  },
  plugins: []
};
export default config;
