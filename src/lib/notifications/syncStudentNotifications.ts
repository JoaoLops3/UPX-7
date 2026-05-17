import type { WeatherSnapshot } from '../weather';
import type { AluguelComItem, MultaComAluguel } from '../../types/database';
import { NOTIFICATION_ID_PREFIX } from './constants';
import { markNotified } from './notifiedStore';
import { planStudentNotifications } from './planStudentNotifications';
import { getNotificationPermissionState } from './permissions';
import { getNotificationsEnabled, notificationsSupportedOnPlatform } from './preferences';

function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (!notificationsSupportedOnPlatform()) return null;
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

async function cancelStudentScheduledNotifications(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(NOTIFICATION_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function syncStudentNotifications(input: {
  aluguelAtivo: AluguelComItem | null;
  reservaQuadra: AluguelComItem | null;
  multasPendentes: MultaComAluguel[];
  weather: WeatherSnapshot | null;
}): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const enabled = await getNotificationsEnabled();
  if (!enabled) {
    await cancelStudentScheduledNotifications();
    return;
  }

  const permission = await getNotificationPermissionState();
  if (permission !== 'granted') return;

  await cancelStudentScheduledNotifications();

  const plans = await planStudentNotifications(input);

  for (const plan of plans) {
    await Notifications.scheduleNotificationAsync({
      identifier: plan.id,
      content: {
        title: plan.title,
        body: plan.body,
        sound: true,
        data: { kind: plan.kind },
      },
      trigger: plan.trigger,
    });

    if (plan.notifyKey) {
      await markNotified(plan.notifyKey);
    }
  }
}
