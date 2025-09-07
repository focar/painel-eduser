// src/app/dashboard-traqueamento/organico/mov-diario/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Ícones SVG embutidos para remover dependências externas ---
const FaSpinner = () => (
    <svg className="animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
  
const FaChevronLeft = ({ size = 14 }: { size?: number }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height={`${size}px`} width={`${size}px`} xmlns="http://www.w3.org/2000/svg">
      <path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"></path>
    </svg>
);

// --- Tipos de Dados ---
type DailyMovementData = {
  movement_date: string; // Vem como string (YYYY-MM-DD)
  leads_count: number;
  checkins_count: number;
};

// --- Componente do Gráfico ---
const DailyMovementChart = ({ data }: { data: DailyMovementData[] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-[40rem]">
        <p className="text-slate-400">Nenhum dado de movimento diário para exibir.</p>
      </div>
    );
  }

  // Formata a data para exibição no gráfico (DD/MM)
  const formattedData = data.map(item => ({
    ...item,
    dateFormatted: new Date(item.movement_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
  }));

  return (
    <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg h-[40rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5b71" />
          <XAxis dataKey="dateFormatted" stroke="#a0b3d6" />
          <YAxis stroke="#a0b3d6" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e2b41', border: '1px solid #4a5b71' }}
            labelStyle={{ color: '#ffffff' }}
            cursor={{fill: 'rgba(108, 229, 232, 0.1)'}}
          />
          <Legend wrapperStyle={{ color: '#ffffff' }}/>
          <Bar dataKey="leads_count" name="Leads" fill="#3b82f6" />
          <Bar dataKey="checkins_count" name="Check-ins" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


// --- Componente Principal da Página ---
function MovDiarioOrganicoPageContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchId = searchParams.get('launchId');
  const launchName = searchParams.get('launchName');

  const [data, setData] = useState<DailyMovementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_organic_traffic_daily_movement', { p_launch_id: id });
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (launchId) {
      fetchData(launchId);
    } else {
      router.push('/dashboard-traqueamento');
    }
  }, [launchId, fetchData, router]);

  return (
    <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
      <header className="flex items-center gap-6 mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 bg-[#2a3a5a] text-slate-200 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-700">
          <FaChevronLeft size={14} /> Voltar
        </button>
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider">Movimento Diário - Tráfego Orgânico</p>
          <h1 className="text-3xl font-bold text-white">{launchName || 'Movimento Diário'}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-96"><FaSpinner /></div>
      ) : (
        <main>
          <DailyMovementChart data={data} />
        </main>
      )}
    </div>
  );
}

export default function MovDiarioOrganicoPage() {
    return (
        <Suspense fallback={<div className="bg-[#1e2b41] min-h-screen w-full flex justify-center items-center"><FaSpinner /></div>}>
            <MovDiarioOrganicoPageContent />
        </Suspense>
    );
}

