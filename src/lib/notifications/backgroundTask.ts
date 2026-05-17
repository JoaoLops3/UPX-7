import { fetchNotificationDataForCurrentUser } from './fetchNotificationData';
import { getNotificationsEnabled, notificationsSupportedOnPlatform } from './preferences';
import { syncStudentNotifications } from './syncStudentNotifications';

export const NOTIFICATION_BACKGROUND_TASK = 'upx7-notification-sync';

let defineAttempted = false;

async function runBackgroundSync(): Promise<number> {
  const BackgroundFetch = require('expo-background-fetch') as typeof import('expo-background-fetch');
  try {
    if (!notificationsSupportedOnPlatform()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const enabled = await getNotificationsEnabled();
    if (!enabled) return BackgroundFetch.BackgroundFetchResult.NoData;

    const payload = await fetchNotificationDataForCurrentUser();
    if (!payload) return BackgroundFetch.BackgroundFetchResult.NoData;

    await syncStudentNotifications(payload);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

/** Registra tarefa em segundo plano sem derrubar o app se o módulo nativo falhar. */
export function ensureBackgroundTaskDefined(): void {
  if (defineAttempted || !notificationsSupportedOnPlatform()) return;
  defineAttempted = true;

  try {
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    if (TaskManager.isTaskDefined?.(NOTIFICATION_BACKGROUND_TASK)) return;

    TaskManager.defineTask(NOTIFICATION_BACKGROUND_TASK, runBackgroundSync);
  } catch {
    /* expo-task-manager indisponível neste build */
  }
}

export async function registerNotificationBackgroundSync(): Promise<void> {
  if (!notificationsSupportedOnPlatform()) return;

  ensureBackgroundTaskDefined();

  try {
    const BackgroundFetch = require('expo-background-fetch') as typeof import('expo-background-fetch');
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) return;

    const registered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_BACKGROUND_TASK);
    if (!registered) {
      await BackgroundFetch.registerTaskAsync(NOTIFICATION_BACKGROUND_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    /* ignorar — app segue sem background fetch */
  }
}
