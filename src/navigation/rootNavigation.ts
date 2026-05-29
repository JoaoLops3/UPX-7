import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { ItemTipo } from '../types/database';
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
      navigationRef.navigate('Home', { screen: 'QuadraReserva' });
      return;
    case 'Active':
      navigationRef.navigate('Home', { screen: 'Active' });
      return;
    case 'Devolucao':
      // Devolução agora é feita no totem; no app levamos o aluno ao Início.
      navigateToHomeTab();
      return;
    case 'Fines':
      navigationRef.navigate('Profile', { screen: 'Fines' });
      return;
    case 'NotificationSettings':
      navigationRef.navigate('Profile', { screen: 'NotificationSettings' });
      return;
    default:
      return;
  }
}

export function navigateToReturn() {
  // Devolução migrou para o totem; no app só voltamos ao Início.
  navigateToHomeTab();
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

export function navigateToScan(_item?: ItemTipo) {
  // A retirada/aluguel passou a ser feita no totem físico; no app vamos ao Início.
  navigateToHomeTab();
}

export function navigateToProfile() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Profile', { screen: 'ProfileMain' });
}

export function navigateToNotificationSettings() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Profile', { screen: 'NotificationSettings' });
}
