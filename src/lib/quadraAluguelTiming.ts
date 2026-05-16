import { supabase } from './supabase';
import type { AluguelComItem } from '../types/database';

/** Tempo após o fim previsto para confirmar devolução no totem NFC. */
export const QUADRA_GRACE_MINUTES = 10;

export type QuadraAluguelPhase = 'em_uso' | 'aguardando_nfc';

export function getQuadraGraceDeadline(fimPrevistoIso: string): Date {
  return new Date(
    new Date(fimPrevistoIso).getTime() + QUADRA_GRACE_MINUTES * 60_000,
  );
}

export function isQuadraAluguelRow(aluguel: AluguelComItem): boolean {
  return aluguel.itens?.tipo === 'quadra';
}

export function isAluguelPendenteParaAluno(aluguel: AluguelComItem): boolean {
  if (aluguel.status === 'ativo') return true;
  if (aluguel.status === 'aguardando_nfc' && isQuadraAluguelRow(aluguel)) return true;
  return false;
}

export function getQuadraAluguelPhase(aluguel: AluguelComItem | null): QuadraAluguelPhase | null {
  if (!aluguel || !isQuadraAluguelRow(aluguel)) return null;
  if (aluguel.status === 'aguardando_nfc') return 'aguardando_nfc';
  if (aluguel.status === 'ativo') {
    if (Date.now() >= new Date(aluguel.fim_previsto).getTime()) {
      return 'aguardando_nfc';
    }
    return 'em_uso';
  }
  return null;
}

/**
 * Ao fim do horário: libera a quadra e passa para aguardando_nfc.
 * Após 10 min sem NFC: encerra como devolvido (sem multa).
 */
export async function syncQuadraAluguelTiming(
  aluguel: AluguelComItem,
): Promise<boolean> {
  if (!isQuadraAluguelRow(aluguel)) return false;

  const now = Date.now();
  const fim = new Date(aluguel.fim_previsto).getTime();
  const graceEnd = getQuadraGraceDeadline(aluguel.fim_previsto).getTime();

  if (aluguel.status === 'ativo' && now >= fim) {
    const { error: aluguelError } = await supabase
      .from('alugueis')
      .update({ status: 'aguardando_nfc' })
      .eq('id', aluguel.id);

    if (aluguelError) return false;

    if (aluguel.item_id) {
      await supabase.from('itens').update({ disponivel: true }).eq('id', aluguel.item_id);
    }
    return true;
  }

  if (aluguel.status === 'aguardando_nfc' && now >= graceEnd) {
    const { error } = await supabase
      .from('alugueis')
      .update({
        status: 'devolvido',
        fim_real: new Date(graceEnd).toISOString(),
      })
      .eq('id', aluguel.id);

    return !error;
  }

  return false;
}

export async function syncAllQuadraAlugueisTiming(
  alugueis: AluguelComItem[],
): Promise<boolean> {
  let updated = false;
  for (const aluguel of alugueis) {
    if (
      isQuadraAluguelRow(aluguel) &&
      (aluguel.status === 'ativo' || aluguel.status === 'aguardando_nfc')
    ) {
      if (await syncQuadraAluguelTiming(aluguel)) {
        updated = true;
      }
    }
  }
  return updated;
}
