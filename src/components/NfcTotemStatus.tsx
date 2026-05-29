import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';

type Props = {
  uidNfc: string | null | undefined;
};

export function NfcTotemStatus({ uidNfc }: Props) {
  if (!uidNfc) {
    return (
      <View style={[styles.box, styles.warn]} accessibilityRole="alert">
        <Ionicons name="warning-outline" size={20} color="#92400e" accessibilityElementsHidden />
        <Text style={styles.warnText}>
          Seu cadastro não tem UID NFC. Peça ao admin para vincular a carteirinha.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.ok]} accessibilityRole="text">
      <Ionicons name="radio-outline" size={20} color={colors.primaryDark} accessibilityElementsHidden />
      <Text style={styles.okText}>
        Totem ativo — aproxime a carteirinha. O app reage automaticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    ...border,
  },
  ok: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  warn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  okText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryVeryDark,
    lineHeight: 18,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
});
