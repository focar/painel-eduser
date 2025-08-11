// src/components/charts/TrafficDonutChart.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type ChartData = {
    name: string;
    value: number;
    fill: string;
};

// Este é o mesmo componente de antes, agora no seu próprio ficheiro.
export default function TrafficDonutChart({ data }: { data: ChartData[] }) {
    return (
        <div className="w-full h-96">
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={150}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            if (midAngle == null || percent == null) return null;
                            const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                            return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold">
                                    {`${(percent * 100).toFixed(1)}%`}
                                </text>
                            );
                        }}
                    >
                        {data.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e2b41', borderColor: '#6ce5e8', color: 'white' }} formatter={(value: number, name) => [`${value.toLocaleString('pt-BR')} leads`, name]} />
                    <Legend iconType="circle" formatter={(value) => <span className="text-white">{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};