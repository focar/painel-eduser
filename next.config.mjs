/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Mantém as boas práticas no desenvolvimento
  
  // ✅ ADICIONADO PARA IGNORAR ERROS DE LINT NO BUILD DA VERCEL
  eslint: {
    // Atenção: Isto permite que a publicação seja concluída mesmo que
    // o seu projeto tenha erros de ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;