// =================================================================
// ARQUIVO NOVO: supabase/functions/process-csv-import-lote/index.ts
// Função dedicada exclusivamente ao processamento de grandes lotes.
// =================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Papa from 'https://esm.sh/papaparse@5.4.1';
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para interpretar datas de forma flexível
const parseDateValue = (dateString: string): string => {
    if (!dateString || dateString.trim() === '') return new Date().toISOString();
    // Tenta corresponder ao formato DD/MM/YYYY HH:mm:ss
    const matchDMY = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (matchDMY) {
        const [, day, month, year, hour, minute, second = '00'] = matchDMY;
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
        if (!isNaN(date.getTime())) return date.toISOString();
    }
    // Fallback para outros formatos que o construtor Date consegue interpretar
    const fallbackDate = new Date(dateString);
    if (!isNaN(fallbackDate.getTime())) return fallbackDate.toISOString();
    
    console.warn(`Formato de data não reconhecido: "${dateString}". A usar data atual.`);
    return new Date().toISOString();
};


Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { csvContent, launch_id } = await req.json();
        if (!csvContent || !launch_id) {
            throw new Error('Parâmetros csvContent e launch_id são obrigatórios.');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const decodedCsvContent = Buffer.from(csvContent.split(',')[1], 'base64').toString('utf-8');
        const { data: rows } = Papa.parse(decodedCsvContent, { header: true, skipEmptyLines: true, delimiter: ';' });

        if (!rows || (rows as any[]).length === 0) {
            throw new Error("Ficheiro CSV está vazio.");
        }

        const firstRow = (rows as any[])[0];
        const emailHeader = Object.keys(firstRow).find(h => h.toLowerCase().trim().includes('email') || h.toLowerCase().trim().includes('e-mail'));
        if (!emailHeader) {
            throw new Error("Coluna de e-mail não encontrada no CSV.");
        }

        const checkinsJson = (rows as any[]).map(row => {
            const email = row[emailHeader]?.trim().toLowerCase();
            const dateHeader = Object.keys(row).find(h => ['data_checkin', 'submitted at'].includes(h.toLowerCase().trim()));
            const checkInDate = parseDateValue(dateHeader ? row[dateHeader] : '');
            
            const respostas = { ...row };
            delete respostas[emailHeader];
            if (dateHeader) delete respostas[dateHeader];
            
            // Converte para o formato de objeto que a sua função SQL espera
            const respostasFormatadas: { [key: string]: any } = {};
            Object.keys(respostas).forEach(key => {
                // Supondo que as chaves são os IDs das perguntas
                respostasFormatadas[key] = respostas[key];
            });
            
            return { email, check_in_at: checkInDate, respostas: respostasFormatadas };
        }).filter(item => item.email && item.email.includes('@'));

        if (checkinsJson.length === 0) {
            throw new Error("Nenhum registo com email válido encontrado no ficheiro.");
        }

        const { data: report, error } = await supabaseClient.rpc('processar_lote_checkins', {
            p_launch_id: launch_id,
            p_checkins_json: checkinsJson
        });

        if (error) {
            throw new Error(`Erro na função SQL de lote: ${error.message}`);
        }

        const finalMessage = `Importação em lote concluída. Recebidos: ${report.total_recebido}, Encontrados: ${report.leads_encontrados}, Atualizados: ${report.leads_atualizados}.`;
        
        return new Response(JSON.stringify({ message: finalMessage, debug_log: [finalMessage] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ message: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
