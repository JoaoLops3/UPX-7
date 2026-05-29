-- Polish: via_totem, devolver item escolhido, listar ativos, cron quadra expirada

ALTER TABLE public.alugueis
  ADD COLUMN IF NOT EXISTS via_totem boolean NOT NULL DEFAULT false;

-- Encerra quadras: ativo após fim → aguardando_nfc + libera item;
-- aguardando_nfc após graça (10 min) → devolvido (igual syncQuadraAluguelTiming no app).
CREATE OR REPLACE FUNCTION public.encerrar_quadras_expiradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n1 int := 0;
  v_n2 int := 0;
BEGIN
  WITH u AS (
    UPDATE public.alugueis a
    SET status = 'aguardando_nfc'
    FROM public.itens i
    WHERE i.id = a.item_id
      AND i.tipo = 'quadra'
      AND a.status = 'ativo'
      AND now() >= a.fim_previsto
    RETURNING a.id, a.item_id
  )
  UPDATE public.itens i
  SET disponivel = true
  FROM u
  WHERE i.id = u.item_id;

  GET DIAGNOSTICS v_n1 = ROW_COUNT;

  WITH u2 AS (
    UPDATE public.alugueis a
    SET status = 'devolvido',
        fim_real = a.fim_previsto,
        via_totem = false
    FROM public.itens i
    WHERE i.id = a.item_id
      AND i.tipo = 'quadra'
      AND a.status = 'aguardando_nfc'
      AND now() >= a.fim_previsto + interval '10 minutes'
    RETURNING a.id
  )
  SELECT count(*)::int INTO v_n2 FROM u2;

  RETURN v_n1 + v_n2;
END;
$$;

-- Status do aluno no totem: lista todos os ativos + flags de check-in/guarda.
CREATE OR REPLACE FUNCTION public.totem_status_aluno(p_aluno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ativos jsonb;
  v_checkin boolean;
  v_guarda boolean;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('erro', 'nao_autorizado');
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object('id', a.id, 'nome', i.nome, 'tipo', i.tipo)
    ORDER BY a.fim_previsto ASC
  ), '[]'::jsonb)
  INTO v_ativos
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = p_aluno_id
    AND a.status IN ('ativo', 'aguardando_nfc');

  SELECT EXISTS (
    SELECT 1 FROM public.alugueis a
    JOIN public.itens i ON i.id = a.item_id
    WHERE a.aluno_id = p_aluno_id
      AND a.status = 'agendado'
      AND i.tipo = 'quadra'
      AND a.inicio IS NOT NULL
      AND now() >= a.inicio - interval '15 minutes'
      AND now() <= a.fim_previsto
  ) INTO v_checkin;

  SELECT EXISTS (
    SELECT 1 FROM public.itens
    WHERE tipo = 'guarda_chuva' AND disponivel = true
  ) INTO v_guarda;

  RETURN jsonb_build_object(
    'alugueis_ativos', v_ativos,
    'checkin_disponivel', v_checkin,
    'guarda_disponivel', v_guarda
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.totem_alugar_guarda_chuva(p_aluno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_nome text;
  v_existe_ativo boolean;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Não autorizado');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.alugueis a
    JOIN public.itens i ON i.id = a.item_id
    WHERE a.aluno_id = p_aluno_id
      AND a.status IN ('ativo', 'aguardando_nfc')
      AND i.tipo = 'guarda_chuva'
  ) INTO v_existe_ativo;

  IF v_existe_ativo THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Você já tem um guarda-chuva ativo.');
  END IF;

  SELECT id, nome INTO v_item_id, v_nome
  FROM public.itens
  WHERE tipo = 'guarda_chuva' AND disponivel = true
  ORDER BY numero NULLS LAST, nome
  LIMIT 1;

  IF v_item_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Nenhum guarda-chuva disponível.');
  END IF;

  INSERT INTO public.alugueis (aluno_id, item_id, status, inicio, fim_previsto, via_totem)
  VALUES (p_aluno_id, v_item_id, 'ativo', now(), now() + interval '7 days', true);

  UPDATE public.itens SET disponivel = false WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Aluguel registrado', 'item', v_nome);
END;
$$;

CREATE OR REPLACE FUNCTION public.totem_checkin_quadra(p_aluno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva_id uuid;
  v_item_id uuid;
  v_nome text;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Não autorizado');
  END IF;

  SELECT a.id, a.item_id, i.nome INTO v_reserva_id, v_item_id, v_nome
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = p_aluno_id
    AND a.status = 'agendado'
    AND i.tipo = 'quadra'
    AND a.inicio IS NOT NULL
    AND now() >= a.inicio - interval '15 minutes'
    AND now() <= a.fim_previsto
  ORDER BY a.inicio ASC
  LIMIT 1;

  IF v_reserva_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Sem reserva de quadra na janela de check-in.');
  END IF;

  UPDATE public.alugueis SET status = 'ativo', via_totem = true
  WHERE id = v_reserva_id AND status = 'agendado';

  UPDATE public.itens SET disponivel = false WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Check-in confirmado', 'item', v_nome);
END;
$$;

DROP FUNCTION IF EXISTS public.totem_devolver(uuid);

CREATE OR REPLACE FUNCTION public.totem_devolver(p_aluno_id uuid, p_aluguel_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_item_id uuid;
  v_nome text;
  v_tipo text;
  v_fim timestamptz;
  v_atrasado boolean;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Não autorizado');
  END IF;

  IF p_aluguel_id IS NOT NULL THEN
    SELECT a.id, a.item_id, i.nome, i.tipo, a.fim_previsto
    INTO v_id, v_item_id, v_nome, v_tipo, v_fim
    FROM public.alugueis a
    JOIN public.itens i ON i.id = a.item_id
    WHERE a.id = p_aluguel_id
      AND a.aluno_id = p_aluno_id
      AND a.status IN ('ativo', 'aguardando_nfc');
  ELSE
    SELECT a.id, a.item_id, i.nome, i.tipo, a.fim_previsto
    INTO v_id, v_item_id, v_nome, v_tipo, v_fim
    FROM public.alugueis a
    JOIN public.itens i ON i.id = a.item_id
    WHERE a.aluno_id = p_aluno_id
      AND a.status IN ('ativo', 'aguardando_nfc')
    ORDER BY a.fim_previsto ASC
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Nenhum item ativo para devolver.');
  END IF;

  v_atrasado := now() > v_fim;

  UPDATE public.alugueis
  SET fim_real = now(),
      via_totem = true,
      status = CASE WHEN v_atrasado AND v_tipo = 'guarda_chuva' THEN 'atrasado' ELSE 'devolvido' END
  WHERE id = v_id;

  UPDATE public.itens SET disponivel = true WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Devolução concluída', 'item', v_nome);
END;
$$;

REVOKE ALL ON FUNCTION public.encerrar_quadras_expiradas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_quadras_expiradas() TO authenticated;

REVOKE ALL ON FUNCTION public.totem_devolver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_devolver(uuid, uuid) TO authenticated;

-- pg_cron: habilite a extensão no Supabase Dashboard se quiser agendamento automático.
-- SELECT cron.schedule('upx7_encerrar_quadras', '*/5 * * * *', $$SELECT public.encerrar_quadras_expiradas();$$);
