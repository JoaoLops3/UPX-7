import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingView } from '../components/LoadingView';
import { DevolverNfcButton } from '../components/DevolverNfcButton';
import { PressableCard } from '../components/PressableCard';
import { SupabaseErrorBanner } from '../components/SupabaseErrorBanner';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { supabase } from '../lib/supabase';
import { getSupabaseErrorMessage } from '../utils/supabaseError';
import type { MainTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { card } from '../theme/ui';
import type { Item, ItemTipo } from '../types/database';
import {
  daysBetween,
  formatCountdown,
  formatDate,
  formatTime,
} from '../utils/dates';
import { getInitials } from '../utils/initials';
import { ITEM_DISPLAY } from '../utils/itemDisplay';
import {
  bookingEndForAluguel,
  computeQuadraSlots,
  type QuadraBooking,
  type SlotState,
} from '../utils/quadraAvailability';

type Props = MainTabScreenProps<'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading, error: alunoError, refetch: refetchAluno } = useAluno();
  const alunoId = aluno?.id ?? '';
  const {
    aluguelAtivo,
    loading: alugueisLoading,
    error: alugueisError,
    refetch: refetchAlugueis,
  } = useAlugueis(alunoId);
  const [itens, setItens] = useState<Item[]>([]);
  const [itensLoading, setItensLoading] = useState(true);
  const [itensError, setItensError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [quadraBookings, setQuadraBookings] = useState<QuadraBooking[]>([]);
  const [agendaNow, setAgendaNow] = useState(() => new Date());

  const fetchItens = useCallback(async () => {
    setItensLoading(true);
    const { data, error } = await supabase.from('itens').select('*');
    if (error) {
      setItensError(getSupabaseErrorMessage(error));
      setItens([]);
    } else {
      setItensError(null);
      setItens((data as Item[]) ?? []);
    }
    setItensLoading(false);
  }, []);

  const fetchQuadraAgenda = useCallback(async (quadraId: string) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [{ data: active }, { data: today }] = await Promise.all([
      supabase
        .from('alugueis')
        .select('inicio, fim_previsto, fim_real, status')
        .eq('item_id', quadraId)
        .eq('status', 'ativo'),
      supabase
        .from('alugueis')
        .select('inicio, fim_previsto, fim_real, status')
        .eq('item_id', quadraId)
        .in('status', ['devolvido', 'atrasado'])
        .gte('inicio', dayStart.toISOString()),
    ]);

    const rows = [...(active ?? []), ...(today ?? [])];
    const seen = new Set<string>();
    const bookings: QuadraBooking[] = [];

    for (const row of rows) {
      if (!row.inicio) continue;
      const fim = bookingEndForAluguel(row);
      const key = `${row.inicio}|${fim}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bookings.push({ inicio: row.inicio, fim });
    }

    setQuadraBookings(bookings);
  }, []);

  const supabaseError = alunoError ?? alugueisError ?? itensError;
  const retryAll = () => {
    void refetchAluno();
    void refetchAlugueis();
    void fetchItens();
  };

  useFocusEffect(
    useCallback(() => {
      fetchItens();
      void refetchAlugueis();
    }, [fetchItens, refetchAlugueis]),
  );

  const quadraId = useMemo(
    () => itens.find((i) => i.tipo === 'quadra')?.id,
    [itens],
  );

  useFocusEffect(
    useCallback(() => {
      if (quadraId) void fetchQuadraAgenda(quadraId);
    }, [quadraId, fetchQuadraAgenda]),
  );

  useEffect(() => {
    const id = setInterval(() => setAgendaNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => {
    if (quadraId) void fetchQuadraAgenda(quadraId);
  }, [quadraId, fetchQuadraAgenda, aluguelAtivo?.id, aluguelAtivo?.fim_previsto]);

  const quadraSlots = useMemo(
    () => computeQuadraSlots(quadraBookings, agendaNow),
    [quadraBookings, agendaNow],
  );

  const quadraOcupadaAgora = useMemo(
    () => quadraSlots.some((s) => s.state === 'busy'),
    [quadraSlots],
  );

  const agendaHint = useMemo(() => {
    if (aluguelAtivo?.itens.tipo === 'quadra' && aluguelAtivo.inicio) {
      return `Em uso · ${formatTime(aluguelAtivo.inicio)} – ${formatTime(aluguelAtivo.fim_previsto)}`;
    }
    if (quadraOcupadaAgora) {
      const ativo = quadraBookings.find((b) => {
        const start = new Date(b.inicio).getTime();
        const end = new Date(b.fim).getTime();
        const now = agendaNow.getTime();
        return start <= now && end > now;
      });
      if (ativo) {
        return `Ocupada · ${formatTime(ativo.inicio)} – ${formatTime(ativo.fim)}`;
      }
      return 'Ocupada agora';
    }
    return null;
  }, [aluguelAtivo, quadraOcupadaAgora, quadraBookings, agendaNow]);

  const loading = alunoLoading || alugueisLoading || itensLoading;
  if (loading) return <LoadingView />;

  const quadra = itens.find((i) => i.tipo === 'quadra');
  const guardaChuvas = itens.filter((i) => i.tipo === 'guarda_chuva');
  const guardaDisponiveis = guardaChuvas.filter((i) => i.disponivel).length;

  const navigateScan = (item: ItemTipo) => {
    navigation.navigate('Scan', { item });
  };

  const activeDaysLeft =
    aluguelAtivo?.itens.tipo === 'guarda_chuva'
      ? daysBetween(new Date(), new Date(aluguelAtivo.fim_previsto))
      : 0;

  const slotStyleFor = (state: SlotState) => {
    if (state === 'busy') return styles.slotBusy;
    if (state === 'past') return styles.slotPast;
    return styles.slotFree;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {supabaseError && (
        <SupabaseErrorBanner message={supabaseError} onRetry={retryAll} />
      )}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Olá, {aluno?.nome?.split(' ')[0] ?? 'aluno'}</Text>
          <Text style={styles.subGreeting}>Bem-vindo de volta</Text>
        </View>
        <View style={styles.avatar} accessibilityLabel="Avatar do aluno">
          <Text style={styles.avatarText}>{getInitials(aluno?.nome ?? 'A')}</Text>
        </View>
      </View>

      {aluguelAtivo ? (
        <>
          <Pressable
            style={({ pressed }) => [styles.activeBanner, pressed && styles.pressedDark]}
            onPress={() => navigation.navigate('Active')}
            accessibilityLabel="Ver detalhes do aluguel ativo"
          >
            <Text style={styles.activeTitle}>{aluguelAtivo.itens.nome}</Text>
            <Text style={styles.activeCountdown}>
              {aluguelAtivo.itens.tipo === 'quadra'
                ? countdown || '00:00:00'
                : `${activeDaysLeft} dias restantes`}
            </Text>
            <Text style={styles.activeSubtitle}>
              {aluguelAtivo.itens.tipo === 'quadra'
                ? `Término às ${formatTime(aluguelAtivo.fim_previsto)}`
                : `Devolver até ${formatDate(aluguelAtivo.fim_previsto)}`}
            </Text>
            <Text style={styles.activeLink}>Ver detalhes →</Text>
          </Pressable>
          <DevolverNfcButton />
        </>
      ) : (
        <View style={styles.emptyActive}>
          <Text style={styles.emptyActiveText}>Nenhum aluguel ativo</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Itens disponíveis</Text>

      <PressableCard
        onPress={() => navigateScan('quadra')}
        accessibilityLabel="Alugar quadra"
        style={styles.cardSpacing}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="football-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{quadra?.nome ?? 'Quadra A'}</Text>
            <Text style={styles.cardSub}>{quadra?.localizacao ?? 'Campus Facens'}</Text>
          </View>
          <View
            style={[
              styles.badge,
              quadraOcupadaAgora || !quadra?.disponivel ? styles.badgeBusy : styles.badgeFree,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                quadraOcupadaAgora || !quadra?.disponivel
                  ? styles.badgeTextBusy
                  : styles.badgeTextFree,
              ]}
            >
              {quadraOcupadaAgora || !quadra?.disponivel ? 'Ocupado' : 'Livre'}
            </Text>
          </View>
        </View>
      </PressableCard>

      <PressableCard
        onPress={() => navigateScan('guarda_chuva')}
        accessibilityLabel="Alugar guarda-chuva"
        style={styles.cardSpacing}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={ITEM_DISPLAY.guarda_chuva.icon} size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{ITEM_DISPLAY.guarda_chuva.label}</Text>
            <Text style={styles.cardSub}>{guardaDisponiveis} disponíveis</Text>
          </View>
          <View
            style={[styles.badge, guardaDisponiveis > 0 ? styles.badgeFree : styles.badgeBusy]}
          >
            <Text
              style={[
                styles.badgeText,
                guardaDisponiveis > 0 ? styles.badgeTextFree : styles.badgeTextBusy,
              ]}
            >
              {guardaDisponiveis > 0 ? 'Livre' : 'Ocupado'}
            </Text>
          </View>
        </View>
      </PressableCard>

      <View style={styles.slotsCard}>
        <Text style={styles.slotsLabel}>Disponibilidade da quadra hoje</Text>
        {agendaHint ? <Text style={styles.slotsHint}>{agendaHint}</Text> : null}
        <View style={styles.slotsRow}>
          {quadraSlots.map((slot) => (
            <View key={slot.index} style={styles.slotColumn}>
              <Text style={styles.slotHourTop}>{slot.hourLabel ?? ' '}</Text>
              <View style={[styles.slot, slotStyleFor(slot.state)]} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerText: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.primaryVeryDark },
  subGreeting: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  activeBanner: {
    backgroundColor: colors.primaryVeryDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pressedDark: { opacity: 0.9 },
  activeTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  activeCountdown: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: 6,
  },
  activeSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  activeLink: { color: colors.progressFill, fontSize: 13, marginTop: 10, fontWeight: '600' },
  emptyActive: {
    ...card,
    backgroundColor: '#f3f4f6',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyActiveText: { color: colors.textMuted, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.primaryVeryDark, marginBottom: 10 },
  cardSpacing: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.primaryVeryDark },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeFree: { backgroundColor: colors.successBg },
  badgeBusy: { backgroundColor: colors.dangerBg },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextFree: { color: colors.successText },
  badgeTextBusy: { color: colors.dangerText },
  slotsCard: {
    ...card,
    padding: 12,
    marginTop: 6,
  },
  slotsLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  slotsHint: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  slotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  slotColumn: { flex: 1, alignItems: 'center' },
  slotHourTop: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
    minHeight: 14,
    textAlign: 'center',
  },
  slot: { alignSelf: 'stretch', width: '100%', height: 8, borderRadius: 4 },
  slotBusy: { backgroundColor: colors.primary },
  slotFree: { backgroundColor: colors.background },
  slotPast: { backgroundColor: '#e2e8f0' },
});
