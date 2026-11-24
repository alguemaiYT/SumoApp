/* eslint-disable ts/ban-ts-comment */
/* eslint-disable no-restricted-globals */

jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      ScrollView: View,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn((fn) => fn()),
  };
});

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn().mockImplementation(() => ({
    state: jest.fn(async () => 'PoweredOn'),
    onStateChange: jest.fn(() => ({ remove: jest.fn() })),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
    devices: jest.fn(async () => []),
    connectToDevice: jest.fn(),
    onDeviceDisconnected: jest.fn(() => ({ remove: jest.fn() })),
    destroy: jest.fn(),
  })),
  State: {
    PoweredOn: 'PoweredOn',
    PoweredOff: 'PoweredOff',
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [
    { languageTag: 'pt-BR', languageCode: 'pt', textDirection: 'ltr' },
  ]),
}));

jest.mock('react-native-mmkv', () => {
  const mem = new Map<string, string>();
  const mockStore = {
    set: jest.fn((k: string, v: string) => mem.set(k, String(v))),
    getString: jest.fn((k: string) => mem.get(k)),
    remove: jest.fn((k: string) => mem.delete(k)),
    clearAll: jest.fn(() => mem.clear()),
    getAllKeys: jest.fn(() => Array.from(mem.keys())),
  };
  return {
    createMMKV: jest.fn(() => mockStore),
    useMMKVString: jest.fn(() => [undefined, jest.fn()]),
  };
});

// @ts-expect-error
global.window = global;
