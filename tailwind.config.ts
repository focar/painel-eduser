import type { Config } from "tailwindcss";

const config: Config = {
  // Habilita a estratégia de modo escuro baseada em classe
  darkMode: "class",
  
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
