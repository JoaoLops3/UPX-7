import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAlugueis } from './useAlugueis';
import { useMultas } from './useMultas';
import { useWeather } from './useWeather';
import { getNotificationsEnabled } from '../lib/notifications/preferences';
import { syncStudentNotifications } from '../lib/notifications/syncStudentNotifications';

const SYNC_DEBOUNCE_MS = 2_000;

/** Mantém notificações locais alinhadas com aluguel, reserva, multas e clima. */
export function useStudentNotifications(alunoId: string) {
  const { aluguelAtivo, reservaQuadra, loading: alugueisLoading } = useAlugueis(alunoId);
  const { multas, loading: multasLoading } = useMultas(alunoId);
  const { weather, loading: weatherLoading, refresh: refreshWeather } = useWeather();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (!alunoId || syncingRef.current) return;
    if (alugueisLoading || multasLoading || weatherLoading) return;

    const enabled = await getNotificationsEnabled();
    if (!enabled) {
      await syncStudentNotifications({
        aluguelAtivo: null,
        reservaQuadra: null,
        multasPendentes: [],
        weather: null,
      });
      return;
    }

    syncingRef.current = true;
    try {
      const multasPendentes = multas.filter((m) => m.status === 'pendente');
      await syncStudentNotifications({
        aluguelAtivo,
        reservaQuadra,
        multasPendentes,
        weather,
      });
    } finally {
      syncingRef.current = false;
    }
  }, [
    alunoId,
    aluguelAtivo,
    reservaQuadra,
    multas,
    weather,
    alugueisLoading,
    multasLoading,
    weatherLoading,
  ]);

  const scheduleSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSync();
    }, SYNC_DEBOUNCE_MS);
  }, [runSync]);

  useEffect(() => {
    scheduleSync();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scheduleSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshWeather(true);
        scheduleSync();
      }
    });
    return () => sub.remove();
  }, [refreshWeather, scheduleSync]);

  return { refresh: runSync };
}
