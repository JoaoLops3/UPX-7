import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { border, cardPressed } from '../theme/ui';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function BackButton({ onPress, style, accessibilityLabel = 'Voltar' }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && cardPressed(true), style]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.label}>← Voltar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    ...border,
    backgroundColor: colors.white,
  },
  label: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
