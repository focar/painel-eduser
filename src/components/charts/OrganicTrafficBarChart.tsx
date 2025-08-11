// src/components/charts/OrganicTrafficBarChart.tsx
// VERSÃO DE TESTE - ULTRA SIMPLIFICADA
'use client';

// Importamos apenas os componentes mais básicos do recharts
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

// Definimos o tipo de dados que o gráfico espera
type MediumData = {
    utm_medium: string;
    total_leads: number;
    total_checkins: number; // Mantemos o tipo completo por consistência
};

export default function OrganicTrafficBarChart({ data }: { data: MediumData[] }) {
    
    // Se não houver dados, mostra uma mensagem
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-[30rem] bg-[#2a3a5a] p-4 sm:p-6 rounded-lg shadow-lg flex justify-center items-center">
                <p className="text-slate-400">Sem dados para exibir no gráfico.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[30rem] bg-[#2a3a5a] p-4 sm:p-6 rounded-lg shadow-lg">
            <ResponsiveContainer width="100%" height="100%">
                {/* Este é o gráfico mais simples possível com a biblioteca */}
                <BarChart 
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // Aumenta a margem inferior para o texto
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5a7a" />
                    <XAxis 
                        dataKey="utm_medium" 
                        angle={-45} 
                        textAnchor="end"
                        stroke="#a0aec0"
                        interval={0} // Garante que todos os labels apareçam
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#a0aec0" allowDecimals={false} />
                    <Bar dataKey="total_leads" fill="#6ce5e8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
