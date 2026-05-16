import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AluguelComItem } from '../types/database';

export function useAlugueis(alunoId: string) {
  const [alugueis, setAlugueis] = useState<AluguelComItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlugueis = useCallback(async () => {
    if (!alunoId) {
      setAlugueis([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('alugueis')
      .select('*, itens(*)')
      .eq('aluno_id', alunoId)
      .order('inicio', { ascending: false });

    if (!error && data) {
      setAlugueis(data as AluguelComItem[]);
    }
    setLoading(false);
  }, [alunoId]);

  useEffect(() => {
    fetchAlugueis();

    const channel = supabase
      .channel('alugueis-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alugueis' },
        () => {
          fetchAlugueis();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlugueis]);

  const aluguelAtivo = useMemo(
    () => alugueis.find((a) => a.status === 'ativo') ?? null,
    [alugueis],
  );

  return { alugueis, loading, aluguelAtivo, refetch: fetchAlugueis };
}
