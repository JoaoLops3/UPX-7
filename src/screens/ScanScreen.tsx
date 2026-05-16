import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import type { ItemTipo } from '../types/database';

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
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const chips: { key: ItemTipo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'quadra', label: 'Quadra A', icon: 'football-outline' },
    { key: 'guarda_chuva', label: 'Guarda-chuva', icon: 'rainy-outline' },
  ];

  return (
    <View style={styles.screen}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        onPress={() => navigation.navigate('Home' as const)}
        accessibilityLabel="Voltar"
      >
        <Text style={styles.backText}>← Voltar</Text>
      </Pressable>

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
            <Pressable
              key={chip.key}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
              onPress={() => setSelected(chip.key)}
              accessibilityLabel={`Selecionar ${chip.label}`}
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
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.simulateBtn, pressed && styles.simulatePressed]}
        onPress={() => navigation.getParent()?.navigate('Confirm', { item: selected })}
        accessibilityLabel="Simular leitura NFC"
      >
        <Text style={styles.simulateText}>Simular leitura NFC</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, padding: 16 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backPressed: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.background },
  chipPressed: { backgroundColor: colors.background },
  chipText: { fontSize: 13, color: colors.inactive, fontWeight: '500' },
  chipTextSelected: { color: colors.primaryDark },
  simulateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  simulatePressed: { backgroundColor: colors.background },
  simulateText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
