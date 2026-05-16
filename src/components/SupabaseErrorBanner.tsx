import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function SupabaseErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={20} color={colors.dangerText} accessibilityElementsHidden />
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          accessibilityLabel="Tentar novamente"
        >
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#fca5a5',
    gap: 8,
  },
  text: { fontSize: 13, color: colors.dangerText, lineHeight: 18 },
  retry: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8 },
  retryPressed: { backgroundColor: colors.background, borderRadius: 6 },
  retryText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
});
