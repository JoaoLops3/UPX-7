import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeAlugueisChanges } from '../lib/alugueisRealtime';
import { supabase } from '../lib/supabase';
import {
  dedupeAgendadoReservasQuadra,
  pickProximaReservaQuadra,
  syncAgendadoNoShows,
} from '../lib/quadraReserva';
import type { AluguelComItem } from '../types/database';
import {
  isAluguelPendenteParaAluno,
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

    let rows = (data as AluguelComItem[]) ?? [];

    if (!skipSync) {
      let needsRefetch = false;
      if (await dedupeAgendadoReservasQuadra(alunoId)) needsRefetch = true;
      if (await syncAgendadoNoShows(rows)) needsRefetch = true;
      if (needsRefetch) {
        setLoading(false);
        return fetchAlugueis(true);
      }
    }

    setError(null);
    setAlugueis(rows);
    setLoading(false);
    return true;
  }, [alunoId]);

  useEffect(() => {
    if (!alunoId) return;

    void fetchAlugueis();

    return subscribeAlugueisChanges(alunoId, () => {
      void fetchAlugueis();
    });
  }, [fetchAlugueis, alunoId]);

  const aluguelAtivo = useMemo(
    () => alugueis.find((a) => isAluguelPendenteParaAluno(a)) ?? null,
    [alugueis],
  );

  const reservaQuadra = useMemo(() => pickProximaReservaQuadra(alugueis), [alugueis]);

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

  return { alugueis, loading, aluguelAtivo, reservaQuadra, error, refetch: fetchAlugueis };
}
