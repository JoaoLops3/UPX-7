import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { card, cardPressed } from '../theme/ui';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function PressableCard({ children, onPress, style, accessibilityLabel, disabled }: Props) {
  if (!onPress || disabled) {
    return <View style={[styles.card, disabled && styles.disabled, style]}>{children}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardPressed(pressed), style]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...card,
    padding: 12,
  },
  disabled: { opacity: 0.55 },
});
