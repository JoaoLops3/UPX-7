import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { AluguelComItem } from '../types/database';
import {
  isAluguelPendenteParaAluno,
  syncAllQuadraAlugueisTiming,
} from '../lib/quadraAluguelTiming';
import { getSupabaseErrorMessage } from '../utils/supabaseError';

export function useAlugueis(alunoId: string) {
  const [alugueis, setAlugueis] = useState<AluguelComItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlugueis = useCallback(async (skipSync = false) => {
    if (!alunoId) {
      setAlugueis([]);
      setLoading(false);
      setError(null);
      return false;
    }

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('alugueis')
      .select('*, itens(*)')
      .eq('aluno_id', alunoId)
      .order('inicio', { ascending: false });

    if (fetchError) {
      setError(getSupabaseErrorMessage(fetchError));
      setAlugueis([]);
      setLoading(false);
      return false;
    }

    const rows = (data as AluguelComItem[]) ?? [];

    if (!skipSync && (await syncAllQuadraAlugueisTiming(rows))) {
      setLoading(false);
      return fetchAlugueis(true);
    }

    setError(null);
    setAlugueis(rows);
    setLoading(false);
    return true;
  }, [alunoId]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const ok = await fetchAlugueis();
      // Realtime só após REST OK; na web evita spam de WebSocket se o projeto estiver pausado
      if (!ok || !alunoId) return;
      if (Platform.OS === 'web') return;

      channel = supabase
        .channel('alugueis-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alugueis' },
          () => {
            void fetchAlugueis();
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAlugueis, alunoId]);

  const aluguelAtivo = useMemo(
    () => alugueis.find((a) => isAluguelPendenteParaAluno(a)) ?? null,
    [alugueis],
  );

  useEffect(() => {
    if (!aluguelAtivo || aluguelAtivo.itens.tipo !== 'quadra') return;
    if (aluguelAtivo.status !== 'ativo' && aluguelAtivo.status !== 'aguardando_nfc') {
      return;
    }

    const id = setInterval(() => {
      void fetchAlugueis();
    }, 15_000);

    return () => clearInterval(id);
  }, [aluguelAtivo?.id, aluguelAtivo?.status, aluguelAtivo?.itens.tipo, fetchAlugueis]);

  return { alugueis, loading, aluguelAtivo, error, refetch: fetchAlugueis };
}
