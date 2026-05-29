-- Estende o trigger do totem: além de check-in e devolução, agora também faz
-- ALUGUEL de guarda-chuva (prazo fixo de 7 dias) quando o aluno encosta a tag
-- sem nada pendente e há um guarda-chuva disponível.
--
-- Protótipo: 1 totem único, item descoberto pelo estado do aluno.
--   1) Reserva de quadra agendada na janela (início -15min .. fim) -> check-in.
--   2) Aluguel ativo/aguardando_nfc -> devolução.
--   3) Nada pendente + guarda-chuva disponível -> aluguel de guarda-chuva (7 dias).
--   4) Caso contrário -> sem_acao.
-- (Aluguel de quadra continua no app, pois precisa escolher a duração.)

CREATE OR REPLACE FUNCTION public.processar_leitura_nfc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_aluno_id uuid;
  v_reserva record;
  v_aluguel record;
  v_item_id uuid;
  v_atrasado boolean;
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

  SELECT id INTO v_aluno_id
  FROM public.alunos
  WHERE upper(replace(trim(coalesce(uid_nfc, '')), ' ', '')) = v_uid
    AND ativo = true
  LIMIT 1;

  IF v_aluno_id IS NULL THEN
    NEW.acao := 'aluno_desconhecido';
    NEW.sucesso := false;
    RETURN NEW;
  END IF;

  -- 1) Check-in: reserva de quadra agendada com janela aberta agora.
  SELECT a.id AS id, a.item_id AS item_id
  INTO v_reserva
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = v_aluno_id
    AND a.status = 'agendado'
    AND i.tipo = 'quadra'
    AND a.inicio IS NOT NULL
    AND now() >= a.inicio - interval '15 minutes'
    AND now() <= a.fim_previsto
  ORDER BY a.inicio ASC
  LIMIT 1;

  IF v_reserva.id IS NOT NULL THEN
    UPDATE public.alugueis
    SET status = 'ativo'
    WHERE id = v_reserva.id
      AND status = 'agendado';

    UPDATE public.itens
    SET disponivel = false
    WHERE id = v_reserva.item_id;

    NEW.acao := 'checkin';
    NEW.sucesso := true;
    RETURN NEW;
  END IF;

  -- 2) Devolução: aluguel ativo ou aguardando confirmação no totem.
  SELECT a.id AS id, a.item_id AS item_id, a.fim_previsto AS fim_previsto, i.tipo AS tipo
  INTO v_aluguel
  FROM public.alugueis a
  JOIN public.itens i ON i.id = a.item_id
  WHERE a.aluno_id = v_aluno_id
    AND a.status IN ('ativo', 'aguardando_nfc')
  ORDER BY a.fim_previsto ASC
  LIMIT 1;

  IF v_aluguel.id IS NOT NULL THEN
    v_atrasado := now() > v_aluguel.fim_previsto;

    UPDATE public.alugueis
    SET fim_real = now(),
        status = CASE
          WHEN v_atrasado AND v_aluguel.tipo = 'guarda_chuva' THEN 'atrasado'
          ELSE 'devolvido'
        END
    WHERE id = v_aluguel.id;

    UPDATE public.itens
    SET disponivel = true
    WHERE id = v_aluguel.item_id;

    NEW.acao := 'devolucao';
    NEW.sucesso := true;
    RETURN NEW;
  END IF;

  -- 3) Aluguel de guarda-chuva: nada pendente e há um disponível (prazo 7 dias).
  SELECT id INTO v_item_id
  FROM public.itens
  WHERE tipo = 'guarda_chuva'
    AND disponivel = true
  ORDER BY numero NULLS LAST, nome
  LIMIT 1;

  IF v_item_id IS NOT NULL THEN
    INSERT INTO public.alugueis (aluno_id, item_id, status, inicio, fim_previsto)
    VALUES (v_aluno_id, v_item_id, 'ativo', now(), now() + interval '7 days');

    UPDATE public.itens
    SET disponivel = false
    WHERE id = v_item_id;

    NEW.acao := 'aluguel';
    NEW.sucesso := true;
    RETURN NEW;
  END IF;

  -- Cartão válido, mas nada a fazer.
  NEW.acao := 'sem_acao';
  NEW.sucesso := false;
  RETURN NEW;
END;
$$;
