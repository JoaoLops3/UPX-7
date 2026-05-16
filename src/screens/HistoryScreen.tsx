import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingView } from '../components/LoadingView';
import { useAlugueis } from '../hooks/useAlugueis';
import { useAluno } from '../hooks/useAluno';
import { useMultas } from '../hooks/useMultas';
import type { MainTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import type { AluguelComItem, ItemTipo } from '../types/database';
import { formatDuration, formatRelativeDateTime } from '../utils/dates';

type Props = MainTabScreenProps<'History'>;
type Filtro = 'todos' | ItemTipo;

export default function HistoryScreen(_props: Props) {
  const { aluno, loading: alunoLoading } = useAluno();
  const { alugueis, loading } = useAlugueis(aluno?.id ?? '');
  const { multas } = useMultas(aluno?.id ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const multaPorAluguel = useMemo(() => {
    const map = new Map<string, boolean>();
    multas.forEach((m) => map.set(m.aluguel_id, true));
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
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Seus últimos aluguéis</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
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
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
  const isQuadra = aluguel.itens.tipo === 'quadra';
  const duracao =
    aluguel.fim_real != null
      ? formatDuration(
          new Date(aluguel.fim_real).getTime() - new Date(aluguel.inicio).getTime(),
        )
      : '—';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIcon}>
        <Ionicons
          name={isQuadra ? 'football-outline' : 'rainy-outline'}
          size={20}
          color={colors.primaryDark}
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>
          {aluguel.itens.nome}
          {!isQuadra ? ` #${aluguel.itens.numero}` : ''}
        </Text>
        <Text style={styles.itemDate}>{formatRelativeDateTime(aluguel.inicio)}</Text>
      </View>
      {temMulta ? (
        <View style={styles.multaBadge}>
          <Text style={styles.multaBadgeText}>multa</Text>
        </View>
      ) : (
        <Text style={styles.itemDuration}>{duracao}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  pills: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillPressed: { backgroundColor: colors.background, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  pillTextActive: { color: colors.white },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    elevation: 2,
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
  itemDuration: { fontSize: 12, color: colors.primaryDark, fontWeight: '500' },
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
