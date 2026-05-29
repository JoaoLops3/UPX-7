-- Permite o pc-bridge gravar leituras (usa anon ou service_role no .env do totem).

DROP POLICY IF EXISTS "logs_nfc_insert_totem" ON public.logs_nfc;
CREATE POLICY "logs_nfc_insert_totem" ON public.logs_nfc
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (
    uid_cartao IS NOT NULL
    AND length(trim(uid_cartao)) >= 4
    AND uid_totem IS NOT NULL
  );
