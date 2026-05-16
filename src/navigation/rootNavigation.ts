import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToReturn() {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.navigate({ name: 'Return' }));
}
