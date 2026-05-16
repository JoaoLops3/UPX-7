import { useEffect, useRef, useState } from 'react';
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
import { BackButton } from '../components/BackButton';
import { ChipButton } from '../components/ChipButton';
import { LoadingView } from '../components/LoadingView';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { devolverAluguel } from '../lib/devolverAluguel';
import type { RootStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';
import type { ItemTipo } from '../types/database';
import { ITEM_DISPLAY } from '../utils/itemDisplay';

type Props = RootStackScreenProps<'Return'>;

const CHIPS: { key: ItemTipo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'quadra', label: ITEM_DISPLAY.quadra.shortLabel, icon: ITEM_DISPLAY.quadra.icon },
  {
    key: 'guarda_chuva',
    label: ITEM_DISPLAY.guarda_chuva.shortLabel,
    icon: ITEM_DISPLAY.guarda_chuva.icon,
  },
];

const TIPOS_VALIDOS: ItemTipo[] = ['quadra', 'guarda_chuva'];

export default function ReturnScanScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { aluguelAtivo, loading, refetch } = useAlugueis(aluno?.id ?? '');
  const [selected, setSelected] = useState<ItemTipo>('guarda_chuva');
  const [submitting, setSubmitting] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

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

  if (alunoLoading || loading) return <LoadingView />;

  if (!aluguelAtivo) {
    return (
      <View style={styles.screen}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color={colors.inactive} accessibilityElementsHidden />
          <Text style={styles.title}>Sem aluguel ativo</Text>
          <Text style={styles.subtitle}>
            Você não tem nenhum item para devolver no momento.
          </Text>
        </View>
      </View>
    );
  }

  const activeTipo = aluguelAtivo.itens.tipo as ItemTipo;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.center}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulse }] }]}>
          <Ionicons
            name="radio-outline"
            size={48}
            color={colors.primaryDark}
            accessibilityElementsHidden
          />
        </Animated.View>
        <Text style={styles.title}>Aproxime a carteirinha</Text>
        <Text style={styles.subtitle}>
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
                  isSelected ? colors.primaryDark : isActiveRental ? colors.inactive : '#d1d5db'
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
          style={styles.simulateSpacing}
          accessibilityLabel="Simular leitura NFC para devolver"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  scrollContent: { padding: 16, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...border,
    borderColor: colors.primary,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  itemHint: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chipItem: { flexGrow: 1, flexBasis: '47%' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, color: colors.inactive, fontWeight: '500' },
  chipTextSelected: { color: colors.primaryDark },
  chipTextDisabled: { color: '#d1d5db' },
  simulateSpacing: { marginBottom: 16 },
  loadingBtn: { paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
});
