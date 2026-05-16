import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Aluno } from '../types/database';
import { getSupabaseErrorMessage } from '../utils/supabaseError';

export function useAluno() {
  const { session, user } = useAuth();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAluno = useCallback(async () => {
    if (!session || !user?.email) {
      setAluno(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const email = user.email.trim().toLowerCase();
    const { data, error: fetchError } = await supabase
      .from('alunos')
      .select('*')
      .ilike('email', email)
      .eq('ativo', true)
      .maybeSingle();

    if (fetchError) {
      setError(getSupabaseErrorMessage(fetchError));
      setAluno(null);
    } else if (data) {
      setError(null);
      setAluno(data as Aluno);
    } else {
      setError(null);
      setAluno(null);
    }
    setLoading(false);
  }, [session, user?.email]);

  useEffect(() => {
    void fetchAluno();
  }, [fetchAluno]);

  return {
    aluno,
    loading,
    error,
    notRegistered: Boolean(session && user?.email && !loading && !aluno && !error),
    refetch: fetchAluno,
  };
}
