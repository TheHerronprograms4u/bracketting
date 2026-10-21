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
        // ACCeSS Logo color palette tokens
        access: {
          blue: "#1A3A8A",       // Royal/Navy Blue (main logo triangle)
          blueMid: "#2347A8",    // Mid Royal Blue
          blueLight: "#3A5BC7",  // Lighter blue accent
          gold: "#FFB800",       // Golden Yellow (logo accents)
          goldDeep: "#E09900",   // Deeper Gold / Hover
          goldLight: "#FFCF4D",  // Light Gold Highlight
          white: "#F5F8FF",      // Clean White
        },

        arena: {
          bg: "#070E1A",
          surface: "#0C1628",
          elevated: "#1A3A8A",
          card: "#0F1E38",
          border: "#1E3060",
          borderLight: "#2347A8",
          text: "#F5F8FF",
          muted: "#8FADD4",
          accent: "#FFB800",
          accentHover: "#E09900",
          highlight: "#FFCF4D",
          deep: "#1A3A8A",
          success: "#38BDF8",
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
        glow: "0 0 35px -5px rgba(255, 184, 0, 0.4)",
        "glow-sm": "0 0 15px -3px rgba(255, 184, 0, 0.3)",
        "glow-gold": "0 0 20px -3px rgba(255, 184, 0, 0.5)",
        "glow-ocean": "0 0 30px -5px rgba(26, 58, 138, 0.5)",
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
