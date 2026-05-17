import { appStorageGetItem, appStorageSetItem } from '../storage/appStorage';
import { STORAGE_KEYS } from './constants';

type NotifiedMap = Record<string, number>;

async function readMap(): Promise<NotifiedMap> {
  try {
    const raw = await appStorageGetItem(STORAGE_KEYS.notified);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotifiedMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: NotifiedMap): Promise<void> {
  await appStorageSetItem(STORAGE_KEYS.notified, JSON.stringify(map));
}

/** Evita repetir alertas imediatos (chuva, multa, devolução urgente). */
export async function wasNotifiedRecently(
  key: string,
  cooldownMs?: number,
): Promise<boolean> {
  const map = await readMap();
  const at = map[key];
  if (at == null) return false;
  if (cooldownMs == null) return true;
  return Date.now() - at < cooldownMs;
}

export async function markNotified(key: string): Promise<void> {
  const map = await readMap();
  map[key] = Date.now();
  await writeMap(map);
}

export async function clearNotifiedKeys(prefix: string): Promise<void> {
  const map = await readMap();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (key.startsWith(prefix)) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) await writeMap(map);
}
