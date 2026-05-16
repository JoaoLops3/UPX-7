import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import type { RootStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import {
  daysBetween,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatTime,
} from '../utils/dates';

type Props = RootStackScreenProps<'Active'>;

export default function ActiveScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { aluguelAtivo, loading } = useAlugueis(aluno?.id ?? '');
  const [countdown, setCountdown] = useState('00:00:00');

  useEffect(() => {
    if (!aluguelAtivo || aluguelAtivo.itens.tipo !== 'quadra') return;
    const tick = () => {
      const remaining = new Date(aluguelAtivo.fim_previsto).getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [aluguelAtivo]);

  const progress = useMemo(() => {
    if (!aluguelAtivo) return 0;
    const start = new Date(aluguelAtivo.inicio).getTime();
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
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar"
        >
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const isQuadra = aluguelAtivo.itens.tipo === 'quadra';
  const diasRestantes = daysBetween(new Date(), new Date(aluguelAtivo.fim_previsto));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar"
        >
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Aluguel ativo</Text>
        <Ionicons
          name="notifications-outline"
          size={22}
          color={colors.primaryDark}
          accessibilityLabel="Notificações"
        />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{aluguelAtivo.itens.nome}</Text>
        <Text style={styles.heroLoc}>{aluguelAtivo.itens.localizacao}</Text>

        {isQuadra ? (
          <Text style={styles.countdown}>{countdown}</Text>
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

      <Pressable
        style={({ pressed }) => [styles.devolverBtn, pressed && styles.devolverPressed]}
        accessibilityLabel="Devolver aproximando a carteirinha"
      >
        <Text style={styles.devolverBtnText}>Devolver — aproxime a carteirinha</Text>
      </Pressable>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Detalhes</Text>
        <DetailRow label="Início" value={formatDateTime(aluguelAtivo.inicio)} />
        <DetailRow
          label="Devolver até"
          value={
            isQuadra
              ? `${formatDate(aluguelAtivo.fim_previsto)} · ${formatTime(aluguelAtivo.fim_previsto)}`
              : formatDate(aluguelAtivo.fim_previsto)
          }
        />
        {isQuadra && aluguelAtivo.com_extra && (
          <DetailRow label="Extra" value="Bola incluída" />
        )}
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
  backBtn: { paddingVertical: 4 },
  backPressed: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8 },
  backText: { color: colors.primary, fontSize: 15 },
  heroCard: {
    backgroundColor: colors.primaryVeryDark,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  devolverBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  devolverPressed: { backgroundColor: colors.background },
  devolverBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '600' },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    elevation: 2,
  },
  detailsTitle: { fontSize: 15, fontWeight: '600', color: colors.primaryVeryDark, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
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
