import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { registerRootComponent } from 'expo';
import App from './App';

// Evita overlay invisível do native-stack na web que bloqueia cliques
if (Platform.OS === 'web') {
  enableScreens(false);
}

registerRootComponent(App);
