import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { DragonBotzSplash } from '@/components/sumo/DragonBotzSplash';
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

const SumoCarbonTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF4D00',
    background: '#09090B',
    card: '#121215',
    text: '#FAFAFA',
    border: '#27272A',
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
        <ThemeProvider value={SumoCarbonTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
          </Stack>
          <DragonBotzSplash />
          <FlashMessage position="top" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    padding: 20,
    paddingTop: 64,
  },
  errorContent: {
    gap: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  errorStack: {
    color: '#A1A1AA',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#FF4D00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
