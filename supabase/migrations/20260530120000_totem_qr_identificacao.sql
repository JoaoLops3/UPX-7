-- Identificação alternativa no totem: aluno escaneia QR exibido na tela do totem pelo app logado.

CREATE TABLE IF NOT EXISTS public.totem_sessoes_qr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid_totem text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'identificado', 'expirado')),
  aluno_id uuid REFERENCES public.alunos (id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  identificado_em timestamptz
);

CREATE INDEX IF NOT EXISTS totem_sessoes_qr_uid_totem_status_idx
  ON public.totem_sessoes_qr (uid_totem, status, expira_em DESC);

ALTER TABLE public.totem_sessoes_qr ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "totem_sessoes_qr_select_totem" ON public.totem_sessoes_qr;
CREATE POLICY "totem_sessoes_qr_select_totem" ON public.totem_sessoes_qr
  FOR SELECT TO authenticated
  USING (
    public.is_totem()
    AND uid_totem = (
      SELECT t.uid_totem FROM public.totens t
      WHERE lower(trim(t.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
        AND t.ativo = true
      LIMIT 1
    )
  );

GRANT SELECT ON public.totem_sessoes_qr TO authenticated;

ALTER TABLE public.totem_sessoes_qr REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'totem_sessoes_qr'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.totem_sessoes_qr;
  END IF;
END $$;

-- Aluno ativo pelo e-mail da sessão autenticada.
CREATE OR REPLACE FUNCTION public.current_aluno_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.alunos
  WHERE lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    AND ativo = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_aluno_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_aluno_id() TO authenticated;

-- Totem: cria sessão QR efêmera (45s).
CREATE OR REPLACE FUNCTION public.totem_criar_sessao_qr()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid_totem text;
  v_id uuid;
  v_token text;
  v_expira timestamptz;
BEGIN
  IF NOT public.is_totem() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'nao_autorizado');
  END IF;

  SELECT t.uid_totem INTO v_uid_totem
  FROM public.totens t
  WHERE lower(trim(t.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    AND t.ativo = true
  LIMIT 1;

  IF v_uid_totem IS NULL OR trim(v_uid_totem) = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'totem_sem_uid');
  END IF;

  UPDATE public.totem_sessoes_qr
  SET status = 'expirado'
  WHERE uid_totem = v_uid_totem
    AND status = 'aguardando';

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_expira := now() + interval '45 seconds';

  INSERT INTO public.totem_sessoes_qr (uid_totem, token, expira_em)
  VALUES (v_uid_totem, v_token, v_expira)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'sessao_id', v_id,
    'token', v_token,
    'expira_em', v_expira
  );
END;
$$;

REVOKE ALL ON FUNCTION public.totem_criar_sessao_qr() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_criar_sessao_qr() TO authenticated;

-- Aluno: confirma identificação escaneando o QR do totem.
CREATE OR REPLACE FUNCTION public.totem_confirmar_sessao_qr(p_sessao_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id uuid;
  v_nome text;
  v_sessao public.totem_sessoes_qr%ROWTYPE;
BEGIN
  IF public.is_totem() OR public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'nao_autorizado');
  END IF;

  v_aluno_id := public.current_aluno_id();
  IF v_aluno_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'aluno_nao_encontrado');
  END IF;

  SELECT * INTO v_sessao
  FROM public.totem_sessoes_qr
  WHERE id = p_sessao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'sessao_invalida');
  END IF;

  IF v_sessao.status <> 'aguardando' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'sessao_indisponivel');
  END IF;

  IF v_sessao.expira_em <= now() THEN
    UPDATE public.totem_sessoes_qr SET status = 'expirado' WHERE id = p_sessao_id;
    RETURN jsonb_build_object('ok', false, 'message', 'qr_expirado');
  END IF;

  IF trim(coalesce(p_token, '')) <> trim(v_sessao.token) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'token_invalido');
  END IF;

  SELECT nome INTO v_nome FROM public.alunos WHERE id = v_aluno_id;

  UPDATE public.totem_sessoes_qr
  SET status = 'identificado',
      aluno_id = v_aluno_id,
      identificado_em = now()
  WHERE id = p_sessao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'aluno', jsonb_build_object('id', v_aluno_id, 'nome', v_nome)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.totem_confirmar_sessao_qr(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_confirmar_sessao_qr(uuid, text) TO authenticated;

-- Totem: resolve aluno após identificação QR.
CREATE OR REPLACE FUNCTION public.totem_aluno_por_id(p_aluno_id uuid)
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
  WHERE id = p_aluno_id
    AND ativo = true
  LIMIT 1;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.totem_aluno_por_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_aluno_por_id(uuid) TO authenticated;
