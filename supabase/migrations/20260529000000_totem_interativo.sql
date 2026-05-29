-- Totem interativo: o tap do NFC passa a SÓ identificar o aluno (não age mais).
-- O aluno escolhe a ação na tela do totem, que chama RPCs SECURITY DEFINER
-- (a conta do totem não pode escrever em nome do aluno via RLS).

-- 1) Trigger agora apenas valida/identifica o cartão (sem efeitos colaterais).
CREATE OR REPLACE FUNCTION public.processar_leitura_nfc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_existe boolean;
BEGIN
  v_uid := upper(replace(trim(coalesce(NEW.uid_cartao, '')), ' ', ''));

  IF coalesce(NEW.acao, 'leitura') NOT IN ('leitura', '') THEN
    RETURN NEW;
  END IF;

  IF length(v_uid) < 4 THEN
    NEW.acao := 'uid_invalido';
    NEW.sucesso := false;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.alunos
    WHERE upper(replace(trim(coalesce(uid_nfc, '')), ' ', '')) = v_uid
      AND ativo = true
  ) INTO v_existe;

  IF v_existe THEN
    NEW.acao := 'identificacao';
    NEW.sucesso := true;
  ELSE
    NEW.acao := 'aluno_desconhecido';
    NEW.sucesso := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Identifica aluno pelo UID (totem recebe id + nome).
CREATE OR REPLACE FUNCTION public.totem_aluno_por_uid(p_uid text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object('id', id, 'nome', nome)
  INTO v
  FROM public.alunos
  WHERE upper(replace(trim(coalesce(uid_nfc, '')), ' ', '')) =
        upper(replace(trim(coalesce(p_uid, '')), ' ', ''))
    AND ativo = true
  LIMIT 1;

  RETURN v;
END;
$$;

-- 3) Situação do aluno (para a tela do totem montar as opções).
CREATE OR REPLACE FUNCTION public.totem_status_aluno(p_aluno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ativo jsonb;
  v_checkin boolean;
  v_guarda boolean;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('erro', 'nao_autorizado');
  END IF;

  SELECT jsonb_build_object('id', a.id, 'nome', i.nome, 'tipo', i.tipo)
  INTO v_ativo
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = p_aluno_id
    AND a.status IN ('ativo', 'aguardando_nfc')
  ORDER BY a.fim_previsto ASC
  LIMIT 1;

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
    'aluguel_ativo', v_ativo,
    'checkin_disponivel', v_checkin,
    'guarda_disponivel', v_guarda
  );
END;
$$;

-- 4) Aluga um guarda-chuva (7 dias) para o aluno.
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

  INSERT INTO public.alugueis (aluno_id, item_id, status, inicio, fim_previsto)
  VALUES (p_aluno_id, v_item_id, 'ativo', now(), now() + interval '7 days');

  UPDATE public.itens SET disponivel = false WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Aluguel registrado', 'item', v_nome);
END;
$$;

-- 5) Check-in de reserva de quadra (na janela).
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

  UPDATE public.alugueis SET status = 'ativo'
  WHERE id = v_reserva_id AND status = 'agendado';

  UPDATE public.itens SET disponivel = false WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Check-in confirmado', 'item', v_nome);
END;
$$;

-- 6) Devolução do item ativo do aluno (multa do guarda-chuva atrasado é automática).
CREATE OR REPLACE FUNCTION public.totem_devolver(p_aluno_id uuid)
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

  SELECT a.id, a.item_id, i.nome, i.tipo, a.fim_previsto
  INTO v_id, v_item_id, v_nome, v_tipo, v_fim
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = p_aluno_id
    AND a.status IN ('ativo', 'aguardando_nfc')
  ORDER BY a.fim_previsto ASC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Nenhum item ativo para devolver.');
  END IF;

  v_atrasado := now() > v_fim;

  UPDATE public.alugueis
  SET fim_real = now(),
      status = CASE WHEN v_atrasado AND v_tipo = 'guarda_chuva' THEN 'atrasado' ELSE 'devolvido' END
  WHERE id = v_id;

  UPDATE public.itens SET disponivel = true WHERE id = v_item_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Devolução concluída', 'item', v_nome);
END;
$$;

REVOKE ALL ON FUNCTION public.totem_aluno_por_uid(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.totem_status_aluno(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.totem_alugar_guarda_chuva(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.totem_checkin_quadra(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.totem_devolver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_aluno_por_uid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.totem_status_aluno(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.totem_alugar_guarda_chuva(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.totem_checkin_quadra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.totem_devolver(uuid) TO authenticated;
