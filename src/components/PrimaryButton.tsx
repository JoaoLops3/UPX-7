import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { primaryButton, primaryButtonPressed } from '../theme/ui';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {({ pressed }) => (
        <Text style={[styles.label, pressed && !disabled && styles.labelPressed]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: primaryButton,
  pressed: primaryButtonPressed,
  disabled: { opacity: 0.55 },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  labelPressed: {
    color: colors.primaryDark,
  },
});
