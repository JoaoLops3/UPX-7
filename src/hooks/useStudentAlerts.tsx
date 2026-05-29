import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAlugueis } from './useAlugueis';
import { useMultas } from './useMultas';
import { useWeather } from './useWeather';
import { buildStudentAlerts } from '../lib/studentAlerts';
import {
  loadStudentAlertHistory,
  markStudentAlertRead,
  syncStudentAlertHistory,
  type StoredStudentAlert,
} from '../lib/studentAlertHistory';

type StudentAlertsContextValue = {
  alerts: StoredStudentAlert[];
  count: number;
  loading: boolean;
  refetch: () => void;
  markAlertRead: (alert: StoredStudentAlert) => Promise<void>;
};

const StudentAlertsContext = createContext<StudentAlertsContextValue>({
  alerts: [],
  count: 0,
  loading: true,
  refetch: () => {},
  markAlertRead: async () => {},
});

export function StudentAlertsProvider({
  alunoId,
  children,
}: {
  alunoId: string;
  children: ReactNode;
}) {
  const { aluguelAtivo, reservaQuadra, loading: alugueisLoading, refetch: refetchAlugueis } =
    useAlugueis(alunoId);
  const { multas, loading: multasLoading, refetch: refetchMultas } = useMultas(alunoId);
  const { weather, loading: weatherLoading, refresh: refreshWeather } = useWeather();

  const refetch = useCallback(() => {
    void refetchAlugueis();
    void refetchMultas();
    void refreshWeather();
  }, [refetchAlugueis, refetchMultas, refreshWeather]);

  const multasPendentes = useMemo(
    () => multas.filter((m) => m.status === 'pendente'),
    [multas],
  );

  const activeAlerts = useMemo(
    () =>
      buildStudentAlerts({
        aluguelAtivo,
        reservaQuadra,
        multasPendentes,
        weather,
      }),
    [aluguelAtivo, reservaQuadra, multasPendentes, weather],
  );

  const activeAlertIds = useMemo(
    () => new Set(activeAlerts.map((alert) => alert.id)),
    [activeAlerts],
  );

  const activeAlertsKey = useMemo(
    () => activeAlerts.map((a) => `${a.id}:${a.title}:${a.body}`).join('|'),
    [activeAlerts],
  );

  const [history, setHistory] = useState<StoredStudentAlert[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!alunoId) {
      setHistory([]);
      setHistoryReady(true);
      return;
    }

    setHistoryReady(false);
    void loadStudentAlertHistory(alunoId).then((stored) => {
      if (!cancelled) {
        setHistory(stored);
        setHistoryReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [alunoId]);

  useEffect(() => {
    if (!alunoId || !historyReady || alugueisLoading || multasLoading || weatherLoading) return;
    let cancelled = false;
    void syncStudentAlertHistory(alunoId, activeAlerts).then((merged) => {
      if (!cancelled) setHistory(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [
    alunoId,
    activeAlertsKey,
    historyReady,
    alugueisLoading,
    multasLoading,
    weatherLoading,
    activeAlerts,
  ]);

  const markAlertRead = useCallback(
    async (alert: StoredStudentAlert) => {
      if (!alunoId) return;

      const readAt = alert.readAt ?? new Date().toISOString();
      const readAlert = { ...alert, readAt };
      setHistory((prev) =>
        prev.map((item) => (item.id === alert.id ? readAlert : item)),
      );
      await markStudentAlertRead(alunoId, readAlert);
    },
    [alunoId],
  );

  const loading =
    Boolean(alunoId) &&
    (alugueisLoading || multasLoading || weatherLoading || !historyReady);

  const count = useMemo(
    () => history.filter((alert) => !alert.readAt && activeAlertIds.has(alert.id)).length,
    [history, activeAlertIds],
  );

  const value = useMemo(
    () => ({
      alerts: history,
      count,
      loading,
      refetch,
      markAlertRead,
    }),
    [history, count, loading, refetch, markAlertRead],
  );

  return (
    <StudentAlertsContext.Provider value={value}>{children}</StudentAlertsContext.Provider>
  );
}

export function useStudentAlerts() {
  return useContext(StudentAlertsContext);
}
