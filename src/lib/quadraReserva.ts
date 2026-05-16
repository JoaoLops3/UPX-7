import { supabase } from './supabase';
import type { AluguelComItem } from '../types/database';
import {
  QUADRA_CHECKIN_MINUTES_BEFORE,
  isSameCalendarDay,
} from '../utils/quadraAvailability';

export type CheckInResult =
  | { ok: true; aluguelId: string }
  | { ok: false; code: 'no_reserva' | 'too_early' | 'too_late' | 'already_active' | 'error'; message: string };

export function isQuadraReservaRow(aluguel: AluguelComItem): boolean {
  return aluguel.itens?.tipo === 'quadra' && aluguel.status === 'agendado';
}

export function getReservaCheckInWindow(inicioIso: string, fimPrevistoIso: string): {
  openAt: Date;
  closeAt: Date;
} {
  const inicio = new Date(inicioIso);
  const fim = new Date(fimPrevistoIso);
  const openAt = new Date(inicio.getTime() - QUADRA_CHECKIN_MINUTES_BEFORE * 60_000);
  return { openAt, closeAt: fim };
}

export function validateCheckInWindow(
  inicioIso: string,
  fimPrevistoIso: string,
  now: Date = new Date(),
): CheckInResult | { ok: true } {
  const { openAt, closeAt } = getReservaCheckInWindow(inicioIso, fimPrevistoIso);
  if (now < openAt) {
    return {
      ok: false,
      code: 'too_early',
      message: `Check-in disponível a partir de ${openAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
    };
  }
  if (now > closeAt) {
    return {
      ok: false,
      code: 'too_late',
      message: 'O horário da reserva já passou.',
    };
  }
  return { ok: true };
}

export async function findAgendadoForCheckIn(
  alunoId: string,
  quadraItemId: string,
  now: Date = new Date(),
): Promise<AluguelComItem | null> {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data } = await supabase
    .from('alugueis')
    .select('*, itens(*)')
    .eq('aluno_id', alunoId)
    .eq('item_id', quadraItemId)
    .eq('status', 'agendado')
    .gte('inicio', dayStart.toISOString())
    .lt('inicio', dayEnd.toISOString())
    .order('inicio', { ascending: true });

  const rows = (data as AluguelComItem[]) ?? [];
  for (const row of rows) {
    const check = validateCheckInWindow(row.inicio ?? '', row.fim_previsto, now);
    if (check.ok) return row;
  }
  return rows[0] ?? null;
}

export async function activateQuadraReserva(
  aluguelId: string,
  itemId: string,
): Promise<CheckInResult> {
  const { error: aluguelError } = await supabase
    .from('alugueis')
    .update({ status: 'ativo' })
    .eq('id', aluguelId)
    .eq('status', 'agendado');

  if (aluguelError) {
    return { ok: false, code: 'error', message: aluguelError.message };
  }

  const { error: itemError } = await supabase
    .from('itens')
    .update({ disponivel: false })
    .eq('id', itemId);

  if (itemError) {
    return { ok: false, code: 'error', message: itemError.message };
  }

  return { ok: true, aluguelId };
}

/** Cancela todas as reservas agendadas futuras do aluno na quadra (inclui duplicatas legadas). */
export async function cancelarReservaAgendada(reserva: {
  id: string;
  aluno_id: string;
  item_id: string;
}): Promise<{ ok: boolean; message?: string }> {

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('alugueis')
    .update({ status: 'cancelado' })
    .eq('aluno_id', reserva.aluno_id)
    .eq('item_id', reserva.item_id)
    .eq('status', 'agendado')
    .gte('fim_previsto', now)
    .select('id');

  if (error) return { ok: false, message: error.message };
  if (!data?.length) {
    const { data: single, error: singleError } = await supabase
      .from('alugueis')
      .update({ status: 'cancelado' })
      .eq('id', reserva.id)
      .eq('status', 'agendado')
      .select('id')
      .maybeSingle();

    if (singleError) return { ok: false, message: singleError.message };
    if (!single) {
      return {
        ok: false,
        message: 'Reserva não encontrada ou já foi cancelada. Atualize a página.',
      };
    }
  }
  return { ok: true };
}

/** Remove agendados duplicados (mantém o mais antigo por início). */
export async function dedupeAgendadoReservasQuadra(alunoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('alugueis')
    .select('id, item_id, inicio, itens(tipo)')
    .eq('aluno_id', alunoId)
    .eq('status', 'agendado')
    .order('inicio', { ascending: true });

  if (error || !data?.length) return false;

  const quadraRows = (data as { id: string; item_id: string; inicio: string | null; itens: { tipo: string } | null }[]).filter(
    (r) => r.itens?.tipo === 'quadra' && r.inicio,
  );
  const byItem = new Map<string, string[]>();
  for (const row of quadraRows) {
    const ids = byItem.get(row.item_id) ?? [];
    ids.push(row.id);
    byItem.set(row.item_id, ids);
  }

  const idsToCancel: string[] = [];
  for (const ids of byItem.values()) {
    if (ids.length > 1) idsToCancel.push(...ids.slice(1));
  }
  if (!idsToCancel.length) return false;

  const { error: updateError } = await supabase
    .from('alugueis')
    .update({ status: 'cancelado' })
    .in('id', idsToCancel)
    .eq('status', 'agendado');

  return !updateError;
}

/** Marca reservas agendadas cujo fim_previsto já passou sem check-in. */
export async function syncAgendadoNoShows(alugueis: AluguelComItem[]): Promise<boolean> {
  const now = Date.now();
  let updated = false;

  for (const aluguel of alugueis) {
    if (!isQuadraReservaRow(aluguel)) continue;
    if (new Date(aluguel.fim_previsto).getTime() > now) continue;

    const { error } = await supabase
      .from('alugueis')
      .update({ status: 'cancelado' })
      .eq('id', aluguel.id)
      .eq('status', 'agendado');

    if (!error) updated = true;
  }

  return updated;
}

export function isReservaHoje(reserva: AluguelComItem, now: Date = new Date()): boolean {
  if (!reserva.inicio) return false;
  return isSameCalendarDay(new Date(reserva.inicio), now);
}

export function pickProximaReservaQuadra(alugueis: AluguelComItem[]): AluguelComItem | null {
  const now = Date.now();
  const reservas = alugueis
    .filter(isQuadraReservaRow)
    .filter((a) => new Date(a.fim_previsto).getTime() > now)
    .sort((a, b) => new Date(a.inicio ?? 0).getTime() - new Date(b.inicio ?? 0).getTime());
  return reservas[0] ?? null;
}

/** Impede segunda reserva agendada futura para o mesmo aluno. */
export function hasOutraReservaAgendada(
  alugueis: AluguelComItem[],
  excludeId?: string,
): boolean {
  const now = Date.now();
  return alugueis.some(
    (a) =>
      isQuadraReservaRow(a) &&
      a.id !== excludeId &&
      new Date(a.fim_previsto).getTime() > now,
  );
}
