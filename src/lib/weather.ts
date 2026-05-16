/**
 * Clima do campus Facens (Sorocaba).
 * Tenta OpenWeather se EXPO_PUBLIC_OPENWEATHER_API_KEY estiver válida;
 * em falha (401, chave ausente, etc.) usa Open-Meteo sem chave.
 */
const DEFAULT_LAT = -23.5015;
const DEFAULT_LON = -47.4526;
const TIMEZONE = 'America/Sao_Paulo';

export type WeatherSnapshot = {
  temperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  weatherCode: number;
  isDay: boolean;
  description: string;
  isRainy: boolean;
  fetchedAt: string;
  source: 'openweather' | 'open-meteo';
};

type OpenWeatherCondition = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

type OpenWeatherResponse = {
  weather?: OpenWeatherCondition[];
  main?: { temp: number; humidity: number };
  rain?: { '1h'?: number; '3h'?: number };
  sys?: { sunrise: number; sunset: number };
};

type OpenMeteoCurrent = {
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  is_day: number;
};

const RAIN_MAINS = new Set(['Rain', 'Drizzle', 'Thunderstorm']);
const WMO_RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

export function isRainyConditions(
  weatherId: number,
  precipitationMm: number,
  main?: string,
): boolean {
  if (precipitationMm > 0.05) return true;
  if (main && RAIN_MAINS.has(main)) return true;
  if (WMO_RAIN_CODES.has(weatherId)) return true;
  const group = Math.floor(weatherId / 100);
  return group === 2 || group === 3 || group === 5;
}

function weatherDescriptionFromWmo(code: number): string {
  if (code === 0) return 'Céu limpo';
  if (code <= 3) return 'Parcialmente nublado';
  if (code <= 48) return 'Neblina';
  if (code <= 57) return 'Garoa';
  if (code <= 67) return 'Chuva';
  if (code <= 82) return 'Pancadas de chuva';
  if (code <= 99) return 'Tempestade';
  return 'Tempo variável';
}

function getCoords(): { lat: number; lon: number } {
  const lat = Number(process.env.EXPO_PUBLIC_WEATHER_LAT);
  const lon = Number(process.env.EXPO_PUBLIC_WEATHER_LON);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon };
  }
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

function getOpenWeatherKey(): string | null {
  const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim();
  return key || null;
}

function capitalizePt(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isDayNow(sunrise?: number, sunset?: number, icon?: string): boolean {
  if (icon?.endsWith('d')) return true;
  if (icon?.endsWith('n')) return false;
  if (sunrise != null && sunset != null) {
    const now = Math.floor(Date.now() / 1000);
    return now >= sunrise && now < sunset;
  }
  return true;
}

async function fetchFromOpenWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  const apiKey = getOpenWeatherKey();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
    units: 'metric',
    lang: 'pt_br',
  });
  const url = `https://api.openweathermap.org/data/2.5/weather?${params}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const json = (await response.json()) as OpenWeatherResponse;
  const condition = json.weather?.[0];
  const mainBlock = json.main;
  if (!condition || !mainBlock) return null;

  const precipitationMm = json.rain?.['1h'] ?? json.rain?.['3h'] ?? 0;
  const weatherCode = condition.id;
  const isDay = isDayNow(json.sys?.sunrise, json.sys?.sunset, condition.icon);

  return {
    temperatureC: Math.round(mainBlock.temp),
    humidityPercent: Math.round(mainBlock.humidity),
    precipitationMm,
    weatherCode,
    isDay,
    description: capitalizePt(condition.description),
    isRainy: isRainyConditions(weatherCode, precipitationMm, condition.main),
    fetchedAt: new Date().toISOString(),
    source: 'openweather',
  };
}

async function fetchFromOpenMeteo(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,is_day` +
    `&timezone=${encodeURIComponent(TIMEZONE)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Não foi possível carregar o clima agora.');
  }

  const json = (await response.json()) as { current?: OpenMeteoCurrent };
  const current = json.current;
  if (!current) {
    throw new Error('Resposta de clima inválida.');
  }

  const weatherCode = current.weather_code;
  const precipitationMm = current.precipitation ?? 0;

  return {
    temperatureC: Math.round(current.temperature_2m),
    humidityPercent: Math.round(current.relative_humidity_2m),
    precipitationMm,
    weatherCode,
    isDay: current.is_day === 1,
    description: weatherDescriptionFromWmo(weatherCode),
    isRainy: isRainyConditions(weatherCode, precipitationMm),
    fetchedAt: new Date().toISOString(),
    source: 'open-meteo',
  };
}

export async function fetchCampusWeather(): Promise<WeatherSnapshot> {
  const { lat, lon } = getCoords();

  try {
    const openWeather = await fetchFromOpenWeather(lat, lon);
    if (openWeather) return openWeather;
  } catch {
    /* rede ou parse — tenta fallback */
  }

  return fetchFromOpenMeteo(lat, lon);
}

export function weatherIconName(
  snapshot: WeatherSnapshot,
): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  if (snapshot.isRainy) return 'rainy-outline';

  const code = snapshot.weatherCode;
  const isOpenWeather = snapshot.source === 'openweather';

  if (isOpenWeather) {
    if (code === 800) return snapshot.isDay ? 'sunny-outline' : 'moon-outline';
    if (code > 800) return snapshot.isDay ? 'partly-sunny-outline' : 'cloudy-night-outline';
    if (code >= 701 && code <= 781) return 'cloud-outline';
    return 'partly-sunny-outline';
  }

  if (code === 0) return snapshot.isDay ? 'sunny-outline' : 'moon-outline';
  if (code <= 3) return snapshot.isDay ? 'partly-sunny-outline' : 'cloudy-night-outline';
  if (code <= 48) return 'cloud-outline';
  return 'partly-sunny-outline';
}
