import { useMemo } from 'react';
import {
  Alert,
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
import { useScreenContentInsets } from '../hooks/useScreenContentInsets';
import { getStudentTabBarInset } from '../navigation/StudentTabBar';
import { useAuth } from '../contexts/AuthContext';
import { notificationsSupportedOnPlatform } from '../lib/notifications/preferences';
import { navigateRoot } from '../navigation/rootNavigation';
import type { ProfileStackScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { border, card, cardPressed } from '../theme/ui';
import { formatDurationCompact } from '../utils/dates';
import { getInitials } from '../utils/initials';

type Props = ProfileStackScreenProps<'ProfileMain'>;

export default function ProfileScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { aluno, loading: alunoLoading } = useAluno();
  const { alugueis, loading: alugueisLoading } = useAlugueis(aluno?.id ?? '');
  const { multas, totalPendente, loading: multasLoading } = useMultas(aluno?.id ?? '');
  const { contentContainerStyle } = useScreenContentInsets(getStudentTabBarInset());

  const pendentes = multas.filter((m) => m.status === 'pendente').length;

  const tempoTotal = useMemo(() => {
    const totalMs = alugueis
      .filter((a) => a.fim_real)
      .reduce((sum, a) => {
        const fim = new Date(a.fim_real!).getTime();
        const inicio = new Date(a.inicio ?? 0).getTime();
        return sum + (fim - inicio);
      }, 0);
    return formatDurationCompact(totalMs);
  }, [alugueis]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (alunoLoading || alugueisLoading || multasLoading) return <LoadingView />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={contentContainerStyle}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(aluno?.nome ?? 'A')}</Text>
        </View>
        <View>
          <Text style={styles.nome}>{aluno?.nome ?? 'Aluno'}</Text>
          <Text style={styles.ra}>RA · {aluno?.ra ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Aluguéis" value={String(alugueis.length)} />
        <StatCard label="Tempo total" value={tempoTotal} />
        <Pressable
          style={({ pressed }) => [styles.statCard, pressed && styles.statPressed]}
          onPress={() => navigateRoot('Fines')}
          accessibilityLabel="Ver multas pendentes"
        >
          <Text
            style={[styles.statValue, pendentes > 0 && styles.statDanger]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {pendentes}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            Multas
          </Text>
        </Pressable>
      </View>

      <View style={styles.menuCard}>
        <MenuItem
          icon="alert-circle-outline"
          iconColor={colors.dangerText}
          label="Minhas multas"
          badge={pendentes > 0 ? String(pendentes) : undefined}
          onPress={() => navigateRoot('Fines')}
        />
        <MenuItem
          icon="qr-code-outline"
          label="Identificar no totem"
          subtitle="Abrir leitor de QR Code na barra inferior"
          onPress={() => navigateRoot('TotemScan')}
        />
        <MenuItem
          icon="card-outline"
          label="Minha carteirinha NFC"
          subtitle={
            aluno?.uid_nfc
              ? `Vinculada · termina em ${aluno.uid_nfc.replace(/\s+/g, '').slice(-4)}`
              : 'Não cadastrada — procure a administração'
          }
          onPress={() =>
            Alert.alert(
              aluno?.uid_nfc ? 'Carteirinha vinculada' : 'Carteirinha não cadastrada',
              aluno?.uid_nfc
                ? 'Sua carteirinha está ativa. Use o totem NFC para alugar, check-in e devolução.'
                : 'Peça à administração para vincular o UID da sua carteirinha ao seu cadastro.',
            )
          }
        />
        {notificationsSupportedOnPlatform() ? (
          <MenuItem
            icon="notifications-outline"
            label="Notificações"
            subtitle="Alertas automáticos · testar avisos"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        ) : null}
        <MenuItem
          icon="help-circle-outline"
          label="Ajuda e suporte"
              onPress={() => navigation.navigate('Help')}
          last
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        onPress={handleSignOut}
        accessibilityLabel="Sair da conta"
      >
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>

      {totalPendente > 0 && (
        <Text style={styles.totalPendente}>
          Total pendente: R$ {totalPendente.toFixed(2).replace('.', ',')}
        </Text>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const compactValue = value.length > 9;

  return (
    <View style={styles.statCard}>
      <Text
        style={[styles.statValue, compactValue && styles.statValueCompact]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  iconColor = colors.primaryDark,
  label,
  subtitle,
  badge,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        !last && styles.menuBorder,
        pressed && styles.menuPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={iconColor} accessibilityElementsHidden />
      <View style={styles.menuBody}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.inactive} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark, marginBottom: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  nome: { fontSize: 18, fontWeight: '600', color: colors.primaryVeryDark },
  ra: { fontSize: 14, color: colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, width: '100%' },
  statCard: {
    flex: 1,
    minWidth: 0,
    ...card,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statPressed: cardPressed(true),
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    width: '100%',
  },
  statValueCompact: { fontSize: 14, lineHeight: 18 },
  statDanger: { color: colors.dangerText },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  menuCard: {
    ...card,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuPressed: { backgroundColor: colors.background },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: colors.primaryVeryDark },
  menuSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuBadge: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  menuBadgeText: { fontSize: 11, fontWeight: '600', color: colors.dangerText },
  logoutBtn: {
    ...border,
    borderColor: '#fca5a5',
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 14,
    alignItems: 'center',
  },
  logoutPressed: { backgroundColor: colors.dangerBg },
  logoutText: { color: colors.dangerText, fontSize: 15, fontWeight: '600' },
  totalPendente: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: colors.dangerText,
  },
});
