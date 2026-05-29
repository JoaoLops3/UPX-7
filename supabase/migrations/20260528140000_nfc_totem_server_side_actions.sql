-- Totem NFC passa a executar CHECK-IN e DEVOLUÇÃO no servidor, sem depender do
-- app logado. O pc-bridge continua apenas inserindo a leitura crua em logs_nfc;
-- este trigger resolve o aluno pelo cartão, decide a ação pelo estado dele e
-- grava o resultado em logs_nfc.acao. O app só observa o resultado via Realtime.
--
-- Regras (espelham a lógica que antes rodava no app):
--   1) Reserva de quadra "agendado" com janela aberta (início -15min .. fim) -> check-in.
--   2) Aluguel "ativo" ou "aguardando_nfc" -> devolução (multa do guarda-chuva
--      atrasado é gerada pelo trigger gerar_multa existente).
-- Prioridade: check-in antes de devolução (janela de check-in é curta/urgente).

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
  v_atrasado boolean;
BEGIN
  v_uid := upper(replace(trim(coalesce(NEW.uid_cartao, '')), ' ', ''));

  -- Só processa leituras cruas (acao 'leitura' ou vazia) vindas do totem.
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

  -- Cartão válido, mas nada a fazer (sem reserva na janela e sem aluguel ativo).
  NEW.acao := 'sem_acao';
  NEW.sucesso := false;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_leitura_nfc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.processar_leitura_nfc() TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_processar_leitura_nfc ON public.logs_nfc;
CREATE TRIGGER trg_processar_leitura_nfc
  BEFORE INSERT ON public.logs_nfc
  FOR EACH ROW
  EXECUTE FUNCTION public.processar_leitura_nfc();
