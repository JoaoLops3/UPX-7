-- Histórico de avisos do aluno (inclui estado lido) — persiste ao sair do app.

CREATE TABLE IF NOT EXISTS public.aluno_avisos (
  aluno_id uuid NOT NULL REFERENCES public.alunos (id) ON DELETE CASCADE,
  alert_id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL CHECK (tone IN ('danger', 'warning', 'info')),
  action text,
  created_at timestamptz NOT NULL,
  read_at timestamptz,
  PRIMARY KEY (aluno_id, alert_id)
);

CREATE INDEX IF NOT EXISTS aluno_avisos_aluno_created_idx
  ON public.aluno_avisos (aluno_id, created_at DESC);

ALTER TABLE public.aluno_avisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aluno_avisos_select_own" ON public.aluno_avisos;
CREATE POLICY "aluno_avisos_select_own" ON public.aluno_avisos
  FOR SELECT TO authenticated
  USING (aluno_id = public.current_aluno_id());

DROP POLICY IF EXISTS "aluno_avisos_insert_own" ON public.aluno_avisos;
CREATE POLICY "aluno_avisos_insert_own" ON public.aluno_avisos
  FOR INSERT TO authenticated
  WITH CHECK (aluno_id = public.current_aluno_id());

DROP POLICY IF EXISTS "aluno_avisos_update_own" ON public.aluno_avisos;
CREATE POLICY "aluno_avisos_update_own" ON public.aluno_avisos
  FOR UPDATE TO authenticated
  USING (aluno_id = public.current_aluno_id())
  WITH CHECK (aluno_id = public.current_aluno_id());

GRANT SELECT, INSERT, UPDATE ON public.aluno_avisos TO authenticated;
