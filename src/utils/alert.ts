import { Alert, type AlertButton } from 'react-native';

export function showAlert(title: string, message: string, buttons?: AlertButton[]): void {
  Alert.alert(title, message, buttons);
}

export function showConfirm(message: string, title = 'Confirmar'): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Sim', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
