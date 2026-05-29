import { PlatformPressable } from '@react-navigation/elements';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStudentAlerts } from '../hooks/useStudentAlerts';
import { colors } from '../theme/colors';
import type { AppTabParamList } from './types';

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

function tabLabel(options: BottomTabBarProps['descriptors'][string]['options']): string {
  const label = options.tabBarLabel ?? options.title ?? '';
  return typeof label === 'string' ? label : '';
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function navigateTabPress(
  navigation: BottomTabBarProps['navigation'],
  routeName: keyof AppTabParamList,
  focused: boolean,
  params: object | undefined,
) {
  if (focused) {
    if (routeName === 'Home') {
      navigation.navigate('Home', { screen: 'HomeMain' });
      return;
    }
    if (routeName === 'Profile') {
      navigation.navigate('Profile', { screen: 'ProfileMain' });
      return;
    }
    return;
  }

  navigation.navigate(routeName, params as never);
}

export function StudentTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count: alertCount } = useStudentAlerts();
  const bottomGap =
    Platform.OS === 'web' ? TAB_BAR_BOTTOM_GAP_WEB : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.outer, { paddingBottom: bottomGap }]}>
      <View style={styles.shell}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const color = focused ? colors.primary : colors.inactive;
            const label = tabLabel(options);
            const isTotemScan = route.name === 'TotemScan';
            const isNotifications = route.name === 'Notifications';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigateTabPress(navigation, route.name as keyof AppTabParamList, focused, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            if (isTotemScan) {
              return (
                <PlatformPressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.totemTab}
                >
                  <View style={[styles.totemButton, focused && styles.totemButtonFocused]}>
                    {options.tabBarIcon?.({
                      focused,
                      color: colors.white,
                      size: 26,
                    })}
                  </View>
                  <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.inactive }]}>
                    {label}
                  </Text>
                </PlatformPressable>
              );
            }

            if (isNotifications) {
              return (
                <PlatformPressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={
                    alertCount > 0
                      ? `${options.tabBarAccessibilityLabel ?? label}, ${alertCount} avisos`
                      : (options.tabBarAccessibilityLabel ?? label)
                  }
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[styles.tabButton, focused && styles.tabButtonSelected]}
                >
                  <View style={styles.iconWithBadge}>
                    {options.tabBarIcon?.({ focused, color, size: 22 })}
                    <Badge count={alertCount} />
                  </View>
                  <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </PlatformPressable>
              );
            }

            return (
              <PlatformPressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[styles.tabButton, focused && styles.tabButtonSelected]}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </PlatformPressable>
            );
          })}
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: STUDENT_TAB_BAR_CONTENT_HEIGHT,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 1,
    marginVertical: 4,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    gap: 2,
  },
  tabButtonSelected: {
    backgroundColor: colors.background,
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: '600',
    lineHeight: 11,
    textAlign: 'center',
  },
  iconWithBadge: {
    position: 'relative',
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dangerText,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  totemTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
    paddingBottom: 2,
    gap: 4,
  },
  totemButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(37, 99, 160, 0.35)' }
      : {
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  totemButtonFocused: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
