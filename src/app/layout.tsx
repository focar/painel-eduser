// Conteúdo CORRETO e LIMPO para: src/app/layout.tsx

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
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <div className="relative min-h-screen md:flex">
          
          <Sidebar />
          
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Toaster position="top-right" />
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}