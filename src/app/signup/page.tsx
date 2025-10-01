'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import Image from 'next/image';

export default function SignupPage() {
    const supabase = createClient();
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setFullName('');
        setEmail('');
        setPassword('');
    }, []);

    const handleSignup = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        if (password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
        } else {
            toast.success('Cadastro realizado! Verifique seu e-mail para confirmação.');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <div className="w-full max-w-sm p-8 space-y-6 bg-[#1a202c] text-white rounded-lg shadow-md">
                    <Image
                        src="https://xqsrkvfvrqjzayrkbzsp.supabase.co/storage/v1/object/public/logos/logo_02.png"
                        alt="Logo"
                        width={80}
                        height={80}
                        className="mx-auto"
                    />
                    <h2 className="text-2xl font-bold text-center">Criar Conta</h2>
                    {/* --- MUDANÇA APLICADA AQUI --- */}
                    <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">Nome Completo</label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                required
                                autoComplete="name"
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">E-mail</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Senha</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <div
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-200"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : 'Cadastrar'}
                        </button>
                    </form>
                    <div className="text-sm text-center">
                        <Link href="/login" className="font-medium text-green-400 hover:text-green-300">
                            Já tem uma conta? Entre
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

