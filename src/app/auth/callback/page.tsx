'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner } from 'react-icons/fa';

export default function AuthCallback() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getSessionAndRedirect = async () => {
            // Esta chamada força a sincronização da sessão antes de redirecionar
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Agora que temos certeza da sessão, vamos para a página principal
                router.replace('/');
            } else {
                // Se por algum motivo a sessão não for encontrada, volta para o login
                router.replace('/login');
            }
        };

        getSessionAndRedirect();
    }, [router, supabase]);

    return (
        <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
            <FaSpinner className="animate-spin text-4xl text-blue-600" />
            <p className="mt-4 text-slate-600">Verificando autenticação...</p>
        </div>
    );
}