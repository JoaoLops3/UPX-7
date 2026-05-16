import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeatherSnapshot } from '../lib/weather';
import { weatherIconName } from '../lib/weather';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';

type Props = {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: string | null;
  guardaDisponiveis: number;
  onRetry: () => void;
  onUmbrellaPress?: () => void;
};

export function WeatherCard({
  weather,
  loading,
  error,
  guardaDisponiveis,
  onRetry,
  onUmbrellaPress,
}: Props) {
  if (loading && !weather) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Carregando clima do campus…</Text>
      </View>
    );
  }

  if (error && !weather) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onRetry}
        accessibilityLabel="Tentar carregar clima novamente"
      >
        <Ionicons name="cloud-offline-outline" size={22} color={colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryLink}>Toque para tentar de novo</Text>
      </Pressable>
    );
  }

  if (!weather) return null;

  const showUmbrellaTip = weather.isRainy;
  const canRentUmbrella = showUmbrellaTip && guardaDisponiveis > 0;

  return (
    <View style={[styles.card, showUmbrellaTip && styles.cardRainy]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, showUmbrellaTip && styles.iconWrapRainy]}>
          <Ionicons
            name={weatherIconName(weather)}
            size={26}
            color={showUmbrellaTip ? colors.primaryDark : colors.primary}
          />
        </View>
        <View style={styles.main}>
          <Text style={styles.campus}>Campus Facens · Sorocaba</Text>
          <Text style={styles.temp}>{weather.temperatureC}°C</Text>
          <Text style={styles.desc}>{weather.description}</Text>
          <Text style={styles.meta}>
            Umidade {weather.humidityPercent}%
            {weather.precipitationMm > 0
              ? ` · Chuva ${weather.precipitationMm.toFixed(1)} mm`
              : ''}
          </Text>
        </View>
      </View>

      {showUmbrellaTip ? (
        <Pressable
          style={({ pressed }) => [
            styles.tip,
            canRentUmbrella ? styles.tipAction : styles.tipMuted,
            pressed && canRentUmbrella && styles.tipPressed,
          ]}
          onPress={canRentUmbrella ? onUmbrellaPress : undefined}
          disabled={!canRentUmbrella}
          accessibilityLabel={
            canRentUmbrella
              ? 'Boa hora para alugar guarda-chuva'
              : 'Chuva no campus, guarda-chuvas indisponíveis'
          }
        >
          <Ionicons
            name="umbrella-outline"
            size={18}
            color={canRentUmbrella ? colors.primaryVeryDark : colors.textMuted}
          />
          <Text style={[styles.tipText, !canRentUmbrella && styles.tipTextMuted]}>
            {canRentUmbrella
              ? `Boa hora para guarda-chuva — ${guardaDisponiveis} disponíveis`
              : 'Chuva no campus — guarda-chuvas em uso no momento'}
          </Text>
          {canRentUmbrella ? (
            <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
          ) : null}
        </Pressable>
      ) : (
        <Text style={styles.clearHint}>Tempo firme — aproveite a quadra ao ar livre.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...card,
    padding: 14,
    marginBottom: 16,
  },
  cardRainy: {
    backgroundColor: '#e8f4fc',
    borderColor: colors.primary,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: { fontSize: 12, color: colors.textMuted },
  pressed: { backgroundColor: colors.background },
  errorText: {
    fontSize: 13,
    color: colors.dangerText,
    marginTop: 8,
    textAlign: 'center',
  },
  retryLink: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapRainy: { backgroundColor: colors.white },
  main: { flex: 1 },
  campus: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  temp: { fontSize: 26, fontWeight: '700', color: colors.primaryVeryDark },
  desc: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    ...border,
  },
  tipAction: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  tipPressed: cardPressed(true),
  tipMuted: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryVeryDark,
  },
  tipTextMuted: { color: colors.textMuted, fontWeight: '500' },
  clearHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
