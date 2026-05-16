-- Corrige 403 no PATCH de alugueis: trigger gerar_multa insería multa (RLS em multas)
-- para encerramento automático da quadra, onde não há multa.

CREATE OR REPLACE FUNCTION public.gerar_multa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_dias int;
  v_valor numeric;
BEGIN
  IF NEW.fim_real IS NULL OR NEW.fim_real <= NEW.fim_previsto THEN
    RETURN NEW;
  END IF;

  SELECT tipo INTO v_tipo FROM public.itens WHERE id = NEW.item_id;
  IF v_tipo IS DISTINCT FROM 'guarda_chuva' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.multas WHERE aluguel_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_dias := ceil(extract(epoch FROM NEW.fim_real - NEW.fim_previsto) / 86400)::int;
  IF v_dias <= 0 THEN
    RETURN NEW;
  END IF;

  v_valor := v_dias * 5.00;

  INSERT INTO public.multas (aluno_id, aluguel_id, dias_atraso, valor, status)
  VALUES (NEW.aluno_id, NEW.id, v_dias, v_valor, 'pendente');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_multa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_multa() TO authenticated, service_role;

DROP POLICY IF EXISTS "multas_insert_own_auth" ON public.multas;
CREATE POLICY "multas_insert_own_auth" ON public.multas
  FOR INSERT TO authenticated
  WITH CHECK (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

DROP POLICY IF EXISTS "alugueis_update_own_auth" ON public.alugueis;
CREATE POLICY "alugueis_update_own_auth" ON public.alugueis
  FOR UPDATE TO authenticated
  USING (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  )
  WITH CHECK (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

DROP POLICY IF EXISTS "alugueis_select_own_auth" ON public.alugueis;
CREATE POLICY "alugueis_select_own_auth" ON public.alugueis
  FOR SELECT TO authenticated
  USING (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

DROP POLICY IF EXISTS "alugueis_insert_own_auth" ON public.alugueis;
CREATE POLICY "alugueis_insert_own_auth" ON public.alugueis
  FOR INSERT TO authenticated
  WITH CHECK (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

DROP POLICY IF EXISTS "alugueis_select_admin" ON public.alugueis;
CREATE POLICY "alugueis_select_admin" ON public.alugueis
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "alugueis_update_admin" ON public.alugueis;
CREATE POLICY "alugueis_update_admin" ON public.alugueis
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "multas_select_own_auth" ON public.multas;
CREATE POLICY "multas_select_own_auth" ON public.multas
  FOR SELECT TO authenticated
  USING (
    aluno_id IN (
      SELECT alunos.id
      FROM public.alunos
      WHERE lower(trim(alunos.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );
