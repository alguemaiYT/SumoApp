import { Tabs } from 'expo-router';
import { Activity, Crosshair, SlidersHorizontal, Wrench } from 'lucide-react-native';
import * as React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF7B1A',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 64,
          paddingBottom: 8,
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
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="strategies"
        options={{
          title: 'Estratégias',
          tabBarIcon: ({ color, size }) => <Crosshair color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tuning"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bench"
        options={{
          title: 'Bancada',
          tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
