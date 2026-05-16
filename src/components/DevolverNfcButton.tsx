import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { navigateToReturn } from '../navigation/rootNavigation';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Após o horário da quadra: destaque para devolução no totem. */
  urgent?: boolean;
};

export function DevolverNfcButton({ style, urgent = false }: Props) {
  const handlePress = () => {
    navigateToReturn();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        urgent
          ? 'Tempo esgotado. Aproxime a carteirinha no totem para liberar a quadra'
          : 'Devolver aproximando a carteirinha'
      }
      style={({ pressed }) => [
        styles.btn,
        urgent && styles.btnUrgent,
        pressed && (urgent ? styles.btnUrgentPressed : cardPressed(true)),
        style,
      ]}
    >
      <Text style={[styles.label, urgent && styles.labelUrgent]}>
        {urgent
          ? 'Tempo esgotado — aproxime o NFC no totem'
          : 'Devolver — aproxime a carteirinha'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    ...card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  btnUrgent: {
    ...border,
    backgroundColor: colors.warningBg,
    borderColor: '#f59e0b',
  },
  btnUrgentPressed: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
  },
  label: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelUrgent: {
    color: '#92400e',
  },
});
