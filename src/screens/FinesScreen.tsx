import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingView } from '../components/LoadingView';
import { useAluno } from '../hooks/useAluno';
import { useMultas } from '../hooks/useMultas';
import type { RootStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import type { MultaComAluguel } from '../types/database';
import { formatDateTime } from '../utils/dates';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = RootStackScreenProps<'Fines'>;

export default function FinesScreen({ navigation }: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { multas, loading } = useMultas(aluno?.id ?? '');

  if (alunoLoading || loading) return <LoadingView />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Voltar"
      >
        <Text style={styles.backText}>← Voltar</Text>
      </Pressable>

      <Text style={styles.title}>Minhas multas</Text>
      <Text style={styles.subtitle}>RA · {aluno?.ra ?? '—'}</Text>

      {multas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sem multas pendentes ✓</Text>
        </View>
      ) : (
        multas.map((multa) => <MultaCard key={multa.id} multa={multa} ra={aluno?.ra ?? '—'} />)
      )}
    </ScrollView>
  );
}

function MultaCard({ multa, ra }: { multa: MultaComAluguel; ra: string }) {
  const [expanded, setExpanded] = useState(false);
  const pendente = multa.status === 'pendente';
  const itemNome = multa.alugueis?.itens?.nome ?? 'Item';
  const valor = Number(multa.valor).toFixed(2).replace('.', ',');

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  return (
    <View style={[styles.card, !pendente && styles.cardPaid]}>
      <Pressable
        style={({ pressed }) => [styles.cardHeader, pressed && styles.cardHeaderPressed]}
        onPress={toggle}
        accessibilityLabel={`Multa ${itemNome}, ${pendente ? 'pendente' : 'paga'}`}
      >
        <View
          style={[
            styles.statusIcon,
            pendente ? styles.statusPending : styles.statusPaid,
          ]}
        >
          <Ionicons
            name={pendente ? 'warning-outline' : 'checkmark-circle-outline'}
            size={20}
            color={pendente ? '#d97706' : colors.successText}
            accessibilityElementsHidden
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{itemNome}</Text>
          <Text style={styles.cardStatus}>
            {pendente ? 'Pendente' : 'Pago'} · R$ {valor}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.inactive}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          accessibilityElementsHidden
        />
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          <BodyLine
            icon="calendar-outline"
            text={`Alugado em: ${formatDateTime(multa.alugueis?.inicio ?? multa.gerada_em)}`}
          />
          <BodyLine
            icon="time-outline"
            text={`Devolver até: ${formatDateTime(multa.alugueis?.fim_previsto ?? multa.gerada_em)}`}
          />
          {multa.alugueis?.fim_real && (
            <BodyLine
              icon="close-circle-outline"
              text={`Devolvido em: ${formatDateTime(multa.alugueis.fim_real)} (${multa.dias_atraso} dias de atraso)`}
            />
          )}
          <BodyLine
            icon="cash-outline"
            text={`Cálculo: ${multa.dias_atraso} dias × R$5,00/dia = R$${valor}`}
          />
          <BodyLine icon="school-outline" text={`RA: ${ra}`} />
        </View>
      )}
    </View>
  );
}

function BodyLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.bodyLine}>
      <Ionicons name={icon} size={16} color={colors.primaryDark} accessibilityElementsHidden />
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, paddingBottom: 40 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 12 },
  backPressed: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8 },
  backText: { color: colors.primary, fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  emptyCard: {
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#bbf7d0',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.successText },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 2,
  },
  cardPaid: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardHeaderPressed: { backgroundColor: colors.background },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPending: { backgroundColor: colors.warningBg },
  statusPaid: { backgroundColor: colors.successBg },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  cardStatus: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: 10,
  },
  bodyLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  bodyText: { flex: 1, fontSize: 13, color: colors.primaryVeryDark, lineHeight: 20 },
});
