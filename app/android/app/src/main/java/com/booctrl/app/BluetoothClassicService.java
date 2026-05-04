package com.booctrl.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class BluetoothClassicService {
    private static final String TAG = "BT_CLASSIC";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    
    private final Context context;
    private final BluetoothAdapter bluetoothAdapter;
    private final Handler mainHandler;
    private final BluetoothServiceListener listener;
    
    private BluetoothSocket socket;
    private InputStream inputStream;
    private OutputStream outputStream;
    private boolean isConnected = false;
    private boolean isScanning = false;
    private ReadThread readThread;
    
    public interface BluetoothServiceListener {
        void onDeviceFound(BluetoothDevice device);
        void onConnected(String deviceName, String deviceAddress);
        void onDisconnected();
        void onDataReceived(String data);
        void onError(String message);
        void onScanningState(boolean scanning);
    }
    
    public BluetoothClassicService(Context context, BluetoothServiceListener listener) {
        this.context = context;
        this.listener = listener;
        this.bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        this.mainHandler = new Handler(Looper.getMainLooper());
    }
    
    @SuppressLint("MissingPermission")
    public void startDiscovery() {
        if (!isBluetoothAvailable()) {
            listener.onError("Bluetooth não disponível");
            return;
        }
        
        if (isScanning) {
            return;
        }
        
        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        
        isScanning = true;
        listener.onScanningState(true);
        
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        
        context.registerReceiver(discoveryReceiver, filter);
        bluetoothAdapter.startDiscovery();
    }
    
    @SuppressLint("MissingPermission")
    public void stopDiscovery() {
        isScanning = false;
        bluetoothAdapter.cancelDiscovery();
        try {
            context.unregisterReceiver(discoveryReceiver);
        } catch (IllegalArgumentException e) {
            // Receiver not registered
        }
        listener.onScanningState(false);
    }
    
    @SuppressLint("MissingPermission")
    public void connectToDevice(String deviceAddress) {
        if (isConnected) {
            disconnect();
        }
        
        if (!isBluetoothAvailable()) {
            listener.onError("Bluetooth não disponível");
            return;
        }
        
        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceAddress);
        
        try {
            stopDiscovery();
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            
            inputStream = socket.getInputStream();
            outputStream = socket.getOutputStream();
            isConnected = true;
            
            listener.onConnected(device.getName(), device.getAddress());
            
            // Start reading thread
            readThread = new ReadThread();
            readThread.start();
        } catch (IOException e) {
            isConnected = false;
            listener.onError("Falha na conexão: " + e.getMessage());
            try {
                if (socket != null) socket.close();
            } catch (IOException ignored) {}
        }
    }
    
    public void disconnect() {
        isConnected = false;
        
        if (readThread != null) {
            readThread.interrupt();
            readThread = null;
        }
        
        try {
            if (inputStream != null) inputStream.close();
            if (outputStream != null) outputStream.close();
            if (socket != null) socket.close();
        } catch (IOException e) {
            Log.e(TAG, "Error closing socket", e);
        }
        
        listener.onDisconnected();
    }
    
    public void sendCommand(String command) {
        if (!isConnected || outputStream == null) {
            listener.onError("Não conectado");
            return;
        }
        
        try {
            outputStream.write(command.getBytes());
            outputStream.flush();
        } catch (IOException e) {
            isConnected = false;
            listener.onError("Erro ao enviar: " + e.getMessage());
            disconnect();
        }
    }
    
    public boolean isConnected() {
        return isConnected && socket != null && socket.isConnected();
    }
    
    public boolean isBluetoothAvailable() {
        return bluetoothAdapter != null;
    }
    
    public boolean isBluetoothEnabled() {
        return bluetoothAdapter != null && bluetoothAdapter.isEnabled();
    }
    
    private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                @SuppressLint("MissingPermission")
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null) {
                    listener.onDeviceFound(device);
                }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                isScanning = false;
                listener.onScanningState(false);
            }
        }
    };
    
    private class ReadThread extends Thread {
        private static final int BUFFER_SIZE = 1024;
        
        @Override
        public void run() {
            byte[] buffer = new byte[BUFFER_SIZE];
            StringBuilder stringBuilder = new StringBuilder();
            
            try {
                while (isConnected && !Thread.currentThread().isInterrupted()) {
                    int bytes = inputStream.read(buffer);
                    if (bytes > 0) {
                        String data = new String(buffer, 0, bytes);
                        stringBuilder.append(data);
                        
                        // Process complete lines
                        String content = stringBuilder.toString();
                        int newlineIndex = content.indexOf('\n');
                        
                        while (newlineIndex != -1) {
                            String line = content.substring(0, newlineIndex).trim();
                            if (!line.isEmpty()) {
                                final String finalLine = line;
                                mainHandler.post(() -> listener.onDataReceived(finalLine));
                            }
                            content = content.substring(newlineIndex + 1);
                            newlineIndex = content.indexOf('\n');
                        }
                        
                        stringBuilder = new StringBuilder(content);
                    }
                }
            } catch (IOException e) {
                if (isConnected) {
                    Log.e(TAG, "Read error", e);
                    mainHandler.post(() -> {
                        isConnected = false;
                        listener.onError("Conexão perdida");
                        disconnect();
                    });
                }
            }
        }
    }
    
    public void cleanup() {
        stopDiscovery();
        disconnect();
    }
}
