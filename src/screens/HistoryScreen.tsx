import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useMultas } from '../hooks/useMultas';
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card } from '../theme/ui';
import type { AluguelComItem, ItemTipo } from '../types/database';
import { formatDuration, formatRelativeDateTime } from '../utils/dates';
import { getItemDisplay } from '../utils/itemDisplay';

type Props = AppTabScreenProps<'History'>;
type Filtro = 'todos' | ItemTipo;

export default function HistoryScreen(_props: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { alugueis, loading } = useAlugueis(aluno?.id ?? '');
  const { multas } = useMultas(aluno?.id ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const { paddingTop, paddingHorizontal } = useScreenContentInsets();

  const multaPorAluguel = useMemo(() => {
    const map = new Map<string, boolean>();
    multas.forEach((m) => {
      if (m.aluguel_id) map.set(m.aluguel_id, true);
    });
    return map;
  }, [multas]);

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return alugueis;
    return alugueis.filter((a) => a.itens.tipo === filtro);
  }, [alugueis, filtro]);

  if (alunoLoading || loading) return <LoadingView />;

  const pills: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'quadra', label: 'Quadra' },
    { key: 'guarda_chuva', label: 'Guarda-chuva' },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop, paddingHorizontal }]}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Seus últimos aluguéis</Text>
      </View>

      <View style={styles.pills}>
        {pills.map((pill) => {
          const active = filtro === pill.key;
          return (
            <Pressable
              key={pill.key}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillActive,
                !active && pressed && styles.pillPressed,
              ]}
              onPress={() => setFiltro(pill.key)}
              accessibilityLabel={`Filtrar ${pill.label}`}
            >
              <Text
                style={[styles.pillText, active && styles.pillTextActive]}
                numberOfLines={2}
              >
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtrados.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="archive-outline" size={48} color={colors.inactive} accessibilityElementsHidden />
          <Text style={styles.emptyText}>Nenhum aluguel encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HistoryItem
              aluguel={item}
              temMulta={multaPorAluguel.has(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

function HistoryItem({
  aluguel,
  temMulta,
}: {
  aluguel: AluguelComItem;
  temMulta: boolean;
}) {
  const tipo = aluguel.itens.tipo as ItemTipo;
  const display = getItemDisplay(tipo);
  const temNumero = tipo === 'guarda_chuva';
  const duracao =
    aluguel.fim_real != null
      ? formatDuration(
          new Date(aluguel.fim_real).getTime() - new Date(aluguel.inicio ?? 0).getTime(),
        )
      : '—';

  const statusLabel =
    aluguel.status === 'agendado'
      ? 'Reservado'
      : aluguel.status === 'cancelado'
        ? 'Cancelado'
        : null;

  const viaTotem =
    aluguel.via_totem &&
    (aluguel.status === 'devolvido' ||
      aluguel.status === 'atrasado' ||
      aluguel.status === 'ativo' ||
      aluguel.status === 'aguardando_nfc');

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIcon}>
        <Ionicons
          name={display.icon}
          size={20}
          color={colors.primaryDark}
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>
          {!temNumero
            ? aluguel.itens.nome
            : aluguel.itens.nome.includes('#')
              ? aluguel.itens.nome
              : `${aluguel.itens.nome} #${aluguel.itens.numero}`}
        </Text>
        <Text style={styles.itemDate}>{formatRelativeDateTime(aluguel.inicio ?? '')}</Text>
        {viaTotem ? (
          <View style={styles.totemRow}>
            <Ionicons name="hardware-chip-outline" size={12} color={colors.primaryDark} />
            <Text style={styles.totemLabel}>Ação no totem</Text>
          </View>
        ) : null}
      </View>
      {temMulta ? (
        <View style={styles.multaBadge}>
          <Text style={styles.multaBadgeText}>multa</Text>
        </View>
      ) : statusLabel ? (
        <Text style={styles.itemStatus}>{statusLabel}</Text>
      ) : (
        <Text style={styles.itemDuration}>{duracao}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: { paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  pills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  pill: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillPressed: { backgroundColor: colors.background, borderColor: colors.primary },
  pillText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  pillTextActive: { color: colors.white },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    ...card,
    padding: 12,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  itemDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  totemRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  totemLabel: { fontSize: 11, color: colors.primaryDark, fontWeight: '600' },
  itemDuration: { fontSize: 12, color: colors.primaryDark, fontWeight: '500' },
  itemStatus: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  multaBadge: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  multaBadgeText: { fontSize: 11, fontWeight: '600', color: colors.dangerText },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
