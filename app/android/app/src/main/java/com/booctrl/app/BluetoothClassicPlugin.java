package com.booctrl.app;

import android.app.Activity;
import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BluetoothClassic",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class BluetoothClassicPlugin extends Plugin implements BluetoothClassicService.BluetoothServiceListener {
    
    private BluetoothClassicService bluetoothService;
    
    @Override
    public void load() {
        bluetoothService = new BluetoothClassicService(getContext(), this);
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = bluetoothService.isBluetoothAvailable();
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void isEnabled(PluginCall call) {
        boolean enabled = bluetoothService.isBluetoothEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void isConnected(PluginCall call) {
        boolean connected = bluetoothService.isConnected();
        JSObject ret = new JSObject();
        ret.put("connected", connected);
        call.resolve(ret);
    }

    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            // Pre-Android 12: We only care about location for discovery
            PermissionState locationState = getPermissionState("location");
            JSObject ret = new JSObject();
            ret.put("bluetooth", locationState); // Map to "bluetooth" for UI simplicity
            ret.put("location", locationState);
            call.resolve(ret);
        } else {
            // Android 12+: Standard Capacitor check
            super.checkPermissions(call);
        }
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            // Pre-Android 12: Request location
            requestPermissionForAlias("location", call, "permissionsCallback");
        } else {
            // Android 12+: Request both
            requestPermissionForAliases(new String[]{"bluetooth", "location"}, call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        checkPermissions(call);
    }
    
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (!bluetoothService.isBluetoothAvailable()) {
            call.reject("Bluetooth não disponível");
            return;
        }

        if (!bluetoothService.isBluetoothEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(call, enableBtIntent, "handleStartDiscoveryEnableResult");
            return;
        }

        bluetoothService.startDiscovery();
        call.resolve();
    }
    
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        bluetoothService.stopDiscovery();
        call.resolve();
    }

    @PluginMethod
    public void enableBluetooth(PluginCall call) {
        if (!bluetoothService.isBluetoothAvailable()) {
            call.reject("Bluetooth não disponível");
            return;
        }

        if (bluetoothService.isBluetoothEnabled()) {
            call.resolve();
            return;
        }

        Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
        startActivityForResult(call, enableBtIntent, "handleEnableBluetoothResult");
    }
    
    @PluginMethod
    public void connect(PluginCall call) {
        String deviceAddress = call.getString("address");
        if (deviceAddress == null) {
            call.reject("Endereço do dispositivo obrigatório");
            return;
        }
        bluetoothService.connectToDevice(deviceAddress);
        call.resolve();
    }
    
    @PluginMethod
    public void disconnect(PluginCall call) {
        bluetoothService.disconnect();
        call.resolve();
    }
    
    @PluginMethod
    public void sendCommand(PluginCall call) {
        String command = call.getString("command");
        if (command == null) {
            call.reject("Comando obrigatório");
            return;
        }
        bluetoothService.sendCommand(command);
        call.resolve();
    }
    
    @Override
    public void onDeviceFound(BluetoothDevice device) {
        JSObject data = new JSObject();
        data.put("name", device.getName());
        data.put("address", device.getAddress());
        
        // Filter for Madinboo_BT
        if (device.getName() != null && device.getName().contains("Madinboo")) {
            notifyListeners("deviceFound", data);
        }
    }
    
    @Override
    public void onConnected(String deviceName, String deviceAddress) {
        JSObject data = new JSObject();
        data.put("name", deviceName);
        data.put("address", deviceAddress);
        notifyListeners("connected", data);
    }
    
    @Override
    public void onDisconnected() {
        notifyListeners("disconnected", new JSObject());
    }
    
    @Override
    public void onDataReceived(String data) {
        JSObject obj = new JSObject();
        obj.put("data", data);
        notifyListeners("dataReceived", obj);
    }
    
    @Override
    public void onError(String message) {
        JSObject obj = new JSObject();
        obj.put("message", message);
        notifyListeners("error", obj);
    }
    
    @Override
    public void onScanningState(boolean scanning) {
        JSObject obj = new JSObject();
        obj.put("scanning", scanning);
        notifyListeners("scanningState", obj);
    }

    @ActivityCallback
    private void handleStartDiscoveryEnableResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            bluetoothService.startDiscovery();
            call.resolve();
        } else {
            call.reject("Bluetooth não ativado");
        }
    }

    @ActivityCallback
    private void handleEnableBluetoothResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            call.resolve();
        } else {
            call.reject("Bluetooth não ativado");
        }
    }
    
    @Override
    protected void handleOnDestroy() {
        if (bluetoothService != null) {
            bluetoothService.cleanup();
        }
        super.handleOnDestroy();
    }
}
