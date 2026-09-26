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
          50: "#f7f4ef",
          100: "#efeae2",
          200: "#e2dcd2",
          300: "#cfc7bb",
          400: "#b3aa9d",
          500: "#8e8579",
          600: "#6b645b",
          700: "#48433d",
          800: "#2d2a27",
          900: "#1a1c19",
          950: "#121412"
        },
        crimson: {
          300: "#dcd3b8",
          400: "#c9bb92",
          500: "#4f7a64",
          600: "#2f5a47",
          700: "#244638"
        },
        amber: {
          300: "#e2cf9f",
          400: "#cdb27a",
          500: "#b39459",
          600: "#917645"
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