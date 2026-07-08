export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          created_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          papel: 'admin' | 'cliente'
          cliente_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          papel?: 'admin' | 'cliente'
          cliente_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          papel?: 'admin' | 'cliente'
          cliente_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usuarios_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          }
        ]
      }
      calendarios: {
        Row: {
          id: string
          cliente_id: string
          titulo: string
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          titulo: string
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          titulo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendarios_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          }
        ]
      }
      entradas: {
        Row: {
          id: string
          calendario_id: string
          numero: number
          data_post: string
          hora_prevista: string
          plataforma: string | null
          pilar: string | null
          tema: string | null
          objetivo: string | null
          formato: string | null
          gancho: string | null
          legenda: string | null
          cta: string | null
          compliance: string | null
          status: 'planejado' | 'alterado' | 'publicado'
          imagens: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendario_id: string
          numero: number
          data_post: string
          hora_prevista: string
          plataforma?: string | null
          pilar?: string | null
          tema?: string | null
          objetivo?: string | null
          formato?: string | null
          gancho?: string | null
          legenda?: string | null
          cta?: string | null
          compliance?: string | null
          status?: 'planejado' | 'alterado' | 'publicado'
          imagens?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendario_id?: string
          numero?: number
          data_post?: string
          hora_prevista?: string
          plataforma?: string | null
          pilar?: string | null
          tema?: string | null
          objetivo?: string | null
          formato?: string | null
          gancho?: string | null
          legenda?: string | null
          cta?: string | null
          compliance?: string | null
          status?: 'planejado' | 'alterado' | 'publicado'
          imagens?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entradas_calendario_id_fkey'
            columns: ['calendario_id']
            isOneToOne: false
            referencedRelation: 'calendarios'
            referencedColumns: ['id']
          }
        ]
      }
      alteracoes: {
        Row: {
          id: string
          entrada_id: string
          usuario_id: string
          diff: Record<string, { de: unknown; para: unknown }>
          criado_em: string
        }
        Insert: {
          id?: string
          entrada_id: string
          usuario_id: string
          diff: Record<string, { de: unknown; para: unknown }>
          criado_em?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'alteracoes_entrada_id_fkey'
            columns: ['entrada_id']
            isOneToOne: false
            referencedRelation: 'entradas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'alteracoes_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          }
        ]
      }
      notificacoes: {
        Row: {
          id: string
          alteracao_id: string
          canal: string
          estado: 'pendente' | 'enviada' | 'falha' | 'falha_definitiva'
          tentativas: number
          enviado_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alteracao_id: string
          canal?: string
          estado?: 'pendente' | 'enviada' | 'falha' | 'falha_definitiva'
          tentativas?: number
          enviado_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alteracao_id?: string
          canal?: string
          estado?: 'pendente' | 'enviada' | 'falha' | 'falha_definitiva'
          tentativas?: number
          enviado_em?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notificacoes_alteracao_id_fkey'
            columns: ['alteracao_id']
            isOneToOne: false
            referencedRelation: 'alteracoes'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
