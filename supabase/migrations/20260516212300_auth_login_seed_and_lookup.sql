-- Lookup de e-mail por RA para login (anon pode chamar sem expor tabela inteira)
CREATE OR REPLACE FUNCTION public.lookup_aluno_email_for_login(p_ra text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(email))
  FROM public.alunos
  WHERE ativo = true
    AND ra = trim(p_ra)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_aluno_email_for_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_aluno_email_for_login(text) TO anon, authenticated;

DROP POLICY IF EXISTS "alunos_select_own_auth" ON public.alunos;
CREATE POLICY "alunos_select_own_auth" ON public.alunos
  FOR SELECT TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- Usuário Auth alinhado ao aluno de teste (223969@facens.br) — senha definida no Dashboard ou seed local
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := '223969@facens.br';
  v_password text := 'Aluno@223969';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', 'João Lopes'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;
END $$;
