// src/app/login/page.tsx (VERSÃO FINAL COM DICA DE AUTOCOMPLETE)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('E-mail ou senha inválidos.'); setLoading(false); } 
    else { router.push('/'); }
  };

  const handlePasswordReset = async () => {
    if (!email) { toast.error('Digite seu e-mail no campo acima.'); return; }
    const toastId = toast.loading('Enviando link...');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
    if (error) { toast.error('Erro ao enviar e-mail.', { id: toastId }); } 
    else { toast.success('Link enviado! Verifique sua caixa de entrada.', { id: toastId }); }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-800">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Seu e-mail</label>
              {/* Adicionado autocomplete="username" */}
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Sua senha</label>
              <div className="relative">
                {/* Adicionado autocomplete="current-password" */}
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>
            {error && <div className="p-3 text-center text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">{error}</div>}
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">
              {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Entrar'}
            </button>
          </form>
          <div className="text-sm text-center space-y-2">
            <button type="button" onClick={handlePasswordReset} className="font-medium text-blue-600 hover:text-blue-500 underline">
              Esqueceu sua senha?
            </button>
            <div>
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Não tem uma conta? Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}