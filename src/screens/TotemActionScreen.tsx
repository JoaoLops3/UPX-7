import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { border } from '../theme/ui';

export type TotemAluno = { id: string; nome: string | null };

type AtivoItem = { id: string; nome: string | null; tipo: string };

type Status = {
  alugueis_ativos: AtivoItem[];
  checkin_disponivel: boolean;
  guarda_disponivel: boolean;
};

type RpcResult = { ok: boolean; message?: string; item?: string | null };

type TotemActionRpc = 'totem_alugar_guarda_chuva' | 'totem_checkin_quadra';

type Props = {
  aluno: TotemAluno;
  onFinish: () => void;
  onLogout: () => void;
};

const IDLE_TIMEOUT_MS = 30000;
const DONE_AFTER_MS = 3500;

type Tab = 'alugar' | 'quadra' | 'devolver';

export default function TotemActionScreen({ aluno, onFinish, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('alugar');
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string; subtitle: string } | null>(null);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTabSet = useRef(false);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(onFinish, IDLE_TIMEOUT_MS);
  }, [onFinish]);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.rpc('totem_status_aluno', { p_aluno_id: aluno.id });
    const next = (data as Status | null) ?? null;
    setStatus(next);
    setLoading(false);
    if (!initialTabSet.current && next) {
      initialTabSet.current = true;
      const ativos = next.alugueis_ativos ?? [];
      if (ativos.length > 0) setTab('devolver');
      else if (next.checkin_disponivel) setTab('quadra');
      else setTab('alugar');
    }
  }, [aluno.id]);

  useEffect(() => {
    resetIdle();
    void loadStatus();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [resetIdle, loadStatus]);

  const finishWith = useCallback(
    (title: string, subtitle: string) => {
      setDone({ title, subtitle });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      doneTimer.current = setTimeout(onFinish, DONE_AFTER_MS);
    },
    [onFinish],
  );

  const runAction = useCallback(
    async (fn: TotemActionRpc, sucessoTitle: string) => {
      if (busy) return;
      resetIdle();
      setBanner(null);
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc(fn, { p_aluno_id: aluno.id });
        if (error) {
          setBanner('Erro ao processar. Tente novamente.');
          return;
        }
        const res = (data as RpcResult | null) ?? { ok: false };
        if (res.ok) {
          const item = res.item ? ` — ${res.item}` : '';
          finishWith(sucessoTitle, `${aluno.nome ?? 'Aluno'}${item}`);
        } else {
          setBanner(res.message ?? 'Não foi possível concluir.');
          await loadStatus();
        }
      } finally {
        setBusy(false);
      }
    },
    [aluno.id, aluno.nome, busy, finishWith, loadStatus, resetIdle],
  );

  const runDevolver = useCallback(
    async (aluguelId: string) => {
      if (busy) return;
      resetIdle();
      setBanner(null);
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc('totem_devolver', {
          p_aluno_id: aluno.id,
          p_aluguel_id: aluguelId,
        });
        if (error) {
          setBanner('Erro ao processar. Tente novamente.');
          return;
        }
        const res = (data as RpcResult | null) ?? { ok: false };
        if (res.ok) {
          const item = res.item ? ` — ${res.item}` : '';
          finishWith('Devolução concluída', `${aluno.nome ?? 'Aluno'}${item}`);
        } else {
          setBanner(res.message ?? 'Não foi possível concluir.');
          await loadStatus();
        }
      } finally {
        setBusy(false);
      }
    },
    [aluno.id, aluno.nome, busy, finishWith, loadStatus, resetIdle],
  );

  const selectTab = useCallback(
    (next: Tab) => {
      resetIdle();
      setBanner(null);
      setTab(next);
    },
    [resetIdle],
  );

  if (done) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.doneIcon, { borderColor: colors.primary }]}>
          <Ionicons name="checkmark-circle-outline" size={72} color={colors.primary} />
        </View>
        <Text style={styles.doneTitle}>{done.title}</Text>
        <Text style={styles.doneSubtitle}>{done.subtitle}</Text>
      </View>
    );
  }

  const ativos = status?.alugueis_ativos ?? [];
  const podeGuarda = !!status?.guarda_disponivel;
  const podeCheckin = !!status?.checkin_disponivel;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Olá,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {aluno.nome ?? 'Aluno'}
          </Text>
        </View>
        <Pressable onPress={onFinish} style={styles.exitBtn} accessibilityRole="button">
          <Ionicons name="close" size={18} color={colors.textMuted} />
          <Text style={styles.exitText}>Encerrar</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : tab === 'alugar' ? (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>Alugar guarda-chuva</Text>
            <ActionCard
              icon="umbrella-outline"
              title="Alugar guarda-chuva"
              subtitle={podeGuarda ? 'Pegue agora — prazo de 7 dias' : 'Nenhum disponível no momento'}
              disabled={!podeGuarda || busy}
              loading={busy}
              onPress={() => void runAction('totem_alugar_guarda_chuva', 'Aluguel registrado')}
            />
          </View>
        ) : tab === 'quadra' ? (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>Confirmar aluguel da quadra</Text>
            {podeCheckin ? (
              <ActionCard
                icon="tennisball-outline"
                title="Confirmar aluguel da quadra"
                subtitle="Libera a quadra e inicia a contagem do seu tempo"
                disabled={busy}
                loading={busy}
                onPress={() => void runAction('totem_checkin_quadra', 'Quadra liberada')}
              />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  Você não tem uma reserva de quadra na janela de confirmação agora.
                  {'\n'}Faça a reserva no app e volte no horário marcado.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>Devolver item</Text>
            {ativos.length > 0 ? (
              <>
                {ativos.length > 1 ? (
                  <Text style={styles.pageHint}>Escolha qual item devolver:</Text>
                ) : null}
                {ativos.map((item) => (
                  <ActionCard
                    key={item.id}
                    icon={item.tipo === 'quadra' ? 'tennisball-outline' : 'umbrella-outline'}
                    title={`Devolver ${item.nome ?? 'item'}`}
                    subtitle="Encerrar este aluguel"
                    disabled={busy}
                    loading={busy}
                    onPress={() => void runDevolver(item.id)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="checkmark-done-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>Nenhum item ativo para devolver.</Text>
              </View>
            )}
          </View>
        )}

        {banner ? (
          <View style={styles.banner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} />
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { borderColor: colors.primary, backgroundColor: colors.background },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sair do totem"
      >
        <Ionicons name="log-out-outline" size={16} color={colors.textMuted} accessibilityElementsHidden />
        <Text style={styles.logoutText}>Sair do totem</Text>
      </Pressable>

      <NavBar tab={tab} onSelect={selectTab} bottomInset={insets.bottom} />
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  disabled,
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionCard,
        disabled && styles.actionCardDisabled,
        pressed && !disabled && { borderColor: colors.primary, backgroundColor: colors.background },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={styles.actionIcon}>
        {loading ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : (
          <Ionicons name={icon} size={28} color={disabled ? colors.inactive : colors.primaryDark} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, disabled && { color: colors.inactive }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {!disabled ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function NavBar({
  tab,
  onSelect,
  bottomInset,
}: {
  tab: Tab;
  onSelect: (t: Tab) => void;
  bottomInset: number;
}) {
  return (
    <View style={[styles.navOuter, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View style={styles.navShell}>
        <NavItem icon="umbrella-outline" label="Alugar" active={tab === 'alugar'} onPress={() => onSelect('alugar')} />
        <NavItem
          icon="tennisball-outline"
          label="Quadra"
          active={tab === 'quadra'}
          onPress={() => onSelect('quadra')}
        />
        <NavItem
          icon="return-down-back-outline"
          label="Devolver"
          active={tab === 'devolver'}
          onPress={() => onSelect('devolver')}
        />
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navItem, active && styles.navItemActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={24} color={active ? colors.primary : colors.inactive} />
      <Text style={[styles.navLabel, { color: active ? colors.primary : colors.inactive }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...border,
  },
  hello: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 20, fontWeight: '800', color: colors.primaryVeryDark },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.white,
    ...border,
  },
  exitText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.white,
    marginBottom: 8,
    ...border,
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  content: { flex: 1, paddingTop: 12 },
  page: { gap: 14 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryVeryDark, marginBottom: 2 },
  pageHint: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    ...border,
  },
  actionCardDisabled: { backgroundColor: colors.screenBg, opacity: 0.7 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryVeryDark },
  actionSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
  },
  bannerText: { flex: 1, fontSize: 14, color: colors.dangerText },
  navOuter: { paddingHorizontal: 4, paddingTop: 8 },
  navShell: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 8,
    gap: 8,
    ...border,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
  },
  navItemActive: { backgroundColor: colors.background },
  navLabel: { fontSize: 13, fontWeight: '600' },
  doneIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...border,
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  doneSubtitle: { fontSize: 17, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
