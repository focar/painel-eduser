// Cole este código atualizado no ficheiro: src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Importa o nosso novo componente da barra lateral
import Sidebar from "@/components/Sidebar";

// 1. Importa o componente para exibir as notificações
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Painel de Lançamentos",
  description: "Painel de controle Eduser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className={`${inter.className} bg-slate-50`}>
        <div className="relative min-h-screen md:flex">
          
          {/* A nossa barra lateral agora é um componente reutilizável! */}
          <Sidebar />
          
          {/* Área de conteúdo principal */}
         <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {/* 2. Adiciona o container que vai renderizar os pop-ups */}
            <Toaster position="top-right" />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}