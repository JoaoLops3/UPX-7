import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { StudentTabBar, StudentTabBarButton } from './StudentTabBar';
import type {
  AppTabParamList,
  HomeStackParamList,
  ProfileStackParamList,
  ScanStackParamList,
} from './types';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConfirmScreen from '../screens/ConfirmScreen';
import QuadraReservaScreen from '../screens/QuadraReservaScreen';
import ActiveScreen from '../screens/ActiveScreen';
import DevolucaoScreen from '../screens/DevolucaoScreen';
import FinesScreen from '../screens/FinesScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const ScanStack = createStackNavigator<ScanStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

const stackScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: colors.screenBg },
  cardOverlayEnabled: false,
  presentation: 'card' as const,
  ...(Platform.OS === 'web' ? { animationEnabled: false } : {}),
};

function blurFocusedElementOnWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator initialRouteName="HomeMain" screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Confirm" component={ConfirmScreen} />
      <HomeStack.Screen name="QuadraReserva" component={QuadraReservaScreen} />
      <HomeStack.Screen name="Active" component={ActiveScreen} />
    </HomeStack.Navigator>
  );
}

function ScanStackNavigator() {
  return (
    <ScanStack.Navigator initialRouteName="ScanMain" screenOptions={stackScreenOptions}>
      <ScanStack.Screen name="ScanMain" component={ScanScreen} />
    </ScanStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator initialRouteName="ProfileMain" screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Fines" component={FinesScreen} />
      <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

export function StudentNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <StudentTabBar {...props} />}
      screenListeners={{
        tabPress: () => blurFocusedElementOnWeb(),
      }}
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: colors.screenBg },
        tabBarButton: (props) => <StudentTabBarButton {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          lineHeight: 12,
          marginTop: 0,
          marginBottom: 2,
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 6,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === 'web' ? { zIndex: 10 } : {}),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Devolucao"
        component={DevolucaoScreen}
        options={{
          tabBarLabel: 'Devolução',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'return-down-back' : 'return-down-back-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStackNavigator}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'wifi' : 'wifi-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
