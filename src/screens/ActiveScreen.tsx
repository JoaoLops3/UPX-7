import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { devolverAluguel } from '../lib/devolverAluguel';
import type { RootStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { card, cardPressed } from '../theme/ui';
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
  const { aluguelAtivo, loading, refetch } = useAlugueis(aluno?.id ?? '');
  const [countdown, setCountdown] = useState('00:00:00');
  const [submitting, setSubmitting] = useState(false);

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
    const start = new Date(aluguelAtivo.inicio ?? Date.now()).getTime();
    const end = new Date(aluguelAtivo.fim_previsto).getTime();
    const now = Date.now();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [aluguelAtivo, countdown]);

  const handleDevolver = async () => {
    if (!aluguelAtivo || !aluno || submitting) return;

    setSubmitting(true);
    const result = await devolverAluguel(aluguelAtivo, aluno.id);
    setSubmitting(false);

    if (!result.ok) {
      Alert.alert('Erro na devolução', result.message);
      return;
    }

    await refetch();

    const itemNome = aluguelAtivo.itens.nome;
    if (result.multaGerada) {
      const valor = result.valorMulta.toFixed(2).replace('.', ',');
      Alert.alert(
        'Devolvido com atraso',
        `${itemNome} devolvido. Multa de R$ ${valor} (${result.diasAtraso} dia(s)) registrada no seu RA.`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }],
      );
    } else {
      Alert.alert(
        'Devolução concluída',
        `${itemNome} devolvido com sucesso.`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }],
      );
    }
  };

  const confirmarDevolucao = () => {
    if (!aluguelAtivo) return;
    Alert.alert(
      'Devolver item',
      'Aproxime a carteirinha no totem NFC.\n\nEm desenvolvimento web, toque em Confirmar para simular a leitura.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => void handleDevolver() },
      ],
    );
  };

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
        style={({ pressed }) => [
          styles.devolverBtn,
          pressed && styles.devolverPressed,
          submitting && styles.devolverDisabled,
        ]}
        onPress={confirmarDevolucao}
        disabled={submitting}
        accessibilityLabel="Devolver aproximando a carteirinha"
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : (
          <Text style={styles.devolverBtnText}>Devolver — aproxime a carteirinha</Text>
        )}
      </Pressable>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Detalhes</Text>
        <DetailRow label="Início" value={formatDateTime(aluguelAtivo.inicio ?? '')} />
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
    ...card,
    alignItems: 'center',
    marginBottom: 16,
  },
  devolverPressed: cardPressed(true),
  devolverDisabled: { opacity: 0.6 },
  devolverBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '600' },
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
