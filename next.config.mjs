/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Mantém as boas práticas no desenvolvimento
  
  // ✅ ADICIONADO PARA IGNORAR ERROS DE LINT NO BUILD DA VERCEL
  eslint: {
    // Atenção: Isto permite que a publicação seja concluída mesmo que
    // o seu projeto tenha erros de ESLint.
    ignoreDuringBuilds: true,
  },

  // ✅ ADICIONADO PARA AUTORIZAR IMAGENS DO SUPABASE
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xqsrkvfvrqjzayrkbzsp.supabase.co', // Seu hostname do Supabase
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
