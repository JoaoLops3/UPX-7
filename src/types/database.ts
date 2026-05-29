import type { Tables } from './supabase.generated';

export type ItemTipo = 'quadra' | 'guarda_chuva';
export type ExtraQuadra = 'futebol' | 'volei' | 'basquete';
export type AluguelStatus =
  | 'ativo'
  | 'devolvido'
  | 'atrasado'
  | 'aguardando_nfc'
  | 'agendado'
  | 'cancelado';
export type MultaStatus = 'pendente' | 'pago';

export type Admin = Tables<'admins'>;
export type Totem = Tables<'totens'>;
export type Aluno = Tables<'alunos'>;
export type Item = Tables<'itens'>;
export type Aluguel = Omit<Tables<'alugueis'>, 'extras'> & {
  extras: ExtraQuadra[] | null;
};
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
