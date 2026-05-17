import { Platform } from 'react-native';
import { appStorageGetItem, appStorageSetItem } from '../storage/appStorage';
import { STORAGE_KEYS } from './constants';

export function notificationsSupportedOnPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function getNotificationsEnabled(): Promise<boolean> {
  if (!notificationsSupportedOnPlatform()) return false;
  const raw = await appStorageGetItem(STORAGE_KEYS.enabled);
  if (raw === null) return true;
  return raw === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await appStorageSetItem(STORAGE_KEYS.enabled, enabled ? 'true' : 'false');
}
