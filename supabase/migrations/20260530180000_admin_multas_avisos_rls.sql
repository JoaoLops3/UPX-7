-- Admin: ler/inserir/remover multas e gerenciar avisos dos alunos.

DROP POLICY IF EXISTS "multas_select_admin" ON public.multas;
CREATE POLICY "multas_select_admin" ON public.multas
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "multas_insert_admin" ON public.multas;
CREATE POLICY "multas_insert_admin" ON public.multas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "multas_delete_admin" ON public.multas;
CREATE POLICY "multas_delete_admin" ON public.multas
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "aluno_avisos_admin_all" ON public.aluno_avisos;
CREATE POLICY "aluno_avisos_admin_all" ON public.aluno_avisos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
