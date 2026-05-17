import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useMultas } from '../hooks/useMultas';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import {
  getNotificationPermissionState,
  requestNotificationPermissions,
  type PermissionState,
} from '../lib/notifications/permissions';
import {
  getNotificationsEnabled,
  notificationsSupportedOnPlatform,
  setNotificationsEnabled,
} from '../lib/notifications/preferences';
import { syncStudentNotifications } from '../lib/notifications/syncStudentNotifications';
import { fetchCampusWeather } from '../lib/weather';
import type { ProfileStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';

type Props = ProfileStackScreenProps<'NotificationSettings'>;

const ALERT_TYPES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: 'rainy-outline',
    title: 'Chuva no campus',
    description: 'Avisa quando estiver chovendo na Facens.',
  },
  {
    icon: 'calendar-outline',
    title: 'Reserva da quadra',
    description: 'Lembretes 1 hora e 15 minutos antes do horário reservado.',
  },
  {
    icon: 'football-outline',
    title: 'Devolução da quadra',
    description: 'Fim do horário, prazo do totem NFC e alertas urgentes.',
  },
  {
    icon: 'umbrella-outline',
    title: 'Devolução do guarda-chuva',
    description: 'Lembretes antes do prazo de devolução.',
  },
  {
    icon: 'alert-circle-outline',
    title: 'Multas pendentes',
    description: 'Quando houver multa em aberto no seu RA.',
  },
];

function permissionLabel(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'Permitidas no celular';
    case 'denied':
      return 'Bloqueadas nas configurações do sistema';
    case 'undetermined':
      return 'Permissão ainda não concedida';
    default:
      return 'Disponível só no app iOS ou Android';
  }
}

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { aluno } = useAluno();
  const { aluguelAtivo, reservaQuadra } = useAlugueis(aluno?.id ?? '');
  const { multas } = useMultas(aluno?.id ?? '');
  const { contentContainerStyle } = useScreenContentInsets(40);

  const supported = notificationsSupportedOnPlatform();
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [syncing, setSyncing] = useState(false);

  const refreshState = useCallback(async () => {
    if (!supported) return;
    setEnabled(await getNotificationsEnabled());
    setPermission(await getNotificationPermissionState());
  }, [supported]);

  useFocusEffect(
    useCallback(() => {
      void refreshState();
    }, [refreshState]),
  );

  const resyncNotifications = useCallback(async () => {
    if (!aluno?.id) return;
    setSyncing(true);
    try {
      let clima = null;
      try {
        clima = await fetchCampusWeather();
      } catch {
        /* ignora */
      }
      await syncStudentNotifications({
        aluguelAtivo,
        reservaQuadra,
        multasPendentes: multas.filter((m) => m.status === 'pendente'),
        weather: clima,
      });
    } finally {
      setSyncing(false);
    }
  }, [aluno?.id, aluguelAtivo, multas, reservaQuadra]);

  const handleToggle = async (value: boolean) => {
    if (!supported) {
      Alert.alert('Notificações', 'Instale o app no iPhone ou Android para receber alertas.');
      return;
    }

    if (value) {
      const state = await requestNotificationPermissions();
      setPermission(state);
      if (state !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Para receber alertas, ative as notificações do UPX 7 nas configurações do celular.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
    }

    await setNotificationsEnabled(value);
    setEnabled(value);
    if (value) {
      await resyncNotifications();
    } else {
      await syncStudentNotifications({
        aluguelAtivo: null,
        reservaQuadra: null,
        multasPendentes: [],
        weather: null,
      });
    }
  };

  const switchOn = supported && enabled && permission === 'granted';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <BackButton onPress={() => navigation.goBack()} style={styles.backSpacing} />

      <Text style={styles.title}>Notificações</Text>
      <Text style={styles.subtitle}>
        Configure os alertas do UPX 7 no seu celular.
      </Text>

      <View style={styles.card}>
        <View style={styles.masterRow}>
          <View style={styles.masterText}>
            <Text style={styles.masterLabel}>Receber alertas</Text>
            <Text style={styles.masterHint}>
              {supported
                ? permissionLabel(permission)
                : 'Use o aplicativo nativo no celular'}
            </Text>
          </View>
          {supported ? (
            <Switch
              value={switchOn}
              onValueChange={(v) => void handleToggle(v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Ativar ou desativar notificações do UPX 7"
            />
          ) : null}
        </View>
      </View>

      {permission === 'denied' && supported ? (
        <PrimaryButton
          label="Abrir configurações do celular"
          onPress={() => void Linking.openSettings()}
          style={styles.settingsBtn}
        />
      ) : null}

      <Text style={styles.sectionTitle}>Tipos de alerta</Text>
      <View style={styles.card}>
        {ALERT_TYPES.map((item, index) => (
          <View
            key={item.title}
            style={[styles.typeRow, index < ALERT_TYPES.length - 1 && styles.typeBorder]}
          >
            <View style={styles.typeIcon}>
              <Ionicons name={item.icon} size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.typeBody}>
              <Text style={styles.typeTitle}>{item.title}</Text>
              <Text style={styles.typeDesc}>{item.description}</Text>
            </View>
            <Ionicons
              name={switchOn ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={switchOn ? colors.successText : colors.inactive}
              accessibilityElementsHidden
            />
          </View>
        ))}
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primaryDark} />
        <Text style={styles.noteText}>
          Os lembretes são agendados no seu aparelho quando você usa o app. Abra o UPX 7 pelo
          menos uma vez ao dia para manter reservas e devoluções atualizadas.
        </Text>
      </View>

      {supported && switchOn ? (
        <Pressable
          style={({ pressed }) => [styles.resyncBtn, pressed && cardPressed(true)]}
          onPress={() => void resyncNotifications()}
          disabled={syncing}
          accessibilityLabel="Atualizar lembretes agora"
        >
          <Text style={styles.resyncText}>
            {syncing ? 'Atualizando lembretes…' : 'Atualizar lembretes agora'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  backSpacing: { marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    ...card,
    marginBottom: 16,
    overflow: 'hidden',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  masterText: { flex: 1 },
  masterLabel: { fontSize: 16, fontWeight: '600', color: colors.primaryVeryDark },
  masterHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  settingsBtn: { marginBottom: 16 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  typeBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBody: { flex: 1 },
  typeTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  typeDesc: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  noteCard: {
    ...card,
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.background,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  resyncBtn: {
    ...border,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  resyncText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
