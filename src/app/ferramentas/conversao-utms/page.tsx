'use client';

import { useState, useEffect } from 'react';
// CORREÇÃO: Importa o cliente recomendado
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaEdit } from 'react-icons/fa';

type UtmAlias = {
    id: number;
    utm_type: string;
    raw_value: string;
    display_name: string;
};

export default function ConversaoUtmsPage() {
    // CORREÇÃO: Usa o cliente correto
    const supabase = createClient();
    
    const [aliases, setAliases] = useState<UtmAlias[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState<Partial<UtmAlias>>({ utm_type: 'content', raw_value: '', display_name: '' });
    const [isEditing, setIsEditing] = useState<number | null>(null);

    const fetchAliases = async () => {
        setIsLoading(true);
        // CORREÇÃO: Usa a variável 'supabase'
        const { data, error } = await supabase.from('utm_aliases').select('*').order('utm_type').order('raw_value');
        if (error) {
            toast.error("Erro ao carregar as conversões.");
        } else {
            setAliases(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAliases();
    }, []); // O 'supabase' não é necessário aqui pois a função não é recriada com ele

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.utm_type || !formData.raw_value || !formData.display_name) {
            toast.error("Todos os campos são obrigatórios.");
            return;
        }
        setIsSaving(true);
        
        const dataToSave = {
            utm_type: formData.utm_type.trim(),
            raw_value: formData.raw_value.trim(),
            display_name: formData.display_name.trim(),
        };
        
        // CORREÇÃO: Usa a variável 'supabase'
        const { error } = isEditing 
            ? await supabase.from('utm_aliases').update(dataToSave).eq('id', isEditing)
            : await supabase.from('utm_aliases').insert(dataToSave);
        
        if (error) {
            toast.error(`Falha ao salvar: ${error.message}`);
        } else {
            toast.success(`Conversão ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
            resetForm();
            fetchAliases(); // Recarrega a lista
        }
        setIsSaving(false);
    };
    
    const handleEdit = (alias: UtmAlias) => {
        setIsEditing(alias.id);
        setFormData(alias);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({ utm_type: 'content', raw_value: '', display_name: '' });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Gerenciador de Conversão de UTMs</h1>
            
            <form onSubmit={handleSubmit} className="p-4 md:p-6 bg-white rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-semibold text-slate-700">{isEditing ? 'Editar Conversão' : 'Adicionar Nova Conversão'}</h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="utm_type" className="block text-sm font-medium text-slate-700">Tipo de UTM</label>
                        <select name="utm_type" id="utm_type" value={formData.utm_type} onChange={handleInputChange} className="mt-1 w-full md:w-1/3 p-2 border border-slate-300 rounded-md bg-white">
                            <option value="content">UTM Content</option>
                            <option value="campaign">UTM Campaign</option>
                            <option value="medium">UTM Medium</option>
                            <option value="source">UTM Source</option>
                            <option value="term">UTM Term</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="raw_value" className="block text-sm font-medium text-slate-700">Valor Original (Técnico)</label>
                        <textarea name="raw_value" id="raw_value" value={formData.raw_value || ''} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Cole aqui o valor vindo do Excel..."/>
                    </div>
                    <div>
                        <label htmlFor="display_name" className="block text-sm font-medium text-slate-700">Nome Amigável (para o Dashboard)</label>
                        <input type="text" name="display_name" id="display_name" value={formData.display_name || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Anúncio de Teste Estático para o LC20 de Março"/>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4">
                    {isEditing && <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 w-full sm:w-auto">Cancelar Edição</button>}
                    <button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 w-full sm:w-auto">
                        {isSaving ? <FaSpinner className="animate-spin mx-auto"/> : (isEditing ? 'Atualizar' : 'Adicionar')}
                    </button>
                </div>
            </form>

            <div className="bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 p-4 md:p-6">Conversões Salvas</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 hidden md:table-header-group">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Valor Original</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Nome Amigável</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {isLoading ? (<tr><td colSpan={4} className="text-center p-4"><FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" /></td></tr>) 
                            : aliases.map(alias => (
                                <tr key={alias.id} className="block md:table-row border rounded-lg shadow-sm mb-4 md:border-none md:shadow-none md:mb-0 md:border-b">
                                    <td className="p-3 md:px-6 md:py-4 whitespace-nowrap"><span className="md:hidden font-bold text-slate-500">Tipo: </span><span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{alias.utm_type}</span></td>
                                    <td className="p-3 md:px-6 md:py-4 max-w-full md:max-w-sm truncate" title={alias.raw_value}><span className="md:hidden font-bold text-slate-500">Valor Original: </span>{alias.raw_value}</td>
                                    <td className="p-3 md:px-6 md:py-4 max-w-full md:max-w-sm truncate font-medium text-slate-800" title={alias.display_name}><span className="md:hidden font-bold text-slate-500">Nome Amigável: </span>{alias.display_name}</td>
                                    <td className="p-3 md:px-6 md-py-4 whitespace-nowrap">
                                        <button onClick={() => handleEdit(alias)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                            <FaEdit />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {aliases.length === 0 && !isLoading && (
                                <tr><td colSpan={4} className="text-center p-6 text-slate-500">Nenhuma conversão cadastrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}