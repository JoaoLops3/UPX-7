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

/** Fase exibida na UI — status vem do servidor (cron pg_cron + totem). */
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
