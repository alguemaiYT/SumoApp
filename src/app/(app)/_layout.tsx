import { Tabs } from 'expo-router';
import { Activity, Crosshair, SlidersHorizontal, Wrench } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalTopBar } from '@/components/sumo/GlobalTopBar';
import { useSumoStore } from '@/lib/sumo/store';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const highContrast = useSumoStore((s) => s.highContrast);
  const bottomInset = Math.max(8, insets.bottom);
  const bg = highContrast ? '#000000' : '#09090B';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <GlobalTopBar />
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: bg },
            tabBarActiveTintColor: '#FF4D00',
            tabBarInactiveTintColor: '#71717A',
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
