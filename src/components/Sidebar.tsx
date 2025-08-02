// src/components/Sidebar.tsx (VERSÃO FINAL E CORRIGIDA)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // 1. Importar o useRouter
import { FaChartPie, FaRocket, FaTools, FaBars, FaTimes, FaChevronDown, FaSignOutAlt, FaSpinner } from 'react-icons/fa';
import { useUser } from '@/components/providers/UserProvider';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
    {
        title: "Dashboards",
        icon: FaChartPie,
        links: [
            { name: "Análise de Campanha", href: "/dashboard-analise-campanha" },
            { name: "Evolução de Canal", href: "/dashboard-evolucao-por-hora" },
            { name: "Resumo Diário", href: "/dashboard-resumo" },
            { name: "Performance e Controle", href: "/dashboard-performance" },
            { name: "Lead Scoring", href: "/dashboard-lead-scoring" },
            { name: "Análise de Score", href: "/dashboard-analise-score" },
            { name: "Perfil de Score", href: "/dashboard-perfil-score" },
            { name: "Acompanhamento Canais", href: "/dashboard-acompanhamento-canais" },
            { name: "Detalhamento Canais", href: "/dashboard-detalhamento-canais" },
            { name: "Posição Final", href: "/dashboard-posicao-final" },
            { name: "Campanhas e Criativos", href: "/dashboard-campanhas-criativos" },
            { name: "Análise de Respostas", href: "/dashboard-score-por-resposta" },
            { name: "Respostas por Score", href: "/dashboard-respostas-por-score" },
        ],
    },
    {
        title: "Operacional",
        icon: FaRocket,
        links: [
            { name: "Lançamentos", href: "/lancamentos" },
            { name: "Pesquisas", href: "/pesquisas" },
            { name: "Perguntas", href: "/perguntas" },
        ],
    },
    {
        title: "Ferramentas",
        icon: FaTools,
        links: [
            { name: "Controle de Inscrições", href: "/ferramentas/controle-inscricoes" },
            { name: "Ajustes de Arquivos", href: "/ferramentas/importacao" },
            { name: "Simulador de Inscrição", href: "/ferramentas/simulador-inscricao" },
            { name: "Conversão UTMs", href: "/ferramentas/conversao-utms" },
            { name: "Mapeamento de Colunas", href: "/ferramentas/mapeamento" },
            { name: "Gerenciar Usuários", href: "/ferramentas/gerenciar-usuarios" },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter(); // 2. Inicializar o router
    const { session, isLoading } = useUser();
    const { user, profile } = session;

    const activeGroup = menuItems.find(group => group.links.some(link => link.href === pathname));
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOperacionalOpen, setIsOperacionalOpen] = useState(activeGroup?.title === 'Operacional');
    const [isFerramentasOpen, setIsFerramentasOpen] = useState(activeGroup?.title === 'Ferramentas');

    // 3. FUNÇÃO DE LOGOUT CORRIGIDA
    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        
        // Esta é a linha mais importante.
        // Ela força uma atualização da página com o servidor, que então
        // acionará o middleware. Como o usuário já está deslogado,
        // o middleware o redirecionará corretamente para a página de login.
        router.refresh();
    };
    
    if (pathname === '/login' || pathname === '/auth/status') {
        return null;
    }

    return (
        <>
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
                    flex flex-col
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
                    
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2 px-1">
                        <span>v 1.00</span>
                        <span>by FOCAR</span>
                    </div>
                </div>
                <nav className="flex-1 flex flex-col justify-between overflow-y-auto">
                    <ul className="space-y-2">
                        {isLoading ? (
                            <li className="text-center p-4">
                                <FaSpinner className="animate-spin mx-auto text-xl" />
                            </li>
                        ) : menuItems.map((group) => {
                            if ((group.title === 'Operacional' || group.title === 'Ferramentas') && profile?.role !== 'admin') {
                                return null;
                            }
                            const Icon = group.icon;
                            if (group.title === 'Dashboards') {
                                return (
                                    <li key={group.title} className="mb-4">
                                        <h2 className="w-full flex items-center text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                            <Icon className="mr-3" />
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
                                    </li>
                                );
                            }
                            const isOpen = group.title === 'Operacional' ? isOperacionalOpen : isFerramentasOpen;
                            const setIsOpen = group.title === 'Operacional' ? setIsOperacionalOpen : setIsFerramentasOpen;
                            return (
                                <li key={group.title} className="mb-4">
                                    <button 
                                        onClick={() => setIsOpen(!isOpen)}
                                        className="w-full flex justify-between items-center text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:bg-slate-700 rounded-md"
                                    >
                                        <span className="flex items-center"><Icon className="mr-3" />{group.title}</span>
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
                                </li>
                            );
                        })}
                    </ul>
                    {!isLoading && user && (
                        <div className="border-t border-slate-700 pt-4 mt-4">
                            <p className="text-sm text-white px-2 truncate" title={user.email || ''}>{profile?.full_name || user.email}</p>
                            <p className="text-xs text-slate-400 px-2 mb-2 capitalize">{profile?.role}</p>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                            >
                                <FaSignOutAlt />
                                <span>Sair</span>
                            </button>
                        </div>
                    )}
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