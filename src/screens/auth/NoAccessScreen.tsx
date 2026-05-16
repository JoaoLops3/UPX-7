import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { card } from '../../theme/ui';

export default function NoAccessScreen() {
  const { signOut, user } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Ionicons
          name="person-circle-outline"
          size={56}
          color={colors.inactive}
          accessibilityElementsHidden
        />
        <Text style={styles.title}>Cadastro não encontrado</Text>
        <Text style={styles.message}>
          A conta {user?.email ? `(${user.email})` : ''} não está vinculada a um aluno ativo no
          sistema.
        </Text>
        <Text style={styles.message}>
          Entre em contato com a secretaria ou biblioteca do campus para liberar seu acesso.
        </Text>
        <PrimaryButton
          label="Sair e tentar outra conta"
          onPress={() => void signOut()}
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    ...card,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  btn: { marginTop: 24, alignSelf: 'stretch' },
});
