import {
  getNotificationPermissionState,
  requestNotificationPermissions,
} from './permissions';
import { getNotificationsEnabled, notificationsSupportedOnPlatform, setNotificationsEnabled } from './preferences';

let setupDone = false;

/** Pede permissão e ativa alertas automaticamente no primeiro uso (mobile). */
export async function ensureNotificationsAutoSetup(): Promise<void> {
  if (!notificationsSupportedOnPlatform() || setupDone) return;

  const alreadyEnabled = await getNotificationsEnabled();
  const permission = await getNotificationPermissionState();

  if (permission === 'undetermined') {
    await requestNotificationPermissions();
  }

  if (!alreadyEnabled) {
    const after = await getNotificationPermissionState();
    if (after === 'granted') {
      await setNotificationsEnabled(true);
    }
  }

  setupDone = true;
}
