import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ItemTipo } from '../types/database';

export type RootStackParamList = {
  MainTabs: undefined;
  Confirm: { item: ItemTipo };
  Active: undefined;
  Fines: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Scan: { item?: ItemTipo };
  History: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
