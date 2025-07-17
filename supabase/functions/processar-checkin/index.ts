// File: supabase/functions/processar-checkin/index.ts
// Versão 15: À Prova de Sujeira. Limpa os emails de espaços extra antes de os processar.

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

    const sheetRowData = await req.json();
    const { sheetName } = sheetRowData;

    // --- LÓGICA À PROVA DE SUJEIRA ---
    // Limpa o email de espaços e converte para minúsculas imediatamente.
    const email = (sheetRowData.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'A coluna "email" não foi encontrada ou está vazia nos dados da planilha.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
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
    
    // O resto da lógica continua, agora usando o email limpo.
    const { data: launch, error: launchError } = await supabaseClient
      .from('lancamentos')
      .select('associated_survey_ids')
      .eq('id', launchId)
      .single();

    if (launchError || !launch || !launch.associated_survey_ids || launch.associated_survey_ids.length === 0) {
      return new Response(JSON.stringify({ error: `Lançamento encontrado, mas não tem pesquisas associadas.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    const surveyIds = launch.associated_survey_ids;

    const { data: surveyQuestions, error: questionsError } = await supabaseClient
      .from('pesquisas_perguntas')
      .select('perguntas!inner(*, opcoes)')
      .in('pesquisa_id', surveyIds);
    
    if (questionsError) throw questionsError;

    if (!surveyQuestions || surveyQuestions.length === 0) {
      return new Response(JSON.stringify({ error: `Nenhuma pergunta foi encontrada para as pesquisas associadas.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }
    const relevantQuestions = surveyQuestions.map(p => p.perguntas).filter(Boolean);

    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('id, score')
      .eq('launch_id', launchId)
      .eq('email', email) // A comparação é feita com o email já limpo.
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: `Lead com email ${email} não encontrado no lançamento ativo.` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
    }

    let newPoints = 0;
    const answersToSave = {};

    for (const question of relevantQuestions) {
      if (sheetRowData.hasOwnProperty(question.texto)) {
        const givenAnswer = sheetRowData[question.texto];
        answersToSave[question.id] = givenAnswer;
        const chosenOption = question.opcoes.find(opt => opt.texto === givenAnswer);
        if (chosenOption && chosenOption.peso) {
          newPoints += chosenOption.peso;
        }
      }
    }

    if (Object.keys(answersToSave).length > 0) {
      await supabaseClient
        .from('respostas_leads')
        .upsert({ lead_id: lead.id, respostas: answersToSave }, { onConflict: 'lead_id' });
      
      const currentScore = lead.score || 0;
      const totalScore = currentScore + newPoints;
      
      await supabaseClient
        .from('leads')
        .update({ score: totalScore, check_in_at: new Date().toISOString() })
        .eq('id', lead.id);
    }

    return new Response(JSON.stringify({ message: 'Check-in processado com sucesso!', newPoints: newPoints, totalScore: (lead.score || 0) + newPoints }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  } catch (e) {
    console.error('Erro na execução da função de check-in:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
  }
})
