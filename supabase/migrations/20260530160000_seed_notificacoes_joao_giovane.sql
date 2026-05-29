-- Seed de notificações de teste: 15 multas pendentes (João) e 20 (Giovane).
-- Cada multa gera um aviso no app com data distinta para ordenação.

INSERT INTO public.itens (nome, tipo, numero, localizacao, uid_totem, disponivel, permite_extras)
SELECT
  'Guarda-chuva #' || n,
  'guarda_chuva',
  n,
  'Totem central',
  'SEED-GC-' || n,
  true,
  false
FROM generate_series(13, 45) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM public.itens i WHERE i.tipo = 'guarda_chuva' AND i.numero = n
);

DO $$
DECLARE
  v_joao uuid := '9845cc9f-ed37-4927-a261-98fa63e48d2b';
  v_giovane uuid := '583962be-0bcb-42f9-aea5-7c8cc4bc5727';
  v_items uuid[];
  v_item uuid;
  v_aluguel_id uuid;
  v_gerada timestamptz;
  v_dias int;
  v_valor numeric;
  v_i int;
  v_aluno uuid;
  v_target int;
  v_existing int;
BEGIN
  SELECT array_agg(id ORDER BY numero)
  INTO v_items
  FROM public.itens
  WHERE tipo = 'guarda_chuva';

  IF v_items IS NULL OR array_length(v_items, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhum guarda-chuva cadastrado';
  END IF;

  FOR v_aluno, v_target IN
    SELECT v_joao, 15
    UNION ALL
    SELECT v_giovane, 20
  LOOP
    SELECT count(*)::int
    INTO v_existing
    FROM public.multas
    WHERE aluno_id = v_aluno
      AND status = 'pendente';

    FOR v_i IN 1..greatest(v_target - v_existing, 0) LOOP
      v_item := v_items[1 + ((v_i - 1) % array_length(v_items, 1))];
      v_dias := 1 + ((v_i + v_existing) % 12);
      v_valor := round((v_dias * 5.00 / 7.0)::numeric, 2);
      v_gerada := timestamptz '2026-05-29 12:00:00+00'
        - ((v_i + v_existing) * interval '1 day 3 hours');

      INSERT INTO public.alugueis (
        aluno_id,
        item_id,
        inicio,
        fim_previsto,
        fim_real,
        status,
        com_extra,
        extras,
        via_totem
      )
      VALUES (
        v_aluno,
        v_item,
        v_gerada - interval '5 days',
        v_gerada - interval '2 days',
        v_gerada - interval '1 day',
        'devolvido',
        false,
        '{}',
        true
      )
      RETURNING id INTO v_aluguel_id;

      INSERT INTO public.multas (
        aluno_id,
        aluguel_id,
        dias_atraso,
        valor,
        status,
        gerada_em
      )
      VALUES (
        v_aluno,
        v_aluguel_id,
        v_dias,
        v_valor,
        'pendente',
        v_gerada
      );
    END LOOP;
  END LOOP;
END $$;
