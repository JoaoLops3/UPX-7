import { useEffect, useRef, useState } from 'react';
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
import type { MainTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';
import type { ItemTipo } from '../types/database';
import { ITEM_DISPLAY } from '../utils/itemDisplay';

type Props = MainTabScreenProps<'Scan'>;

// Fluxo real em produção:
// ESP32 lê cartão NFC → grava em logs_nfc no Supabase → app escuta via Realtime → navega automaticamente.
export default function ScanScreen({ navigation, route }: Props) {
  const initialItem = route.params?.item ?? 'quadra';
  const [selected, setSelected] = useState<ItemTipo>(initialItem);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (route.params?.item) {
      setSelected(route.params.item);
    }
  }, [route.params?.item]);

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

  const chips: { key: ItemTipo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'quadra', label: ITEM_DISPLAY.quadra.shortLabel, icon: ITEM_DISPLAY.quadra.icon },
    {
      key: 'guarda_chuva',
      label: ITEM_DISPLAY.guarda_chuva.shortLabel,
      icon: ITEM_DISPLAY.guarda_chuva.icon,
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={() => navigation.navigate('Home' as const)} />

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
          Leve o cartão ao totem NFC para iniciar o aluguel
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
        label="Simular leitura NFC"
        onPress={() => navigation.getParent()?.navigate('Confirm', { item: selected })}
        style={styles.simulateSpacing}
      />
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
