import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSumoStore } from '@/lib/sumo/store';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)',
};

void SplashScreen.preventAutoHideAsync();

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
  const hasHiddenSplash = React.useRef(false);
  const initTransport = useSumoStore((s) => s.initTransport);

  React.useEffect(() => {
    initTransport();
  }, [initTransport]);

  const onLayoutRootView = React.useCallback(() => {
    if (hasHiddenSplash.current) return;
    hasHiddenSplash.current = true;
    SplashScreen.hide();
  }, []);

  return (
    <GestureHandlerRootView
      onLayout={onLayoutRootView}
      style={styles.container}
      className="dark bg-[#090D16]"
    >
      <ThemeProvider value={SumoDarkTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
        </Stack>
        <FlashMessage position="top" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
});
