export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          criado_em: string
          profile_id: string
        }
        Insert: {
          criado_em?: string
          profile_id: string
        }
        Update: {
          criado_em?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          concluido_em: string | null
          concluido_por: string | null
          conversation_id: string
          created_at: string
          data_servico: string
          id: string
          status: Database["public"]["Enums"]["status_booking"]
          updated_at: string
          valor_combinado_centavos: number
        }
        Insert: {
          concluido_em?: string | null
          concluido_por?: string | null
          conversation_id: string
          created_at?: string
          data_servico: string
          id?: string
          status?: Database["public"]["Enums"]["status_booking"]
          updated_at?: string
          valor_combinado_centavos: number
        }
        Update: {
          concluido_em?: string | null
          concluido_por?: string | null
          conversation_id?: string
          created_at?: string
          data_servico?: string
          id?: string
          status?: Database["public"]["Enums"]["status_booking"]
          updated_at?: string
          valor_combinado_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      boosts: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          payment_id: string | null
          status: Database["public"]["Enums"]["status_boost"]
          valor_centavos: number
          worker_profile_id: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["status_boost"]
          valor_centavos: number
          worker_profile_id: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["status_boost"]
          valor_centavos?: number
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boosts_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      busca_avisos: {
        Row: {
          categoria_slug: string | null
          criado_em: string
          email: string
          id: string
          lat: number
          lon: number
        }
        Insert: {
          categoria_slug?: string | null
          criado_em?: string
          email: string
          id?: string
          lat: number
          lon: number
        }
        Update: {
          categoria_slug?: string | null
          criado_em?: string
          email?: string
          id?: string
          lat?: number
          lon?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          briefing: Json
          client_id: string
          created_at: string
          id: string
          worker_profile_id: string
        }
        Insert: {
          briefing?: Json
          client_id: string
          created_at?: string
          id?: string
          worker_profile_id: string
        }
        Update: {
          briefing?: Json
          client_id?: string
          created_at?: string
          id?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          id: string
          pago_em: string | null
          profile_id: string
          provedor: string | null
          provedor_id: string | null
          status: Database["public"]["Enums"]["status_pagamento"]
          tipo: Database["public"]["Enums"]["tipo_pagamento"]
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          id?: string
          pago_em?: string | null
          profile_id: string
          provedor?: string | null
          provedor_id?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          tipo: Database["public"]["Enums"]["tipo_pagamento"]
          valor_centavos: number
        }
        Update: {
          created_at?: string
          id?: string
          pago_em?: string | null
          profile_id?: string
          provedor?: string | null
          provedor_id?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          tipo?: Database["public"]["Enums"]["tipo_pagamento"]
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_perfil"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nome: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_perfil"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_perfil"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          autor_id: string
          booking_id: string
          comentario: string | null
          created_at: string
          denunciada: boolean
          id: string
          nota: number
        }
        Insert: {
          autor_id: string
          booking_id: string
          comentario?: string | null
          created_at?: string
          denunciada?: boolean
          id?: string
          nota: number
        }
        Update: {
          autor_id?: string
          booking_id?: string
          comentario?: string | null
          created_at?: string
          denunciada?: boolean
          id?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          categoria_slug: string | null
          criado_em: string
          id: string
          lat: number
          lon: number
          numero_resultados: number
          raio_maximo_km: number | null
          usuario_id: string | null
        }
        Insert: {
          categoria_slug?: string | null
          criado_em?: string
          id?: string
          lat: number
          lon: number
          numero_resultados: number
          raio_maximo_km?: number | null
          usuario_id?: string | null
        }
        Update: {
          categoria_slug?: string | null
          criado_em?: string
          id?: string
          lat?: number
          lon?: number
          numero_resultados?: number
          raio_maximo_km?: number | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string
          documento_url: string | null
          id: string
          observacao: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: Database["public"]["Enums"]["status_verificacao"]
          tipo_documento: string | null
          validade: string | null
          worker_profile_id: string
        }
        Insert: {
          created_at?: string
          documento_url?: string | null
          id?: string
          observacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["status_verificacao"]
          tipo_documento?: string | null
          validade?: string | null
          worker_profile_id: string
        }
        Update: {
          created_at?: string
          documento_url?: string | null
          id?: string
          observacao?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["status_verificacao"]
          tipo_documento?: string | null
          validade?: string | null
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_categories: {
        Row: {
          category_id: string
          worker_profile_id: string
        }
        Insert: {
          category_id: string
          worker_profile_id: string
        }
        Update: {
          category_id?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_categories_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          ativo: boolean
          bairro: string | null
          cidade: string | null
          created_at: string
          descricao: string | null
          id: string
          location: unknown
          preco_medio_centavos: number | null
          profile_id: string
          raio_atendimento_km: number
          uf: string | null
          unidade_preco: Database["public"]["Enums"]["unidade_preco"] | null
          updated_at: string
          verificado_ate: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          location?: unknown
          preco_medio_centavos?: number | null
          profile_id: string
          raio_atendimento_km?: number
          uf?: string | null
          unidade_preco?: Database["public"]["Enums"]["unidade_preco"] | null
          updated_at?: string
          verificado_ate?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          location?: unknown
          preco_medio_centavos?: number | null
          profile_id?: string
          raio_atendimento_km?: number
          uf?: string | null
          unidade_preco?: Database["public"]["Enums"]["unidade_preco"] | null
          updated_at?: string
          verificado_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_profissionais: {
        Args: {
          p_categoria_slug?: string
          p_lat: number
          p_limite?: number
          p_lon: number
          p_offset?: number
          p_raio_maximo_km?: number
        }
        Returns: {
          avatar_url: string
          bairro: string
          categorias: string[]
          cidade: string
          descricao: string
          distancia_km: number
          nome: string
          preco_medio_centavos: number
          profile_id: string
          raio_atendimento_km: number
          uf: string
          unidade_preco: Database["public"]["Enums"]["unidade_preco"]
          verificado_ate: string
          worker_profile_id: string
        }[]
      }
      eh_admin: { Args: never; Returns: boolean }
      eh_cliente_da_conversa: {
        Args: { id_conversa: string }
        Returns: boolean
      }
      meu_telefone: { Args: never; Returns: string }
      participa_da_conversa: { Args: { id_conversa: string }; Returns: boolean }
      pode_avaliar: { Args: { id_booking: string }; Returns: boolean }
      telefone_do_par: { Args: { id_conversa: string }; Returns: string }
    }
    Enums: {
      status_booking: "proposto" | "aceito" | "concluido" | "cancelado"
      status_boost: "pendente" | "ativo" | "expirado" | "cancelado"
      status_pagamento: "pendente" | "pago" | "falhou" | "estornado"
      status_verificacao: "pendente" | "aprovado" | "reprovado"
      tipo_pagamento: "verificacao" | "boost" | "b2b"
      tipo_perfil: "cliente" | "profissional" | "ambos"
      unidade_preco: "hora" | "diaria" | "servico"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      status_booking: ["proposto", "aceito", "concluido", "cancelado"],
      status_boost: ["pendente", "ativo", "expirado", "cancelado"],
      status_pagamento: ["pendente", "pago", "falhou", "estornado"],
      status_verificacao: ["pendente", "aprovado", "reprovado"],
      tipo_pagamento: ["verificacao", "boost", "b2b"],
      tipo_perfil: ["cliente", "profissional", "ambos"],
      unidade_preco: ["hora", "diaria", "servico"],
    },
  },
} as const

