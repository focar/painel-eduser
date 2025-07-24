// Substitua o conteúdo do seu src/app/layout.tsx por este código

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Sidebar from "@/components/Sidebar";
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
      <body className={`${inter.className} bg-gray-50`}>
        <div className="relative min-h-screen md:flex">
          
          <Sidebar />
          
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {/* O Toaster é usado para mostrar notificações */}
            <Toaster position="top-right" />
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}