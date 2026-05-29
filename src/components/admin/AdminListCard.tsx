import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { card } from '../../theme/ui';

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'default' | 'success' | 'warning' | 'danger';
  right?: ReactNode;
  showChevron?: boolean;
};

export function AdminListCard({
  title,
  subtitle,
  badge,
  badgeTone = 'default',
  right,
  showChevron = false,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, badgeStyles[badgeTone]]}>
          <Text style={[styles.badgeText, badgeTextStyles[badgeTone]]}>{badge}</Text>
        </View>
      ) : null}
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.inactive} accessibilityElementsHidden />
      ) : null}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  default: { backgroundColor: colors.background },
  success: { backgroundColor: colors.successBg },
  warning: { backgroundColor: colors.warningBg },
  danger: { backgroundColor: colors.dangerBg },
});

const badgeTextStyles = StyleSheet.create({
  default: { color: colors.primaryDark },
  success: { color: colors.successText },
  warning: { color: '#92400e' },
  danger: { color: colors.dangerText },
});

const styles = StyleSheet.create({
  card: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
