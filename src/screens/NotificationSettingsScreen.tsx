import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BackButton } from '../components/BackButton';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { getStudentTabBarInset } from '../navigation/StudentTabBar';
import {
  getNotificationPermissionState,
  type PermissionState,
} from '../lib/notifications/permissions';
import { notificationsSupportedOnPlatform } from '../lib/notifications/preferences';
import { sendTestNotification } from '../lib/notifications/testNotification';
import type { ProfileStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';

type Props = ProfileStackScreenProps<'NotificationSettings'>;

function permissionHint(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'Permissão concedida — os alertas estão ativos automaticamente.';
    case 'denied':
      return 'Permissão negada. Abra os ajustes do sistema para ativar.';
    case 'undetermined':
      return 'Toque em testar para solicitar permissão.';
    default:
      return 'Use o app instalado no iPhone ou Android.';
  }
}

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { contentContainerStyle } = useScreenContentInsets(getStudentTabBarInset());
  const supported = notificationsSupportedOnPlatform();
  const [permission, setPermission] = useState<PermissionState>(
    supported ? 'undetermined' : 'unsupported',
  );
  const [testing, setTesting] = useState(false);

  const refreshPermission = useCallback(async () => {
    if (!supported) return;
    setPermission(await getNotificationPermissionState());
  }, [supported]);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission]),
  );

  const handleTest = async () => {
    setTesting(true);
    const result = await sendTestNotification();
    await refreshPermission();
    setTesting(false);

    if (!result.ok) {
      Alert.alert('Não foi possível testar', result.message, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir ajustes',
          onPress: () => void Linking.openSettings(),
        },
      ]);
      return;
    }

    Alert.alert(
      'Teste enviado',
      'Em alguns segundos você deve ver uma notificação de exemplo do UPX 7.',
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <BackButton onPress={() => navigation.goBack()} style={styles.backSpacing} />

      <Text style={styles.title}>Notificações</Text>
      <Text style={styles.subtitle}>
        Os alertas são configurados automaticamente. Use o botão abaixo para simular um aviso.
      </Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusText}>{permissionHint(permission)}</Text>
      </View>

      {supported ? (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.testBtn,
              pressed && styles.testBtnPressed,
              testing && styles.testBtnDisabled,
            ]}
            onPress={() => void handleTest()}
            disabled={testing}
            accessibilityRole="button"
            accessibilityLabel="Testar notificação aleatória"
          >
            {testing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.testBtnText}>Testar notificação</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.settingsLink, pressed && cardPressed(true)]}
            onPress={() => void Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações do sistema"
          >
            <Text style={styles.settingsLinkText}>Abrir ajustes do celular</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Instale o UPX 7 no iPhone ou Android para receber e testar notificações.
          </Text>
        </View>
      )}
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
    lineHeight: 18,
  },
  statusCard: {
    ...card,
    padding: 16,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.primaryVeryDark,
    lineHeight: 20,
  },
  testBtn: {
    backgroundColor: colors.dangerText,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#c62828',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: 12,
  },
  testBtnPressed: {
    backgroundColor: '#c62828',
  },
  testBtnDisabled: {
    opacity: 0.7,
  },
  testBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  settingsLink: {
    ...border,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingVertical: 14,
    alignItems: 'center',
  },
  settingsLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
