import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { card, cardPressed } from '../theme/ui';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function DevolverNfcButton({ style }: Props) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    const parent = navigation.getParent?.();
    (parent ?? navigation).navigate('Return');
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Devolver aproximando a carteirinha"
      style={({ pressed }) => [styles.btn, pressed && cardPressed(true), style]}
    >
      <Text style={styles.label}>Devolver — aproxime a carteirinha</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    ...card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '600',
  },
});
