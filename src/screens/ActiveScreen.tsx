import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import {
  getQuadraAluguelPhase,
  getQuadraGraceDeadline,
  QUADRA_GRACE_MINUTES,
} from '../lib/quadraAluguelTiming';
import { notificationsSupportedOnPlatform } from '../lib/notifications/preferences';
import { navigateToNotificationSettings } from '../navigation/rootNavigation';
import type { HomeStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import type { ExtraQuadra } from '../types/database';
import {
  daysBetween,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatTime,
} from '../utils/dates';
import { EXTRA_DISPLAY } from '../utils/itemDisplay';

type Props = HomeStackScreenProps<'Active'>;

export default function ActiveScreen({ navigation }: Props) {
  const { contentContainerStyle, paddingTop, paddingHorizontal } =
    useScreenContentInsets(40);
  const { aluno, loading: alunoLoading } = useAluno();
  const { aluguelAtivo, loading } = useAlugueis(aluno?.id ?? '');
  const [countdown, setCountdown] = useState('00:00:00');

  const quadraPhase = useMemo(
    () => getQuadraAluguelPhase(aluguelAtivo),
    [aluguelAtivo],
  );

  useEffect(() => {
    if (!aluguelAtivo || aluguelAtivo.itens.tipo !== 'quadra') return;
    const tick = () => {
      const phase = getQuadraAluguelPhase(aluguelAtivo);
      const remaining =
        phase === 'aguardando_nfc'
          ? getQuadraGraceDeadline(aluguelAtivo.fim_previsto).getTime() - Date.now()
          : new Date(aluguelAtivo.fim_previsto).getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [aluguelAtivo]);

  const progress = useMemo(() => {
    if (!aluguelAtivo) return 0;
    const start = new Date(aluguelAtivo.inicio ?? Date.now()).getTime();
    const end = new Date(aluguelAtivo.fim_previsto).getTime();
    const now = Date.now();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [aluguelAtivo, countdown]);

  if (alunoLoading || loading) return <LoadingView />;

  if (!aluguelAtivo) {
    return (
      <View style={[styles.empty, { paddingTop, paddingHorizontal }]}>
        <Ionicons
          name="cube-outline"
          size={48}
          color={colors.inactive}
          accessibilityElementsHidden
        />
        <Text style={styles.emptyTitle}>Nenhum aluguel ativo</Text>
        <Text style={styles.emptyText}>Retire itens no totem com sua carteirinha NFC.</Text>
        <BackButton onPress={() => navigation.goBack()} style={styles.emptyBack} />
      </View>
    );
  }

  const isQuadra = aluguelAtivo.itens.tipo === 'quadra';
  const diasRestantes = daysBetween(new Date(), new Date(aluguelAtivo.fim_previsto));
  const extras = (aluguelAtivo.extras ?? []) as ExtraQuadra[];
  const extrasLabel =
    extras.length > 0
      ? extras.map((e) => EXTRA_DISPLAY[e]?.label ?? e).join(' · ')
      : aluguelAtivo.com_extra
        ? 'Bola incluída'
        : null;
  const urgent = isQuadra && quadraPhase === 'aguardando_nfc';
  const showNotifications = notificationsSupportedOnPlatform();

  const detailRows: { label: string; value: string }[] = [
    { label: 'Início', value: formatDateTime(aluguelAtivo.inicio ?? '') },
    {
      label: urgent ? 'Confirmar no totem até' : 'Devolver até',
      value:
        urgent
          ? formatDateTime(getQuadraGraceDeadline(aluguelAtivo.fim_previsto).toISOString())
          : isQuadra
            ? `${formatDate(aluguelAtivo.fim_previsto)} · ${formatTime(aluguelAtivo.fim_previsto)}`
            : formatDate(aluguelAtivo.fim_previsto),
    },
    ...(isQuadra && extrasLabel ? [{ label: 'Extras', value: extrasLabel }] : []),
    { label: 'RA', value: aluno?.ra ?? '—' },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.topRow, !showNotifications && styles.topRowBackOnly]}>
        <BackButton onPress={() => navigation.goBack()} />
        {showNotifications ? (
          <Pressable
            onPress={navigateToNotificationSettings}
            style={({ pressed }) => [styles.bellBtn, pressed && styles.bellBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações de notificações"
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title}>Aluguel ativo</Text>
      <Text style={styles.subtitle}>
        {isQuadra
          ? 'Quadra em uso · devolva no totem ao fim do horário'
          : 'Item em uso · devolva no totem dentro do prazo'}
      </Text>

      <View style={[styles.heroCard, urgent && styles.heroCardUrgent]}>
        <Text style={styles.heroTitle}>{aluguelAtivo.itens.nome}</Text>
        <Text style={styles.heroLoc}>{aluguelAtivo.itens.localizacao}</Text>

        {urgent ? (
          <Text style={styles.expiredHint}>
            Tempo esgotado — aproxime o NFC no totem para confirmar a devolução (
            {QUADRA_GRACE_MINUTES} min)
          </Text>
        ) : null}

        {isQuadra ? (
          <Text style={[styles.countdown, urgent && styles.countdownUrgent]}>{countdown}</Text>
        ) : (
          <>
            <View style={styles.heroNumeroBlock}>
              <Text style={styles.heroNumeroLabel}>Pegue o item</Text>
              <Text style={styles.heroNumero}>#{aluguelAtivo.itens.numero}</Text>
            </View>
            <View style={styles.prazoBlock}>
              <Text style={styles.prazoHighlight}>
                {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
              </Text>
              <Text style={styles.devolver}>
                Devolver até {formatDate(aluguelAtivo.fim_previsto)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.totemHint}>
        <Ionicons name="hardware-chip-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.totemHintText}>
          {urgent
            ? `Confirme a devolução no totem NFC (até ${QUADRA_GRACE_MINUTES} min após o horário).`
            : 'Para devolver, vá ao totem e use a aba Devolver com sua carteirinha.'}
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Detalhes</Text>
        {detailRows.map((row, index) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={row.value}
            isLast={index === detailRows.length - 1}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topRowBackOnly: {
    justifyContent: 'flex-start',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...border,
    backgroundColor: colors.white,
  },
  bellBtnPressed: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  heroCard: {
    backgroundColor: colors.primaryVeryDark,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 168,
  },
  heroCardUrgent: {
    backgroundColor: '#92400e',
  },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: '600' },
  heroLoc: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  expiredHint: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  countdown: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: 20,
    textAlign: 'center',
  },
  countdownUrgent: {
    color: '#fde68a',
  },
  heroNumeroBlock: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    minWidth: 140,
  },
  heroNumeroLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroNumero: {
    color: colors.white,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
    letterSpacing: -1,
  },
  prazoBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prazoHighlight: {
    color: colors.progressFill,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  devolver: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.progressFill, borderRadius: 3 },
  totemHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    ...border,
  },
  totemHintText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
    fontWeight: '500',
  },
  detailsCard: {
    ...card,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 0 },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryVeryDark,
    textAlign: 'right',
    flex: 1,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyBack: { marginTop: 8 },
});
