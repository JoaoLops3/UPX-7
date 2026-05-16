import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Admin } from '../types/database';
import { getSupabaseErrorMessage } from '../utils/supabaseError';

export function useAdmin() {
  const { session, user } = useAuth();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmin = useCallback(async () => {
    if (!session || !user?.email) {
      setAdmin(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const email = user.email.trim().toLowerCase();
    const { data, error: fetchError } = await supabase
      .from('admins')
      .select('*')
      .ilike('email', email)
      .eq('ativo', true)
      .maybeSingle();

    if (fetchError) {
      setError(getSupabaseErrorMessage(fetchError));
      setAdmin(null);
    } else {
      setError(null);
      setAdmin((data as Admin) ?? null);
    }
    setLoading(false);
  }, [session, user?.email]);

  useEffect(() => {
    void fetchAdmin();
  }, [fetchAdmin]);

  return {
    admin,
    isAdmin: Boolean(admin),
    loading,
    error,
    refetch: fetchAdmin,
  };
}
