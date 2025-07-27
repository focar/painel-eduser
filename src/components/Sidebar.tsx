'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartPie, FaRocket, FaTools, FaBars, FaTimes, FaChevronDown } from 'react-icons/fa';

// O iconMap não estava sendo usado, mas a ideia é boa.
// A implementação atual usa classes do Font Awesome, que vou manter.

const menuItems = [
    {
        title: "Dashboards",
        icon: "fa-chart-pie", // Classe do Font Awesome
        links: [
            { name: "Análise de Campanha", href: "/dashboard-analise-campanha" },
            { name: "Evolução de Canal ", href: "/dashboard-evolucao-por-hora" },
            { name: "Resumo Diário", href: "/dashboard-resumo" },
            { name: "Performance e Controle", href: "/dashboard-performance" },
            { name: "Lead Scoring", href: "/dashboard-lead-scoring" },
            { name: "Análise de Score", href: "/dashboard-analise-score" },
            { name: "Análise de Respostas", href: "/dashboard-score-por-resposta" },
            { name: "Respostas por Score", href: "/dashboard-respostas-por-score" },
            { name: "Perfil de Score", href: "/dashboard-perfil-score" },
            { name: "Acompanhamento Canais", href: "/dashboard-acompanhamento-canais" },
            { name: "Detalhamento Canais", href: "/dashboard-detalhamento-canais" },
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
            { name: "Ajustes de Arquivos", href: "/ferramentas/importacao" },
            { name: "Simulador de Inscrição", href: "/ferramentas/simulador-inscricao" },
            { name: "Conversão UTMs", href: "/ferramentas/conversao-utms" },
            { name: "Mapeamento de Colunas", href: "/ferramentas/mapeamento" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    // Esta lógica continua útil para definir o estado inicial dos menus retráteis
    const activeGroup = menuItems.find(group => group.links.some(link => link.href === pathname));
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- MUDANÇA PRINCIPAL NO ESTADO ---
    // Removemos o estado único 'openMenu'.
    // Criamos estados individuais para cada seção que deve ser retrátil.
    // O estado inicial ainda abre a seção se uma de suas páginas estiver ativa.
    const [isOperacionalOpen, setIsOperacionalOpen] = useState(activeGroup?.title === 'Operacional');
    const [isFerramentasOpen, setIsFerramentasOpen] = useState(activeGroup?.title === 'Ferramentas');


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
                    
                    <Link href="/" className="cursor-pointer">
                        <h1 className="text-xl font-extrabold text-white text-center pt-1 hover:text-blue-300 transition-colors">
                            Análise de<br/>Lançamentos
                        </h1>
                    </Link>
                    
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2 px-1">
                        <span>v 3.00</span>
                        <span>by FOCAR</span>
                    </div>
                </div>

                {/* --- LÓGICA DE RENDERIZAÇÃO ALTERADA --- */}
                <nav>
                    {menuItems.map((group) => {
                        // Lógica para o grupo DASHBOARDS (sempre aberto)
                        if (group.title === 'Dashboards') {
                            return (
                                <div key={group.title} className="mb-4">
                                    <h2 className="w-full flex items-center text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                        <i className={`fas ${group.icon} mr-3`}></i>
                                        {group.title}
                                    </h2>
                                    <ul className="mt-2 space-y-1">
                                        {group.links.map((link) => (
                                            <li key={link.name}>
                                                <Link 
                                                    href={link.href} 
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`block text-sm rounded-md px-3 py-2 transition-colors ${
                                                        pathname === link.href 
                                                            ? 'bg-blue-600 text-white font-semibold' 
                                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                    }`}
                                                >
                                                    {link.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }

                        // Lógica para os outros grupos (retráteis)
                        const isOpen = group.title === 'Operacional' ? isOperacionalOpen : isFerramentasOpen;
                        const setIsOpen = group.title === 'Operacional' ? setIsOperacionalOpen : setIsFerramentasOpen;

                        return (
                            <div key={group.title} className="mb-4">
                                <button 
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="w-full flex justify-between items-center text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:bg-slate-700 rounded-md"
                                >
                                    <span><i className={`fas ${group.icon} mr-3`}></i>{group.title}</span>
                                    {/* Usando o componente de ícone para consistência */}
                                    <FaChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isOpen && (
                                    <ul className="mt-2 space-y-1">
                                        {group.links.map((link) => (
                                            <li key={link.name}>
                                                <Link 
                                                    href={link.href} 
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`block text-sm rounded-md px-3 py-2 transition-colors ${
                                                        pathname === link.href 
                                                            ? 'bg-blue-600 text-white font-semibold' 
                                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                    }`}
                                                >
                                                    {link.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>
            
            {/* Overlay para fechar o menu no mobile */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}
        </>
    );
}