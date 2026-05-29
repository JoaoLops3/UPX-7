import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { LoadingView } from '../components/LoadingView';
import { useStudentAlerts } from '../hooks/useStudentAlerts';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { getStudentTabBarInset } from '../navigation/StudentTabBar';
import { navigateRoot } from '../navigation/rootNavigation';
import type { AppTabScreenProps } from '../navigation/types';
import type { StudentAlertAction } from '../lib/studentAlerts';
import type { StoredStudentAlert } from '../lib/studentAlertHistory';
import { formatRelativeDateTime } from '../utils/dates';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';

type Props = AppTabScreenProps<'Notifications'>;

const TONE_COLORS = {
  danger: colors.dangerText,
  warning: '#b45309',
  info: colors.primaryDark,
} as const;

const KIND_ICONS: Record<StoredStudentAlert['kind'], keyof typeof Ionicons.glyphMap> = {
  multa: 'alert-circle',
  reserva: 'calendar',
  devolucao: 'return-down-back',
  quadra: 'football',
  rain: 'rainy',
  info: 'information-circle',
};

function runAlertAction(action?: StudentAlertAction) {
  if (!action) return;
  switch (action) {
    case 'Fines':
      navigateRoot('Fines');
      return;
    case 'Active':
      navigateRoot('Active');
      return;
    case 'TotemScan':
      navigateRoot('TotemScan');
      return;
    case 'QuadraReserva':
      navigateRoot('QuadraReserva');
      return;
    case 'Home':
      navigateRoot('MainTabs');
      return;
  }
}

export default function NotificationsScreen(_props: Props) {
  const { alerts, loading, refetch, markAlertRead } = useStudentAlerts();
  const { contentContainerStyle } = useScreenContentInsets(getStudentTabBarInset());

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (loading && alerts.length === 0) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Notificações</Text>
      <Text style={styles.subtitle}>
        Histórico de avisos sobre multas, reservas, devoluções e clima no campus.
      </Text>

      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} accessibilityElementsHidden />
          <Text style={styles.emptyTitle}>Nenhum aviso ainda</Text>
          <Text style={styles.emptySubtitle}>
            Quando houver multas pendentes ou lembretes importantes, eles aparecerão aqui.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onRead={markAlertRead} />
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}

function AlertCard({
  alert,
  onRead,
}: {
  alert: StoredStudentAlert;
  onRead: (alert: StoredStudentAlert) => Promise<void>;
}) {
  const isRead = alert.readAt != null;
  const toneColor = TONE_COLORS[alert.tone];
  const icon = KIND_ICONS[alert.kind];
  const dateLabel = formatRelativeDateTime(alert.createdAt);

  const handlePress = () => {
    if (!isRead) void onRead(alert);
    runAlertAction(alert.action);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.alertCard,
        isRead && styles.alertCardRead,
        pressed && styles.alertPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${alert.title}. ${dateLabel}. ${alert.body}`}
    >
      <View style={[styles.iconWrap, { borderColor: toneColor }, isRead && styles.iconWrapRead]}>
        <Ionicons
          name={icon}
          size={22}
          color={isRead ? colors.textMuted : toneColor}
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.alertBody}>
        <View style={styles.alertHeader}>
          <Text
            style={[
              styles.alertTitle,
              !isRead && alert.tone === 'danger' && { color: colors.dangerText },
              isRead && styles.alertTitleRead,
            ]}
          >
            {alert.title}
          </Text>
          {!isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={[styles.alertDate, isRead && styles.alertDateRead]}>{dateLabel}</Text>
        <Text style={[styles.alertText, isRead && styles.alertTextRead]}>{alert.body}</Text>
        {alert.action && !isRead ? (
          <Text style={styles.alertAction}>Toque para ver detalhes</Text>
        ) : null}
      </View>
      {alert.action ? (
        <Ionicons name="chevron-forward" size={18} color={colors.inactive} accessibilityElementsHidden />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  list: { gap: 10 },
  emptyCard: {
    ...card,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.primaryVeryDark, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  alertCardRead: {
    opacity: 0.82,
    backgroundColor: colors.background,
  },
  alertPressed: { backgroundColor: colors.background },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    ...border,
  },
  iconWrapRead: {
    borderColor: colors.border,
  },
  alertBody: { flex: 1 },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryVeryDark, flexShrink: 1 },
  alertTitleRead: { color: colors.textMuted, fontWeight: '600' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dangerText,
  },
  alertDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
    marginTop: 2,
  },
  alertDateRead: {
    color: colors.inactive,
    fontWeight: '500',
  },
  alertText: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  alertTextRead: { color: colors.inactive },
  alertAction: { fontSize: 12, fontWeight: '600', color: colors.primaryDark, marginTop: 6 },
});
