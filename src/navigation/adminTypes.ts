import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminAlugueis: undefined;
  AdminItens: undefined;
  AdminAlunos: undefined;
  AdminMultas: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
};

export type AdminTabScreenProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  StackScreenProps<AdminStackParamList>
>;
