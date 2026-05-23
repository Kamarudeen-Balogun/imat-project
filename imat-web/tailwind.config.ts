import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        borderDark: "var(--borderDark)",
        borderLit: "var(--borderLit)",
        textDefault: "var(--textDefault)",
        text2: "var(--text2)",
        text3: "var(--text3)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        primary: "var(--primary)",
        primaryDim: "var(--primaryDim)",
        success: "var(--success)",
        successDim: "var(--successDim)",
        danger: "var(--danger)",
        dangerDim: "var(--dangerDim)",
        warning: "var(--warning)",
        warningDim: "var(--warningDim)",
        surface: "var(--surface)",
        surfaceStrong: "var(--surfaceStrong)",
        asphalt: "var(--asphalt)",
        asphalt2: "var(--asphalt2)",
        caution: "var(--caution)",
        steel: "var(--steel)",
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)"],
        mono: ["var(--font-ibm-plex-mono)"],
      },
      boxShadow: {
        'glow': '0 0 20px var(--primary)',
        'glow-lg': '0 0 40px var(--primary)',
        'glow-accent': '0 0 20px var(--accent)',
        'glow-success': '0 0 20px var(--success)',
        'inner-glow': 'inset 0 0 20px var(--primaryDim)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [forms],
};
export default config;
