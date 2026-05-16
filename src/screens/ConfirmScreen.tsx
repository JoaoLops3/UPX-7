import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAluno } from '../hooks/useAluno';
import { supabase } from '../lib/supabase';
import type { RootStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import type { ExtraQuadra, Item } from '../types/database';
import { addDays, addMinutes, formatDate, formatTime } from '../utils/dates';
import { EXTRA_DISPLAY, EXTRA_KEYS, getItemDisplay } from '../utils/itemDisplay';

type Props = RootStackScreenProps<'Confirm'>;

const DURACOES = [30, 60, 90, 120] as const;

export default function ConfirmScreen({ navigation, route }: Props) {
  const tipo = route.params.item;
  const { aluno, loading: alunoLoading } = useAluno();
  const [item, setItem] = useState<Item | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [duracaoIdx, setDuracaoIdx] = useState(1);
  const [extras, setExtras] = useState<Record<ExtraQuadra, boolean>>({
    futebol: false,
    volei: false,
    basquete: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoadingItem(true);
    const { data } = await supabase
      .from('itens')
      .select('*')
      .eq('tipo', tipo)
      .eq('disponivel', true)
      .limit(1)
      .maybeSingle();
    setItem((data as Item) ?? null);
    setLoadingItem(false);
  }, [tipo]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const duracaoMin = DURACOES[duracaoIdx];
  const fimPrevisto = useMemo(() => {
    const base = new Date();
    return tipo === 'quadra' ? addMinutes(base, duracaoMin) : addDays(base, 7);
  }, [tipo, duracaoMin]);

  const duracaoLabel = useMemo(() => {
    if (duracaoMin === 30) return '30min';
    if (duracaoMin === 60) return '1h';
    if (duracaoMin === 90) return '1h30';
    return '2h';
  }, [duracaoMin]);

  const extrasSelecionados: ExtraQuadra[] = EXTRA_KEYS.filter((k) => extras[k]);

  const handleConfirm = async () => {
    if (!aluno || !item) {
      Alert.alert('Erro', 'Aluno ou item não disponível.');
      return;
    }

    setSubmitting(true);
    const inicio = new Date().toISOString();

    const { error: insertError } = await supabase.from('alugueis').insert({
      aluno_id: aluno.id,
      item_id: item.id,
      inicio,
      fim_previsto: fimPrevisto.toISOString(),
      status: 'ativo',
      com_extra: tipo === 'quadra' ? extrasSelecionados.length > 0 : false,
      extras: tipo === 'quadra' ? extrasSelecionados : [],
    } as never);

    if (insertError) {
      Alert.alert('Erro', insertError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from('itens').update({ disponivel: false }).eq('id', item.id);
    setSubmitting(false);
    navigation.replace('Active');
  };

  if (alunoLoading || loadingItem) return <LoadingView />;

  const display = getItemDisplay(tipo);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BackButton onPress={() => navigation.goBack()} style={styles.backSpacing} />

      <Text style={styles.title}>Confirmar aluguel</Text>
      <Text style={styles.subtitle}>
        {tipo === 'quadra'
          ? 'Revise a duração e os extras antes de confirmar'
          : 'Confira o número do guarda-chuva atribuído'}
      </Text>

      <View style={styles.itemCard}>
        <View style={styles.itemRow}>
          <Ionicons
            name={display.icon}
            size={24}
            color={colors.primaryDark}
            accessibilityElementsHidden
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item?.nome ?? display.label}</Text>
            <Text style={styles.itemLoc}>{item?.localizacao}</Text>
          </View>
          <View style={[styles.badge, styles.badgeFree]}>
            <Text style={styles.badgeText}>Livre</Text>
          </View>
        </View>

        {tipo === 'guarda_chuva' && item && (
          <View style={styles.numeroBox}>
            <Text style={styles.numeroLabel}>Seu número</Text>
            <Text style={styles.numeroValue}>#{item.numero}</Text>
            <Text style={styles.numeroHint}>
              Pegue o guarda-chuva número {item.numero} na {item.localizacao}
            </Text>
          </View>
        )}
      </View>

      {tipo === 'quadra' ? (
        <>
          <Text style={styles.sectionLabel}>Duração</Text>
          <View style={styles.durationRow}>
            <Pressable
              style={({ pressed }) => [styles.durationBtn, pressed && styles.durationPressed]}
              onPress={() => setDuracaoIdx((i) => Math.max(0, i - 1))}
              disabled={duracaoIdx === 0}
              accessibilityLabel="Diminuir duração"
            >
              <Text style={styles.durationBtnText}>−</Text>
            </Pressable>
            <Text style={styles.durationValue}>{duracaoLabel}</Text>
            <Pressable
              style={({ pressed }) => [styles.durationBtn, pressed && styles.durationPressed]}
              onPress={() => setDuracaoIdx((i) => Math.min(DURACOES.length - 1, i + 1))}
              disabled={duracaoIdx === DURACOES.length - 1}
              accessibilityLabel="Aumentar duração"
            >
              <Text style={styles.durationBtnText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Extras (opcional)</Text>
          {EXTRA_KEYS.map((key) => {
            const meta = EXTRA_DISPLAY[key];
            const checked = extras[key];
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
                  value={checked}
                  onValueChange={(v) =>
                    setExtras((prev) => ({ ...prev, [key]: v }))
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  accessibilityLabel={`Incluir ${meta.label}`}
                />
              </View>
            );
          })}

          <Text style={styles.estimate}>
            Término estimado: {formatTime(fimPrevisto.toISOString())}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Prazo de devolução: 7 dias. Devolver até {formatDate(fimPrevisto.toISOString())}.
              {'\n'}Atrasos geram multa de R$5,00/dia registrada no seu RA.
            </Text>
          </View>
          <Text style={styles.estimate}>
            Devolver até: {formatDate(fimPrevisto.toISOString())}
          </Text>
        </>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.confirmBtn,
          pressed && styles.confirmPressed,
          (submitting || !item) && styles.confirmDisabled,
        ]}
        onPress={handleConfirm}
        disabled={submitting || !item}
        accessibilityLabel="Confirmar aluguel"
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.confirmText}>Confirmar aluguel</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, paddingBottom: 40 },
  backSpacing: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
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
  numeroBox: {
    marginTop: 14,
    backgroundColor: colors.primaryVeryDark,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  numeroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  numeroValue: { color: colors.white, fontSize: 36, fontWeight: '700', marginVertical: 4 },
  numeroHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center' },
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
