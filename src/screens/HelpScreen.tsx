import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import type { ProfileStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { card } from '../theme/ui';
import { QUADRA_GRACE_MINUTES } from '../lib/quadraAluguelTiming';

type Props = ProfileStackScreenProps<'Help'>;

const FAQ = [
  {
    q: 'Como reservo a quadra?',
    a: 'No Início, toque em "Reservar data" ou "Alugar agora" (horários de hoje). Escolha o horário e confirme a reserva no app.',
  },
  {
    q: 'Como faço check-in na quadra?',
    a: 'No horário da reserva (janela abre 15 min antes), vá ao totem NFC do campus e aproxime sua carteirinha. Depois confirme na aba Quadra.',
  },
  {
    q: 'Como pego um guarda-chuva?',
    a: 'Vá ao totem, aproxime a carteirinha e escolha a aba Alugar. A devolução também é no totem (aba Devolver).',
  },
  {
    q: 'Como devolvo itens?',
    a: 'No totem, aba Devolver. Se tiver guarda-chuva e quadra ao mesmo tempo, escolha qual devolver.',
  },
  {
    q: 'O que acontece se eu atrasar a quadra?',
    a: `Após o horário previsto, você tem ${QUADRA_GRACE_MINUTES} minutos para confirmar a devolução no totem. Depois disso o sistema encerra automaticamente.`,
  },
  {
    q: 'Horário de funcionamento',
    a: 'Quadra: 8h às 22h. Reservas e aluguel seguem a agenda disponível no app.',
  },
  {
    q: 'Multas',
    a: 'Multas por atraso de guarda-chuva aparecem em Perfil → Minhas multas. Pagamento na tesouraria da Facens.',
  },
  {
    q: 'Cartão não reconhecido no totem',
    a: 'Procure a administração para vincular sua carteirinha NFC ao seu cadastro.',
  },
];

export default function HelpScreen({ navigation }: Props) {
  const { contentContainerStyle } = useScreenContentInsets(40);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <BackButton onPress={() => navigation.goBack()} style={styles.back} />
      <Text style={styles.title}>Ajuda</Text>
      <Text style={styles.sub}>Como usar o UPX 7 e o totem NFC</Text>

      {FAQ.map((item) => (
        <View key={item.q} style={styles.card}>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </View>
      ))}

      <Text style={styles.footer}>Dúvidas? Entre em contato com a secretaria ou biblioteca do campus.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  back: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    ...card,
  },
  question: { fontSize: 15, fontWeight: '700', color: colors.primaryVeryDark, marginBottom: 6 },
  answer: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  footer: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 20, textAlign: 'center' },
});
