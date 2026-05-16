import { supabase } from './supabase';
import type { AluguelComItem } from '../types/database';

const MULTA_POR_DIA = 5;

export type DevolverResult =
  | { ok: true; multaGerada: false }
  | { ok: true; multaGerada: true; valorMulta: number; diasAtraso: number }
  | { ok: false; message: string };

export async function devolverAluguel(
  aluguel: AluguelComItem,
  alunoId: string,
): Promise<DevolverResult> {
  const agora = new Date();
  const fimPrevisto = new Date(aluguel.fim_previsto);
  const atrasado = agora.getTime() > fimPrevisto.getTime();
  const isGuardaChuva = aluguel.itens.tipo === 'guarda_chuva';

  const { error: aluguelError } = await supabase
    .from('alugueis')
    .update({
      fim_real: agora.toISOString(),
      status: atrasado && isGuardaChuva ? 'atrasado' : 'devolvido',
    })
    .eq('id', aluguel.id);

  if (aluguelError) {
    return { ok: false, message: aluguelError.message };
  }

  if (aluguel.item_id) {
    const { error: itemError } = await supabase
      .from('itens')
      .update({ disponivel: true })
      .eq('id', aluguel.item_id);

    if (itemError) {
      return { ok: false, message: itemError.message };
    }
  }

  if (atrasado && isGuardaChuva) {
    const diasAtraso = Math.ceil(
      (agora.getTime() - fimPrevisto.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diasAtraso > 0) {
      const valorMulta = diasAtraso * MULTA_POR_DIA;
      const { error: multaError } = await supabase.from('multas').insert({
        aluguel_id: aluguel.id,
        aluno_id: alunoId,
        dias_atraso: diasAtraso,
        valor: valorMulta,
        status: 'pendente',
      });

      if (multaError) {
        return { ok: false, message: multaError.message };
      }

      return { ok: true, multaGerada: true, valorMulta, diasAtraso };
    }
  }

  return { ok: true, multaGerada: false };
}
