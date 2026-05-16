import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  children: ReactNode;
};

/** Centraliza o app no navegador (layout tipo celular). */
export function WebLayout({ children }: Props) {
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
