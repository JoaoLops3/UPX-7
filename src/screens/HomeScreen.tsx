import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingView } from '../components/LoadingView';
import { WeatherCard } from '../components/WeatherCard';
import { PressableCard } from '../components/PressableCard';
import { SupabaseErrorBanner } from '../components/SupabaseErrorBanner';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { useWeather } from '../hooks/useWeather';
import { supabase } from '../lib/supabase';
import { getSupabaseErrorMessage } from '../utils/supabaseError';
import { navigateRoot, navigateToProfile } from '../navigation/rootNavigation';
import type { HomeStackScreenProps } from '../navigation/types';
import { showAlert, showConfirm } from '../utils/alert';
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
  cancelarReservaAgendada,
  isReservaHoje,
} from '../lib/quadraReserva';
import {
  getQuadraAluguelPhase,
  getQuadraGraceDeadline,
  QUADRA_GRACE_MINUTES,
} from '../lib/quadraAluguelTiming';
import { fetchQuadraBookingsToday } from '../utils/quadraAgenda';
import {
  canRentQuadraToday,
  computeQuadraSlots,
  formatHourLabel,
  getQuadraUnavailableReason,
  isQuadraBusyNow,
  QUADRA_DAY_END_HOUR,
  QUADRA_DAY_START_HOUR,
  QUADRA_HOUR_LABELS,
  quadraUnavailableLabel,
  slotIndexForHourLabel,
  type QuadraBooking,
  type SlotState,
} from '../utils/quadraAvailability';

type Props = HomeStackScreenProps<'HomeMain'>;

export default function HomeScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading, error: alunoError, refetch: refetchAluno } = useAluno();
  const alunoId = aluno?.id ?? '';
  const {
    aluguelAtivo,
    reservaQuadra,
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
  const { weather, loading: weatherLoading, error: weatherError, refresh: refreshWeather } =
    useWeather();
  const { contentContainerStyle } = useScreenContentInsets();

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
    setQuadraBookings(await fetchQuadraBookingsToday(quadraId));
  }, []);

  const supabaseError = alunoError ?? alugueisError ?? itensError;
  const retryAll = () => {
    void refetchAluno();
    void refetchAlugueis();
    void fetchItens();
  };

  const quadraId = useMemo(
    () => itens.find((i) => i.tipo === 'quadra')?.id,
    [itens],
  );

  const executarCancelamentoReserva = useCallback(async () => {
    const reserva = reservaQuadra;
    if (!reserva?.aluno_id || !reserva.item_id) return;
    const confirmou = await showConfirm(
      'Deseja cancelar esta reserva? O horário voltará a ficar disponível para outros alunos.',
      'Cancelar reserva',
    );
    if (!confirmou) return;

    const result = await cancelarReservaAgendada({
      id: reserva.id,
      aluno_id: reserva.aluno_id,
      item_id: reserva.item_id,
    });
    if (!result.ok) {
      showAlert('Erro', result.message ?? 'Não foi possível cancelar.');
      return;
    }

    await refetchAlugueis(true);
    if (quadraId) await fetchQuadraAgenda(quadraId);
    showAlert('Reserva cancelada', 'O horário foi liberado na agenda.');
  }, [reservaQuadra, refetchAlugueis, quadraId, fetchQuadraAgenda]);

  useFocusEffect(
    useCallback(() => {
      fetchItens();
      void refetchAlugueis();
      void refreshWeather();
    }, [fetchItens, refetchAlugueis, refreshWeather]),
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

  useEffect(() => {
    if (quadraId) void fetchQuadraAgenda(quadraId);
    void fetchItens();
  }, [quadraId, fetchQuadraAgenda, fetchItens, aluguelAtivo?.id, aluguelAtivo?.status]);

  const quadra = useMemo(() => itens.find((i) => i.tipo === 'quadra'), [itens]);

  const quadraSlots = useMemo(
    () => computeQuadraSlots(quadraBookings, agendaNow),
    [quadraBookings, agendaNow],
  );

  const quadraOcupadaAgora = useMemo(
    () => isQuadraBusyNow(quadraBookings, agendaNow),
    [quadraBookings, agendaNow],
  );

  const quadraPodeAlugar = useMemo(
    () =>
      canRentQuadraToday(quadraBookings, agendaNow) &&
      Boolean(quadra?.disponivel) &&
      !reservaQuadra,
    [quadraBookings, agendaNow, quadra?.disponivel, reservaQuadra],
  );

  const quadraIndisponivel = useMemo(
    () =>
      getQuadraUnavailableReason(quadraBookings, Boolean(quadra?.disponivel), agendaNow),
    [quadraBookings, quadra?.disponivel, agendaNow],
  );

  const agendaHint = useMemo(() => {
    if (aluguelAtivo?.itens.tipo === 'quadra' && quadraPhase === 'aguardando_nfc') {
      return `Tempo esgotado · confirme no totem NFC (até ${QUADRA_GRACE_MINUTES} min)`;
    }
    if (aluguelAtivo?.itens.tipo === 'quadra' && aluguelAtivo.inicio && quadraPhase === 'em_uso') {
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
    if (quadraIndisponivel === 'closed') {
      return 'Horário encerrado · funcionamento 8h às 22h';
    }
    return null;
  }, [aluguelAtivo, quadraPhase, quadraOcupadaAgora, quadraIndisponivel, quadraBookings, agendaNow]);

  const loading = alunoLoading || alugueisLoading || itensLoading;
  if (loading) return <LoadingView />;

  const guardaChuvas = itens.filter((i) => i.tipo === 'guarda_chuva');
  const guardaDisponiveis = guardaChuvas.filter((i) => i.disponivel).length;

  const navigateScan = (item: ItemTipo) => {
    showAlert(
      item === 'quadra' ? 'Check-in da quadra' : 'Pegar guarda-chuva',
      item === 'quadra'
        ? 'No horário da sua reserva, aproxime a carteirinha no totem da quadra para fazer o check-in.'
        : 'Vá até o totem e aproxime sua carteirinha para retirar um guarda-chuva.',
    );
  };

  const handleReservaPress = () => {
    if (!reservaQuadra?.inicio) return;
    if (isReservaHoje(reservaQuadra)) {
      navigateScan('quadra');
      return;
    }
    const detalhe = `${formatDate(reservaQuadra.inicio)} · ${formatTime(reservaQuadra.inicio)} – ${formatTime(reservaQuadra.fim_previsto)}`;
    showAlert('Sua reserva', detalhe, [{ text: 'Fechar', style: 'default' }]);
  };

  const goQuadraReserva = () => {
    navigateRoot('QuadraReserva');
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
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      {supabaseError && (
        <SupabaseErrorBanner message={supabaseError} onRetry={retryAll} />
      )}
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={navigateToProfile}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
        accessibilityHint="Mostra seus dados e configurações da conta"
      >
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Olá, {aluno?.nome?.split(' ')[0] ?? 'aluno'}</Text>
          <Text style={styles.subGreeting}>Bem-vindo de volta</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(aluno?.nome ?? 'A')}</Text>
        </View>
      </Pressable>

      <WeatherCard
        weather={weather}
        loading={weatherLoading}
        error={weatherError}
        guardaDisponiveis={guardaDisponiveis}
        onRetry={() => void refreshWeather(true)}
        onUmbrellaPress={() =>
          showAlert(
            'Guarda-chuva',
            'Vá até o totem e aproxime sua carteirinha para retirar um guarda-chuva.',
          )
        }
      />

      {aluguelAtivo ? (
        <Pressable
          style={({ pressed }) => [
            styles.activeBanner,
            quadraPhase === 'aguardando_nfc' && styles.activeBannerUrgent,
            pressed && styles.pressedDark,
          ]}
          onPress={() => navigateRoot('Active')}
          accessibilityLabel="Ver detalhes do aluguel ativo"
        >
            <Text style={styles.activeTitle}>{aluguelAtivo.itens.nome}</Text>
            <Text
              style={[
                styles.activeCountdown,
                quadraPhase === 'aguardando_nfc' && styles.activeCountdownUrgent,
              ]}
            >
              {aluguelAtivo.itens.tipo === 'quadra'
                ? countdown || '00:00:00'
                : `${activeDaysLeft} dias restantes`}
            </Text>
            <Text style={styles.activeSubtitle}>
              {aluguelAtivo.itens.tipo === 'quadra' && quadraPhase === 'aguardando_nfc'
                ? `Tempo esgotado — use o NFC no totem (${QUADRA_GRACE_MINUTES} min para confirmar)`
                : aluguelAtivo.itens.tipo === 'quadra'
                  ? `Término às ${formatTime(aluguelAtivo.fim_previsto)}`
                  : `Devolver até ${formatDate(aluguelAtivo.fim_previsto)}`}
            </Text>
            <Text style={styles.activeLink}>Ver detalhes →</Text>
        </Pressable>
      ) : reservaQuadra ? (
        <View style={styles.reservaBanner}>
          <Pressable
            style={({ pressed }) => [pressed && styles.pressedDark]}
            onPress={handleReservaPress}
            accessibilityLabel="Ver reserva da quadra"
          >
            <Text style={styles.reservaTitle}>Reserva da quadra</Text>
            <Text style={styles.reservaWhen}>
              {formatDate(reservaQuadra.inicio ?? '')} · {formatTime(reservaQuadra.inicio ?? '')} –{' '}
              {formatTime(reservaQuadra.fim_previsto)}
            </Text>
            <Text style={styles.reservaHint}>
              {isReservaHoje(reservaQuadra)
                ? 'Faça check-in no totem NFC no horário'
                : 'Toque para ver detalhes'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void executarCancelamentoReserva()}
            accessibilityLabel="Cancelar reserva da quadra"
            style={styles.reservaCancelLink}
          >
            <Text style={styles.reservaCancelText}>Cancelar reserva</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.emptyActive}>
          <Text style={styles.emptyActiveText}>Nenhum aluguel ativo</Text>
        </View>
      )}

      {reservaQuadra && aluguelAtivo ? (
        <Pressable
          style={({ pressed }) => [styles.reservaBannerCompact, pressed && styles.pressedDark]}
          onPress={handleReservaPress}
        >
          <Text style={styles.reservaCompactText}>
            Próxima reserva: {formatDate(reservaQuadra.inicio ?? '')} às{' '}
            {formatTime(reservaQuadra.inicio ?? '')}
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Itens disponíveis</Text>

      <View style={[styles.cardSpacing, styles.quadraCard]}>
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="football-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{quadra?.nome ?? 'Quadra A'}</Text>
            <Text style={styles.cardSub}>
              {reservaQuadra
                ? 'Você já tem uma reserva — confirme no totem no horário'
                : quadraPodeAlugar
                  ? (quadra?.localizacao ?? 'Campus Facens')
                  : quadraIndisponivel === 'closed'
                    ? 'Sem horários hoje · último slot 22h'
                    : 'Em uso no momento'}
            </Text>
          </View>
          <View
            style={[styles.badge, quadraPodeAlugar ? styles.badgeFree : styles.badgeBusy]}
          >
            <Text
              style={[
                styles.badgeText,
                quadraPodeAlugar ? styles.badgeTextFree : styles.badgeTextBusy,
              ]}
            >
              {quadraPodeAlugar
                ? 'Livre'
                : quadraIndisponivel
                  ? quadraUnavailableLabel(quadraIndisponivel)
                  : 'Ocupado'}
            </Text>
          </View>
        </View>
        <View style={styles.quadraActions}>
          <Pressable
            style={({ pressed }) => [
              styles.quadraActionBtn,
              styles.quadraActionPrimary,
              !quadraPodeAlugar && styles.quadraActionDisabled,
              pressed && quadraPodeAlugar && styles.quadraActionPressed,
            ]}
            onPress={() => quadraPodeAlugar && navigateRoot('QuadraReserva', { mode: 'today' })}
            disabled={!quadraPodeAlugar}
            accessibilityLabel="Alugar quadra hoje"
          >
            <Text
              style={[
                styles.quadraActionText,
                styles.quadraActionTextPrimary,
                !quadraPodeAlugar && styles.quadraActionTextDisabled,
              ]}
            >
              Alugar agora
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quadraActionBtn,
              pressed && styles.quadraActionPressed,
            ]}
            onPress={goQuadraReserva}
            accessibilityLabel="Reservar quadra por data"
          >
            <Text style={styles.quadraActionText}>Reservar data</Text>
          </Pressable>
        </View>
      </View>

      <PressableCard style={styles.cardSpacing}>
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={ITEM_DISPLAY.guarda_chuva.icon} size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{ITEM_DISPLAY.guarda_chuva.label}</Text>
            <Text style={styles.cardSub}>
              {guardaDisponiveis} disponíveis · retire no totem NFC
            </Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          style={styles.slotsScrollView}
          contentContainerStyle={styles.slotsScroll}
        >
          <View style={styles.slotsTimeline}>
            <View style={styles.slotsRow}>
              {QUADRA_HOUR_LABELS.map((hour) => {
                const slot = quadraSlots[slotIndexForHourLabel(hour)];

                return (
                  <View key={hour} style={styles.slotColumn}>
                    <Text style={styles.slotHourTop}>{formatHourLabel(hour)}</Text>
                    {slot ? (
                      <View style={[styles.slot, slotStyleFor(slot.state)]} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerPressed: { opacity: 0.75 },
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
  activeBannerUrgent: {
    backgroundColor: '#92400e',
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
  activeCountdownUrgent: {
    color: '#fef3c7',
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
  reservaBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reservaTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  reservaWhen: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  reservaHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8 },
  reservaCancelLink: { marginTop: 10, alignSelf: 'flex-start' },
  reservaCancelText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  reservaBannerCompact: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    ...card,
  },
  reservaCompactText: { fontSize: 12, color: colors.primaryDark, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.primaryVeryDark, marginBottom: 10 },
  quadraCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    ...card,
    elevation: 2,
  },
  quadraActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quadraActionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  quadraActionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quadraActionDisabled: { opacity: 0.5 },
  quadraActionPressed: { opacity: 0.85 },
  quadraActionText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  quadraActionTextPrimary: { color: colors.white },
  quadraActionTextDisabled: { color: colors.white },
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
  slotsScrollView: Platform.select({
    web: {
      marginBottom: 4,
    },
    default: {},
  }),
  slotsScroll: {
    alignItems: 'flex-start',
  },
  slotsTimeline: Platform.select({
    web: {
      paddingBottom: 16,
    },
    default: {},
  }),
  slotsRow: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 2,
  },
  slotColumn: {
    alignItems: 'center',
    minWidth: 22,
  },
  slotHourTop: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
    minHeight: 12,
    textAlign: 'center',
  },
  slot: { width: 20, height: 8, borderRadius: 4 },
  slotBusy: { backgroundColor: colors.primary },
  slotFree: { backgroundColor: colors.background },
  slotPast: { backgroundColor: '#e2e8f0' },
});
