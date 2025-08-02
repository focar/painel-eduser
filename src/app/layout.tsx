// src/app/layout.tsx
// VERSÃO CORRIGIDA E LIMPA

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "@/components/providers/UserProvider";

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
      <body className={`${inter.className} bg-gray-50`}>
        <UserProvider>
          {/* Esta estrutura garante que a sidebar tenha uma altura fixa e que apenas a área
            de conteúdo principal tenha uma barra de rolagem quando necessário.
          */}
          <div className="relative flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Toaster position="top-right" />
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
