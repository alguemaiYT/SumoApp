import type { ConfigContext, ExpoConfig } from '@expo/config';

import 'tsx/cjs';
import Env from './env';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: 'SumoApp — Telemetria, estratégias e calibração BLE para Sumo_Auto_ESP32',
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'sumo-app',
  version: Env.EXPO_PUBLIC_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSBluetoothAlwaysUsageDescription:
        'SumoApp usa Bluetooth Low Energy (BLE) para conectar automaticamente ao robô Sumo_Auto_ESP32.',
      NSBluetoothPeripheralUsageDescription:
        'SumoApp usa Bluetooth Low Energy (BLE) para trocar telemetria e configurações com o robô.',
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#09090B',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#09090B',
        image: './assets/splash-icon.png',
        imageWidth: 260,
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                {
                  path: 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
                  weight: 400,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
                  weight: 500,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
                  weight: 600,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
                  weight: 700,
                },
              ],
            },
          ],
        },
      },
    ],
    'expo-localization',
    'expo-router',
    ['react-native-edge-to-edge'],
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: true,
        modes: ['central'],
        bluetoothAlwaysPermission:
          'SumoApp precisa do Bluetooth para encontrar e reconectar automaticamente ao robô Sumo_Auto_ESP32.',
        neverForLocation: true,
      },
    ],
  ],
});
