import { supabase } from '../lib/supabase';
import {
  bookingEndForAluguel,
  startOfCalendarDay,
  type QuadraBooking,
} from './quadraAvailability';

const AGENDA_STATUSES = ['agendado', 'ativo', 'aguardando_nfc', 'devolvido', 'atrasado'] as const;
const BLOCKING_STATUSES = ['agendado', 'ativo', 'aguardando_nfc'] as const;

function rowToBooking(row: {
  inicio: string | null;
  fim_previsto: string;
  fim_real: string | null;
  status: string | null;
}): QuadraBooking | null {
  if (!row.inicio) return null;
  return {
    inicio: row.inicio,
    fim: bookingEndForAluguel(row),
    status: row.status,
  };
}

export async function fetchQuadraBookingsForDay(
  quadraId: string,
  day: Date,
): Promise<QuadraBooking[]> {
  const dayStart = startOfCalendarDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [{ data: blocking }, { data: concluded }] = await Promise.all([
    supabase
      .from('alugueis')
      .select('inicio, fim_previsto, fim_real, status')
      .eq('item_id', quadraId)
      .in('status', [...BLOCKING_STATUSES])
      .lt('inicio', dayEnd.toISOString())
      .gt('fim_previsto', dayStart.toISOString()),
    supabase
      .from('alugueis')
      .select('inicio, fim_previsto, fim_real, status')
      .eq('item_id', quadraId)
      .in('status', ['devolvido', 'atrasado'])
      .gte('inicio', dayStart.toISOString())
      .lt('inicio', dayEnd.toISOString()),
  ]);

  const rows = [...(blocking ?? []), ...(concluded ?? [])];
  const seen = new Set<string>();
  const bookings: QuadraBooking[] = [];

  for (const row of rows) {
    const booking = rowToBooking(row);
    if (!booking) continue;
    const key = `${booking.inicio}|${booking.fim}|${booking.status ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bookings.push(booking);
  }

  return bookings;
}

export async function fetchQuadraBookingsToday(quadraId: string): Promise<QuadraBooking[]> {
  return fetchQuadraBookingsForDay(quadraId, new Date());
}
