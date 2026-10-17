import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Calming Blues and Aquas palette tokens
        serenity: "#B3CEE5",
        calmSky: "#B9CBD9",
        deepOcean: "#17496c",
        mutedSky: "#779fba",

        arena: {
          bg: "#0A141D", // Deep Oceanic Base
          surface: "#0E1C28", // Midnight Ocean Surface
          elevated: "#17496C", // Deep Ocean Blue
          card: "#122434", // Oceanic Card
          border: "#22445E", // Soft Ocean Border
          borderLight: "#325E80", // Ocean Border Light / Hover
          text: "#F0F5F9", // Crisp Clean Ocean White
          muted: "#B9CBD9", // Calm Sky Blue (Secondary Text)
          accent: "#779fba", // Muted Sky Accent (Primary Actions/Buttons)
          accentHover: "#628ca9", // Interactive Hover
          highlight: "#B3CEE5", // Serenity / Soft Blue (Highlights & Glow)
          deep: "#17496c", // Deep Ocean Blue
          success: "#38BDF8", // Calming Aqua / Sky Success
          danger: "#F87171",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 35px -5px rgba(119, 159, 186, 0.35)",
        "glow-sm": "0 0 15px -3px rgba(179, 206, 229, 0.3)",
        "glow-ocean": "0 0 30px -5px rgba(23, 73, 108, 0.5)",
        "glow-danger": "0 0 30px -5px rgba(248, 113, 113, 0.3)",
        "glow-success": "0 0 30px -5px rgba(56, 189, 248, 0.3)",
      },
      keyframes: {
        shiver: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shiver: "shiver 0.2s ease-in-out infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
