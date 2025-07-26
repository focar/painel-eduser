export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      lancamentos: {
        Row: {
          associated_survey_ids: string[] | null
          cor: string | null
          created_at: string | null
          data_fim: string
          data_inicio: string
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
          data_fim: string
          data_inicio: string
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
          data_fim?: string
          data_inicio?: string
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
          nome: string | null
          score: number | null
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
          nome?: string | null
          score?: number | null
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
          nome?: string | null
          score?: number | null
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
          created_at: string | null
          id: string
          modified_at: string | null
          opcoes: Json | null
          texto: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          modified_at?: string | null
          opcoes?: Json | null
          texto: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
      respostas_leads: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          respostas: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          respostas?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          respostas?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
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
      [_ in never]: never
    }
    Functions: {
      associate_survey_to_launch: {
        Args: { p_launch_id: string; p_survey_id: string }
        Returns: undefined
      }
      atualizar_peso_resposta: {
        Args: {
          p_pergunta_id: number
          p_texto_resposta: string
          p_novo_peso: number
        }
        Returns: undefined
      }
      bulk_insert_leads: {
        Args: { p_leads_data: Json }
        Returns: undefined
      }
      bulk_process_survey_results: {
        Args: { p_survey_data: Json; p_launch_id: string }
        Returns: undefined
      }
      clear_leads_from_launch: {
        Args: { p_launch_id: string }
        Returns: number
      }
      delete_leads_by_launch: {
        Args: { p_launch_id: string }
        Returns: undefined
      }
      get_active_launch: {
        Args: Record<PropertyKey, never>
        Returns: {
          launch_id: string
        }[]
      }
      get_answer_breakdown_by_score: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_answer_counts_for_launch: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_channel_details_data: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_channel_kpis: {
        Args: { p_launch_id: string }
        Returns: {
          total_inscricoes: number
          total_checkins: number
          checkins_avulsos: number
        }[]
      }
      get_channel_summary: {
        Args: { p_launch_id: string }
        Returns: {
          utm_content: string
          utm_medium: string
          inscritos: number
          checkins: number
          taxa_conversao: number
        }[]
      }
      get_channel_summary_data: {
        Args: { p_launch_id: string; p_group_by: string }
        Returns: Json
      }
      get_channel_tracking_dashboard: {
        Args: { p_launch_id: string; p_group_by_utm: string }
        Returns: Json
      }
      get_channel_tracking_data: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_daily_evolution: {
        Args: { p_launch_id: string }
        Returns: {
          dia: string
          inscricoes_count: number
          checkins_count: number
        }[]
      }
      get_daily_summary: {
        Args: { p_launch_id: string }
        Returns: {
          full_date: string
          short_date: string
          inscricoes: number
          checkins: number
        }[]
      }
      get_dashboard_evolucao_canal: {
        Args: {
          p_launch_id: string
          p_start_datetime: string
          p_end_datetime: string
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
      get_filtered_channel_data: {
        Args: { p_launch_id: string; p_filters: Json }
        Returns: {
          total_inscriptions: number
          total_checkins: number
          conversion_rate: number
        }[]
      }
      get_final_position_dashboard: {
        Args:
          | { p_launch_id: string }
          | { p_launch_id: string; p_group_by: string }
        Returns: Json
      }
      get_final_position_kpis: {
        Args: { p_launch_id: string; p_filters: Json }
        Returns: {
          total_inscriptions: number
          total_checkins: number
          total_buyers: number
          conversion_rate: number
        }[]
      }
      get_full_lead_scoring_dashboard: {
        Args:
          | { p_launch_id: string }
          | { p_launch_id: string; p_group_by: string }
        Returns: Json
      }
      get_full_performance_dashboard: {
        Args: {
          p_launch_id: string
          p_start_datetime: string
          p_end_datetime: string
          p_group_by: string
        }
        Returns: Json
      }
      get_hierarchical_traffic_details: {
        Args: { p_launch_id: string; p_traffic_type: string }
        Returns: Json
      }
      get_hourly_performance: {
        Args:
          | {
              p_launch_id: string
              p_start_datetime: string
              p_end_datetime: string
            }
          | {
              p_launch_id: string
              p_start_datetime: string
              p_end_datetime: string
              p_utm_content?: string
            }
        Returns: Json
      }
      get_hourly_utm_breakdown: {
        Args: { p_launch_id: string; p_utm_type: string }
        Returns: Json
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
      get_performance_dashboard_data: {
        Args: {
          p_launch_id: string
          p_start_datetime: string
          p_end_datetime: string
        }
        Returns: Json
      }
      get_performance_data: {
        Args:
          | { p_launch_id: string; p_start_date: string; p_end_date: string }
          | { start_date: string; end_date: string }
          | { start_date: string; end_date: string; p_launch_id?: string }
        Returns: Json
      }
      get_performance_por_canal: {
        Args: { p_launch_id: string }
        Returns: {
          canal: string
          midia: string
          inscritos: number
          checkins: number
        }[]
      }
      get_sales_dashboard_data: {
        Args: { launch_id_param?: string }
        Returns: Json
      }
      get_score_category_totals: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_score_composition_dashboard: {
        Args: { p_launch_id: string }
        Returns: Json
      }
      get_score_profile_by_answers: {
        Args: { p_launch_id: string; p_score_category: string }
        Returns: Json
      }
      get_survey_id_for_launch: {
        Args: { p_launch_id: string }
        Returns: string
      }
      get_utm_options_for_level: {
        Args: { p_launch_id: string; p_level: string; p_filters: Json }
        Returns: {
          option: string
        }[]
      }
      mark_leads_as_buyers: {
        Args: { p_launch_id: string; p_buyer_emails: string[] }
        Returns: number
      }
      propor_novos_pesos_respostas: {
        Args: { p_launch_id: string; p_escala_maxima_pontos?: number }
        Returns: {
          pergunta_id: number
          texto_pergunta: string
          resposta_dada: string
          indice_impacto: number
          peso_proposto: number
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
