// Conteúdo FINAL e CORRIGIDO para: src/components/Sidebar.tsx

'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartPie, FaRocket, FaTools, FaMapSigns, FaBars, FaTimes } from 'react-icons/fa';

const iconMap = {
  "fa-chart-pie": <FaChartPie />,
  "fa-rocket": <FaRocket />,
  "fa-tools": <FaTools />,
  "fa-map-signs": <FaMapSigns />,
};

const menuItems = [
    {
        title: "Dashboards",
        icon: "fa-chart-pie",
        links: [
            { name: "Evolução de Canal ", href: "/dashboard-evolucao-por-hora" },
            { name: "Resumo Diário", href: "/dashboard-resumo" },
            { name: "Performance e Controle", href: "/dashboard-performance" },
            { name: "Lead Scoring", href: "/dashboard-lead-scoring" },
            { name: "Acompanhamento Canais", href: "/acompanhamento-canais" },
            { name: "Detalhamento Canais", href: "/detalhamento-canais" },
            { name: "Posição Final", href: "/dashboard-posicao-final" }, 
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
            { name: "Controle de Inscrições", href: "/ferramentas/controle-inscricoes" },
            { name: "Importação", href: "/importacao" },
            { name: "Simulador de Inscrição", href: "/ferramentas/simulador-inscricao" },
            { name: "Conversão UTMs", href: "/ferramentas/conversao-utms" },
            { name: "Mapeamento de Colunas", href: "/ferramentas/mapeamento", icon: "fa-map-signs" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const activeGroup = menuItems.find(group => group.links.some(link => link.href === pathname));
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState(activeGroup?.title || 'Dashboards');

    return (
        <>
            {/* Botão Hamburger para abrir o menu no mobile */}
            <button 
                className="md:hidden p-4 text-slate-800 fixed top-0 left-0 z-10"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Abrir menu"
            >
                <FaBars size={24} />
            </button>

            <aside 
                className={`
                    bg-slate-800 text-slate-300 w-64 p-4 min-h-screen 
                    fixed inset-y-0 left-0 z-30 transform 
                    transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="relative border-b border-slate-700 pb-4 mb-4">
                    <button 
                        className="absolute top-0 right-0 p-2 text-slate-400 hover:text-white md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Fechar menu"
                    >
                        <FaTimes size={20} />
                    </button>
                    
                    {/* --- ALTERAÇÃO AQUI --- */}
                    {/* O título agora é um link para a página inicial */}
                    <Link href="/" className="cursor-pointer">
                        <h1 className="text-xl font-extrabold text-white text-center pt-1 hover:text-blue-300 transition-colors">
                            Análise de<br/>Lançamentos
                        </h1>
                    </Link>
                    
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2 px-1">
                        <span>v 2.00</span>
                        <span>by FOCAR</span>
                    </div>
                </div>

                {/* Navegação */}
                <nav>
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
                                                    onClick={() => setIsMobileMenuOpen(false)}
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
            
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}
        </>
    );
}
