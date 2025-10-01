'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { setEmail(''); setPassword(''); }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { 
      setError('E-mail ou senha inválidos.'); 
      setLoading(false); 
    } else { 
      window.location.assign('/');
    }
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
      {/* --- MUDANÇA: Fundo geral da página --- */}
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        
        {/* --- MUDANÇA: Cor de fundo do cartão, cor do texto e dos links --- */}
        <div className="w-full max-w-sm p-8 space-y-6 bg-[#1a202c] rounded-lg shadow-md text-white">
          
          <div className="flex justify-center">
            <Image
              src="https://xqsrkvfvrqjzayrkbzsp.supabase.co/storage/v1/object/public/logos/logo_02.png"
              alt="Logo da Empresa"
              width={100}
              height={100}
              priority
            />
          </div>
          
          <h2 className="text-2xl font-bold text-center">Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Seu e-mail</label>
              {/* --- MUDANÇA: Estilo dos inputs para contraste --- */}
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Sua senha</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-200" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>
            {error && <div className="p-3 text-center text-sm text-red-400 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500">
              {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Entrar'}
            </button>
          </form>
          <div className="text-sm text-center space-y-2">
            <button type="button" onClick={handlePasswordReset} className="font-medium text-blue-400 hover:text-blue-300 underline">
              Esqueceu sua senha?
            </button>
            <div>
              <Link href="/signup" className="font-medium text-blue-400 hover:text-blue-300">
                Não tem uma conta? Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}