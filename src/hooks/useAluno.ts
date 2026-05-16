import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Aluno } from '../types/database';

export function useAluno() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAluno = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setAluno(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('email', user.email)
      .eq('ativo', true)
      .maybeSingle();

    if (!error && data) {
      setAluno(data as Aluno);
    } else {
      setAluno(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAluno();
  }, [fetchAluno]);

  return { aluno, loading, refetch: fetchAluno };
}
