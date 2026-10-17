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
        arena: {
          bg: "#0B0B0F",
          surface: "#111116",
          elevated: "#17171F",
          card: "#14141C",
          border: "#292932",
          borderLight: "#363644",
          text: "#F5F5F7",
          muted: "#92929F",
          accent: "#8B5CF6",
          accentHover: "#7C3AED",
          highlight: "#A78BFA",
          success: "#34D399",
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
        glow: "0 0 35px -5px rgba(139, 92, 246, 0.3)",
        "glow-sm": "0 0 15px -3px rgba(139, 92, 246, 0.25)",
        "glow-danger": "0 0 30px -5px rgba(248, 113, 113, 0.3)",
        "glow-success": "0 0 30px -5px rgba(52, 211, 153, 0.3)",
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
