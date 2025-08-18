// supabase/functions/processar-inscricao-compradores/index.ts
// VERSÃO FINAL E CORRIGIDA PARA TESTE

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PAINEL_SECRET = Deno.env.get('PAINEL_COMPRADORES_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Validação de Segurança ---
    const authHeader = req.headers.get('Authorization');
    if (!PAINEL_SECRET || authHeader !== `Bearer ${PAINEL_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Espera um array de inscrições diretamente
    const loteCompradores = await req.json();
    if (!Array.isArray(loteCompradores) || loteCompradores.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload vazio ou em formato inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usa 'launch_name' para consistência com o Google Apps Script
    const launchName = loteCompradores[0]?.launch_name;
    if (!launchName) {
      return new Response(JSON.stringify({ error: 'O campo "launch_name" é obrigatório no payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (launchName === 'TESTE_CONEXAO') {
      return new Response(JSON.stringify({ message: "Conexão de teste bem-sucedida!" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { data: launchData, error: launchError } = await supabaseAdmin
      .from('lancamentos')
      .select('id')
      .eq('nome', launchName)
      .single();

    if (launchError || !launchData) {
      return new Response(JSON.stringify({ error: `Lançamento com nome "${launchName}" não foi encontrado.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const launchId = launchData.id;

    const leadsParaUpsert = loteCompradores.map((comprador) => ({
      launch_id: launchId,
      email: (comprador.email || '').trim().toLowerCase(),
      nome: comprador.nome,
      telefone: comprador.telefone,
      utm_campaign: comprador.utm_campaign,
      utm_source: comprador.utm_source,
      utm_medium: comprador.utm_medium,
      utm_content: comprador.utm_content,
      utm_term: comprador.utm_term,
      is_buyer: false, // Correto: uma inscrição não é uma compra
      created_at: comprador.created_at // Pega a data da planilha
    })).filter((lead) => lead.email);

    if (leadsParaUpsert.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum lead válido para processar.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(leadsParaUpsert, { onConflict: 'email, launch_id' })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ message: `${data.length} inscrições processadas com sucesso.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});