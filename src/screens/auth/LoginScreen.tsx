import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { border, textInputWeb } from '../../theme/ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const message = await signIn(identifier, password);
    setSubmitting(false);
    if (message) setError(message);
  };

  const handleForgotPassword = () => {
    const email = identifier.trim();
    if (!email.includes('@')) {
      Alert.alert(
        'Recuperar senha',
        'Informe seu e-mail institucional no campo acima e toque novamente em "Esqueceu a senha?".',
      );
      return;
    }
    Alert.alert(
      'Em breve',
      'O envio de link para redefinir senha será habilitado em breve. Procure a secretaria se precisar de acesso.',
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerPattern} />
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>U</Text>
          </View>
          <Text style={styles.logoText}>UPX 7</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheet}>
            <View style={styles.tabRow}>
              <View style={styles.tabActive}>
                <Text style={styles.tabActiveText}>Acessar conta</Text>
              </View>
              <Pressable
                style={styles.tabInactive}
                onPress={() =>
                  Alert.alert(
                    'Conta de visitante',
                    'O acesso de visitante não está disponível nesta versão. Use RA ou e-mail institucional cadastrado.',
                  )
                }
                accessibilityLabel="Criar conta de visitante"
              >
                <Text style={styles.tabInactiveText}>Criar conta de visitante</Text>
              </Pressable>
            </View>

            <Text style={styles.welcomeTitle}>Boas-vindas ao UPX 7</Text>
            <Text style={styles.welcomeSub}>Acessar a plataforma</Text>

            <View
              style={[styles.inputWrap, identifierFocused && styles.inputWrapFocused]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.inactive}
                style={styles.inputIcon}
                accessibilityElementsHidden
              />
              <TextInput
                style={[styles.input, textInputWeb]}
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setIdentifierFocused(true)}
                onBlur={() => setIdentifierFocused(false)}
                placeholder="RA ou e-mail institucional"
                placeholderTextColor={colors.inactive}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                autoComplete="username"
                textContentType="username"
                accessibilityLabel="RA, e-mail ou usuário"
              />
            </View>

            <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="key-outline"
                size={18}
                color={colors.inactive}
                style={styles.inputIcon}
                accessibilityElementsHidden
              />
              <TextInput
                style={[styles.input, styles.inputWithToggle, textInputWeb]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Senha de acesso"
                placeholderTextColor={colors.inactive}
                secureTextEntry={!showPassword}
                textContentType="password"
                accessibilityLabel="Senha"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.inactive}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
              accessibilityLabel="Esqueceu a senha"
            >
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                submitting && styles.submitBtnDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
              accessibilityLabel="Entrar"
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Entrar</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.helpBtn}
              onPress={() =>
                Alert.alert('Ajuda', 'Procure a secretaria ou biblioteca do campus para suporte.')
              }
              accessibilityLabel="Precisa de ajuda"
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.helpText}>Precisa de ajuda?</Text>
            </Pressable>

            <Text style={styles.version}>UPX 7 · v1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const SHEET_RADIUS = 28;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primaryVeryDark,
  },
  header: {
    minHeight: 168,
    paddingTop: Platform.OS === 'web' ? 28 : 48,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryDark,
    opacity: 0.45,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  sheetWrap: {
    flex: 1,
    marginTop: -SHEET_RADIUS,
  },
  sheetScroll: {
    flex: 1,
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
  },
  sheetContent: {
    flexGrow: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
    minHeight: '100%',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  tabActive: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...border,
    borderColor: colors.border,
  },
  tabActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryVeryDark,
  },
  tabInactive: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...border,
    borderColor: colors.border,
  },
  tabInactiveText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 22,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
    ...border,
    minHeight: 52,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryVeryDark,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 12,
  },
  inputWithToggle: {
    paddingRight: 4,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  error: {
    fontSize: 13,
    color: colors.dangerText,
    textAlign: 'center',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 52,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.primaryDark,
  },
  submitBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  version: {
    fontSize: 11,
    color: colors.inactive,
    textAlign: 'center',
    marginTop: 12,
  },
});
