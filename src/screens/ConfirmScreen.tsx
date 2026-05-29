import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { hasOutraReservaAgendada } from '../lib/quadraReserva';
import { supabase } from '../lib/supabase';
import { navigateRoot } from '../navigation/rootNavigation';
import type { HomeStackScreenProps } from '../navigation/types';
import { showAlert } from '../utils/alert';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import type { ExtraQuadra, Item } from '../types/database';
import { formatDate, formatTime } from '../utils/dates';
import { EXTRA_DISPLAY, EXTRA_KEYS, ITEM_DISPLAY } from '../utils/itemDisplay';
import { fetchQuadraBookingsForDay } from '../utils/quadraAgenda';
import {
  allowedQuadraDurations,
  computeQuadraFimPrevisto,
  overlapsExistingBooking,
  QUADRA_DURACOES_MIN,
  type QuadraBooking,
} from '../utils/quadraAvailability';

type Props = HomeStackScreenProps<'Confirm'>;

const DURACOES = QUADRA_DURACOES_MIN;

export default function ConfirmScreen({ navigation, route }: Props) {
  const { contentContainerStyle } = useScreenContentInsets(40);
  const scheduledStartIso = route.params.scheduledStart;
  const { aluno, loading: alunoLoading } = useAluno();
  const { alugueis } = useAlugueis(aluno?.id ?? '');
  const [item, setItem] = useState<Item | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [duracaoIdx, setDuracaoIdx] = useState(1);
  const [extras, setExtras] = useState<Record<ExtraQuadra, boolean>>({
    futebol: false,
    volei: false,
    basquete: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [quadraBookings, setQuadraBookings] = useState<QuadraBooking[]>([]);

  const slotInicio = useMemo(() => new Date(scheduledStartIso), [scheduledStartIso]);

  const fetchItem = useCallback(async () => {
    setLoadingItem(true);
    const { data } = await supabase.from('itens').select('*').eq('tipo', 'quadra').limit(1).maybeSingle();
    setItem((data as Item) ?? null);
    setLoadingItem(false);
  }, []);

  useEffect(() => {
    void fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    if (!item?.id) {
      setQuadraBookings([]);
      return;
    }
    void fetchQuadraBookingsForDay(item.id, slotInicio).then(setQuadraBookings);
  }, [item?.id, slotInicio]);

  const duracoesPermitidas = useMemo(
    () => allowedQuadraDurations(quadraBookings, slotInicio),
    [quadraBookings, slotInicio],
  );

  useEffect(() => {
    if (duracoesPermitidas.length === 0) return;
    const current = DURACOES[duracaoIdx];
    if (!duracoesPermitidas.includes(current)) {
      const lastAllowed = duracoesPermitidas[duracoesPermitidas.length - 1];
      const idx = DURACOES.indexOf(lastAllowed as (typeof DURACOES)[number]);
      if (idx >= 0) setDuracaoIdx(idx);
    }
  }, [duracoesPermitidas, duracaoIdx]);

  const duracaoMin = duracoesPermitidas.includes(DURACOES[duracaoIdx])
    ? DURACOES[duracaoIdx]
    : (duracoesPermitidas[duracoesPermitidas.length - 1] ?? DURACOES[0]);

  const fimPrevisto = useMemo(
    () => computeQuadraFimPrevisto(slotInicio, duracaoMin),
    [duracaoMin, slotInicio],
  );

  const quadraBloqueada =
    duracoesPermitidas.length === 0 ||
    overlapsExistingBooking(
      quadraBookings,
      slotInicio,
      computeQuadraFimPrevisto(slotInicio, duracaoMin),
    );

  const duracaoLabel = useMemo(() => {
    if (duracaoMin === 30) return '30min';
    if (duracaoMin === 60) return '1h';
    if (duracaoMin === 90) return '1h30';
    return '2h';
  }, [duracaoMin]);

  const extrasSelecionados: ExtraQuadra[] = EXTRA_KEYS.filter((k) => extras[k]);

  const handleConfirm = async () => {
    if (!aluno || !item) {
      showAlert('Erro', 'Aluno ou item não disponível.');
      return;
    }

    if (hasOutraReservaAgendada(alugueis)) {
      showAlert(
        'Reserva existente',
        'Você já tem uma reserva agendada. Cancele-a antes de criar outra.',
      );
      return;
    }

    if (duracoesPermitidas.length === 0) {
      showAlert(
        'Quadra indisponível',
        'Não há tempo suficiente antes das 22h ou do próximo agendamento.',
      );
      return;
    }

    const fimCheck = computeQuadraFimPrevisto(slotInicio, duracaoMin);
    if (overlapsExistingBooking(quadraBookings, slotInicio, fimCheck)) {
      showAlert('Horário ocupado', 'Outro aluguel já ocupa este período. Escolha outra duração.');
      return;
    }

    setSubmitting(true);
    const inicio = slotInicio.toISOString();
    const fimSalvar = computeQuadraFimPrevisto(slotInicio, duracaoMin).toISOString();

    const { error: insertError } = await supabase.from('alugueis').insert({
      aluno_id: aluno.id,
      item_id: item.id,
      inicio,
      fim_previsto: fimSalvar,
      status: 'agendado',
      com_extra: extrasSelecionados.length > 0,
      extras: extrasSelecionados,
    } as never);

    setSubmitting(false);

    if (insertError) {
      showAlert('Erro', insertError.message);
      return;
    }

    showAlert('Reserva confirmada', 'No horário, vá ao totem e aproxime a carteirinha para fazer check-in.', [
      { text: 'OK', onPress: () => navigateRoot('MainTabs') },
    ]);
  };

  if (alunoLoading || loadingItem) return <LoadingView />;

  const display = ITEM_DISPLAY.quadra;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <BackButton onPress={() => navigation.goBack()} style={styles.backSpacing} />

      <Text style={styles.title}>Confirmar reserva</Text>
      <Text style={styles.subtitle}>
        {formatDate(slotInicio.toISOString())} às {formatTime(slotInicio.toISOString())}
      </Text>

      <View style={styles.itemCard}>
        <View style={styles.itemRow}>
          <Ionicons name={display.icon} size={24} color={colors.primaryDark} accessibilityElementsHidden />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item?.nome ?? display.label}</Text>
            <Text style={styles.itemLoc}>{item?.localizacao}</Text>
          </View>
          <View style={[styles.badge, styles.badgeFree]}>
            <Text style={styles.badgeText}>Livre</Text>
          </View>
        </View>
      </View>

      {quadraBloqueada ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            A quadra não pode ser reservada neste horário. Funcionamento: 8h às 22h.
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Duração</Text>
      <View style={styles.durationRow}>
        <Pressable
          style={({ pressed }) => [styles.durationBtn, pressed && styles.durationPressed]}
          onPress={() => {
            const pos = duracoesPermitidas.indexOf(duracaoMin);
            if (pos > 0) {
              const prev = duracoesPermitidas[pos - 1];
              const idx = DURACOES.indexOf(prev as (typeof DURACOES)[number]);
              if (idx >= 0) setDuracaoIdx(idx);
            }
          }}
          disabled={duracoesPermitidas.indexOf(duracaoMin) <= 0}
          accessibilityLabel="Diminuir duração"
        >
          <Text style={styles.durationBtnText}>−</Text>
        </Pressable>
        <Text style={styles.durationValue}>{duracaoLabel}</Text>
        <Pressable
          style={({ pressed }) => [styles.durationBtn, pressed && styles.durationPressed]}
          onPress={() => {
            const pos = duracoesPermitidas.indexOf(duracaoMin);
            if (pos >= 0 && pos < duracoesPermitidas.length - 1) {
              const next = duracoesPermitidas[pos + 1];
              const idx = DURACOES.indexOf(next as (typeof DURACOES)[number]);
              if (idx >= 0) setDuracaoIdx(idx);
            }
          }}
          disabled={
            duracoesPermitidas.indexOf(duracaoMin) < 0 ||
            duracoesPermitidas.indexOf(duracaoMin) >= duracoesPermitidas.length - 1
          }
          accessibilityLabel="Aumentar duração"
        >
          <Text style={styles.durationBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Extras (opcional)</Text>
      {EXTRA_KEYS.map((key) => {
        const meta = EXTRA_DISPLAY[key];
        return (
          <View key={key} style={styles.extraRow}>
            <View style={styles.extraInfo}>
              <View style={styles.extraIconWrap}>
                <Ionicons name={meta.icon} size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.extraTexts}>
                <Text style={styles.extraTitle}>{meta.label}</Text>
                <Text style={styles.extraSub}>Disponível · {meta.unidades} unidades</Text>
              </View>
            </View>
            <Switch
              value={extras[key]}
              onValueChange={(v) => setExtras((prev) => ({ ...prev, [key]: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel={`Incluir ${meta.label}`}
            />
          </View>
        );
      })}

      <Text style={styles.estimate}>
        Término estimado: {formatTime(fimPrevisto.toISOString())} (máx. 22h)
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.confirmBtn,
          pressed && styles.confirmPressed,
          (submitting || !item) && styles.confirmDisabled,
        ]}
        onPress={() => void handleConfirm()}
        disabled={submitting || !item || quadraBloqueada}
        accessibilityLabel="Confirmar reserva"
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.confirmText}>Confirmar reserva</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  backSpacing: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    ...card,
    marginBottom: 16,
    elevation: 2,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.primaryVeryDark },
  itemLoc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeFree: { backgroundColor: colors.successBg },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.successText },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark, marginBottom: 8 },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  durationBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  durationPressed: { backgroundColor: colors.background },
  durationBtnText: { fontSize: 22, color: colors.primaryDark },
  durationValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'center',
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    ...border,
    marginBottom: 8,
  },
  extraInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  extraIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraTexts: { flex: 1 },
  extraTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  extraSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  estimate: { fontSize: 13, color: colors.primaryDark, marginBottom: 20 },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#fde68a',
  },
  warningText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmPressed: { backgroundColor: colors.background },
  confirmDisabled: { opacity: 0.6 },
  confirmText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
