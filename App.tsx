import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { navigationRef } from './src/navigation/rootNavigation';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ConfirmScreen from './src/screens/ConfirmScreen';
import ActiveScreen from './src/screens/ActiveScreen';
import ReturnScanScreen from './src/screens/ReturnScanScreen';
import FinesScreen from './src/screens/FinesScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: colors.screenBg },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 60 : 56 + Math.max(insets.bottom, 8),
          ...(Platform.OS === 'web'
            ? { paddingTop: 0, paddingBottom: 0 }
            : { paddingBottom: Math.max(insets.bottom, 8) }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarItemStyle: {
          padding: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wifi-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.screenBg },
          cardOverlayEnabled: false,
          presentation: 'card',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Confirm" component={ConfirmScreen} />
        <Stack.Screen name="Active" component={ActiveScreen} />
        <Stack.Screen name="Return" component={ReturnScanScreen} />
        <Stack.Screen name="Fines" component={FinesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'UPX 7';
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
