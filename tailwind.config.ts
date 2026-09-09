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
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#6c757d",
          700: "#495057",
          800: "#343a40",
          900: "#121316",
          950: "#0b0c0e"
        },
        crimson: {
          500: "#e63946",
          600: "#d90429",
          700: "#c1121f"
        },
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(230, 57, 70, 0.3)",
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        "card-tattoo": "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(230, 57, 70, 0.08)",
        "gold-glow": "0 0 30px -5px rgba(245, 158, 11, 0.2)"
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(35px, -25px) scale(1.08)" }
        },
        "float-reverse": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-30px, 20px) scale(0.96)" }
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.12", transform: "scale(1)" },
          "50%": { opacity: "0.22", transform: "scale(1.06)" }
        }
      },
      animation: {
        "float-slow": "float-slow 14s ease-in-out infinite",
        "float-reverse": "float-reverse 18s ease-in-out infinite",
        "pulse-slow": "pulse-slow 10s ease-in-out infinite"
      }
    },
  },
  plugins: [],
};
export default config;
