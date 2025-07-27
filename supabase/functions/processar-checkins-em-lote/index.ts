import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Função principal
serve(async (req) => {
  // Tratamento de CORS para requisições OPTIONS (boa prática)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } });
  }

  // --- Bloco de Validação de Segurança ---
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorizationHeader = req.headers.get('Authorization');
    const expectedAuthHeader = `Bearer ${serviceKey}`;

    if (!serviceKey || authorizationHeader !== expectedAuthHeader) {
      return new Response(
        JSON.stringify({ error: 'Chave de autorização inválida ou ausente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Erro de segurança: ${e.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Bloco de Lógica Principal ---
  try {
    const checkins = await req.json();
    console.log(`LÓGICA INICIADA: Recebido um lote com ${checkins.length} check-ins.`);

    // Inicializa o cliente Supabase para se comunicar com o banco de dados
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Itera sobre cada check-in recebido no lote
    for (const checkin of checkins) {
      if (!checkin.email) {
        console.error("REGISTRO IGNORADO por não conter e-mail:", checkin);
        continue; // Pula para o próximo registro do lote
      }

      // Passo 1: Encontrar o lead pelo e-mail
      console.log(`[PASSO 1] Buscando lead com o e-mail: ${checkin.email}`);
      const { data: lead, error: leadError } = await supabaseClient
        .from('leads')
        .select('id')
        .eq('email', checkin.email)
        .single(); // .single() espera encontrar exatamente 1 resultado

      if (leadError || !lead) {
        console.error(`[FALHA PASSO 1] LEAD NÃO ENCONTRADO ou ERRO ao buscar: ${checkin.email}. Erro:`, leadError);
        continue; // Pula para o próximo registro
      }

      console.log(`[SUCESSO PASSO 1] Lead encontrado. ID: ${lead.id}.`);

      // Passo 2: Inserir as respostas na tabela 'respostas_leads'
      console.log(`[PASSO 2] Tentando inserir respostas para o lead ID ${lead.id}...`);
      const { error: insertError } = await supabaseClient
        .from('respostas_leads')
        .insert({
          lead_id: lead.id,
          respostas: checkin // Salva o objeto inteiro do check-in na coluna JSONB
        });

      if (insertError) {
        console.error(`[FALHA PASSO 2] ERRO ao inserir respostas para o lead ID ${lead.id}:`, insertError);
      } else {
        console.log(`[SUCESSO PASSO 2] Respostas inseridas com sucesso para o lead ID ${lead.id}.`);
        // É AQUI que a sua lógica de CÁLCULO DE SCORE deve ser chamada
      }
    }

    // Retorna a mensagem de sucesso final após processar todo o lote
    return new Response(
      JSON.stringify({ message: 'Processamento do lote concluído com sucesso.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error("ERRO GERAL no bloco de lógica principal:", e);
    return new Response(
      JSON.stringify({ error: `Erro no processamento: ${e.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});