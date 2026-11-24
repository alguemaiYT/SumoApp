import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { useSumoStore } from '@/lib/sumo/store';
import '../global.css';

export const unstable_settings = {
  initialRouteName: '(app)',
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <ScrollView contentContainerStyle={styles.errorContent}>
        <Text style={styles.errorTitle}>Erro ao carregar SumoApp</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        {error.stack ? <Text style={styles.errorStack}>{error.stack}</Text> : null}
        <Pressable onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const SumoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF6C00',
    background: '#090D16',
    card: '#111827',
    text: '#F8FAFC',
    border: '#1F2937',
    notification: '#EF4444',
  },
};

export default function RootLayout() {
  const initTransport = useSumoStore((s) => s.initTransport);

  React.useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    try {
      initTransport();
    } catch {
      // Handled inside store statusDetail
    }
  }, [initTransport]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider value={SumoDarkTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
          </Stack>
          <FlashMessage position="top" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 20,
    paddingTop: 64,
  },
  errorContent: {
    gap: 12,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#F8FAFC',
    fontSize: 14,
  },
  errorStack: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
