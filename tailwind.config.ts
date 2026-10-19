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
          50: "#fbf3e6",
          100: "#f4e7d0",
          200: "#ead9bc",
          300: "#e3d2b5",
          400: "#c8b394",
          500: "#a08a6c",
          600: "#786650",
          700: "#4d3f31",
          800: "#33261c",
          900: "#241811",
          950: "#1a110c"
        },
        crimson: {
          300: "#ecd2a4",
          400: "#d6b27a",
          500: "#3f7a5c",
          600: "#275f45",
          700: "#1f4c37"
        },
        amber: {
          300: "#ecd2a4",
          400: "#d9b886",
          500: "#b98d57",
          600: "#956b3c"
        },
        sage: {
          400: "#8fb8a8",
          500: "#6fa08e"
        }
      },
      borderRadius: {
        xl: "0.625rem",
        "2xl": "0.75rem",
        "3xl": "1rem"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "0 1px 2px rgba(0, 0, 0, 0.3)",
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        "card-tattoo": "0 12px 30px -15px rgba(0, 0, 0, 0.6)",
        "gold-glow": "0 1px 2px rgba(0, 0, 0, 0.3)"
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
        "drift": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg) scale(1)" },
          "33%": { transform: "translate(4vw, -3vh) rotate(8deg) scale(1.06)" },
          "66%": { transform: "translate(-3vw, 2vh) rotate(-6deg) scale(0.97)" }
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.12", transform: "scale(1)" },
          "50%": { opacity: "0.22", transform: "scale(1.06)" }
        }
      },
      animation: {
        "float-slow": "float-slow 14s ease-in-out infinite",
        "float-reverse": "float-reverse 18s ease-in-out infinite",
        "pulse-slow": "pulse-slow 10s ease-in-out infinite",
        "drift": "drift 32s ease-in-out infinite"
      }
    },
  },
  plugins: [],
};
export default config;