export interface Aluno {
  id: string;
  nome: string;
  ra: string;
  email: string;
  uid_nfc: string | null;
  ativo: boolean;
}

export type ItemTipo = 'quadra' | 'guarda_chuva';
export type AluguelStatus = 'ativo' | 'devolvido' | 'atrasado';
export type MultaStatus = 'pendente' | 'pago';

export interface Item {
  id: string;
  nome: string;
  tipo: ItemTipo;
  numero: number;
  localizacao: string;
  uid_totem: string;
  disponivel: boolean;
  permite_extras: boolean;
}

export interface Aluguel {
  id: string;
  aluno_id: string;
  item_id: string;
  inicio: string;
  fim_previsto: string;
  fim_real: string | null;
  status: AluguelStatus;
  com_extra: boolean;
}

export interface Multa {
  id: string;
  aluno_id: string;
  aluguel_id: string;
  dias_atraso: number;
  valor: number;
  status: MultaStatus;
  gerada_em: string;
  pago_em: string | null;
}

export interface LogNFC {
  id: string;
  uid_cartao: string;
  uid_totem: string;
  acao: string;
  sucesso: boolean;
  lido_em: string;
}

export interface AluguelComItem extends Aluguel {
  itens: Item;
}

export interface MultaComAluguel extends Multa {
  alugueis: Aluguel & {
    itens: Pick<Item, 'nome' | 'numero'>;
  };
}
