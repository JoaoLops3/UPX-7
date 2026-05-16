import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Aluno } from '../types/database';
import { getSupabaseErrorMessage } from '../utils/supabaseError';

export function useAluno() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAluno = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const { data, error: fetchError } = await supabase
        .from('alunos')
        .select('*')
        .eq('email', user.email)
        .eq('ativo', true)
        .maybeSingle();

      if (fetchError) {
        setError(getSupabaseErrorMessage(fetchError));
        setAluno(null);
      } else if (data) {
        setError(null);
        setAluno(data as Aluno);
      } else {
        setAluno(null);
        setError(null);
      }
      setLoading(false);
      return;
    }

    if (Platform.OS === 'web' && __DEV__) {
      const { data, error: fetchError } = await supabase
        .from('alunos')
        .select('*')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        setError(getSupabaseErrorMessage(fetchError));
        setAluno(null);
      } else {
        setError(null);
        setAluno((data as Aluno) ?? null);
      }
    } else {
      setAluno(null);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAluno();
  }, [fetchAluno]);

  return { aluno, loading, error, refetch: fetchAluno };
}
