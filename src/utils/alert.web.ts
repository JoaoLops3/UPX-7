import { Alert, type AlertButton } from 'react-native';

function runButton(btn?: AlertButton): void {
  if (btn?.onPress) {
    btn.onPress();
    return;
  }
  btn?.onDismiss?.();
}

/** Alert com botões no navegador (RN Alert é limitado na web). */
export function showAlert(title: string, message: string, buttons?: AlertButton[]): void {
  if (!buttons?.length) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  if (buttons.length === 1) {
    window.alert(`${title}\n\n${message}`);
    runButton(buttons[0]);
    return;
  }

  if (buttons.length === 2) {
    const [dismissBtn, confirmBtn] = buttons;
    const ok = window.confirm(`${title}\n\n${message}`);
    runButton(ok ? confirmBtn : dismissBtn);
    return;
  }

  window.alert(`${title}\n\n${message}`);
  Alert.alert(title, message, buttons);
}

/** Confirmação única: OK = sim, Cancelar = não. */
export function showConfirm(message: string, title = 'Confirmar'): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
