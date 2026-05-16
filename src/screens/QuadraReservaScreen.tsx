import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { LoadingView } from '../components/LoadingView';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { supabase } from '../lib/supabase';
import { hasOutraReservaAgendada } from '../lib/quadraReserva';
import { navigateRoot } from '../navigation/rootNavigation';
import type { HomeStackScreenProps } from '../navigation/types';
import { showAlert } from '../utils/alert';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import { formatDayMonth, formatWeekdayShort } from '../utils/dates';
import { fetchQuadraBookingsForDay } from '../utils/quadraAgenda';
import {
  computeQuadraSlots,
  formatHourLabel,
  isSameCalendarDay,
  listReservaDates,
  QUADRA_HOUR_LABELS,
  slotIndexForHourLabel,
  startOfCalendarDay,
  type QuadraBooking,
  type QuadraSlot,
  type SlotState,
} from '../utils/quadraAvailability';

type Props = HomeStackScreenProps<'QuadraReserva'>;

function dateChipBadge(day: Date, today: Date): string | null {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDay(day, tomorrow)) return 'Amanhã';
  return null;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export default function QuadraReservaScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { alugueis, loading: alugueisLoading } = useAlugueis(aluno?.id ?? '');
  const today = useMemo(() => startOfCalendarDay(new Date()), []);
  const dates = useMemo(() => listReservaDates(), []);
  const [selectedDay, setSelectedDay] = useState(() => {
    const tomorrow = startOfCalendarDay(new Date());
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [bookings, setBookings] = useState<QuadraBooking[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [quadraId, setQuadraId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<QuadraSlot | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('itens')
        .select('id')
        .eq('tipo', 'quadra')
        .limit(1)
        .maybeSingle();
      setQuadraId(data?.id ?? null);
    })();
  }, []);

  const loadAgenda = useCallback(async () => {
    if (!quadraId) return;
    setLoadingAgenda(true);
    setBookings(await fetchQuadraBookingsForDay(quadraId, selectedDay));
    setLoadingAgenda(false);
  }, [quadraId, selectedDay]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  const referenceNow = useMemo(() => {
    if (isSameCalendarDay(selectedDay, new Date())) return new Date();
    return startOfCalendarDay(selectedDay);
  }, [selectedDay]);

  const slots = useMemo(
    () => computeQuadraSlots(bookings, selectedDay, referenceNow),
    [bookings, selectedDay, referenceNow],
  );

  const freeCount = useMemo(() => slots.filter((s) => s.state === 'free').length, [slots]);

  const slotVisual = (state: SlotState, picked: boolean) => {
    if (picked) return styles.slotBtnPicked;
    if (state === 'busy') return styles.slotBtnBusy;
    if (state === 'past') return styles.slotBtnPast;
    return styles.slotBtnFree;
  };

  const slotTextVisual = (state: SlotState, picked: boolean) => {
    if (picked) return styles.slotBtnTextPicked;
    if (state === 'busy') return styles.slotBtnTextBusy;
    if (state === 'past') return styles.slotBtnTextPast;
    return styles.slotBtnTextFree;
  };

  const handleContinue = () => {
    if (!selectedSlot || selectedSlot.state !== 'free') {
      showAlert('Horário', 'Selecione um horário livre.');
      return;
    }
    if (hasOutraReservaAgendada(alugueis)) {
      showAlert(
        'Reserva existente',
        'Você já tem uma reserva agendada. Cancele-a antes de criar outra.',
      );
      return;
    }
    navigateRoot('Confirm', {
      item: 'quadra',
      mode: 'schedule',
      scheduledStart: selectedSlot.slotStart.toISOString(),
    });
  };

  if (alunoLoading || alugueisLoading) return <LoadingView />;

  const isToday = isSameCalendarDay(selectedDay, new Date());
  const selectedDateLabel = `${formatWeekdayShort(selectedDay)}, ${formatDayMonth(selectedDay)}`;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <BackButton onPress={() => navigation.goBack()} style={styles.back} />

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.title}>Reservar quadra</Text>
            <Text style={styles.sub}>
              Escolha data e horário de início. No dia, faça check-in no totem NFC.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="radio-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.infoText}>
            Funcionamento das 8h às 22h · check-in disponível 15 min antes do horário
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Data</Text>
              <Text style={styles.sectionMeta}>{selectedDateLabel}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={Platform.OS === 'web'}
            contentContainerStyle={styles.dateRow}
          >
            {dates.map((day) => {
              const selected = isSameCalendarDay(day, selectedDay);
              const isTodayChip = isSameCalendarDay(day, today);
              if (isTodayChip) return null;
              const badge = dateChipBadge(day, today);
              return (
                <Pressable
                  key={day.toISOString()}
                  style={({ pressed }) => [
                    styles.dateChip,
                    selected && styles.dateChipSelected,
                    pressed && !selected && styles.dateChipPressed,
                  ]}
                  onPress={() => {
                    setSelectedDay(day);
                    setSelectedSlot(null);
                  }}
                  accessibilityLabel={`Dia ${formatDayMonth(day)}`}
                  accessibilityState={{ selected }}
                >
                  {badge ? (
                    <View style={[styles.dateBadge, selected && styles.dateBadgeSelected]}>
                      <Text style={[styles.dateBadgeText, selected && styles.dateTextSelected]}>
                        {badge}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.dateWeekday, selected && styles.dateTextSelected]}>
                    {formatWeekdayShort(day)}
                  </Text>
                  <Text style={[styles.dateDay, selected && styles.dateTextSelected]}>
                    {formatDayMonth(day)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Horário de início</Text>
              <Text style={styles.sectionMeta}>
                {loadingAgenda
                  ? 'Carregando agenda…'
                  : `${freeCount} horário${freeCount === 1 ? '' : 's'} livre${freeCount === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>

          {isToday ? (
            <View style={styles.todayHint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.todayHintText}>
                Para usar a quadra hoje agora, volte e toque em &quot;Alugar agora&quot;.
              </Text>
            </View>
          ) : null}

          <View style={styles.legendRow}>
            <LegendDot color={colors.successText} label="Livre" />
            <LegendDot color="#f87171" label="Ocupado" />
            <LegendDot color="#cbd5e1" label="Passado" />
            <LegendDot color={colors.primary} label="Selecionado" />
          </View>

          {loadingAgenda ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingSlotsText}>Consultando disponibilidade…</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {QUADRA_HOUR_LABELS.slice(0, -1).map((hour) => {
                const slot = slots[slotIndexForHourLabel(hour)];
                if (!slot) return null;
                const picked = selectedSlot?.index === slot.index;
                const disabled = slot.state !== 'free';
                return (
                  <Pressable
                    key={hour}
                    style={({ pressed }) => [
                      styles.slotBtn,
                      slotVisual(slot.state, picked),
                      pressed && !disabled && styles.slotBtnPressed,
                    ]}
                    disabled={disabled}
                    onPress={() => setSelectedSlot(slot)}
                    accessibilityLabel={`Horário ${formatHourLabel(hour)}`}
                    accessibilityState={{ selected: picked, disabled }}
                  >
                    <Text style={[styles.slotBtnTime, slotTextVisual(slot.state, picked)]}>
                      {formatHourLabel(hour)}
                    </Text>
                    {slot.state === 'busy' && !picked ? (
                      <Text style={styles.slotBtnSub}>Ocupado</Text>
                    ) : null}
                    {picked ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.white} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.scrollFooterSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        {selectedSlot && selectedSlot.state === 'free' ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryLabel}>Horário escolhido</Text>
              <Text style={styles.summaryValue}>
                {formatHourLabel(selectedSlot.hourStart)} · {selectedDateLabel}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.footerHint}>Selecione um horário livre para continuar</Text>
        )}
        <PrimaryButton
          label="Continuar"
          onPress={handleContinue}
          disabled={!selectedSlot || selectedSlot.state !== 'free'}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  scrollFooterSpacer: { height: 8 },
  back: { marginBottom: 16 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(26, 74, 122, 0.08)' }
      : { elevation: 2 }),
  },
  heroText: { flex: 1, paddingTop: 2 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    ...border,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 17,
    fontWeight: '500',
  },
  sectionCard: {
    ...card,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryVeryDark,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateRow: { gap: 10, paddingRight: 4 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    minWidth: 72,
    ...border,
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(59, 130, 196, 0.35)' }
      : { elevation: 4 }),
  },
  dateChipPressed: { backgroundColor: colors.background },
  dateBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  dateBadgeSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateWeekday: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  dateTextSelected: { color: colors.white },
  todayHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  todayHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryVeryDark,
    lineHeight: 17,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  loadingSlots: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingSlotsText: { fontSize: 13, color: colors.textMuted },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotBtn: {
    width: Platform.select({ web: '23%', default: '30%' }),
    minWidth: 72,
    maxWidth: Platform.OS === 'web' ? 96 : undefined,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'solid',
    gap: 2,
  },
  slotBtnFree: {
    backgroundColor: colors.successBg,
    borderColor: '#bbf7d0',
  },
  slotBtnBusy: {
    backgroundColor: colors.dangerBg,
    borderColor: '#fecaca',
    opacity: 0.85,
  },
  slotBtnPast: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  slotBtnPicked: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 10px rgba(59, 130, 196, 0.4)' }
      : { elevation: 3 }),
  },
  slotBtnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  slotBtnTime: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  slotBtnTextFree: { color: colors.successText },
  slotBtnTextBusy: { color: colors.dangerText },
  slotBtnTextPast: { color: colors.inactive },
  slotBtnTextPicked: { color: colors.white },
  slotBtnSub: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.dangerText,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.select({ web: 20, default: 24 }),
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -4px 16px rgba(26, 74, 122, 0.08)' }
      : { elevation: 8 }),
  },
  footerHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    ...border,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...border,
  },
  summaryBody: { flex: 1 },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginTop: 2,
  },
  cta: { marginTop: 0 },
});
