'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // Esta página redireciona o usuário para o destino final.
        // O tempo que leva para carregar esta página é suficiente para o cookie ser processado.
        router.replace('/');
    }, [router]);

    return (
        <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
            <FaSpinner className="animate-spin text-4xl text-blue-600" />
            <p className="mt-4 text-slate-600">Autenticando...</p>
        </div>
    );
}