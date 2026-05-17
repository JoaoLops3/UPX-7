import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { LoadingView } from './src/components/LoadingView';
import { PrimaryButton } from './src/components/PrimaryButton';
import { SupabaseErrorBanner } from './src/components/SupabaseErrorBanner';
import { WebLayout } from './src/components/WebLayout';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useAdmin } from './src/hooks/useAdmin';
import { useAluno } from './src/hooks/useAluno';
import { AdminNavigation } from './src/navigation/AdminNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import NoAccessScreen from './src/screens/auth/NoAccessScreen';
import { colors } from './src/theme/colors';
import { navigationRef } from './src/navigation/rootNavigation';
import { StudentNavigator } from './src/navigation/StudentNavigator';
import { StudentNotificationSync } from './src/components/StudentNotificationSync';
import {
  attachNotificationResponseListener,
  configureNotificationHandler,
  detachNotificationResponseListener,
} from './src/lib/notifications/setup';
import { unregisterOrphanServiceWorker } from './src/lib/unregisterOrphanServiceWorker';

function AuthenticatedApp() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError, refetch: refetchAdmin } = useAdmin();
  const { aluno, loading: alunoLoading, notRegistered, error, refetch } = useAluno();

  if (authLoading || (session && adminLoading) || (session && !isAdmin && alunoLoading)) {
    return <LoadingView />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (isAdmin) {
    if (adminError) {
      return (
        <View style={gateStyles.errorScreen}>
          <Text style={gateStyles.errorTitle}>Erro ao carregar perfil admin</Text>
          <SupabaseErrorBanner message={adminError} onRetry={() => void refetchAdmin()} />
          <PrimaryButton label="Sair" onPress={() => void signOut()} style={gateStyles.errorBtn} />
        </View>
      );
    }
    return <AdminNavigation />;
  }

  if (notRegistered) {
    return <NoAccessScreen />;
  }

  if (error && !aluno) {
    return (
      <View style={gateStyles.errorScreen}>
        <Text style={gateStyles.errorTitle}>Não foi possível carregar seu perfil</Text>
        <SupabaseErrorBanner message={error} onRetry={() => void refetch()} />
        <PrimaryButton label="Sair" onPress={() => void signOut()} style={gateStyles.errorBtn} />
      </View>
    );
  }

  if (!aluno) {
    return <LoadingView />;
  }

  return <AppNavigation />;
}

function AppNavigation() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <StudentNotificationSync />
      <StudentNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    configureNotificationHandler();
    attachNotificationResponseListener();
    return () => detachNotificationResponseListener();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      unregisterOrphanServiceWorker();
      if (typeof document !== 'undefined') {
        document.title = 'UPX 7';
      }
    }
  }, []);

  const onLayout = useCallback(() => {}, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <AuthProvider>
          <WebLayout>
            <AuthenticatedApp />
          </WebLayout>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenBg,
  },
});

const gateStyles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 24,
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryVeryDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBtn: { marginTop: 20 },
});
