import { navigateRoot, navigateToHomeTab } from '../../navigation/rootNavigation';
import type { NotificationKind } from './constants';
import { notificationsSupportedOnPlatform } from './preferences';

type NotificationSubscription = { remove: () => void };
let responseSubscription: NotificationSubscription | null = null;

function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (!notificationsSupportedOnPlatform()) return null;
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

export function configureNotificationHandler(): void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    /* módulo nativo indisponível */
  }
}

function handleNotificationNavigation(data: Record<string, unknown> | undefined): void {
  const kind = data?.kind as NotificationKind | undefined;
  switch (kind) {
    case 'rain':
    case 'reserva':
    case 'devolucao_quadra':
    case 'devolucao_guarda':
      navigateToHomeTab();
      break;
    case 'multa':
      navigateRoot('Fines');
      break;
    default:
      navigateToHomeTab();
  }
}

export function attachNotificationResponseListener(): void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    responseSubscription?.remove();
    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
    });
  } catch {
    /* ignorar */
  }
}

export function detachNotificationResponseListener(): void {
  responseSubscription?.remove();
  responseSubscription = null;
}
