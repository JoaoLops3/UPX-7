import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { card, cardPressed } from '../theme/ui';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PressableCard({ children, onPress, style, accessibilityLabel }: Props) {
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
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
});
