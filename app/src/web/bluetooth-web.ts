import { definePlugin } from '@capacitor/core'

export interface BluetoothWebPlugin {
  isAvailable(): Promise<{ available: boolean }>
  isEnabled(): Promise<{ enabled: boolean }>
  isConnected(): Promise<{ connected: boolean }>
  requestPermissions(): Promise<void>
  startDiscovery(): Promise<void>
  stopDiscovery(): Promise<void>
  connect(options: { address: string }): Promise<void>
  disconnect(): Promise<void>
  sendCommand(options: { command: string }): Promise<void>
}

export class BluetoothWeb {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false }
  }
  
  async isEnabled(): Promise<{ enabled: boolean }> {
    return { enabled: false }
  }
  
  async isConnected(): Promise<{ connected: boolean }> {
    return { connected: false }
  }
  
  async requestPermissions(): Promise<void> {
    console.log('Web platform: permissions not applicable')
  }
  
  async startDiscovery(): Promise<void> {
    console.log('Web platform: discovery not available')
  }
  
  async stopDiscovery(): Promise<void> {
    console.log('Web platform: discovery not available')
  }
  
  async connect(): Promise<void> {
    console.log('Web platform: native Bluetooth not available')
  }
  
  async disconnect(): Promise<void> {
    console.log('Web platform: not connected')
  }
  
  async sendCommand(): Promise<void> {
    console.log('Web platform: cannot send command')
  }
}
