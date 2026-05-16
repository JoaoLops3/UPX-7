-- Tabela de administradores (e-mail deve existir no Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE ativo = true
      AND lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

GRANT SELECT ON public.admins TO authenticated;

DROP POLICY IF EXISTS "admins_select_if_admin" ON public.admins;
CREATE POLICY "admins_select_if_admin" ON public.admins
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "alunos_select_admin" ON public.alunos;
CREATE POLICY "alunos_select_admin" ON public.alunos
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "alunos_update_admin" ON public.alunos;
CREATE POLICY "alunos_update_admin" ON public.alunos
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "alunos_insert_admin" ON public.alunos;
CREATE POLICY "alunos_insert_admin" ON public.alunos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "multas_update_admin" ON public.multas;
CREATE POLICY "multas_update_admin" ON public.multas
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "itens_insert_admin" ON public.itens;
CREATE POLICY "itens_insert_admin" ON public.itens
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "logs_nfc_select_admin" ON public.logs_nfc;
CREATE POLICY "logs_nfc_select_admin" ON public.logs_nfc
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin de teste (criar usuário Auth com o mesmo e-mail e senha no Dashboard ou abaixo)
INSERT INTO public.admins (email, nome)
VALUES ('admin@facens.br', 'Admin UPX 7')
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'admin@facens.br';
  v_password text := 'Admin@UPX7';
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
      jsonb_build_object('nome', 'Admin UPX 7'),
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
