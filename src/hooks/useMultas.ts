import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MultaComAluguel } from '../types/database';

export function useMultas(alunoId: string) {
  const [multas, setMultas] = useState<MultaComAluguel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMultas = useCallback(async () => {
    if (!alunoId) {
      setMultas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('multas')
      .select('*, alugueis(*, itens(nome, numero))')
      .eq('aluno_id', alunoId)
      .order('gerada_em', { ascending: false });

    if (!error && data) {
      setMultas(data as MultaComAluguel[]);
    }
    setLoading(false);
  }, [alunoId]);

  useEffect(() => {
    fetchMultas();
  }, [fetchMultas]);

  const totalPendente = useMemo(
    () =>
      multas
        .filter((m) => m.status === 'pendente')
        .reduce((sum, m) => sum + Number(m.valor), 0),
    [multas],
  );

  const multasOrdenadas = useMemo(() => {
    const pendentes = multas.filter((m) => m.status === 'pendente');
    const pagas = multas.filter((m) => m.status === 'pago');
    return [...pendentes, ...pagas];
  }, [multas]);

  return {
    multas: multasOrdenadas,
    totalPendente,
    loading,
    refetch: fetchMultas,
  };
}
