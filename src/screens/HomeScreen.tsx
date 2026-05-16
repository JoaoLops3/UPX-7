import { useCallback, useEffect, useState } from 'react';
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

type Props = MainTabScreenProps<'Home'>;

const QUADRA_SLOTS = 10;

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

  const occupiedSlots = aluguelAtivo?.itens.tipo === 'quadra' && !quadra?.disponivel ? 3 : 1;

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
              quadra?.disponivel ? styles.badgeFree : styles.badgeBusy,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                quadra?.disponivel ? styles.badgeTextFree : styles.badgeTextBusy,
              ]}
            >
              {quadra?.disponivel ? 'Livre' : 'Ocupado'}
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
        <View style={styles.slotsRow}>
          {Array.from({ length: QUADRA_SLOTS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.slot,
                i < occupiedSlots ? styles.slotBusy : styles.slotFree,
              ]}
            />
          ))}
        </View>
        <View style={styles.slotsHours}>
          <Text style={styles.slotHour}>08h</Text>
          <Text style={styles.slotHour}>10h</Text>
          <Text style={styles.slotHour}>12h</Text>
          <Text style={styles.slotHour}>14h</Text>
          <Text style={styles.slotHour}>16h</Text>
          <Text style={styles.slotHour}>18h</Text>
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
  slotsLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  slotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  slot: { flex: 1, height: 8, borderRadius: 4 },
  slotBusy: { backgroundColor: colors.primary },
  slotFree: { backgroundColor: colors.background },
  slotsHours: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  slotHour: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
