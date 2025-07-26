// File: supabase/functions/processar-checkins-em-lote/index.ts
// Versão Final: Ignora espaços em branco nos cabeçalhos e no texto das perguntas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseSheetDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{1,2})/);
  if (!parts) return null;
  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1;
  const year = parseInt(parts[3], 10);
  const hour = parseInt(parts[4], 10);
  const minute = parseInt(parts[5], 10);
  const date = new Date(year, month, day, hour, minute);
  if (isNaN(date.getTime())) return null;
  return date;
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

    const { sheetName, checkins } = await req.json();

    if (!checkins || !Array.isArray(checkins) || checkins.length === 0) {
      return new Response(JSON.stringify({ error: 'Um array de "checkins" é obrigatório.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
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

    const { data: launch } = await supabaseClient.from('lancamentos').select('associated_survey_ids').eq('id', launchId).single();
    if (!launch || !launch.associated_survey_ids || launch.associated_survey_ids.length === 0) {
      return new Response(JSON.stringify({ error: `Lançamento encontrado, mas não tem pesquisas associadas.` }), { status: 404 })
    }
    const surveyIds = launch.associated_survey_ids;

    const { data: surveyQuestions } = await supabaseClient.from('pesquisas_perguntas').select('perguntas!inner(*, opcoes)').in('pesquisa_id', surveyIds);
    if (!surveyQuestions || surveyQuestions.length === 0) {
      return new Response(JSON.stringify({ error: `Nenhuma pergunta foi encontrada para as pesquisas associadas.` }), { status: 404 })
    }
    
    // --- CORREÇÃO CRUCIAL AQUI ---
    // Limpa o texto das perguntas da base de dados para garantir a correspondência.
    const questionsMap = new Map(surveyQuestions.map(p => [p.perguntas.texto.trim(), p.perguntas]));

    const incomingEmails = checkins.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean);
    const { data: existingLeads } = await supabaseClient.from('leads').select('id, email, score').eq('launch_id', launchId).in('email', incomingEmails);
    const leadsMap = new Map(existingLeads.map(l => [l.email, l]));

    const respostasToUpsert = [];
    const leadsToUpdate = [];
    
    for (const checkinRow of checkins) {
      const email = (checkinRow.email || '').trim().toLowerCase();
      const lead = leadsMap.get(email);

      if (lead) {
        let newPoints = 0;
        const answersToSave = {};
        for (const header in checkinRow) {
          // --- CORREÇÃO CRUCIAL AQUI ---
          // Limpa o cabeçalho da planilha antes de fazer a comparação.
          if (questionsMap.has(header.trim())) {
            const question = questionsMap.get(header.trim());
            const givenAnswer = checkinRow[header];
            answersToSave[question.id] = givenAnswer;
            const chosenOption = question.opcoes.find(opt => opt.texto === givenAnswer);
            if (chosenOption && chosenOption.peso) {
              newPoints += chosenOption.peso;
            }
          }
        }
        if (Object.keys(answersToSave).length > 0) {
          respostasToUpsert.push({ lead_id: lead.id, respostas: answersToSave });
          
          const dateFromSheet = parseSheetDate(checkinRow.data_checkin);
          const checkinDate = dateFromSheet ? dateFromSheet.toISOString() : new Date().toISOString();

          leadsToUpdate.push({ 
            id: lead.id, 
            score: (lead.score || 0) + newPoints, 
            check_in_at: checkinDate
          });
        }
      }
    }

    if (respostasToUpsert.length > 0) {
      await supabaseClient.from('respostas_leads').upsert(respostasToUpsert, { onConflict: 'lead_id' });
    }
    if (leadsToUpdate.length > 0) {
      await supabaseClient.from('leads').upsert(leadsToUpdate, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ message: `${leadsToUpdate.length} de ${checkins.length} check-ins processados com sucesso!` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})

  } catch (e) {
    console.error('Erro na execução da função de lote de check-ins:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }})
  }
})
