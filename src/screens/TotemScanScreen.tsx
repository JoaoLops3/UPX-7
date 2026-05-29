import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { getStudentTabBarInset } from '../navigation/StudentTabBar';
import { supabase } from '../lib/supabase';
import { parseTotemQrValue, type TotemQrConfirmResult } from '../lib/totemQr';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import { showAlert } from '../utils/alert';

type Props = AppTabScreenProps<'TotemScan'>;

const CONFIRM_COOLDOWN_MS = 2500;
const CAMERA_SQUARE_MAX = 300;

export default function TotemScanScreen(_props: Props) {
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const { paddingHorizontal, contentContainerStyle } = useScreenContentInsets(
    getStudentTabBarInset(),
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const lastScanRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  const cameraSize = Math.min(windowWidth - paddingHorizontal * 2, CAMERA_SQUARE_MAX);

  useEffect(() => {
    if (!isFocused || permission?.granted) return;
    void requestPermission();
  }, [isFocused, permission?.granted, requestPermission]);

  useEffect(() => {
    if (isFocused) return;
    setDone(false);
    lastScanRef.current = null;
    cooldownRef.current = false;
    setBusy(false);
  }, [isFocused]);

  const handleScan = useCallback(
    async (raw: string) => {
      if (!isFocused || busy || done || cooldownRef.current) return;

      const payload = parseTotemQrValue(raw);
      if (!payload) return;
      if (lastScanRef.current === `${payload.sessaoId}:${payload.token}`) return;

      lastScanRef.current = `${payload.sessaoId}:${payload.token}`;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, CONFIRM_COOLDOWN_MS);

      setBusy(true);
      const { data, error } = await supabase.rpc('totem_confirmar_sessao_qr', {
        p_sessao_id: payload.sessaoId,
        p_token: payload.token,
      });
      setBusy(false);

      if (error) {
        void showAlert('Erro', 'Não foi possível identificar no totem. Tente novamente.');
        return;
      }

      const result = (data as TotemQrConfirmResult | null) ?? null;
      if (!result?.ok) {
        const message =
          result?.message === 'qr_expirado'
            ? 'QR expirado. Peça para o totem gerar um novo código.'
            : result?.message === 'sessao_indisponivel'
              ? 'Este QR já foi usado ou o totem está ocupado.'
              : result?.message === 'token_invalido'
                ? 'Código inválido. Escaneie o QR exibido no totem.'
                : 'Não foi possível identificar no totem.';
        void showAlert('Não identificado', message);
        return;
      }

      setDone(true);
    },
    [busy, done, isFocused],
  );

  const handleScanAgain = useCallback(() => {
    setDone(false);
    lastScanRef.current = null;
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[contentContainerStyle, styles.scrollContent]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Totem</Text>
      <Text style={styles.subtitle}>
        Aponte a câmera para o QR Code na tela do totem. Sua conta já está logada.
      </Text>

      {Platform.OS === 'web' ? (
        <View style={[styles.cameraSquare, { width: cameraSize, height: cameraSize }, styles.placeholderSquare]}>
          <Ionicons name="qr-code-outline" size={56} color={colors.textMuted} accessibilityElementsHidden />
          <Text style={styles.placeholderText}>Use o app no celular</Text>
        </View>
      ) : !permission ? (
        <View style={[styles.cameraSquare, { width: cameraSize, height: cameraSize }, styles.placeholderSquare]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !permission.granted ? (
        <View style={[styles.cameraSquare, { width: cameraSize, height: cameraSize }, styles.placeholderSquare]}>
          <Ionicons name="camera-outline" size={48} color={colors.primaryDark} accessibilityElementsHidden />
          <Text style={styles.placeholderText}>Permita o acesso à câmera</Text>
          <Pressable
            onPress={() => void requestPermission()}
            style={({ pressed }) => [styles.permissionBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Permitir câmera"
          >
            <Text style={styles.permissionBtnText}>Permitir câmera</Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={[styles.cameraSquare, { width: cameraSize, height: cameraSize }]}
          accessibilityLabel="Área da câmera para ler QR Code do totem"
        >
          {isFocused && !done ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                void handleScan(data);
              }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cameraPaused]}>
              <Ionicons
                name={done ? 'checkmark-circle' : 'camera-outline'}
                size={48}
                color={done ? colors.primaryDark : colors.textMuted}
                accessibilityElementsHidden
              />
            </View>
          )}
          {!done ? <View style={styles.scanFrame} pointerEvents="none" /> : null}
        </View>
      )}

      {busy ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primaryDark} />
          <Text style={styles.statusText}>Identificando…</Text>
        </View>
      ) : null}

      {done ? (
        <View style={styles.successCard} accessibilityRole="alert">
          <Text style={styles.successTitle}>Identificado!</Text>
          <Text style={styles.successSubtitle}>
            Escolha sua ação na tela do totem: alugar, check-in ou devolver.
          </Text>
          <Pressable
            onPress={handleScanAgain}
            style={({ pressed }) => [styles.scanAgainBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Ler outro QR Code"
          >
            <Text style={styles.scanAgainText}>Ler outro QR</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primaryDark} accessibilityElementsHidden />
          <Text style={styles.hintText}>
            O QR fica abaixo de “Aproxime a carteirinha” na tela do totem.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  scrollContent: { alignItems: 'center' },
  title: {
    alignSelf: 'stretch',
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 8,
  },
  subtitle: {
    alignSelf: 'stretch',
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  cameraSquare: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...border,
    borderColor: colors.primary,
  },
  placeholderSquare: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraPaused: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  hintCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    alignSelf: 'stretch',
    padding: 14,
    backgroundColor: colors.background,
  },
  hintText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  successCard: {
    ...card,
    marginTop: 24,
    alignSelf: 'stretch',
    padding: 18,
    alignItems: 'center',
    borderColor: colors.primary,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryVeryDark },
  successSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scanAgainBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
  },
  scanAgainText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  permissionBtn: {
    marginTop: 4,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  permissionBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
