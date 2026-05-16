export const QUADRA_DAY_START_HOUR = 8;
export const QUADRA_DAY_END_HOUR = 22;
export const QUADRA_SLOT_COUNT = QUADRA_DAY_END_HOUR - QUADRA_DAY_START_HOUR;
/** Marcadores de hora na agenda (8h … 22h, inclusive). */
export const QUADRA_HOUR_LABELS = Array.from(
  { length: QUADRA_DAY_END_HOUR - QUADRA_DAY_START_HOUR + 1 },
  (_, i) => QUADRA_DAY_START_HOUR + i,
);

export const QUADRA_DURACOES_MIN = [30, 60, 90, 120] as const;

export type SlotState = 'free' | 'busy' | 'past';

export interface QuadraBooking {
  inicio: string;
  fim: string;
}

export interface QuadraSlot {
  index: number;
  hourStart: number;
  hourLabel: string;
  state: SlotState;
}

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}h`;
}

export function getQuadraDayClose(day: Date): Date {
  const close = new Date(day);
  close.setHours(QUADRA_DAY_END_HOUR, 0, 0, 0);
  return close;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Limite máximo do término de um aluguel no mesmo dia. */
export function capQuadraEnd(inicio: Date, fim: Date): Date {
  const close = getQuadraDayClose(inicio);
  return fim.getTime() > close.getTime() ? close : fim;
}

function slotBoundsForIndex(index: number, day: Date): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(QUADRA_DAY_START_HOUR + index, 0, 0, 0);
  const end = new Date(day);
  end.setHours(QUADRA_DAY_START_HOUR + index + 1, 0, 0, 0);
  return { start, end };
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function hourLabelForSlotIndex(index: number): string {
  return formatHourLabel(QUADRA_DAY_START_HOUR + index);
}

/** Índice do slot (barra) exibido sob o rótulo de hora na agenda. */
export function slotIndexForHourLabel(hour: number): number {
  const index = hour - QUADRA_DAY_START_HOUR;
  if (index >= QUADRA_SLOT_COUNT) {
    return QUADRA_SLOT_COUNT - 1;
  }
  return index;
}

export function computeQuadraSlots(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): QuadraSlot[] {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const dayClose = getQuadraDayClose(now);

  const slots: QuadraSlot[] = [];

  for (let i = 0; i < QUADRA_SLOT_COUNT; i++) {
    const { start: slotStart, end: slotEnd } = slotBoundsForIndex(i, day);
    const effectiveEnd = slotEnd.getTime() > dayClose.getTime() ? dayClose : slotEnd;

    let state: SlotState = 'free';
    if (effectiveEnd <= now) {
      state = 'past';
    }

    for (const booking of bookings) {
      const bookingStart = new Date(booking.inicio);
      const bookingEnd = new Date(booking.fim);
      if (intervalsOverlap(bookingStart, bookingEnd, slotStart, effectiveEnd)) {
        state = effectiveEnd <= now ? 'past' : 'busy';
        break;
      }
    }

    slots.push({
      index: i,
      hourStart: QUADRA_DAY_START_HOUR + i,
      hourLabel: hourLabelForSlotIndex(i),
      state,
    });
  }

  return slots;
}

export function bookingEndForAluguel(row: {
  status: string | null;
  fim_previsto: string;
  fim_real: string | null;
}): string {
  if (row.status === 'ativo' || row.status === 'atrasado') {
    return row.fim_previsto;
  }
  return row.fim_real ?? row.fim_previsto;
}

/** Já passou das 22h ou existe aluguel hoje que vai até o fechamento (22h). */
export function isQuadraDayClosedForNewRentals(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): boolean {
  const close = getQuadraDayClose(now);
  if (now >= close) return true;

  return bookings.some((b) => {
    const end = new Date(b.fim);
    if (!isSameCalendarDay(end, now)) return false;
    return end.getTime() >= close.getTime();
  });
}

export function isQuadraBusyNow(bookings: QuadraBooking[], now: Date = new Date()): boolean {
  const t = now.getTime();
  return bookings.some((b) => {
    const start = new Date(b.inicio).getTime();
    const end = new Date(b.fim).getTime();
    return start <= t && end > t;
  });
}

export function canRentQuadraToday(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): boolean {
  return !isQuadraDayClosedForNewRentals(bookings, now) && !isQuadraBusyNow(bookings, now);
}

export function minutesUntilQuadraClose(now: Date = new Date()): number {
  const close = getQuadraDayClose(now);
  return Math.max(0, Math.floor((close.getTime() - now.getTime()) / 60000));
}

export function nextBookingStartAfter(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): Date | null {
  const t = now.getTime();
  let next: number | null = null;
  for (const b of bookings) {
    const start = new Date(b.inicio).getTime();
    if (start > t && (next === null || start < next)) next = start;
  }
  return next !== null ? new Date(next) : null;
}

/** Minutos máximos de aluguel a partir de agora (até 22h e antes do próximo agendamento). */
export function maxQuadraRentalMinutes(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): number {
  let max = minutesUntilQuadraClose(now);
  const next = nextBookingStartAfter(bookings, now);
  if (next) {
    const untilNext = Math.floor((next.getTime() - now.getTime()) / 60000);
    max = Math.min(max, untilNext);
  }
  return max;
}

export function allowedQuadraDurations(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): number[] {
  const max = maxQuadraRentalMinutes(bookings, now);
  return QUADRA_DURACOES_MIN.filter((d) => d <= max);
}

export function computeQuadraFimPrevisto(
  inicio: Date,
  duracaoMin: number,
): Date {
  const raw = new Date(inicio.getTime() + duracaoMin * 60_000);
  return capQuadraEnd(inicio, raw);
}

export function overlapsExistingBooking(
  bookings: QuadraBooking[],
  inicio: Date,
  fim: Date,
): boolean {
  return bookings.some((b) => {
    const bStart = new Date(b.inicio);
    const bEnd = new Date(b.fim);
    return intervalsOverlap(inicio, fim, bStart, bEnd);
  });
}

export type QuadraUnavailableReason = 'closed' | 'busy' | 'item_busy';

export function getQuadraUnavailableReason(
  bookings: QuadraBooking[],
  itemDisponivel: boolean,
  now: Date = new Date(),
): QuadraUnavailableReason | null {
  if (!itemDisponivel) return 'item_busy';
  if (isQuadraDayClosedForNewRentals(bookings, now)) return 'closed';
  if (isQuadraBusyNow(bookings, now)) return 'busy';
  return null;
}

export function quadraUnavailableLabel(reason: QuadraUnavailableReason): string {
  switch (reason) {
    case 'closed':
      return 'Encerrado hoje';
    case 'busy':
      return 'Ocupado';
    case 'item_busy':
      return 'Ocupado';
  }
}
