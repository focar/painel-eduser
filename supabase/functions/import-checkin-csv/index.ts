// supabase/functions/process-csv-import/index.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Papa from 'https://esm.sh/papaparse@5.4.1';

// --- Tipos alinhados com o Schema (UUIDs) ---
type ImportType = 'CHECKIN' | 'INSCRICAO' | 'BUYERS' | 'PROFILE_ONLY';
type Opcao = { texto: string; peso?: number; mql_score?: number; };
type Pergunta = { id: string; texto: string; classe: 'Score' | 'Perfil'; opcoes: Opcao[] | null; }; // id is UUID (string)
type LeadData = { email: string; launch_id_int: number; check_in_at: string | null; score: number; mql_score: number; score_answers: Record<string, any>; profile_answers: Record<string, any>; };
type LogReport = { mappedHeaders: string[]; unmappedHeaders: string[]; totalRows: number; processedLeads: number; };

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const parseDateWithTimezone = (dateString: string): string | null => {
  if (!dateString) return null;
  let year, month, day, hour, minute, second;
  const formatDMY = dateString.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ T](\d{1,2}):(\d{2}):?(\d{2})?/);
  if (formatDMY) { day = formatDMY[1]; month = formatDMY[2]; year = formatDMY[3]; hour = formatDMY[4]; minute = formatDMY[5]; second = formatDMY[6] || '00';
  } else {
    const formatYMD = dateString.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2}):?(\d{2})?/);
    if (formatYMD) { year = formatYMD[1]; month = formatYMD[2]; day = formatYMD[3]; hour = formatYMD[4]; minute = formatYMD[5]; second = formatYMD[6] || '00'; }
  }
  if (year && month && day && hour && minute) {
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}-03:00`;
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) { return d.toISOString(); }
  }
  const d = new Date(dateString);
  return !isNaN(d.getTime()) ? d.toISOString() : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
  try {
    const { csvContent, launch_id, import_type } = await req.json();
    if (!csvContent || !launch_id || !import_type) { throw new Error('csvContent, launch_id, and import_type are required.'); }
    const supabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization')! } } } );
    let result;
    switch (import_type as ImportType) {
      case 'CHECKIN': case 'PROFILE_ONLY': result = await handleCheckinImport(supabaseClient, csvContent, launch_id, import_type); break;
      case 'INSCRICAO': result = await handleInscriptionImport(supabaseClient, csvContent, launch_id); break;
      case 'BUYERS': result = await handleBuyersImport(supabaseClient, csvContent, launch_id); break;
      default: throw new Error(`Invalid import_type: ${import_type}`);
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message, status: 'error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});

async function handleCheckinImport(supabase: SupabaseClient, csvContent: string, launch_id_int: number, import_type: 'CHECKIN' | 'PROFILE_ONLY') {
    const { data: perguntas, error: perguntasError } = await supabase.from('perguntas').select('id, texto, classe, opcoes');
    if (perguntasError) throw perguntasError;
    const mapaPerguntas = new Map<string, Pergunta>(perguntas.map((p: any) => [p.texto.toLowerCase().trim(), p]));
    const { data: rows, meta } = Papa.parse(csvContent, { header: true, skipEmptyLines: true, transformHeader: h => h.toLowerCase().trim() });
    const headers = meta.fields?.map(h => h.toLowerCase().trim()) || [];
    const emailHeader = headers.find(h => ['email', 'e-mail', 'endereço de e-mail'].includes(h));
    const dateHeader = headers.find(h => ['submitted at', 'data_checkin', 'timestamp', 'carimbo de data/hora'].includes(h));
    if (!emailHeader) throw new Error('Coluna de e-mail não encontrada.');
    const report: LogReport = { mappedHeaders: [], unmappedHeaders: [], totalRows: rows.length, processedLeads: 0 };
    const leadsMap = new Map<string, LeadData>();
    for (const row of rows as any[]) {
      const email = row[emailHeader]?.trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      let lead = leadsMap.get(email) || { email, launch_id_int: launch_id_int, check_in_at: dateHeader ? parseDateWithTimezone(row[dateHeader]) : null, score: 0, mql_score: 0, score_answers: {}, profile_answers: {} };
      for (const header of headers) {
        if (header === emailHeader || header === dateHeader) continue;
        const respostaDoLead = row[header];
        if (!respostaDoLead) continue;
        const perguntaInfo = mapaPerguntas.get(header);
        if (perguntaInfo) {
          if (!report.mappedHeaders.includes(header)) report.mappedHeaders.push(header);
          let pesoDaResposta = 0, mqlScoreDaResposta = 0;
          if (perguntaInfo.opcoes && Array.isArray(perguntaInfo.opcoes)) {
              const opcaoEncontrada = perguntaInfo.opcoes.find(opt => opt.texto === respostaDoLead);
              if (opcaoEncontrada) { pesoDaResposta = opcaoEncontrada.peso || 0; mqlScoreDaResposta = opcaoEncontrada.mql_score || 0; }
          }
          if (perguntaInfo.classe === 'Score' && import_type !== 'PROFILE_ONLY') { lead.score_answers[perguntaInfo.id] = respostaDoLead; lead.score += pesoDaResposta;
          } else if (perguntaInfo.classe === 'Perfil') { lead.profile_answers[perguntaInfo.id] = respostaDoLead; lead.mql_score += mqlScoreDaResposta; }
        } else { if (!report.unmappedHeaders.includes(header)) report.unmappedHeaders.push(header); }
      }
      leadsMap.set(email, lead);
    }
    const payload = Array.from(leadsMap.values());
    report.processedLeads = payload.length;
    if (payload.length === 0) { return { message: 'Nenhum lead válido processado.', details: report }; }
    const { error: rpcError } = await supabase.rpc('bulk_process_survey_recalc', { payload });
    if (rpcError) throw rpcError;
    return { message: `${report.processedLeads} registos de ${import_type} processados.`, details: report };
}

async function handleInscriptionImport(supabase: SupabaseClient, csvContent: string, launch_id_int: number) {
    const { data: rows } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const emailHeaderOptions = ["qual o seu principal e-mail para receber seu presente surpresa agora?", "email"];
    const emailHeader = Object.keys(rows[0] as any || {}).find(h => emailHeaderOptions.includes(h.trim().toLowerCase()));
    if (!emailHeader) throw new Error("Coluna de e-mail não encontrada.");
    const findValue = (row: any, key: string) => { const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim()); return foundKey ? row[foundKey] : null; };
    const leadsData = (rows as any[]).map(row => { const dateString = findValue(row, 'submitted at') || findValue(row, 'timestamp'); const createdAt = dateString ? parseDateWithTimezone(dateString) : null; return { p_launch_id: launch_id_int, p_email: row[emailHeader]?.trim().toLowerCase(), p_nome: findValue(row, 'nome') || null, p_created_at: createdAt, p_utm_source: findValue(row, 'utm_source') || null, p_utm_medium: findValue(row, 'utm_medium') || null, p_utm_campaign: findValue(row, 'utm_campaign') || null, p_utm_term: findValue(row, 'utm_term') || null, p_utm_content: findValue(row, 'utm_content') || null }; }).filter(lead => lead.p_email && lead.p_email.includes('@'));
    if (leadsData.length === 0) return { message: 'Nenhum lead de Inscrição válido.' };
    const { error } = await supabase.rpc('bulk_insert_leads', { p_leads_data: leadsData });
    if (error) throw error;
    return { message: `${leadsData.length} leads de Inscrição processados.` };
}

async function handleBuyersImport(supabase: SupabaseClient, csvContent: string, launch_id_int: number) {
    // ... (Esta função pode precisar de ajuste similar se a tabela de compradores também usar UUIDs)
    return { message: "Função de importação de compradores a ser implementada com UUIDs."}
}