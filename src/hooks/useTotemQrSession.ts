import { useCallback, useEffect, useRef, useState } from 'react';
import { buildTotemQrValue, type TotemQrSessionResult } from '../lib/totemQr';
import { supabase } from '../lib/supabase';
import type { TotemAluno } from '../screens/TotemActionScreen';

const REFRESH_MS = 40_000;

type Options = {
  enabled: boolean;
  onIdentified: (aluno: TotemAluno) => void;
};

export function useTotemQrSession({ enabled, onIdentified }: Options) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sessaoIdRef = useRef<string | null>(null);
  const onIdentifiedRef = useRef(onIdentified);

  useEffect(() => {
    onIdentifiedRef.current = onIdentified;
  }, [onIdentified]);

  const refreshSession = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('totem_criar_sessao_qr', {});
    setLoading(false);

    if (error || !data) {
      setQrValue(null);
      sessaoIdRef.current = null;
      return;
    }

    const result = data as TotemQrSessionResult;
    if (!result.ok || !result.sessao_id || !result.token) {
      setQrValue(null);
      sessaoIdRef.current = null;
      return;
    }

    sessaoIdRef.current = result.sessao_id;
    setQrValue(buildTotemQrValue(result.sessao_id, result.token));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setQrValue(null);
      sessaoIdRef.current = null;
      return;
    }

    void refreshSession();
    const interval = setInterval(() => void refreshSession(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [enabled, refreshSession]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('totem-qr-session')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'totem_sessoes_qr' },
        (payload) => {
          void (async () => {
            const row = payload.new as {
              id?: string;
              status?: string;
              aluno_id?: string | null;
            };
            const currentId = sessaoIdRef.current;
            if (!currentId || row.id !== currentId) return;
            if (row.status !== 'identificado' || !row.aluno_id) return;

            const { data } = await supabase.rpc('totem_aluno_por_id', {
              p_aluno_id: row.aluno_id,
            });
            const resolved = (data as TotemAluno | null) ?? null;
            if (resolved?.id) {
              sessaoIdRef.current = null;
              setQrValue(null);
              onIdentifiedRef.current(resolved);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { qrValue, loading, refreshSession };
}
