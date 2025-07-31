// src/app/login/page.tsx (VERSÃO FINAL COM FORMULÁRIO CUSTOMIZADO)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Por favor, digite seu e-mail no campo acima antes de pedir a redefinição.');
      return;
    }
    
    const toastId = toast.loading('Enviando link de redefinição...');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Esta URL é para onde o usuário será redirecionado APÓS clicar no link no e-mail e definir a nova senha.
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      toast.error('Erro ao enviar e-mail. Verifique se o e-mail está correto.', { id: toastId });
    } else {
      toast.success('Link enviado! Verifique sua caixa de entrada.', { id: toastId });
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-800">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Seu e-mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Sua senha
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <div 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>
            {error && (
              <div className="p-3 text-center text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
                {error}
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Entrar'}
              </button>
            </div>
          </form>
          
          <div className="text-sm text-center space-x-4">
              <button
                type="button"
                onClick={handlePasswordReset}
                className="font-medium text-blue-600 hover:text-blue-500 underline"
              >
                Esqueceu sua senha?
              </button>
              {/* Se você tiver uma página de cadastro, pode usar um Link do Next.js */}
              {/* <Link href="/cadastro" className="font-medium text-blue-600 hover:text-blue-500">
                  Não tem uma conta? Cadastre-se
              </Link> */}
          </div>
        </div>
      </div>
    </>
  );
}