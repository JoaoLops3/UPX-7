import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChipButton } from '../components/ChipButton';
import { LoadingView } from '../components/LoadingView';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { devolverAluguel } from '../lib/devolverAluguel';
import {
  getQuadraAluguelPhase,
  QUADRA_GRACE_MINUTES,
} from '../lib/quadraAluguelTiming';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import type { ItemTipo } from '../types/database';
import { formatDate, formatTime } from '../utils/dates';
import { ITEM_DISPLAY } from '../utils/itemDisplay';

type Props = AppTabScreenProps<'Devolucao'>;

const CHIPS: { key: ItemTipo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'quadra', label: ITEM_DISPLAY.quadra.shortLabel, icon: ITEM_DISPLAY.quadra.icon },
  {
    key: 'guarda_chuva',
    label: ITEM_DISPLAY.guarda_chuva.shortLabel,
    icon: ITEM_DISPLAY.guarda_chuva.icon,
  },
];

const TIPOS_VALIDOS: ItemTipo[] = ['quadra', 'guarda_chuva'];

function statusForTipo(
  tipo: ItemTipo,
  aluguelAtivo: ReturnType<typeof useAlugueis>['aluguelAtivo'],
): { pending: boolean; urgent: boolean; title: string; detail: string } {
  const ativo = aluguelAtivo?.itens.tipo === tipo ? aluguelAtivo : null;

  if (!ativo) {
    return {
      pending: false,
      urgent: false,
      title: 'Sem aluguel ativo',
      detail: `Você não tem ${ITEM_DISPLAY[tipo].shortLabel.toLowerCase()} para devolver.`,
    };
  }

  if (tipo === 'quadra') {
    const phase = getQuadraAluguelPhase(ativo);
    if (phase === 'aguardando_nfc') {
      return {
        pending: true,
        urgent: true,
        title: 'Devolução pendente',
        detail: `Horário encerrado. Aproxime a carteirinha no totem em até ${QUADRA_GRACE_MINUTES} min.`,
      };
    }
    return {
      pending: true,
      urgent: false,
      title: 'Em uso',
      detail: `Devolver até ${formatTime(ativo.fim_previsto)} · ${ativo.itens.nome}`,
    };
  }

  return {
    pending: true,
    urgent: false,
    title: 'Devolução pendente',
    detail: `Devolver até ${formatDate(ativo.fim_previsto)} · ${ativo.itens.nome}`,
  };
}

export default function DevolucaoScreen(_props: Props) {
  const navigation = useNavigation();
  const { aluno, loading: alunoLoading } = useAluno();
  const { aluguelAtivo, loading, refetch } = useAlugueis(aluno?.id ?? '');
  const { contentContainerStyle } = useScreenContentInsets(32);
  const [selected, setSelected] = useState<ItemTipo>('guarda_chuva');
  const [submitting, setSubmitting] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const quadraPhase = getQuadraAluguelPhase(aluguelAtivo);
  const urgent = quadraPhase === 'aguardando_nfc';

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarBadge: aluguelAtivo ? (urgent ? '!' : '1') : undefined,
      tabBarBadgeStyle: urgent
        ? { backgroundColor: '#f59e0b', color: '#fff', fontSize: 11, lineHeight: 14 }
        : { backgroundColor: colors.primary, fontSize: 10, lineHeight: 14 },
      tabBarAccessibilityLabel: aluguelAtivo
        ? 'Devolução, você tem item para devolver'
        : 'Devolução, nenhum item pendente',
    });
  }, [aluguelAtivo, navigation, urgent]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    const tipo = aluguelAtivo?.itens.tipo as ItemTipo | undefined;
    if (tipo && TIPOS_VALIDOS.includes(tipo)) {
      setSelected(tipo);
    }
  }, [aluguelAtivo?.itens.tipo]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const handleSimularNfc = async () => {
    if (!aluguelAtivo || !aluno || submitting) return;

    const tipoAtivo = aluguelAtivo.itens.tipo as ItemTipo;
    if (!TIPOS_VALIDOS.includes(tipoAtivo)) return;
    if (selected !== tipoAtivo) {
      Alert.alert(
        'Item incorreto',
        `Seu aluguel ativo é ${aluguelAtivo.itens.nome}. Selecione o item correto para devolver.`,
      );
      return;
    }

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
      );
    } else {
      Alert.alert('Devolução concluída', `${itemNome} devolvido com sucesso.`);
    }
  };

  if (alunoLoading || loading) return <LoadingView />;

  const activeTipo = aluguelAtivo?.itens.tipo as ItemTipo | undefined;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Devolução</Text>
      <Text style={styles.pageSubtitle}>
        Veja se há itens para devolver e conclua no totem NFC.
      </Text>

      <Text style={styles.sectionTitle}>Situação dos itens</Text>
      <View style={styles.statusList}>
        {CHIPS.map((chip) => {
          const status = statusForTipo(chip.key, aluguelAtivo);
          return (
            <View
              key={chip.key}
              style={[
                styles.statusCard,
                status.pending && styles.statusCardPending,
                status.urgent && styles.statusCardUrgent,
              ]}
              accessibilityRole="summary"
              accessibilityLabel={`${chip.label}: ${status.title}. ${status.detail}`}
            >
              <View
                style={[
                  styles.statusIcon,
                  status.pending && styles.statusIconPending,
                  status.urgent && styles.statusIconUrgent,
                ]}
              >
                <Ionicons
                  name={chip.icon}
                  size={22}
                  color={
                    status.urgent
                      ? '#92400e'
                      : status.pending
                        ? colors.primaryDark
                        : colors.inactive
                  }
                  accessibilityElementsHidden
                />
              </View>
              <View style={styles.statusBody}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{chip.label}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      status.pending && styles.statusBadgePending,
                      status.urgent && styles.statusBadgeUrgent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        status.pending && styles.statusBadgeTextPending,
                        status.urgent && styles.statusBadgeTextUrgent,
                      ]}
                    >
                      {status.pending ? (status.urgent ? 'Urgente' : 'Devolver') : 'Ok'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusTitle}>{status.title}</Text>
                <Text style={styles.statusDetail}>{status.detail}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {aluguelAtivo ? (
        <>
          <Text style={styles.sectionTitle}>Concluir devolução</Text>
          <View style={styles.nfcCard}>
            <View style={styles.center}>
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulse }] }]}>
                <Ionicons
                  name="radio-outline"
                  size={48}
                  color={colors.primaryDark}
                  accessibilityElementsHidden
                />
              </Animated.View>
              <Text style={styles.nfcTitle}>Aproxime a carteirinha</Text>
              <Text style={styles.nfcSubtitle}>
                Leve o cartão ao totem NFC para concluir a devolução
              </Text>
              <Text style={styles.itemHint}>{aluguelAtivo.itens.nome}</Text>
            </View>

            <View style={styles.chips}>
              {CHIPS.map((chip) => {
                const isSelected = selected === chip.key;
                const isActiveRental = activeTipo === chip.key;
                return (
                  <ChipButton
                    key={chip.key}
                    selected={isSelected}
                    onPress={() => {
                      if (!isActiveRental) {
                        Alert.alert(
                          'Sem aluguel deste item',
                          `Você não tem ${chip.label.toLowerCase()} em aluguel no momento.`,
                        );
                        return;
                      }
                      setSelected(chip.key);
                    }}
                    accessibilityLabel={`Devolver ${chip.label}`}
                    style={[styles.chipItem, !isActiveRental && styles.chipDisabled]}
                  >
                    <Ionicons
                      name={chip.icon}
                      size={20}
                      color={
                        isSelected
                          ? colors.primaryDark
                          : isActiveRental
                            ? colors.inactive
                            : '#d1d5db'
                      }
                      accessibilityElementsHidden
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                        !isActiveRental && styles.chipTextDisabled,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </ChipButton>
                );
              })}
            </View>

            {submitting ? (
              <View style={styles.loadingBtn}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : (
              <PrimaryButton
                label="Simular leitura NFC"
                onPress={() => void handleSimularNfc()}
                accessibilityLabel="Simular leitura NFC para devolver"
              />
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyCard} accessibilityRole="text">
          <Ionicons
            name="checkmark-circle-outline"
            size={40}
            color={colors.successText}
            accessibilityElementsHidden
          />
          <Text style={styles.emptyTitle}>Tudo em dia</Text>
          <Text style={styles.emptyText}>
            Você não tem quadra nem guarda-chuva para devolver no momento.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  statusList: { gap: 10, marginBottom: 24 },
  statusCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  statusCardPending: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  statusCardUrgent: {
    borderColor: '#f59e0b',
    backgroundColor: colors.warningBg,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconPending: { backgroundColor: colors.white },
  statusIconUrgent: { backgroundColor: '#fef3c7' },
  statusBody: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  statusLabel: { fontSize: 15, fontWeight: '700', color: colors.primaryVeryDark },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.screenBg,
  },
  statusBadgePending: { backgroundColor: colors.white },
  statusBadgeUrgent: { backgroundColor: '#fde68a' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: colors.inactive },
  statusBadgeTextPending: { color: colors.primaryDark },
  statusBadgeTextUrgent: { color: '#92400e' },
  statusTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  statusDetail: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  nfcCard: {
    ...card,
    padding: 16,
  },
  center: { alignItems: 'center', paddingVertical: 8 },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...border,
    borderColor: colors.primary,
  },
  nfcTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryVeryDark },
  nfcSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  itemHint: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  chipItem: { flexGrow: 1, flexBasis: '47%' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, color: colors.inactive, fontWeight: '500' },
  chipTextSelected: { color: colors.primaryDark },
  chipTextDisabled: { color: '#d1d5db' },
  loadingBtn: { paddingVertical: 16, alignItems: 'center' },
  emptyCard: {
    ...card,
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
