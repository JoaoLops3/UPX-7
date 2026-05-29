export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      admins: {
        Row: {
          ativo: boolean;
          criado_em: string;
          email: string;
          id: string;
          nome: string;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          email: string;
          id?: string;
          nome: string;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          email?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      alugueis: {
        Row: {
          aluno_id: string | null;
          com_extra: boolean | null;
          extras: string[];
          fim_previsto: string;
          fim_real: string | null;
          id: string;
          inicio: string | null;
          item_id: string | null;
          status: string | null;
          via_totem: boolean;
        };
        Insert: {
          aluno_id?: string | null;
          com_extra?: boolean | null;
          extras?: string[];
          fim_previsto: string;
          fim_real?: string | null;
          id?: string;
          inicio?: string | null;
          item_id?: string | null;
          status?: string | null;
          via_totem?: boolean;
        };
        Update: {
          aluno_id?: string | null;
          com_extra?: boolean | null;
          extras?: string[];
          fim_previsto?: string;
          fim_real?: string | null;
          id?: string;
          inicio?: string | null;
          item_id?: string | null;
          status?: string | null;
          via_totem?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'alugueis_aluno_id_fkey';
            columns: ['aluno_id'];
            isOneToOne: false;
            referencedRelation: 'alunos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alugueis_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'itens';
            referencedColumns: ['id'];
          },
        ];
      };
      alunos: {
        Row: {
          ativo: boolean | null;
          criado_em: string | null;
          email: string;
          id: string;
          nome: string;
          ra: string;
          uid_nfc: string | null;
        };
        Insert: {
          ativo?: boolean | null;
          criado_em?: string | null;
          email: string;
          id?: string;
          nome: string;
          ra: string;
          uid_nfc?: string | null;
        };
        Update: {
          ativo?: boolean | null;
          criado_em?: string | null;
          email?: string;
          id?: string;
          nome?: string;
          ra?: string;
          uid_nfc?: string | null;
        };
        Relationships: [];
      };
      itens: {
        Row: {
          disponivel: boolean | null;
          id: string;
          localizacao: string | null;
          nome: string;
          numero: number | null;
          permite_extras: boolean | null;
          tipo: string | null;
          uid_totem: string;
        };
        Insert: {
          disponivel?: boolean | null;
          id?: string;
          localizacao?: string | null;
          nome: string;
          numero?: number | null;
          permite_extras?: boolean | null;
          tipo?: string | null;
          uid_totem: string;
        };
        Update: {
          disponivel?: boolean | null;
          id?: string;
          localizacao?: string | null;
          nome?: string;
          numero?: number | null;
          permite_extras?: boolean | null;
          tipo?: string | null;
          uid_totem?: string;
        };
        Relationships: [];
      };
      logs_nfc: {
        Row: {
          acao: string | null;
          id: string;
          lido_em: string | null;
          sucesso: boolean | null;
          uid_cartao: string;
          uid_totem: string;
        };
        Insert: {
          acao?: string | null;
          id?: string;
          lido_em?: string | null;
          sucesso?: boolean | null;
          uid_cartao: string;
          uid_totem: string;
        };
        Update: {
          acao?: string | null;
          id?: string;
          lido_em?: string | null;
          sucesso?: boolean | null;
          uid_cartao?: string;
          uid_totem?: string;
        };
        Relationships: [];
      };
      multas: {
        Row: {
          aluguel_id: string | null;
          aluno_id: string | null;
          dias_atraso: number;
          gerada_em: string | null;
          id: string;
          pago_em: string | null;
          status: string | null;
          valor: number;
        };
        Insert: {
          aluguel_id?: string | null;
          aluno_id?: string | null;
          dias_atraso: number;
          gerada_em?: string | null;
          id?: string;
          pago_em?: string | null;
          status?: string | null;
          valor: number;
        };
        Update: {
          aluguel_id?: string | null;
          aluno_id?: string | null;
          dias_atraso?: number;
          gerada_em?: string | null;
          id?: string;
          pago_em?: string | null;
          status?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'multas_aluguel_id_fkey';
            columns: ['aluguel_id'];
            isOneToOne: false;
            referencedRelation: 'alugueis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'multas_aluno_id_fkey';
            columns: ['aluno_id'];
            isOneToOne: false;
            referencedRelation: 'alunos';
            referencedColumns: ['id'];
          },
        ];
      };
      totens: {
        Row: {
          ativo: boolean;
          criado_em: string;
          email: string;
          id: string;
          nome: string | null;
          uid_totem: string | null;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          email: string;
          id?: string;
          nome?: string | null;
          uid_totem?: string | null;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          email?: string;
          id?: string;
          nome?: string | null;
          uid_totem?: string | null;
        };
        Relationships: [];
      };
      totem_sessoes_qr: {
        Row: {
          aluno_id: string | null;
          criado_em: string;
          expira_em: string;
          id: string;
          identificado_em: string | null;
          status: string;
          token: string;
          uid_totem: string;
        };
        Insert: {
          aluno_id?: string | null;
          criado_em?: string;
          expira_em: string;
          id?: string;
          identificado_em?: string | null;
          status?: string;
          token: string;
          uid_totem: string;
        };
        Update: {
          aluno_id?: string | null;
          criado_em?: string;
          expira_em?: string;
          id?: string;
          identificado_em?: string | null;
          status?: string;
          token?: string;
          uid_totem?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      encerrar_quadras_expiradas: { Args: Record<PropertyKey, never>; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_totem: { Args: Record<PropertyKey, never>; Returns: boolean };
      lookup_aluno_email_for_login: { Args: { p_ra: string }; Returns: string };
      totem_alugar_guarda_chuva: { Args: { p_aluno_id: string }; Returns: Json };
      totem_aluno_nome: { Args: { p_uid: string }; Returns: string };
      totem_aluno_por_id: { Args: { p_aluno_id: string }; Returns: Json };
      totem_aluno_por_uid: { Args: { p_uid: string }; Returns: Json };
      totem_checkin_quadra: { Args: { p_aluno_id: string }; Returns: Json };
      totem_confirmar_sessao_qr: {
        Args: { p_sessao_id: string; p_token: string };
        Returns: Json;
      };
      totem_criar_sessao_qr: { Args: Record<PropertyKey, never>; Returns: Json };
      totem_devolver: {
        Args: { p_aluguel_id?: string; p_aluno_id: string };
        Returns: Json;
      };
      totem_status_aluno: { Args: { p_aluno_id: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
