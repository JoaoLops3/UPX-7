import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

/** Borda visível na web (0.5px some em alguns navegadores). */
export const border = {
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: colors.border,
} satisfies ViewStyle;

export const card: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: 12,
  ...border,
  ...(Platform.OS === 'web'
    ? { boxShadow: '0 1px 4px rgba(26, 74, 122, 0.1)' }
    : { elevation: 2 }),
};

export const cardPressed = (pressed: boolean): ViewStyle =>
  pressed
    ? {
        backgroundColor: colors.background,
        borderColor: colors.primary,
      }
    : {};

export const chip: ViewStyle = {
  ...border,
  borderRadius: 8,
  backgroundColor: colors.white,
};

export const chipSelected: ViewStyle = {
  borderColor: colors.primary,
  backgroundColor: colors.background,
};

export const primaryButton: ViewStyle = {
  backgroundColor: colors.primary,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: colors.primaryDark,
  paddingVertical: 16,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
};

export const primaryButtonPressed: ViewStyle = {
  backgroundColor: colors.background,
  borderColor: colors.primary,
};

export const outlineButton: ViewStyle = {
  ...border,
  borderRadius: 12,
  backgroundColor: colors.white,
  paddingVertical: 14,
  paddingHorizontal: 20,
  alignItems: 'center',
};

export const outlineButtonPressed: ViewStyle = {
  backgroundColor: colors.background,
  borderColor: colors.primary,
};
