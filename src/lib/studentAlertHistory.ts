import { appStorageGetItem, appStorageRemoveItem, appStorageSetItem } from './storage/appStorage';
import type { StudentAlert } from './studentAlerts';
import {
  fetchRemoteAlertHistory,
  saveRemoteAlert,
  saveRemoteAlerts,
} from './studentAlertRemote';

const LEGACY_DISMISSED_KEY = 'upx7_student_alerts_dismissed';

export type StoredStudentAlert = StudentAlert & {
  readAt: string | null;
};

type HistoryMap = Record<string, StoredStudentAlert>;

function storageKey(alunoId: string): string {
  return `upx7_student_alerts_history:${alunoId}`;
}

async function readMap(alunoId: string): Promise<HistoryMap> {
  try {
    const raw = await appStorageGetItem(storageKey(alunoId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HistoryMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(alunoId: string, map: HistoryMap): Promise<void> {
  await appStorageSetItem(storageKey(alunoId), JSON.stringify(map));
}

function mergeAlertEntries(
  ...entries: Array<StoredStudentAlert | undefined>
): StoredStudentAlert | undefined {
  const defined = entries.filter(Boolean) as StoredStudentAlert[];
  if (defined.length === 0) return undefined;

  const base = defined[0];
  return defined.slice(1).reduce<StoredStudentAlert>(
    (acc, entry) => ({
      ...acc,
      ...entry,
      createdAt: acc.createdAt || entry.createdAt,
      readAt: acc.readAt ?? entry.readAt ?? null,
    }),
    { ...base },
  );
}

function mergeHistoryMaps(...maps: HistoryMap[]): HistoryMap {
  const merged: HistoryMap = {};
  const ids = new Set<string>();
  for (const map of maps) {
    for (const id of Object.keys(map)) ids.add(id);
  }
  for (const id of ids) {
    const entry = mergeAlertEntries(...maps.map((map) => map[id]));
    if (entry) merged[id] = entry;
  }
  return merged;
}

async function migrateLegacyDismissed(map: HistoryMap): Promise<void> {
  try {
    const raw = await appStorageGetItem(LEGACY_DISMISSED_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as Record<string, number>;
    for (const [id, ts] of Object.entries(legacy)) {
      if (map[id] && map[id].readAt == null) {
        map[id].readAt = new Date(ts).toISOString();
      }
    }
    await appStorageRemoveItem(LEGACY_DISMISSED_KEY);
  } catch {
    /* ignora migração */
  }
}

function sortByDateDesc(alerts: StoredStudentAlert[]): StoredStudentAlert[] {
  return [...alerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mapFromAlerts(alerts: StoredStudentAlert[]): HistoryMap {
  return Object.fromEntries(alerts.map((alert) => [alert.id, alert]));
}

function hasAlunoId(alunoId: string): boolean {
  return alunoId.trim().length > 0;
}

/** Carrega histórico mesclando cache local e Supabase (lido persiste ao sair do app). */
export async function loadStudentAlertHistory(alunoId: string): Promise<StoredStudentAlert[]> {
  if (!hasAlunoId(alunoId)) return [];

  const [localMap, remoteAlerts] = await Promise.all([
    readMap(alunoId),
    fetchRemoteAlertHistory(alunoId),
  ]);

  await migrateLegacyDismissed(localMap);

  const remoteMap = mapFromAlerts(remoteAlerts);
  const merged = mergeHistoryMaps(localMap, remoteMap);
  await writeMap(alunoId, merged);

  if (Object.keys(merged).length > 0) {
    void saveRemoteAlerts(alunoId, Object.values(merged));
  }

  return sortByDateDesc(Object.values(merged));
}

/** Mescla avisos ativos no histórico e persiste local + Supabase. */
export async function syncStudentAlertHistory(
  alunoId: string,
  activeAlerts: StudentAlert[],
): Promise<StoredStudentAlert[]> {
  if (!hasAlunoId(alunoId)) return [];

  const map = await readMap(alunoId);
  await migrateLegacyDismissed(map);

  for (const alert of activeAlerts) {
    const existing = map[alert.id];
    if (existing) {
      map[alert.id] = {
        ...existing,
        kind: alert.kind,
        title: alert.title,
        body: alert.body,
        tone: alert.tone,
        action: alert.action,
        createdAt: existing.createdAt,
        readAt: existing.readAt,
      };
    } else {
      map[alert.id] = {
        ...alert,
        createdAt: alert.createdAt,
        readAt: null,
      };
    }
  }

  const sorted = sortByDateDesc(Object.values(map));
  await writeMap(alunoId, map);
  void saveRemoteAlerts(alunoId, sorted);
  return sorted;
}

export async function markStudentAlertRead(
  alunoId: string,
  alert: StoredStudentAlert,
): Promise<void> {
  if (!hasAlunoId(alunoId)) return;

  const readAt = alert.readAt ?? new Date().toISOString();
  const entry: StoredStudentAlert = { ...alert, readAt };

  const map = await readMap(alunoId);
  map[alert.id] = entry;
  await writeMap(alunoId, map);
  await saveRemoteAlert(alunoId, entry);
}

export async function getStudentAlertHistory(alunoId: string): Promise<StoredStudentAlert[]> {
  return loadStudentAlertHistory(alunoId);
}
