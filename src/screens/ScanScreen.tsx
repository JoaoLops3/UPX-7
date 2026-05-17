import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { ChipButton } from '../components/ChipButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useQuadraCheckIn } from '../hooks/useQuadraCheckIn';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import {
  activateQuadraReserva,
  findAgendadoForCheckIn,
  validateCheckInWindow,
} from '../lib/quadraReserva';
import { supabase } from '../lib/supabase';
import { navigateRoot, navigateToHomeTab } from '../navigation/rootNavigation';
import type { ScanStackScreenProps } from '../navigation/types';
import { showAlert } from '../utils/alert';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';
import type { ItemTipo } from '../types/database';
import { ITEM_DISPLAY } from '../utils/itemDisplay';

type Props = ScanStackScreenProps<'ScanMain'>;

// ESP32 lê cartão NFC → grava em logs_nfc no Supabase → app escuta via Realtime → check-in ou confirma aluguel.
export default function ScanScreen({ navigation, route }: Props) {
  const initialItem = route.params?.item ?? 'quadra';
  const [selected, setSelected] = useState<ItemTipo>(initialItem);
  const [quadraId, setQuadraId] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const { aluno } = useAluno();
  const { refetch } = useAlugueis(aluno?.id ?? '');
  const { contentContainerStyle } = useScreenContentInsets();

  useEffect(() => {
    if (route.params?.item) {
      setSelected(route.params.item);
    }
  }, [route.params?.item]);

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

  const goActive = useCallback(() => {
    void refetch();
    navigateRoot('Active');
  }, [refetch]);

  useQuadraCheckIn({
    alunoId: aluno?.id ?? '',
    uidNfc: aluno?.uid_nfc,
    quadraItemId: quadraId,
    enabled: selected === 'quadra' && Boolean(aluno?.id && quadraId),
    onActivated: goActive,
  });

  const chips: { key: ItemTipo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'quadra', label: ITEM_DISPLAY.quadra.shortLabel, icon: ITEM_DISPLAY.quadra.icon },
    {
      key: 'guarda_chuva',
      label: ITEM_DISPLAY.guarda_chuva.shortLabel,
      icon: ITEM_DISPLAY.guarda_chuva.icon,
    },
  ];

  const handleSimulate = async () => {
    if (selected === 'guarda_chuva') {
      navigateRoot('Confirm', { item: selected, mode: 'now' });
      return;
    }

    if (!aluno?.id || !quadraId) return;

    const reserva = await findAgendadoForCheckIn(aluno.id, quadraId);
    if (reserva?.inicio) {
      const windowCheck = validateCheckInWindow(reserva.inicio, reserva.fim_previsto);
      if (!windowCheck.ok) {
        showAlert('Check-in', windowCheck.message);
        return;
      }
      const result = await activateQuadraReserva(reserva.id, quadraId);
      if (result.ok) {
        goActive();
        return;
      }
      showAlert('Check-in', result.message);
      return;
    }

    navigateRoot('Confirm', { item: 'quadra', mode: 'now' });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={() => navigateToHomeTab()} />

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
          {selected === 'quadra'
            ? 'Com reserva: ativa o horário. Sem reserva: inicia aluguel imediato.'
            : 'Leve o cartão ao totem NFC para iniciar o aluguel'}
        </Text>
      </View>

      <View style={styles.chips}>
        {chips.map((chip) => {
          const isSelected = selected === chip.key;
          return (
            <ChipButton
              key={chip.key}
              selected={isSelected}
              onPress={() => setSelected(chip.key)}
              accessibilityLabel={`Selecionar ${chip.label}`}
              style={styles.chipItem}
            >
              <Ionicons
                name={chip.icon}
                size={20}
                color={isSelected ? colors.primaryDark : colors.inactive}
                accessibilityElementsHidden
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </ChipButton>
          );
        })}
      </View>

      <PrimaryButton
        label={selected === 'quadra' ? 'Simular leitura NFC' : 'Simular leitura NFC'}
        onPress={() => void handleSimulate()}
        style={styles.simulateSpacing}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  scrollContent: { flexGrow: 1 },
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chipItem: { flexGrow: 1, flexBasis: '47%' },
  chipText: { fontSize: 13, color: colors.inactive, fontWeight: '500' },
  chipTextSelected: { color: colors.primaryDark },
  simulateSpacing: { marginBottom: 16 },
});
