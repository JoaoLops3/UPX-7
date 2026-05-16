import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCampusWeather, type WeatherSnapshot } from '../lib/weather';

const CACHE_MS = 10 * 60_000;

export function useWeather() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!force && lastFetchRef.current > 0 && Date.now() - lastFetchRef.current < CACHE_MS) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCampusWeather();
      setWeather(data);
      lastFetchRef.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar clima.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  return { weather, loading, error, refresh };
}
