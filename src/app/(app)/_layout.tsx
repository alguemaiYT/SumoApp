import { Tabs, usePathname, useRouter } from 'expo-router';
import { Activity, Crosshair, SlidersHorizontal, Wrench } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Vibration, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalTopBar } from '@/components/sumo/GlobalTopBar';
import { isTabSwipeLocked, resetTabSwipeLock } from '@/lib/sumo/gesture-lock';
import { useSumoStore } from '@/lib/sumo/store';

const TAB_ROUTES = ['/', '/strategies', '/tuning', '/bench'] as const;

function resolveTabIndex(pathname: string): number {
  if (pathname === '/' || pathname === '/index') return 0;
  if (pathname.startsWith('/strategies')) return 1;
  if (pathname.startsWith('/tuning')) return 2;
  if (pathname.startsWith('/bench')) return 3;
  return 0;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const highContrast = useSumoStore((s) => s.highContrast);
  const bottomInset = Math.max(8, insets.bottom);
  const bg = highContrast ? '#000000' : '#09090B';

  const tabIndexRef = React.useRef(resolveTabIndex(pathname));
  tabIndexRef.current = resolveTabIndex(pathname);

  React.useEffect(() => {
    resetTabSwipeLock();
  }, [pathname]);

  const swipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-34, 34])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if (isTabSwipeLocked()) return;
          const strongHorizontal =
            Math.abs(e.translationX) >= 54 || Math.abs(e.velocityX) >= 480;
          if (!strongHorizontal) return;
          if (Math.abs(e.translationY) > Math.abs(e.translationX) * 0.85) return;

          const cur = tabIndexRef.current;
          const nextIdx =
            e.translationX < 0
              ? Math.min(TAB_ROUTES.length - 1, cur + 1)
              : Math.max(0, cur - 1);
          if (nextIdx !== cur) {
            try {
              Vibration.vibrate(10);
            } catch {
              // ignore
            }
            router.navigate(TAB_ROUTES[nextIdx]);
          }
        }),
    [router],
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <GlobalTopBar />
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.content}>
          <Tabs
            screenOptions={{
              headerShown: false,
              freezeOnBlur: true,
              animation: 'shift',
              sceneStyle: { backgroundColor: bg },
              tabBarActiveTintColor: '#FF4D00',
              tabBarInactiveTintColor: '#8E8E98',
              tabBarStyle: {
                backgroundColor: bg,
                borderTopColor: highContrast ? '#3F3F46' : 'rgba(255,255,255,0.08)',
                borderTopWidth: 1,
                height: 54 + bottomInset,
                paddingBottom: bottomInset,
                paddingTop: 6,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Painel',
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Activity color={color} size={size - 2} />
                ),
              }}
            />
            <Tabs.Screen
              name="strategies"
              options={{
                title: 'Estratégias',
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Crosshair color={color} size={size - 2} />
                ),
              }}
            />
            <Tabs.Screen
              name="tuning"
              options={{
                title: 'Ajustes',
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <SlidersHorizontal color={color} size={size - 2} />
                ),
              }}
            />
            <Tabs.Screen
              name="bench"
              options={{
                title: 'Bancada',
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Wrench color={color} size={size - 2} />
                ),
              }}
            />
          </Tabs>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
