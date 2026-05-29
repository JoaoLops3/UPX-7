import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';
import type { AdminStackParamList, AdminTabParamList } from './adminTypes';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminAlugueisScreen from '../screens/admin/AdminAlugueisScreen';
import AdminItensScreen from '../screens/admin/AdminItensScreen';
import AdminAlunosScreen from '../screens/admin/AdminAlunosScreen';
import AdminMultasScreen from '../screens/admin/AdminMultasScreen';
import AdminLogsNfcScreen from '../screens/admin/AdminLogsNfcScreen';
import AdminAlunoDetailScreen from '../screens/admin/AdminAlunoDetailScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createStackNavigator<AdminStackParamList>();

function AdminTabs() {
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
        tabBarActiveTintColor: colors.primaryVeryDark,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAlugueis"
        component={AdminAlugueisScreen}
        options={{
          tabBarLabel: 'Aluguéis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminItens"
        component={AdminItensScreen}
        options={{
          tabBarLabel: 'Itens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAlunos"
        component={AdminAlunosScreen}
        options={{
          tabBarLabel: 'Alunos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMultas"
        component={AdminMultasScreen}
        options={{
          tabBarLabel: 'Multas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AdminNavigation() {
  return (
    <View style={styles.navRoot}>
      <NavigationContainer independent>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { flex: 1, backgroundColor: colors.screenBg },
          }}
        >
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="AdminLogsNfc" component={AdminLogsNfcScreen} />
          <Stack.Screen name="AdminAlunoDetail" component={AdminAlunoDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  navRoot: { flex: 1 },
});
