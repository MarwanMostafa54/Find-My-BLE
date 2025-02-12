import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, PermissionsAndroid, Platform } from 'react-native';
import { db } from '../App'; // Import the 'db' instance from App.js
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BleManager, Device } from 'react-native-ble-plx'; // Import BleManager and Device
import AsyncStorage from '@react-native-async-storage/async-storage';

const BluetoothScanner = () => {
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<Device[]>([]); // Use Device type
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null); // Track connected device
  const bleManager = new BleManager(); // Initialize BleManager

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'To send location data, please grant location permissions in settings.',
          [{ text: 'OK' }]
        );
      }

      // Attempt to reconnect on app startup
      const savedDeviceId = await AsyncStorage.getItem('connectedDeviceId');
      if (savedDeviceId) {
        // We had a previously connected device. Try to reconnect.
        reconnectToDevice(savedDeviceId);
      }

        // Clean up BleManager resources when the component unmounts
        return () => {
            bleManager.destroy();
        }
    })();
  }, []);


    const reconnectToDevice = async (deviceId: string) => {
        try {
            const device = await bleManager.connectToDevice(deviceId);
            setConnectedDevice(device);
            await device.discoverAllServicesAndCharacteristics();
            console.log("Reconnected to device:", device.id);
            sendDataToDatabase(device.id, 'active');

              // Set up disconnection listener
            device.onDisconnected((error, disconnectedDevice) => {
                console.log("Device disconnected:", disconnectedDevice.id);
                sendDataToDatabase(disconnectedDevice.id, 'not_active');
                setConnectedDevice(null);
                AsyncStorage.removeItem('connectedDeviceId'); // Clear saved ID on disconnect
            });

        } catch (error) {
            console.error("Reconnection failed:", error);
            Alert.alert("Reconnection Failed", "Could not reconnect to the saved device.");
            AsyncStorage.removeItem('connectedDeviceId'); // Clear saved ID if reconnection fails
        }
    };

  const scanForBleDevices = async () => {
    setIsScanning(true);
    setDevices([]); // Clear previous devices list when starting a new scan

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      if (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        setIsScanning(false);
        Alert.alert('Required permissions not granted for Bluetooth scanning');
        return;
      }
    }

    bleManager.startDeviceScan(
      null, // services array - null to scan for all devices
      null, // options - null for default options
      (error, device) => {
        if (error) {
          setIsScanning(false);
          console.error('Error during device scan:', error);
          Alert.alert('Scan Error', 'Error occurred during Bluetooth device scan.');
          return;
        }

        if (device) {
          setDevices(prevDevices => {
            const alreadyExists = prevDevices.some(d => d.id === device.id);
            if (alreadyExists) {
              return prevDevices;
            } else {
              return [...prevDevices, device];
            }
          });
        }
      }
    );

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000); // Scan for 10 seconds
  };

    const connectToDevice = async (device: Device) => {
        try {
            const connectedDevice = await bleManager.connectToDevice(device.id);
            setConnectedDevice(connectedDevice);
            await connectedDevice.discoverAllServicesAndCharacteristics();
            console.log("Connected to device:", device.name, device.id);
            await AsyncStorage.setItem('connectedDeviceId', device.id); // Save device ID
            sendDataToDatabase(device.id, 'active');

            // Set up disconnection listener
            connectedDevice.onDisconnected((error, disconnectedDevice) => {
                console.log("Device disconnected:", disconnectedDevice.id);
                sendDataToDatabase(disconnectedDevice.id, 'not_active');
                setConnectedDevice(null);
                AsyncStorage.removeItem('connectedDeviceId'); //Clear saved ID on disconnect.

            });

        } catch (error) {
            console.error("Connection failed:", error);
            Alert.alert("Connection Failed", "Could not connect to the selected device.");
        }
    };

  const sendDataToDatabase = async (deviceId: string, state: 'active' | 'not_active') => {
    if (locationPermissionGranted !== true) {
      console.error('Location permission not granted. Cannot get location.');
      Alert.alert(
        'Location Denied',
        'Location permission is needed to send location data.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      if (!db) {
        console.error("Firestore 'db' is not initialized. Check App.js Firebase setup.");
        return;
      }

      const itagDataCollection = collection(db, 'itag_data');
      await addDoc(itagDataCollection, {
        deviceId: deviceId,
        latitude: latitude,
        longitude: longitude,
        state: state,
        timestamp: serverTimestamp(),
      });

      console.log(`Data successfully sent to Firestore! State: ${state}`);
    } catch (error) {
      console.error('Error sending data to Firestore:', error);
      Alert.alert('Firestore Error', 'Failed to send data to Firestore. Please check console for details.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Scanner</Text>

      {/* Scan for Devices Button */}
      <Button
        title={isScanning ? "Scanning..." : "Scan for Devices"}
        onPress={scanForBleDevices}
        disabled={isScanning}
      />

      {/* Display Discovered Devices */}
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
            <Text style={styles.deviceId}>{item.id}</Text>
            <Button
                title="Connect"
                onPress={() => connectToDevice(item)} // Connect button
                disabled={connectedDevice !== null} // Disable if already connected
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.noDevices}>No Bluetooth devices found.</Text>
        )}
      />

      {locationPermissionGranted === false && (
        <Text style={styles.permissionWarning}>Location permission denied. Please enable in settings.</Text>
      )}
        {connectedDevice && (
            <Text style={styles.connectedDeviceText}>
                Connected to: {connectedDevice.name || 'Unknown Device'} ({connectedDevice.id})
            </Text>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 12,
    color: 'gray',
  },
  noDevices: {
    textAlign: 'center',
    paddingVertical: 20,
    color: 'gray',
  },
  permissionWarning: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
    connectedDeviceText: {
        marginTop: 10,
        textAlign: 'center',
        color: 'green',
    },
});

export default BluetoothScanner;