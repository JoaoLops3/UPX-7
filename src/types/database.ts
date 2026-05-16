import type { Tables } from './supabase.generated';

export type ItemTipo = 'quadra' | 'guarda_chuva';
export type ExtraQuadra = 'futebol' | 'volei' | 'basquete';
export type AluguelStatus = 'ativo' | 'devolvido' | 'atrasado' | 'aguardando_nfc';
export type MultaStatus = 'pendente' | 'pago';

/** Linhas do banco — geradas em supabase.generated.ts (regenerar via Supabase MCP). */
export type Aluno = Tables<'alunos'>;
export type Item = Tables<'itens'>;
type AluguelGenerated = Tables<'alugueis'>;
/** Aluguel + coluna `extras text[]` adicionada manualmente até regenerar os types. */
export type Aluguel = AluguelGenerated & { extras: ExtraQuadra[] | null };
export type Multa = Tables<'multas'>;
export type LogNFC = Tables<'logs_nfc'>;

export interface AluguelComItem extends Aluguel {
  itens: Item;
}

export interface MultaComAluguel extends Multa {
  alugueis: Aluguel & {
    itens: Pick<Item, 'nome' | 'numero'>;
  };
}
