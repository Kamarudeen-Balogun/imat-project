import type { Config } from "tailwindcss";

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
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)"],
        mono: ["var(--font-ibm-plex-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
