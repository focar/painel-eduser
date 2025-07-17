// File: supabase/functions/processar-inscricao/index.ts
// Versão 5: À Prova de Sujeira. Limpa os emails de espaços extra antes de os processar.

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

    const inscricao = await req.json()
    const { sheetName, nome, telefone, utm_campaign, utm_source, utm_medium, utm_content, utm_term } = inscricao

    // --- LÓGICA À PROVA DE SUJEIRA ---
    // Limpa o email de espaços e converte para minúsculas imediatamente.
    const email = (inscricao.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'O campo email é obrigatório.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    // --- FIM DA LÓGICA ---

    let launchId = null;

    if (sheetName) {
        const { data: launchByName } = await supabaseClient
            .from('lancamentos')
            .select('id')
            .eq('nome', sheetName)
            .eq('status', 'Em Andamento')
            .single();
        
        if (launchByName) {
            launchId = launchByName.id;
        }
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

    const { data: leadSalvo, error: erroLead } = await supabaseClient
      .from('leads')
      .upsert({
        launch_id: launchId,
        email: email, // Usa o email já limpo
        nome,
        telefone,
        utm_campaign,
        utm_source,
        utm_medium,
        utm_content,
        utm_term,
      }, {
        onConflict: 'email, launch_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (erroLead) throw erroLead;

    return new Response(JSON.stringify({ message: 'Inscrição processada com sucesso!', lead: leadSalvo }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  } catch (e) {
    console.error('Erro na execução da função de inscrição:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
  }
})
