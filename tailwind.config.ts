import type { Config } from "tailwindcss";

const config: Config = {
  // Sua configuração de modo escuro foi mantida
  darkMode: "class", 
  
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Novas cores adicionadas aqui
      colors: {
        'brand-blue': '#041730',     // O azul escuro de fundo
        'brand-yellow': '#fde047',   // O amarelo dos títulos e detalhes
        'brand-green': '#16a34a',     // O verde dos botões
        'brand-light-gray': '#d1d5db', // O cinza claro dos textos
      },
    },
  },
  plugins: [],
};

export default config;