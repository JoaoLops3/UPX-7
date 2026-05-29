-- Aluno autenticado pode receber Realtime dos logs do proprio cartao (uid_nfc).

DROP POLICY IF EXISTS "logs_nfc_select_own_tag" ON public.logs_nfc;
CREATE POLICY "logs_nfc_select_own_tag" ON public.logs_nfc
  FOR SELECT TO authenticated
  USING (
    upper(replace(trim(uid_cartao), ' ', '')) IN (
      SELECT upper(replace(trim(coalesce(uid_nfc, '')), ' ', ''))
      FROM public.alunos
      WHERE lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
        AND ativo = true
        AND uid_nfc IS NOT NULL
        AND length(trim(uid_nfc)) >= 4
    )
  );
