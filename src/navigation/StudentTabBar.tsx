import { PlatformPressable } from '@react-navigation/elements';
import { Platform, StyleSheet, View } from 'react-native';
import {
  BottomTabBar,
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

/** Ícone (~24) + label (~14) + paddings — altura menor corta o texto na web. */
export const STUDENT_TAB_BAR_CONTENT_HEIGHT = 72;
const TAB_BAR_HORIZONTAL_INSET = 14;
const TAB_BAR_BOTTOM_GAP_WEB = 12;

/** Altura ocupada pela tab bar flutuante (para padding das telas e fim da área de scroll). */
export function getStudentTabBarInset(safeBottom = 0): number {
  const bottomGap =
    Platform.OS === 'web' ? TAB_BAR_BOTTOM_GAP_WEB : Math.max(safeBottom, 8);
  return 8 + STUDENT_TAB_BAR_CONTENT_HEIGHT + bottomGap;
}

export function StudentTabBarButton({
  style,
  children,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const selected = accessibilityState?.selected;

  return (
    <PlatformPressable
      {...rest}
      accessibilityState={accessibilityState}
      style={[styles.tabButton, selected && styles.tabButtonSelected, style]}
    >
      {children}
    </PlatformPressable>
  );
}

export function StudentTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomGap =
    Platform.OS === 'web' ? TAB_BAR_BOTTOM_GAP_WEB : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.outer, { paddingBottom: bottomGap }]}>
      <View style={styles.shell}>
        <BottomTabBar
          {...props}
          style={[props.style, styles.bar]}
        />
      </View>
    </View>
  );
}

const shellShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 4px 20px rgba(26, 74, 122, 0.14)' }
    : {
        shadowColor: '#1a4a7a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      };

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: TAB_BAR_HORIZONTAL_INSET,
    paddingTop: 8,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { zIndex: 10 } : {}),
  },
  shell: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    minHeight: STUDENT_TAB_BAR_CONTENT_HEIGHT,
    ...shellShadow,
  },
  bar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    minHeight: STUDENT_TAB_BAR_CONTENT_HEIGHT,
    height: STUDENT_TAB_BAR_CONTENT_HEIGHT,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
    marginVertical: 4,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
  },
  tabButtonSelected: {
    backgroundColor: colors.background,
  },
});
