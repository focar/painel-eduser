export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      campaign_settings: {
        Row: {
          flow_type: string
          launch_id: string | null
          survey_id: string | null
          updated_at: string | null
          utm_content: string
        }
        Insert: {
          flow_type?: string
          launch_id?: string | null
          survey_id?: string | null
          updated_at?: string | null
          utm_content: string
        }
        Update: {
          flow_type?: string
          launch_id?: string | null
          survey_id?: string | null
          updated_at?: string | null
          utm_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_settings_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_settings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      column_mappings: {
        Row: {
          created_at: string
          id: string
          launch_id: string
          mapping_config: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          launch_id: string
          mapping_config: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          launch_id?: string
          mapping_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: true
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          created_at: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: number
          payload?: Json | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string | null
          details: string | null
          id: number
          launch_id: string | null
          lead_email: string | null
          step_description: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: number
          launch_id?: string | null
          lead_email?: string | null
          step_description?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: number
          launch_id?: string | null
          lead_email?: string | null
          step_description?: string | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          associated_survey_ids: string[] | null
          cor: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          eventos: Json | null
          id: string
          modified_at: string | null
          nome: string
          status: string
        }
        Insert: {
          associated_survey_ids?: string[] | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          eventos?: Json | null
          id?: string
          modified_at?: string | null
          nome: string
          status?: string
        }
        Update: {
          associated_survey_ids?: string[] | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          eventos?: Json | null
          id?: string
          modified_at?: string | null
          nome?: string
          status?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          check_in_at: string | null
          created_at: string | null
          email: string
          id: string
          is_avulso: boolean | null
          is_buyer: boolean | null
          launch_id: string | null
          mql_score: number | null
          nome: string | null
          score: number | null
          score_comprador: number | null
          telefone: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          check_in_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_avulso?: boolean | null
          is_buyer?: boolean | null
          launch_id?: string | null
          mql_score?: number | null
          nome?: string | null
          score?: number | null
          score_comprador?: number | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          check_in_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_avulso?: boolean | null
          is_buyer?: boolean | null
          launch_id?: string | null
          mql_score?: number | null
          nome?: string | null
          score?: number | null
          score_comprador?: number | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      page_variants: {
        Row: {
          body_text: string | null
          button_text: string | null
          created_at: string | null
          headline: string | null
          id: string
          image_url: string | null
          launch_id: string
          name: string
          slug: string | null
          status: string | null
          sub_headline: string | null
        }
        Insert: {
          body_text?: string | null
          button_text?: string | null
          created_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          launch_id: string
          name: string
          slug?: string | null
          status?: string | null
          sub_headline?: string | null
        }
        Update: {
          body_text?: string | null
          button_text?: string | null
          created_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          launch_id?: string
          name?: string
          slug?: string | null
          status?: string | null
          sub_headline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_variants_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          classe: string | null
          created_at: string | null
          id: string
          is_mql: boolean | null
          modified_at: string | null
          opcoes: Json | null
          texto: string
          tipo: string
        }
        Insert: {
          classe?: string | null
          created_at?: string | null
          id?: string
          is_mql?: boolean | null
          modified_at?: string | null
          opcoes?: Json | null
          texto: string
          tipo: string
        }
        Update: {
          classe?: string | null
          created_at?: string | null
          id?: string
          is_mql?: boolean | null
          modified_at?: string | null
          opcoes?: Json | null
          texto?: string
          tipo?: string
        }
        Relationships: []
      }
      pesquisas: {
        Row: {
          categoria_pesquisa: string | null
          created_at: string | null
          id: string
          modified_at: string | null
          nome: string
          status: string
        }
        Insert: {
          categoria_pesquisa?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          nome: string
          status?: string
        }
        Update: {
          categoria_pesquisa?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          nome?: string
          status?: string
        }
        Relationships: []
      }
      pesquisas_perguntas: {
        Row: {
          pergunta_id: string
          pesquisa_id: string
        }
        Insert: {
          pergunta_id: string
          pesquisa_id: string
        }
        Update: {
          pergunta_id?: string
          pesquisa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_perguntas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      respostas_leads: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          respostas: Json | null
          respostas_comprador: Json | null
          respostas_perfil: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          respostas?: Json | null
          respostas_comprador?: Json | null
          respostas_perfil?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          respostas?: Json | null
          respostas_comprador?: Json | null
          respostas_perfil?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads_com_tipo_trafego"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_aliases: {
        Row: {
          created_at: string | null
          display_name: string
          id: number
          raw_value: string
          utm_type: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: never
          raw_value: string
          utm_type: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: never
          raw_value?: string
          utm_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      leads_com_tipo_trafego: {
        Row: {
          check_in_at: string | null
          created_at: string | null
          email: string | null
          id: string | null
          launch_id: string | null
          nome: string | null
          score: number | null
          telefone: string | null
          tipo_trafego: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          check_in_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          launch_id?: string | null
          nome?: string | null
          score?: number | null
          telefone?: string | null
          tipo_trafego?: never
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          check_in_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          launch_id?: string | null
          nome?: string | null
          score?: number | null
          telefone?: string | null
          tipo_trafego?: never
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      associate_survey_to_launch: {
        Args: { p_launch_id: string; p_survey_id: string }
        Returns: undefined
      }
      atualizar_peso_resposta: {
        Args: {
          p_novo_peso: number
          p_pergunta_id: number
          p_texto_resposta: string
        }
        Returns: undefined
      }
      auditar_score_lead: {
        Args: { p_email: string }
        Returns: {
          pergunta: string
          pontos: number
          resposta_dada: string
        }[]
      }
      auditar_score_lead_por_lancamento: {
        Args: { p_email: string; p_launch_id: string }
        Returns: {
          pergunta: string
          pontos: number
          resposta_dada: string
        }[]
      }
      bulk_insert_leads: {
        Args: { p_leads_data: Json }
        Returns: Json
      }
      bulk_process_checkin_csv: {
        Args: { p_csv_content: string; p_launch_id: string }
        Returns: Json
      }
      bulk_process_survey_results: {
        Args: { p_launch_id: string; p_survey_data: Json }
        Returns: undefined
      }
      calcular_mql_score_lancamento: {
        Args: { p_launch_id: string }
        Returns: string
      }
      calcular_score_lancamento: {
        Args: { p_launch_id: string }
        Returns: string
      }
      clear_leads_from_launch: {
        Args: { p_launch_id: string }
        Returns: number
      }
      delete_leads_by_launch: {
        Args: { p_launch_id: string }
        Returns: undefined
      }
      diagnosticar_calculo_em_lote: {
        Args: { p_launch_id: string }
        Returns: {
          lead_id_debug: string
          mql_score_calculado: number
        }[]
      }
      diagnosticar_calculo_geral: {
        Args: { p_launch_id: string }
        Returns: {
          lead_id_debug: string
          mql_score_calculado: number
          respostas_encontradas: Json
        }[]
      }
      diagnosticar_calculo_mql: {
        Args: { p_lead_email: string }
        Returns: {
          detalhe: string
          passo: string
          resultado: string
        }[]
      }
      export_leads_by_mql_category: {
        Args: { p_launch_id: string; p_mql_category: string }
        Returns: {
          email: string
          mql_score: number
          nome: string
          telefone: string
        }[]
      }
      export_leads_by_score: {
        Args: { p_launch_id: string; p_score_category: string }
        Returns: {
          check_in_at: string
          created_at: string
          email: string
          nome: string
          score: number
          telefone: string
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
          utm_term: string
        }[]
      }
      exportar_leads_com_respostas: {
        Args: { p_launch_id: string; p_score_category: string }
        Returns: {
          atua_outra_forma: string
          conhece_metodologia_neuro: string
          data_inscricao: string
          data_resposta: string
          desempregada: string
          dificuldade_di: string
          dificuldade_geral: string
          dificuldade_outros: string
          dificuldade_tdah: string
          dificuldade_tea: string
          dificuldade_tipos: string
          email: string
          estado: string
          forma_pagamento_frequente: string
          idade: string
          ja_comprou_cursos: string
          mae_de_pcd: string
          maior_dificuldade_alfabetizacao: string
          maior_sonho_profissional: string
          o_que_espera_aprender: string
          renda_mensal: string
          score: number
          sem_dificuldade: string
          tempo_conhece_professora: string
          trabalha_clinico: string
          trabalha_em: string
          trabalha_escola_particular: string
          trabalha_escola_publica_conc: string
          trabalha_escola_publica_temp: string
          trabalha_reforco: string
          utm_source: string
          voce_e: string
          whatsapp: string
        }[]
      }
      exportar_perfil_csv: {
        Args: {
          p_launch_id: string
          p_score_category: string
          p_score_type: string
        }
        Returns: string
      }
      get_active_launch: {
        Args: Record<PropertyKey, never>
        Returns: {
          launch_id: string
        }[]
      }
      get_all_users_with_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          full_name: string
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      get_analise_compradores_dashboard: {
        Args:
          | { p_launch_id: string }
          | { p_launch_id: string; p_score_tier?: string }
        Returns: Json
      }
      get_answer_analysis: {
        Args: { p_filter_by_buyers: boolean; p_launch_id: string }
        Returns: Json
      }
      get_campaign_hourly_analysis: {
        Args: {
          p_launch_id: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: Json
      }
      get_channel_details_data: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_channel_evolution_data: {
        Args: {
          p_end_date: string
          p_launch_id: string
          p_start_date: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: Json
      }
      get_channel_kpis: {
        Args: { p_launch_id: string }
        Returns: {
          checkins_avulsos: number
          total_checkins: number
          total_inscricoes: number
        }[]
      }
      get_channel_summary: {
        Args: { p_launch_id: string }
        Returns: {
          checkins: number
          inscritos: number
          taxa_conversao: number
          utm_content: string
          utm_medium: string
        }[]
      }
      get_channel_summary_data: {
        Args: { p_group_by: string; p_launch_id: string }
        Returns: Json
      }
      get_channel_tracking_dashboard: {
        Args: { p_group_by_utm: string; p_launch_id: string }
        Returns: Json
      }
      get_channel_tracking_data: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_daily_evolution: {
        Args: { p_launch_id: string }
        Returns: {
          checkins_count: number
          dia: string
          inscricoes_count: number
        }[]
      }
      get_daily_summary: {
        Args: { p_launch_id: string }
        Returns: {
          checkins: number
          full_date: string
          inscricoes: number
          short_date: string
        }[]
      }
      get_dashboard_compradores_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_dashboard_detalhes_canais: {
        Args: { launch_id_param: string }
        Returns: {
          detalhes: Json
          tipo_trafego: string
          total_checkins: number
          total_inscricoes: number
        }[]
      }
      get_dashboard_evolucao_canal: {
        Args: {
          p_end_datetime: string
          p_launch_id: string
          p_start_datetime: string
        }
        Returns: Json
      }
      get_evolucao_canal_data: {
        Args: {
          p_launch_id: string
          p_period_label: string
          p_utm_content?: string
        }
        Returns: Json
      }
      get_evolution_dashboard_data: {
        Args: {
          p_end_date: string
          p_launch_id: string
          p_start_date: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: Json
      }
      get_filtered_channel_data: {
        Args: { p_filters: Json; p_launch_id: string }
        Returns: {
          conversion_rate: number
          total_checkins: number
          total_inscriptions: number
        }[]
      }
      get_filtros_campanha: {
        Args: { launch_id_param: string }
        Returns: Json
      }
      get_final_position_dashboard: {
        Args:
          | { p_group_by: string; p_launch_id: string }
          | { p_launch_id: string }
        Returns: Json
      }
      get_final_position_kpis: {
        Args: { p_filters: Json; p_launch_id: string }
        Returns: {
          conversion_rate: number
          total_buyers: number
          total_checkins: number
          total_inscriptions: number
        }[]
      }
      get_full_lead_scoring_dashboard: {
        Args:
          | { p_group_by: string; p_launch_id: string }
          | { p_launch_id: string }
        Returns: Json
      }
      get_full_performance_dashboard: {
        Args: {
          p_end_datetime: string
          p_group_by: string
          p_launch_id: string
          p_start_datetime: string
        }
        Returns: Json
      }
      get_full_survey_analysis: {
        Args: { p_filter_by_buyers: boolean; p_launch_id: string }
        Returns: {
          answers: Json
          question_id: string
          question_text: string
        }[]
      }
      get_geral_and_buyer_kpis: {
        Args: { p_launch_id?: string }
        Returns: Json
      }
      get_hierarchical_traffic_details: {
        Args: { p_launch_id: string; p_traffic_type: string }
        Returns: Json
      }
      get_hourly_performance: {
        Args:
          | {
              p_end_datetime: string
              p_launch_id: string
              p_start_datetime: string
            }
          | {
              p_end_datetime: string
              p_launch_id: string
              p_start_datetime: string
              p_utm_content?: string
            }
        Returns: Json
      }
      get_hourly_utm_breakdown: {
        Args: { p_launch_id: string; p_utm_type: string }
        Returns: Json
      }
      get_kpis_campanha: {
        Args: { launch_id_param: string }
        Returns: Json
      }
      get_kpis_for_launch: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_lancamentos_ordenados: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          nome: string
          status: string
        }[]
      }
      get_launches_for_dropdown: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          nome: string
          status: string
        }[]
      }
      get_lead_scoring_data: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_leads_for_score_analysis: {
        Args: { p_launch_id: string }
        Returns: {
          score: number
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
        }[]
      }
      get_leads_para_detalhamento: {
        Args: { launch_id_param: string; p_limit: number; p_offset: number }
        Returns: {
          check_in_at: string
          created_at: string
          email: string
          nome: string
          score: number
          telefone: string
          tipo_trafego: string
          utm_content: string
          utm_medium: string
          utm_source: string
        }[]
      }
      get_mql_answers_by_category: {
        Args: { p_launch_id: string; p_mql_category: string }
        Returns: {
          answers: Json
          question_id: string
          question_text: string
        }[]
      }
      get_mql_category_totals: {
        Args: { p_launch_id: string }
        Returns: {
          a: number
          b: number
          c: number
          d: number
        }[]
      }
      get_organic_mql_breakdown_by_medium: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_organic_score_breakdown_by_medium: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_organic_traffic_by_medium: {
        Args: { p_launch_id: string }
        Returns: {
          total_checkins: number
          total_leads: number
          utm_medium: string
        }[]
      }
      get_paid_mql_breakdown_by_content: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_paid_score_breakdown_by_content: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_paid_traffic_by_content: {
        Args: { p_launch_id: string }
        Returns: {
          total_leads: number
          utm_content: string
        }[]
      }
      get_performance_campanha: {
        Args: {
          campaign_filter?: string
          launch_id_param: string
          term_filter?: string
        }
        Returns: {
          checkins: number
          inscritos: number
          utm_campaign: string
          utm_term: string
        }[]
      }
      get_performance_canais_data: {
        Args: {
          p_launch_id: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: Json
      }
      get_performance_dashboard_data: {
        Args: {
          p_end_datetime: string
          p_launch_id: string
          p_start_datetime: string
        }
        Returns: Json
      }
      get_performance_data: {
        Args:
          | { end_date: string; p_launch_id?: string; start_date: string }
          | { end_date: string; start_date: string }
          | { p_end_date: string; p_launch_id: string; p_start_date: string }
        Returns: Json
      }
      get_performance_por_canal: {
        Args: { p_launch_id: string }
        Returns: {
          canal: string
          checkins: number
          inscritos: number
          midia: string
        }[]
      }
      get_resumo_diario_dashboard: {
        Args: { launch_id_param: string }
        Returns: Json
      }
      get_sales_dashboard_data: {
        Args: { launch_id_param?: string }
        Returns: Json
      }
      get_score_category_totals: {
        Args: { p_launch_id: string }
        Returns: {
          frio: number
          morno: number
          morno_frio: number
          quente: number
          quente_morno: number
        }[]
      }
      get_score_composition_dashboard: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_score_details_by_category: {
        Args: { p_launch_id: string; p_score_category: string }
        Returns: {
          answers: Json
          question_id: string
          question_text: string
        }[]
      }
      get_score_profile_analysis: {
        Args: { p_filter_by_buyers?: boolean; p_launch_id?: string }
        Returns: Json
      }
      get_score_profile_by_answers: {
        Args: { p_launch_id: string; p_score_category: string }
        Returns: {
          answers: Json
          question_id: string
          question_text: string
        }[]
      }
      get_survey_id_for_launch: {
        Args: { p_launch_id: string }
        Returns: string
      }
      get_tracking_kpis: {
        Args: { p_launch_id: string }
        Returns: {
          organic_checkins: number
          organic_leads: number
          paid_checkins: number
          paid_leads: number
          total_checkins: number
          total_leads: number
          untracked_checkins: number
          untracked_leads: number
        }[]
      }
      get_utm_campaigns: {
        Args: { p_launch_id: string; p_medium: string; p_source: string }
        Returns: {
          utm_campaign: string
        }[]
      }
      get_utm_contents: {
        Args: {
          p_campaign: string
          p_launch_id: string
          p_medium: string
          p_source: string
        }
        Returns: {
          utm_content: string
        }[]
      }
      get_utm_mediums: {
        Args: { p_launch_id: string; p_source: string }
        Returns: {
          utm_medium: string
        }[]
      }
      get_utm_options_for_level: {
        Args: { p_filters: Json; p_launch_id: string; p_level: string }
        Returns: {
          option: string
        }[]
      }
      get_utm_sources: {
        Args: { p_launch_id: string }
        Returns: {
          utm_source: string
        }[]
      }
      get_utm_terms: {
        Args: {
          p_campaign: string
          p_content: string
          p_launch_id: string
          p_medium: string
          p_source: string
        }
        Returns: {
          utm_term: string
        }[]
      }
      import_page_process_checkin: {
        Args: { p_launch_id: string; p_survey_data: Json }
        Returns: undefined
      }
      import_profile_answers_only: {
        Args: { p_launch_id: string; p_payload: Json }
        Returns: Json
      }
      mark_leads_as_buyers: {
        Args: { p_buyer_emails: string[]; p_launch_id: string }
        Returns: number
      }
      process_buyers_for_launch: {
        Args: { p_buyer_emails: string[]; p_launch_id: string }
        Returns: Json
      }
      process_profile_only_import: {
        Args: { p_launch_id: string; p_payload: Json }
        Returns: Json
      }
      process_profile_survey_upload: {
        Args: { p_launch_id: string; p_survey_data: Json }
        Returns: Json
      }
      processar_apenas_perfil: {
        Args: { p_email: string; p_launch_id: string; p_respostas_raw: Json }
        Returns: Json
      }
      processar_importacao_checkin: {
        Args: { p_payload: Json }
        Returns: Json
      }
      processar_linha_csv: {
        Args: {
          p_check_in_at: string
          p_email: string
          p_launch_id: string
          p_respostas_raw: Json
        }
        Returns: string
      }
      propor_novos_pesos_respostas: {
        Args: { p_escala_maxima_pontos?: number; p_launch_id: string }
        Returns: {
          indice_impacto: number
          pergunta_id: number
          peso_proposto: number
          resposta_dada: string
          texto_pergunta: string
        }[]
      }
      refresh_launch_dates: {
        Args: { p_launch_id: string }
        Returns: string
      }
      refresh_lead_dates_for_launch: {
        Args: { p_launch_id: string }
        Returns: number
      }
      register_new_questions_from_headers: {
        Args: { p_question_headers: string[] } | { p_question_headers: Json }
        Returns: undefined
      }
      reset_buyers_for_launch: {
        Args: { p_launch_id: string }
        Returns: undefined
      }
      reset_checkin_data_for_launch: {
        Args: { p_launch_id: string }
        Returns: number
      }
      safe_cast_to_int: {
        Args: { default_value?: number; text_value: string }
        Returns: number
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      update_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
