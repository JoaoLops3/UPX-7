import { useMemo, useState } from 'react';
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
import { BackButton } from '../components/BackButton';
import { LoadingView } from '../components/LoadingView';
import { useAluno } from '../hooks/useAluno';
import { useMultas } from '../hooks/useMultas';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import type { ProfileStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';
import type { MultaComAluguel } from '../types/database';
import { formatDateTime } from '../utils/dates';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = ProfileStackScreenProps<'Fines'>;

function formatMoney(value: number) {
  return value.toFixed(2).replace('.', ',');
}

export default function FinesScreen({ navigation }: Props) {
  const { contentContainerStyle } = useScreenContentInsets(40);
  const { aluno, loading: alunoLoading } = useAluno();
  const { multas, totalPendente, loading } = useMultas(aluno?.id ?? '');

  const pendentes = useMemo(() => multas.filter((m) => m.status === 'pendente'), [multas]);
  const quitadas = useMemo(() => multas.filter((m) => m.status === 'pago'), [multas]);

  if (alunoLoading || loading) return <LoadingView />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <BackButton onPress={() => navigation.goBack()} style={styles.backSpacing} />

      <Text style={styles.title}>Minhas multas</Text>
      <Text style={styles.subtitle}>RA · {aluno?.ra ?? '—'}</Text>

      <View style={styles.infoCard} accessibilityRole="text">
        <View style={styles.infoHeader}>
          <View style={styles.infoIconWrap}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={colors.primaryDark}
              accessibilityElementsHidden
            />
          </View>
          <Text style={styles.infoTitle}>Como funcionam as multas</Text>
        </View>
        <Text style={styles.infoBullet}>
          • Multa de <Text style={styles.infoEmphasis}>R$ 5,00 por dia</Text> de atraso na
          devolução do item.
        </Text>
        <Text style={styles.infoBullet}>
          • O valor é registrado automaticamente no seu RA quando você devolve após o prazo.
        </Text>
        <Text style={styles.infoBullet}>
          • Para pagar, vá até a <Text style={styles.infoEmphasis}>tesouraria</Text> do campus com
          seu RA. O pagamento não é feito pelo aplicativo.
        </Text>
      </View>

      {pendentes.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total pendente</Text>
            <Text style={styles.summaryCount}>
              {pendentes.length} {pendentes.length === 1 ? 'multa' : 'multas'}
            </Text>
          </View>
          <Text style={styles.summaryValue}>R$ {formatMoney(totalPendente)}</Text>
        </View>
      )}

      {multas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-circle"
            size={40}
            color={colors.successText}
            accessibilityElementsHidden
          />
          <Text style={styles.emptyTitle}>Nenhuma multa registrada</Text>
          <Text style={styles.emptyText}>
            Devolva os itens no prazo para evitar cobranças no seu RA.
          </Text>
        </View>
      ) : (
        <>
          {pendentes.length > 0 && (
            <MultaSection title="Pendentes" multas={pendentes} ra={aluno?.ra ?? '—'} />
          )}
          {quitadas.length > 0 && (
            <MultaSection
              title="Quitadas"
              multas={quitadas}
              ra={aluno?.ra ?? '—'}
              style={pendentes.length > 0 ? styles.sectionSpaced : undefined}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function MultaSection({
  title,
  multas,
  ra,
  style,
}: {
  title: string;
  multas: MultaComAluguel[];
  ra: string;
  style?: object;
}) {
  return (
    <View style={style}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {multas.map((multa) => (
        <MultaCard key={multa.id} multa={multa} ra={ra} />
      ))}
    </View>
  );
}

function MultaCard({ multa, ra }: { multa: MultaComAluguel; ra: string }) {
  const [expanded, setExpanded] = useState(false);
  const pendente = multa.status === 'pendente';
  const itemNome = multa.alugueis?.itens?.nome ?? 'Item';
  const valor = formatMoney(Number(multa.valor));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  return (
    <View style={[styles.card, !pendente && styles.cardPaid]}>
      <Pressable
        style={({ pressed }) => [styles.cardHeader, pressed && cardPressed(true)]}
        onPress={toggle}
        accessibilityLabel={`Multa ${itemNome}, ${pendente ? 'pendente' : 'paga'}`}
        accessibilityState={{ expanded }}
      >
        <View
          style={[styles.statusIcon, pendente ? styles.statusPending : styles.statusPaid]}
        >
          <Ionicons
            name={pendente ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={pendente ? '#d97706' : colors.successText}
            accessibilityElementsHidden
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{itemNome}</Text>
          <Text style={styles.cardStatus}>
            {pendente ? 'Aguardando pagamento na tesouraria' : 'Paga na tesouraria'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.valorBadge, !pendente && styles.valorBadgePaid]}>
            R$ {valor}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.inactive}
            accessibilityElementsHidden
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          <BodyLine
            icon="calendar-outline"
            text={`Alugado em: ${formatDateTime(multa.alugueis?.inicio ?? multa.gerada_em ?? '')}`}
          />
          <BodyLine
            icon="time-outline"
            text={`Devolver até: ${formatDateTime(multa.alugueis?.fim_previsto ?? multa.gerada_em)}`}
          />
          {multa.alugueis?.fim_real && (
            <BodyLine
              icon="close-circle-outline"
              text={`Devolvido em: ${formatDateTime(multa.alugueis.fim_real)} (${multa.dias_atraso} ${multa.dias_atraso === 1 ? 'dia' : 'dias'} de atraso)`}
            />
          )}
          <BodyLine
            icon="cash-outline"
            text={`Cálculo: ${multa.dias_atraso} ${multa.dias_atraso === 1 ? 'dia' : 'dias'} × R$ 5,00 = R$ ${valor}`}
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
    marginBottom: 16,
  },
  infoCard: {
    ...card,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryVeryDark,
  },
  infoBullet: {
    fontSize: 13,
    color: colors.primaryVeryDark,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoEmphasis: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  summaryCard: {
    ...card,
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...border,
    borderColor: '#fecaca',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dangerText,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  sectionSpaced: {
    marginTop: 24,
  },
  emptyCard: {
    ...card,
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#bbf7d0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.successText,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.successText,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    ...card,
    overflow: 'hidden',
  },
  cardPaid: { opacity: 0.75 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPending: { backgroundColor: colors.warningBg },
  statusPaid: { backgroundColor: colors.successBg },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.primaryVeryDark },
  cardStatus: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  valorBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerText,
  },
  valorBadgePaid: {
    color: colors.successText,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 2,
  },
  bodyLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  bodyText: { flex: 1, fontSize: 13, color: colors.primaryVeryDark, lineHeight: 20 },
});
