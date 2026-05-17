import * as Notifications from 'expo-notifications';
import { navigateRoot, navigateToHomeTab, navigateToReturn, navigateToScan } from '../../navigation/rootNavigation';
import type { NotificationKind } from './constants';
import { notificationsSupportedOnPlatform } from './preferences';

let responseSubscription: Notifications.Subscription | null = null;

export function configureNotificationHandler(): void {
  if (!notificationsSupportedOnPlatform()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function handleNotificationNavigation(data: Record<string, unknown> | undefined): void {
  const kind = data?.kind as NotificationKind | undefined;
  switch (kind) {
    case 'rain':
      navigateToScan('guarda_chuva');
      break;
    case 'reserva':
      navigateToHomeTab();
      break;
    case 'devolucao_quadra':
    case 'devolucao_guarda':
      navigateToReturn();
      break;
    case 'multa':
      navigateRoot('Fines');
      break;
    default:
      navigateToHomeTab();
  }
}

export function attachNotificationResponseListener(): void {
  if (!notificationsSupportedOnPlatform()) return;
  responseSubscription?.remove();
  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationNavigation(
      response.notification.request.content.data as Record<string, unknown> | undefined,
    );
  });
}

export function detachNotificationResponseListener(): void {
  responseSubscription?.remove();
  responseSubscription = null;
}
