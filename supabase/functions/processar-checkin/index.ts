// supabase/functions/processar-checkin/index.ts
// VERSÃO 100% COMPLETA E CORRIGIDA - Usa o cabeçalho x-api-key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('CUSTOM_API_KEY')
    // ### CORREÇÃO DE AUTENTICAÇÃO ###
    const apiKeyHeader = req.headers.get('x-api-key')
    if (!secretKey || apiKeyHeader !== secretKey) {
      return new Response(JSON.stringify({ error: 'Chave de API inválida ou ausente.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sheetRowData = await req.json();
    const { sheetName, data_checkin } = sheetRowData;
    const email = (sheetRowData.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'A coluna "email" não foi encontrada ou está vazia.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }

    let launchId = null;
    if (sheetName) {
        const { data: launchByName } = await supabaseClient.from('lancamentos').select('id').eq('nome', sheetName).eq('status', 'Em Andamento').single();
        if (launchByName) launchId = launchByName.id;
    }
    if (!launchId) {
        const { data: activeLaunchData } = await supabaseClient.rpc('get_active_launch');
        if (activeLaunchData && activeLaunchData.length > 0) launchId = activeLaunchData[0].launch_id;
    }
    if (!launchId) {
        return new Response(JSON.stringify({ error: "Nenhum lançamento ativo foi encontrado." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    
    const { data: lead, error: leadError } = await supabaseClient.from('leads').select('id, score').eq('launch_id', launchId).eq('email', email).single();
    if (leadError || !lead) return new Response(JSON.stringify({ error: `Lead com email ${email} não encontrado.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    
    const { data: launch } = await supabaseClient.from('lancamentos').select('associated_survey_ids').eq('id', launchId).single();
    if (!launch || !launch.associated_survey_ids) return new Response(JSON.stringify({ error: `Lançamento não tem pesquisas associadas.` }), { status: 404 })
    
    const { data: surveyQuestions, error: questionsError } = await supabaseClient.from('pesquisas_perguntas').select('perguntas!inner(*, opcoes)').in('pesquisa_id', launch.associated_survey_ids);
    if (questionsError) throw questionsError;
    if (!surveyQuestions || surveyQuestions.length === 0) return new Response(JSON.stringify({ error: `Nenhuma pergunta encontrada.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    const relevantQuestions = surveyQuestions.map(p => p.perguntas).filter(Boolean);
    
    let newPoints = 0;
    const answersToSave = {};

    for (const question of relevantQuestions) {
      if (sheetRowData.hasOwnProperty(question.texto)) {
        const givenAnswer = sheetRowData[question.texto];
        answersToSave[question.id] = givenAnswer;
        const chosenOption = question.opcoes.find(opt => opt.texto === givenAnswer);
        if (chosenOption && chosenOption.peso) newPoints += chosenOption.peso;
      }
    }

    if (Object.keys(answersToSave).length > 0) {
      await supabaseClient.from('respostas_leads').upsert({ lead_id: lead.id, respostas: answersToSave }, { onConflict: 'lead_id' });
      
      const currentScore = lead.score || 0;
      const totalScore = currentScore + newPoints;
      
      const dateFromSheet = data_checkin ? new Date(data_checkin) : null;
      const checkinDate = (dateFromSheet && !isNaN(dateFromSheet.getTime()))
        ? dateFromSheet.toISOString()
        : new Date().toISOString();

      await supabaseClient
        .from('leads')
        .update({ score: totalScore, check_in_at: checkinDate })
        .eq('id', lead.id);
      
      return new Response(JSON.stringify({ message: 'Check-in processado!', newPoints, totalScore }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }

    return new Response(JSON.stringify({ message: 'Nenhuma resposta encontrada para processar.'}), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
  }
})