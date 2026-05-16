-- Reserva de quadra por data: status agendado (futuro) e cancelado (no-show)

COMMENT ON COLUMN public.alugueis.status IS
  'ativo | devolvido | atrasado (guarda-chuva) | aguardando_nfc (quadra pós-horário) | agendado (reserva quadra) | cancelado (reserva não compareceu)';

CREATE INDEX IF NOT EXISTS alugueis_quadra_agenda_idx
  ON public.alugueis (item_id, inicio)
  WHERE status IN ('agendado', 'ativo', 'aguardando_nfc');
