'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner } from 'react-icons/fa';

export default function AuthStatusPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const checkSessionAndRedirect = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    };
    checkSessionAndRedirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      <p className="mt-4 text-lg text-gray-700">Verificando sua sessão...</p>
    </div>
  );
}