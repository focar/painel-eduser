'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Importa o hook para saber a rota atual

const menuItems = [
    {
        title: "Dashboards",
        icon: "fa-chart-pie",
        links: [
            { name: "Resumo Diário", href: "/dashboard-resumo" },
            { name: "Performance e Controle", href: "/dashboard-performance" },
            { name: "Lead Scoring", href: "/dashboard-lead-scoring" },
            { name: "Acompanhamento Canais", href: "/acompanhamento-canais" },
            { name: "Detalhamento Canais", href: "/detalhamento-canais" },
            // ✅ LINK ADICIONADO AQUI ✅
            { name: "Posição Final", href: "/Daskboard-posicao-final" },
        ],
    },
    {
        title: "Operacional",
        icon: "fa-rocket",
        links: [
            { name: "Lançamentos", href: "/lancamentos" },
            { name: "Pesquisas", href: "/pesquisas" },
            { name: "Perguntas", href: "/perguntas" },
        ],
    },
    {
        title: "Ferramentas",
        icon: "fa-tools",
        links: [
            { name: "Controle de Inscrições", href: "/controle-inscricoes" },
            { name: "Importação", href: "/importacao" },
            { name: "Simulador de Inscrição", href: "/ferramentas/simulador-inscricao" },
            { name: "Conversão UTMs", href: "/ferramentas/conversao-utms" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname(); // Pega a rota atual da URL

    // Encontra o grupo de menu da página ativa para deixá-lo aberto por defeito
    const activeGroup = menuItems.find(group => group.links.some(link => link.href === pathname));
    const [openMenu, setOpenMenu] = useState(activeGroup?.title || 'Dashboards');

    return (
        <aside className="bg-slate-800 text-slate-300 w-64 p-4 min-h-screen">
             <div className="border-b border-slate-700 pb-4 text-center">
                 <h1 className="text-xl font-extrabold text-white">Lançamentos Clássicos</h1>
                 <p className="text-xs text-slate-400 mt-1">v70.04-next / by FOCAR</p>
             </div>
             <nav className="mt-6">
                 {menuItems.map((group) => (
                     <div key={group.title} className="mb-4">
                         <button 
                             onClick={() => setOpenMenu(openMenu === group.title ? '' : group.title)}
                             className="w-full flex justify-between items-center text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1"
                         >
                             <span><i className={`fas ${group.icon} mr-3`}></i>{group.title}</span>
                             <i className={`fas fa-chevron-down transition-transform duration-200 ${openMenu === group.title ? 'rotate-180' : ''}`}></i>
                         </button>

                         {openMenu === group.title && (
                             <ul className="mt-2 space-y-1">
                                 {group.links.map((link) => {
                                     const isActive = pathname === link.href;
                                     return (
                                        <li key={link.name}>
                                            <Link 
                                                href={link.href} 
                                                className={`block text-sm rounded-md px-3 py-2 transition-colors ${
                                                    isActive 
                                                        ? 'bg-blue-600 text-white font-semibold' 
                                                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                }`}
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                     )
                                 })}
                             </ul>
                         )}
                     </div>
                 ))}
             </nav>
        </aside>
    );
}