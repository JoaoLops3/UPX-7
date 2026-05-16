import { useEffect, useMemo, useState } from 'react';
import {
  getQuadraAluguelPhase,
  getQuadraGraceDeadline,
  QUADRA_GRACE_MINUTES,
} from '../lib/quadraAluguelTiming';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import type { RootStackScreenProps } from '../navigation/types';
import { DevolverNfcButton } from '../components/DevolverNfcButton';
import { colors } from '../theme/colors';
import { card } from '../theme/ui';
import {
  daysBetween,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatTime,
} from '../utils/dates';
import { EXTRA_DISPLAY } from '../utils/itemDisplay';
import type { ExtraQuadra } from '../types/database';

type Props = RootStackScreenProps<'Active'>;

export default function ActiveScreen({ navigation }: Props) {
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
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={48} color={colors.inactive} accessibilityElementsHidden />
        <Text style={styles.emptyText}>Nenhum aluguel ativo</Text>
        <BackButton onPress={() => navigation.goBack()} />
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Aluguel ativo</Text>
        <Pressable
          onPress={() => Alert.alert('Notificações', 'Configurações em breve.')}
          accessibilityLabel="Notificações"
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <View
        style={[styles.heroCard, quadraPhase === 'aguardando_nfc' && styles.heroCardUrgent]}
      >
        <Text style={styles.heroTitle}>{aluguelAtivo.itens.nome}</Text>
        <Text style={styles.heroLoc}>{aluguelAtivo.itens.localizacao}</Text>

        {isQuadra && quadraPhase === 'aguardando_nfc' ? (
          <Text style={styles.expiredHint}>
            Tempo esgotado — aproxime o NFC no totem para confirmar a devolução (
            {QUADRA_GRACE_MINUTES} min)
          </Text>
        ) : null}

        {isQuadra ? (
          <Text
            style={[
              styles.countdown,
              quadraPhase === 'aguardando_nfc' && styles.countdownUrgent,
            ]}
          >
            {countdown}
          </Text>
        ) : (
          <>
            <Text style={styles.daysLeft}>{diasRestantes} dias restantes</Text>
            <Text style={styles.devolver}>
              Devolver até {formatDate(aluguelAtivo.fim_previsto)}
            </Text>
            <Text style={styles.numeroDestaque}>#{aluguelAtivo.itens.numero}</Text>
          </>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <DevolverNfcButton urgent={quadraPhase === 'aguardando_nfc'} />

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Detalhes</Text>
        <DetailRow label="Início" value={formatDateTime(aluguelAtivo.inicio ?? '')} />
        <DetailRow
          label={quadraPhase === 'aguardando_nfc' ? 'Confirmar no totem até' : 'Devolver até'}
          value={
            isQuadra && quadraPhase === 'aguardando_nfc'
              ? formatDateTime(getQuadraGraceDeadline(aluguelAtivo.fim_previsto).toISOString())
              : isQuadra
                ? `${formatDate(aluguelAtivo.fim_previsto)} · ${formatTime(aluguelAtivo.fim_previsto)}`
                : formatDate(aluguelAtivo.fim_previsto)
          }
        />
        {isQuadra && extrasLabel && <DetailRow label="Extras" value={extrasLabel} />}
        <DetailRow label="RA" value={aluno?.ra ?? '—'} />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryVeryDark },
  heroCard: {
    backgroundColor: colors.primaryVeryDark,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  heroCardUrgent: {
    backgroundColor: '#92400e',
  },
  expiredHint: {
    color: '#fef3c7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: '600' },
  heroLoc: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  countdown: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: 16,
    textAlign: 'center',
  },
  countdownUrgent: {
    color: '#fde68a',
  },
  daysLeft: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  devolver: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginTop: 4 },
  numeroDestaque: {
    color: colors.progressFill,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.progressFill, borderRadius: 3 },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    ...card,
  },
  detailsTitle: { fontSize: 15, fontWeight: '600', color: colors.primaryVeryDark, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.textMuted },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.primaryVeryDark },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenBg,
    gap: 12,
  },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
