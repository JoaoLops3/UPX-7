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
      alugueis: {
        Row: {
          aluno_id: string | null;
          com_extra: boolean | null;
          fim_previsto: string;
          fim_real: string | null;
          id: string;
          inicio: string | null;
          item_id: string | null;
          status: string | null;
        };
        Insert: {
          aluno_id?: string | null;
          com_extra?: boolean | null;
          fim_previsto: string;
          fim_real?: string | null;
          id?: string;
          inicio?: string | null;
          item_id?: string | null;
          status?: string | null;
        };
        Update: {
          aluno_id?: string | null;
          com_extra?: boolean | null;
          fim_previsto?: string;
          fim_real?: string | null;
          id?: string;
          inicio?: string | null;
          item_id?: string | null;
          status?: string | null;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
