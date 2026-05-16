-- Uma reserva agendada por aluno/quadra; limpa duplicatas e órfãos após cancelamento parcial

-- Se já existe cancelado no mesmo horário, o agendado restante é órfão
UPDATE public.alugueis a
SET status = 'cancelado'
WHERE a.status = 'agendado'
  AND EXISTS (
    SELECT 1
    FROM public.alugueis b
    WHERE b.aluno_id = a.aluno_id
      AND b.item_id = a.item_id
      AND b.inicio = a.inicio
      AND b.fim_previsto = a.fim_previsto
      AND b.status = 'cancelado'
      AND b.id <> a.id
  );

-- Mantém só o agendado mais antigo por aluno/quadra
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY aluno_id, item_id
      ORDER BY inicio ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.alugueis
  WHERE status = 'agendado'
)
UPDATE public.alugueis
SET status = 'cancelado'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS alugueis_one_agendado_quadra_per_aluno
  ON public.alugueis (aluno_id, item_id)
  WHERE status = 'agendado';
