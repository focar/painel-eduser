// File: supabase/functions/processar-inscricoes-em-lote/index.ts
// Versão 5: Final. Lida corretamente com o formato de data ISO do Google Sheets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('CUSTOM_API_KEY')
    const authHeader = req.headers.get('Authorization')
    if (!secretKey || authHeader !== `Bearer ${secretKey}`) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sheetName, leads } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: 'Um array de "leads" é obrigatório.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }

    let launchId = null;

    if (sheetName) {
        const { data: launchByName } = await supabaseClient
            .from('lancamentos').select('id').eq('nome', sheetName).eq('status', 'Em Andamento').single();
        if (launchByName) launchId = launchByName.id;
    }

    if (!launchId) {
        const { data: activeLaunchData } = await supabaseClient.rpc('get_active_launch');
        if (activeLaunchData && activeLaunchData.length > 0) {
            launchId = activeLaunchData[0].launch_id;
        }
    }

    if (!launchId) {
        return new Response(JSON.stringify({ error: "Nenhum lançamento ativo foi encontrado." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }

    let successCount = 0;
    const errors = [];

    for (const lead of leads) {
      try {
        // --- LÓGICA DE DATA CORRIGIDA E SIMPLIFICADA ---
        let inscriptionDate = new Date().toISOString(); // Fallback para a data atual
        if (lead.created_at) {
          // O construtor de Date() consegue interpretar o formato ISO do Google Sheets diretamente.
          const parsedDate = new Date(lead.created_at);
          if (!isNaN(parsedDate.getTime())) { // Verifica se a data é válida
            inscriptionDate = parsedDate.toISOString();
          }
        }
        // --- FIM DA LÓGICA DE DATA ---

        const leadToInsert = {
          launch_id: launchId,
          email: (lead.email || '').trim().toLowerCase(),
          nome: lead.nome,
          telefone: lead.telefone,
          created_at: inscriptionDate, // <-- USA A DATA CORRIGIDA
          utm_campaign: lead.utm_campaign,
          utm_source: lead.utm_source,
          utm_medium: lead.utm_medium,
          utm_content: lead.utm_content,
          utm_term: lead.utm_term,
        };

        if (!leadToInsert.email) continue;

        const { error } = await supabaseClient
          .from('leads')
          .upsert(leadToInsert, { onConflict: 'email, launch_id' });

        if (error) throw error;
        successCount++;
      } catch (e) {
        errors.push(`Falha ao processar o email ${lead.email}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        message: `Processamento do lote concluído com ${errors.length} erros.`,
        success_count: successCount,
        errors: errors 
      }), { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ message: `${successCount} inscrições processadas com sucesso!` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  } catch (e) {
    console.error('Erro CRÍTICO na execução da função de lote:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
  }
})
