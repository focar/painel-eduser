// src/components/charts/OrganicTrafficBarChart.tsx
// VERSÃO FINAL - Altura personalizável
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

// Definimos o tipo de dados que o gráfico espera
type ChartData = {
    utm_medium: string; // Usamos um nome genérico para reutilização
    total_leads: number;
};

// Props que o componente aceita
type ChartProps = {
    data: ChartData[];
    height?: string; // Altura agora é opcional
};

// Componente customizado para o Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e2b41] p-3 border border-[#6ce5e8] rounded-lg shadow-lg">
                <p className="font-bold text-white">{`${label}`}</p>
                <p className="text-[#6ce5e8]">{`Leads: ${payload[0].value.toLocaleString('pt-BR')}`}</p>
            </div>
        );
    }
    return null;
};

export default function OrganicTrafficBarChart({ data, height = '30rem' }: ChartProps) {
    // Garante que os dados estão ordenados do maior para o menor
    const sortedData = [...data].sort((a, b) => b.total_leads - a.total_leads);

    return (
        // Usamos um estilo inline para definir a altura dinamicamente
        <div className="w-full bg-[#2a3a5a] p-4 sm:p-6 rounded-lg shadow-lg" style={{ height: height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={sortedData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5a7a" />
                    <XAxis 
                        dataKey="utm_medium" 
                        angle={-45}
                        textAnchor="end"
                        stroke="#a0aec0"
                        interval={0}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#a0aec0" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108, 229, 232, 0.1)' }} />
                    <Bar dataKey="total_leads" fill="#6ce5e8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
