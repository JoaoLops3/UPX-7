import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';
import { showConfirm } from '../utils/alert';
import TotemActionScreen, { type TotemAluno } from './TotemActionScreen';

const UNKNOWN_CLEAR_MS = 4000;

/**
 * Perfil de totem (aparelho fixo). O tap do NFC apenas IDENTIFICA o aluno e abre
 * uma sessão; o aluno então escolhe a ação (alugar / check-in / devolver) na tela.
 * A sessão se encerra ao concluir a ação ou por inatividade.
 */
export default function TotemKioskScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [aluno, setAluno] = useState<TotemAluno | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alunoRef = useRef<TotemAluno | null>(null);

  useEffect(() => {
    alunoRef.current = aluno;
  }, [aluno]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    const channel = supabase
      .channel('totem-kiosk')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs_nfc' },
        (payload) => {
          void (async () => {
            // Ignora novos taps enquanto há um aluno em sessão.
            if (alunoRef.current) return;

            const row = payload.new as { uid_cartao?: string; acao?: string | null };
            if (!row.uid_cartao) return;

            const { data } = await supabase.rpc('totem_aluno_por_uid', { p_uid: row.uid_cartao });
            const resolved = (data as TotemAluno | null) ?? null;

            if (resolved?.id) {
              if (avisoTimer.current) clearTimeout(avisoTimer.current);
              setAviso(null);
              setAluno(resolved);
            } else {
              setAviso('Cartão não reconhecido. Procure a administração.');
              if (avisoTimer.current) clearTimeout(avisoTimer.current);
              avisoTimer.current = setTimeout(() => setAviso(null), UNKNOWN_CLEAR_MS);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      if (avisoTimer.current) clearTimeout(avisoTimer.current);
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleFinish = useCallback(() => setAluno(null), []);

  const handleLogout = useCallback(() => {
    void (async () => {
      const ok = await showConfirm(
        'Deseja desconectar este totem? Será necessário fazer login novamente.',
        'Sair do totem',
      );
      if (ok) void signOut();
    })();
  }, [signOut]);

  if (aluno) {
    return <TotemActionScreen aluno={aluno} onFinish={handleFinish} />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable
        onLongPress={handleLogout}
        delayLongPress={1200}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel="Totem UPX 7. Pressione e segure para sair."
      >
        <Ionicons name="hardware-chip-outline" size={20} color={colors.textMuted} accessibilityElementsHidden />
        <Text style={styles.headerText}>Totem UPX 7</Text>
      </Pressable>

      <View style={styles.center}>
        {aviso ? (
          <View style={[styles.card, { borderColor: colors.dangerText }]} accessibilityRole="alert">
            <View style={[styles.iconWrap, { borderColor: colors.dangerText }]}>
              <Ionicons name="close-circle-outline" size={64} color={colors.dangerText} accessibilityElementsHidden />
            </View>
            <Text style={[styles.feedbackTitle, { color: colors.dangerText }]}>Cartão não reconhecido</Text>
            <Text style={styles.feedbackSubtitle}>Procure a administração para cadastrar.</Text>
          </View>
        ) : (
          <>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="radio-outline" size={72} color={colors.primaryDark} accessibilityElementsHidden />
            </Animated.View>
            <Text style={styles.idleTitle}>Aproxime a carteirinha</Text>
            <Text style={styles.idleSubtitle}>
              Encoste o cartão para se identificar e escolher: alugar, fazer check-in ou devolver.
            </Text>
          </>
        )}
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [styles.logoutBtn, pressed && { borderColor: colors.primary, backgroundColor: colors.background }]}
        accessibilityRole="button"
        accessibilityLabel="Sair do totem"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.textMuted} accessibilityElementsHidden />
        <Text style={styles.logoutText}>Sair do totem</Text>
      </Pressable>

      <Text style={styles.footer}>Faça reservas e veja seus prazos no app UPX 7.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  headerText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    ...border,
    borderColor: colors.primary,
  },
  idleTitle: { fontSize: 28, fontWeight: '800', color: colors.primaryVeryDark, textAlign: 'center' },
  idleSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: colors.white,
    ...border,
    minWidth: 280,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: colors.background,
    ...border,
  },
  feedbackTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  feedbackSubtitle: { fontSize: 17, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.white,
    marginBottom: 12,
    ...border,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  footer: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
