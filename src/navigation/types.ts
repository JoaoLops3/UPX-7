import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { ItemTipo } from '../types/database';

export type HomeStackParamList = {
  HomeMain: undefined;
  Confirm: { item: ItemTipo; mode?: 'now' | 'schedule'; scheduledStart?: string };
  QuadraReserva: { mode?: 'today' } | undefined;
  Active: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Fines: undefined;
  NotificationSettings: undefined;
};

/** Navegação principal do aluno — tab bar sempre visível. */
export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  History: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

/** Rotas usadas por navigateRoot (mapeadas para abas + stacks). */
export type RootStackParamList = {
  MainTabs: undefined;
  Confirm: HomeStackParamList['Confirm'];
  QuadraReserva: HomeStackParamList['QuadraReserva'];
  Active: undefined;
  /** @deprecated Devolução é no totem; redireciona para Início. */
  Devolucao: undefined;
  Fines: undefined;
  NotificationSettings: undefined;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, T>,
  BottomTabScreenProps<AppTabParamList>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    StackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<AppTabParamList>
  >;

export type AppTabScreenProps<T extends keyof AppTabParamList> = BottomTabScreenProps<
  AppTabParamList,
  T
>;

export type MainTabScreenProps<T extends 'Home' | 'History' | 'Profile'> =
  T extends 'Home'
    ? HomeStackScreenProps<'HomeMain'>
    : T extends 'Profile'
      ? ProfileStackScreenProps<'ProfileMain'>
      : AppTabScreenProps<'History'>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  T extends 'Confirm' | 'QuadraReserva' | 'Active'
    ? HomeStackScreenProps<T extends 'Confirm' ? 'Confirm' : T extends 'QuadraReserva' ? 'QuadraReserva' : 'Active'>
    : T extends 'Fines'
      ? ProfileStackScreenProps<'Fines'>
      : AppTabScreenProps<'Home'>;
