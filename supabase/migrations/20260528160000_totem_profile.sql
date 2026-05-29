-- Perfil de TOTEM: conta dedicada que roda no aparelho fixo do totem.
-- A ação (check-in / devolução / aluguel) já é feita pelo trigger no servidor;
-- o totem apenas exibe o resultado da leitura (tela kiosk). O aluno comum perde
-- as telas de ação e fica só com reserva antecipada + visualização.

CREATE TABLE IF NOT EXISTS public.totens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text,
  uid_totem text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.totens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "totens_select_own" ON public.totens;
CREATE POLICY "totens_select_own" ON public.totens
  FOR SELECT TO authenticated
  USING (lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', ''))));

-- A conta logada é um totem ativo?
CREATE OR REPLACE FUNCTION public.is_totem()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.totens
    WHERE lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      AND ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_totem() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_totem() TO anon, authenticated;

-- Totem pode ler todas as leituras do log (para exibir o feedback de quem passou).
DROP POLICY IF EXISTS "logs_nfc_select_totem" ON public.logs_nfc;
CREATE POLICY "logs_nfc_select_totem" ON public.logs_nfc
  FOR SELECT TO authenticated
  USING (public.is_totem());

-- Nome do aluno por UID, sem expor a tabela inteira (totem mostra "Fulano, ...").
CREATE OR REPLACE FUNCTION public.totem_aluno_nome(p_uid text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome FROM public.alunos
  WHERE upper(replace(trim(coalesce(uid_nfc, '')), ' ', '')) =
        upper(replace(trim(coalesce(p_uid, '')), ' ', ''))
    AND ativo = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.totem_aluno_nome(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totem_aluno_nome(text) TO authenticated;

-- Conta de autenticação do totem (login do aparelho). Senha definida aqui.
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'totem@facens.br';
  v_password text := 'TotemUPX7!2026';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', 'Totem Quadra 01'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;
END $$;

INSERT INTO public.totens (email, nome, uid_totem, ativo)
VALUES ('totem@facens.br', 'Totem Quadra 01', 'TOTEM-QUADRA-01', true)
ON CONFLICT (email) DO UPDATE SET ativo = true, nome = excluded.nome, uid_totem = excluded.uid_totem;
