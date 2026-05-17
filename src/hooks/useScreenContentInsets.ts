import { useMemo } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HORIZONTAL = 16;
const DEFAULT_BOTTOM = 20;

/** Padding de conteúdo que respeita status bar / Dynamic Island no iOS. */
export function useScreenContentInsets(bottomPadding = DEFAULT_BOTTOM) {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const topInset = Platform.OS === 'web' ? 0 : insets.top;
    const paddingTop = HORIZONTAL + topInset;

    const contentContainerStyle: ViewStyle = {
      paddingHorizontal: HORIZONTAL,
      paddingBottom: bottomPadding,
      paddingTop,
    };

    return {
      paddingTop,
      paddingHorizontal: HORIZONTAL,
      contentContainerStyle,
    };
  }, [insets.top, bottomPadding]);
}
