import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Totem } from '../types/database';
import { getSupabaseErrorMessage } from '../utils/supabaseError';

/** Detecta se a conta logada é um totem (aparelho fixo), análogo ao useAdmin. */
export function useTotem() {
  const { session, user } = useAuth();
  const [totem, setTotem] = useState<Totem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotem = useCallback(async () => {
    if (!session || !user?.email) {
      setTotem(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const email = user.email.trim().toLowerCase();
    const { data, error: fetchError } = await supabase
      .from('totens')
      .select('*')
      .ilike('email', email)
      .eq('ativo', true)
      .maybeSingle();

    if (fetchError) {
      setError(getSupabaseErrorMessage(fetchError));
      setTotem(null);
    } else {
      setError(null);
      setTotem((data as Totem) ?? null);
    }
    setLoading(false);
  }, [session, user?.email]);

  useEffect(() => {
    void fetchTotem();
  }, [fetchTotem]);

  return {
    totem,
    isTotem: Boolean(totem),
    loading,
    error,
    refetch: fetchTotem,
  };
}
