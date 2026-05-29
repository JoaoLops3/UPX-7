import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { AppTabParamList, HomeStackParamList, RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppTabParamList>();

export function navigateRoot<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (!navigationRef.isReady()) return;

  switch (name) {
    case 'MainTabs':
      navigationRef.navigate('Home', { screen: 'HomeMain' });
      return;
    case 'Confirm':
      navigationRef.navigate('Home', {
        screen: 'Confirm',
        params: params as HomeStackParamList['Confirm'],
      });
      return;
    case 'QuadraReserva':
      navigationRef.navigate('Home', {
        screen: 'QuadraReserva',
        params: params as HomeStackParamList['QuadraReserva'],
      });
      return;
    case 'Active':
      navigationRef.navigate('Home', { screen: 'Active' });
      return;
    case 'Fines':
      navigationRef.navigate('Profile', { screen: 'Fines' });
      return;
    case 'NotificationSettings':
      navigationRef.navigate('Profile', { screen: 'NotificationSettings' });
      return;
    case 'Help':
      navigationRef.navigate('Profile', { screen: 'Help' });
      return;
    default:
      return;
  }
}

export function navigateToHomeTab() {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Home',
      params: { screen: 'HomeMain' },
    }),
  );
}

export function navigateToActive() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Home', { screen: 'Active' });
}

export function navigateToProfile() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Profile', { screen: 'ProfileMain' });
}

export function navigateToNotificationSettings() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Profile', { screen: 'NotificationSettings' });
}
