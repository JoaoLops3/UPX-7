import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import type { Item } from '../../types/database';
import { getItemDisplay } from '../../utils/itemDisplay';

type Props = AdminTabScreenProps<'AdminItens'>;

export default function AdminItensScreen(_props: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('itens').select('*').order('tipo').order('nome');
    setItens((data as Item[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleDisponivel = (item: Item) => {
    const next = !item.disponivel;
    Alert.alert(
      next ? 'Marcar como disponível' : 'Marcar como indisponível',
      `${item.nome} ficará ${next ? 'livre' : 'ocupado'} no app.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await supabase.from('itens').update({ disponivel: next }).eq('id', item.id);
            void load();
          },
        },
      ],
    );
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Itens</Text>
      <Text style={styles.sub}>Toque para alternar disponibilidade</Text>
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const display = getItemDisplay(item.tipo);
          return (
            <Pressable onPress={() => toggleDisponivel(item)} accessibilityLabel={item.nome}>
              <AdminListCard
                title={item.nome}
                subtitle={`${display.label} · ${item.localizacao ?? 'Campus'}${item.numero != null ? ` · #${item.numero}` : ''}`}
                badge={item.disponivel ? 'Livre' : 'Ocupado'}
                badgeTone={item.disponivel ? 'success' : 'warning'}
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sub: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, paddingTop: 0 },
});
