import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

const WEB_INPUT_FOCUS_STYLE_ID = 'upx7-web-input-focus';

function useWebInputFocusStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(WEB_INPUT_FOCUS_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = WEB_INPUT_FOCUS_STYLE_ID;
    style.textContent = `
      input:focus,
      input:focus-visible,
      textarea:focus,
      textarea:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

type Props = {
  children: ReactNode;
};

/** Centraliza o app no navegador (layout tipo celular). */
export function WebLayout({ children }: Props) {
  useWebInputFocusStyles();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.screenBg,
    boxShadow: '0 4px 24px rgba(26, 74, 122, 0.12)',
    overflow: 'hidden',
  },
});
