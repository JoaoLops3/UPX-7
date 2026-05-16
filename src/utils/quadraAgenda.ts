import { supabase } from '../lib/supabase';
import { bookingEndForAluguel, type QuadraBooking } from './quadraAvailability';

export async function fetchQuadraBookingsToday(quadraId: string): Promise<QuadraBooking[]> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [{ data: active }, { data: today }] = await Promise.all([
    supabase
      .from('alugueis')
      .select('inicio, fim_previsto, fim_real, status')
      .eq('item_id', quadraId)
      .eq('status', 'ativo'),
    supabase
      .from('alugueis')
      .select('inicio, fim_previsto, fim_real, status')
      .eq('item_id', quadraId)
      .in('status', ['devolvido', 'atrasado'])
      .gte('inicio', dayStart.toISOString()),
  ]);

  const rows = [...(active ?? []), ...(today ?? [])];
  const seen = new Set<string>();
  const bookings: QuadraBooking[] = [];

  for (const row of rows) {
    if (!row.inicio) continue;
    const fim = bookingEndForAluguel(row);
    const key = `${row.inicio}|${fim}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bookings.push({ inicio: row.inicio, fim });
  }

  return bookings;
}
