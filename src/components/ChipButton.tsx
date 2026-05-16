import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { cardPressed, chip, chipSelected } from '../theme/ui';

type Props = {
  children: ReactNode;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function ChipButton({
  children,
  selected,
  onPress,
  style,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && cardPressed(true),
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...chip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  selected: chipSelected,
});
