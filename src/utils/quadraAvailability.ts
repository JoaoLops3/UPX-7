export const QUADRA_DAY_START_HOUR = 8;
export const QUADRA_DAY_END_HOUR = 18;
export const QUADRA_SLOT_COUNT = 10;
export const QUADRA_HOUR_LABELS = [8, 10, 12, 14, 16, 18] as const;

export type SlotState = 'free' | 'busy' | 'past';

export interface QuadraBooking {
  inicio: string;
  fim: string;
}

export interface QuadraSlot {
  index: number;
  hourStart: number;
  hourLabel: string | null;
  state: SlotState;
}

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}h`;
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

export function hourLabelForSlotIndex(index: number): string | null {
  if (index === QUADRA_SLOT_COUNT - 1) return formatHourLabel(QUADRA_DAY_END_HOUR);
  if (index % 2 === 0) return formatHourLabel(QUADRA_DAY_START_HOUR + index);
  return null;
}

export function computeQuadraSlots(
  bookings: QuadraBooking[],
  now: Date = new Date(),
): QuadraSlot[] {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const slots: QuadraSlot[] = [];

  for (let i = 0; i < QUADRA_SLOT_COUNT; i++) {
    const { start: slotStart, end: slotEnd } = slotBoundsForIndex(i, day);

    let state: SlotState = 'free';
    if (slotEnd <= now) {
      state = 'past';
    }

    for (const booking of bookings) {
      const bookingStart = new Date(booking.inicio);
      const bookingEnd = new Date(booking.fim);
      if (intervalsOverlap(bookingStart, bookingEnd, slotStart, slotEnd)) {
        state = slotEnd <= now ? 'past' : 'busy';
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
