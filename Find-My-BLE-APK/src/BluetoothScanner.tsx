import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, PermissionsAndroid, Platform, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { BleManager, Device } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BluetoothScanner = () => {
    const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const bleManager = new BleManager();
    const [itagData, setItagData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [knownDeviceIds, setKnownDeviceIds] = useState<string[]>([]);
    const scanIntervalId = useRef<NodeJS.Timeout | null>(null);

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
            const savedDeviceId = await AsyncStorage.getItem('connectedDeviceId');
            if (savedDeviceId) {
                reconnectToDevice(savedDeviceId);
            }

            return () => {
                bleManager.destroy();
                if (scanIntervalId.current) {
                    clearInterval(scanIntervalId.current);
                }
            };
        })();
    }, []);


    
    const reconnectToDevice = async (deviceId: string) => {
        try {
            const device = await bleManager.connectToDevice(deviceId);
            setConnectedDevice(device);
            await device.discoverAllServicesAndCharacteristics();
            console.log("Reconnected to device:", device.id);
            sendDataToDatabase(device.id, 'active');

            const disconnectionSubscription = device.onDisconnected((error, disconnectedDevice) => {
                console.log("Device disconnected:", disconnectedDevice.id, "Error:", error);
                sendDataToDatabase(disconnectedDevice.id, 'not_active');
                setConnectedDevice(null);
                AsyncStorage.removeItem('connectedDeviceId');
                disconnectionSubscription.remove();
            });
        } catch (error) {
            console.error("Reconnection failed:", error);
            Alert.alert("Reconnection Failed", "Could not reconnect to the saved device.");
            AsyncStorage.removeItem('connectedDeviceId');
        }
    };

    const scanForBleDevices = async () => {
        setIsScanning(true);
        setDevices([]);
        const scannedDeviceIds: string[] = [];

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
            null,
            null,
            (error, device) => {
                if (error) {
                    setIsScanning(false);
                    console.error('Error during device scan:', error);
                    Alert.alert('Scan Error', 'Error occurred during Bluetooth device scan.');
                    return;
                }

                if (device) {
                    scannedDeviceIds.push(device.id);
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

        setTimeout(async () => {
            bleManager.stopDeviceScan();
            setIsScanning(false);

            // Send scanned device IDs to the backend
            try {
                const apiUrl = 'http://localhost:5000/api/itag_data/connect';
                const response = await axios.post(apiUrl, {
                    scannedDeviceIds: scannedDeviceIds,
                });

                if (response.status === 200) {
                    const deviceIdToConnect = response.data.deviceId;
                    if (deviceIdToConnect) {
                        console.log(`Backend says: connect to device: ${deviceIdToConnect}`);
                        const deviceToConnect = devices.find(device => device.id === deviceIdToConnect);
                        if (deviceToConnect) {
                            connectToDevice(deviceToConnect);
                        }
                    } else {
                        console.log("Backend says: no device to connect to.");
                    }
                } else {
                    console.error("Error communicating with backend:", response.status, response.data);
                    Alert.alert('Backend Error', 'Failed to communicate with backend.');
                }
            } catch (error) {
                console.error("Error sending scanned device IDs:", error);
                Alert.alert('Network Error', 'Failed to send scanned device IDs. Check console.');
            }
        }, 10000);
    };

    const connectToDevice = async (device: Device) => {
        try {
            const connectedDevice = await bleManager.connectToDevice(device.id);
            setConnectedDevice(connectedDevice);
            await connectedDevice.discoverAllServicesAndCharacteristics();
            console.log("Connected to device:", device.name, device.id);
            await AsyncStorage.setItem('connectedDeviceId', device.id);
            sendDataToDatabase(device.id, 'active');

            const disconnectionSubscription = connectedDevice.onDisconnected((error, disconnectedDevice) => {
                console.log("Device disconnected:", disconnectedDevice.id);
                sendDataToDatabase(disconnectedDevice.id, 'not_active');
                setConnectedDevice(null);
                AsyncStorage.removeItem('connectedDeviceId');
                disconnectionSubscription.remove();
            });
        } catch (error) {
            console.error("Connection failed:", error);
            Alert.alert("Connection Failed", "Could not connect to the selected device.");
            AsyncStorage.removeItem('connectedDeviceId'); // Clear saved ID on failure
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
            const apiUrl = 'http://localhost:5000/api/itag_data';
            const requestData = {
                deviceId: deviceId,
                latitude: latitude,
                longitude: longitude,
                state: state,
            };
            const response = await axios.post(apiUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 200 || response.status === 201) {
                console.log('Data successfully sent to MongoDB!');
            } else {
                console.error('Error sending data to MongoDB:', response.status, response.data);
                Alert.alert('MongoDB Error', `Failed to send data. Status: ${response.status}`);
            }

        } catch (error) {
            console.error('Error sending data to MongoDB:', error);
            Alert.alert('MongoDB Error', 'Failed to send data. Please check console for details.');
        }
    };

    const renderDeviceItem = ({ item }: { item: Device }) => (
        <View style={styles.deviceItem}>
            <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
            <Text style={styles.deviceId}>{item.id}</Text>
            <TouchableOpacity
                style={[
                    styles.button,
                    connectedDevice ? styles.buttonDisabled : {} // Apply disabled style if connected
                ]}
                onPress={() => connectToDevice(item)}
                disabled={connectedDevice !== null}
            >
                <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
        </View>
    );


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bluetooth Scanner</Text>

            {/* Scan for Devices Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={scanForBleDevices}
                disabled={isScanning || !!connectedDevice}
            >
                <Text style={styles.buttonText}>{isScanning ? "Scanning..." : "Scan for Devices"}</Text>
            </TouchableOpacity>

            {/* Display Discovered Devices */}
            <FlatList
                data={devices}
                keyExtractor={item => item.id}
                renderItem={renderDeviceItem}
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
           {itagData && ( // Conditionally render if data is available
               <View>
                   <Text style={styles.deviceName}>Last Known State: {itagData.state}</Text>
                   <Text style={styles.deviceName}>Last Known Latitude: {itagData.latitude}</Text>
                   <Text>Last Known Longitude: {itagData.longitude}</Text>
                   <Text>Last Updated: {new Date(itagData.timestamp).toLocaleString()}</Text>
               </View>
           )}
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000', // Black text
    marginBottom: 20,
    textAlign: 'center',
  },
  deviceItem: {
    padding: 15,
    backgroundColor: '#EEEEEE', // Light gray background for items
    marginBottom: 10,
    borderRadius: 8, // Rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3, // for Android shadow
  },
  deviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000', // Black text
  },
  deviceId: {
    fontSize: 14,
    color: '#666666', // Darker gray
  },
  noDevices: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#888888', // Medium gray
    fontSize: 16,
  },
  permissionWarning: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  connectedDeviceText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#000000', // Black text
    fontSize: 18,
  },
  button: { // Default button style
    backgroundColor: '#000000', // Black background
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25, // More rounded corners
    marginTop: 15,
  },
  buttonText: { // Default button text style
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
    buttonDisabled: { // NEW: Style for disabled button
        opacity: 0.5, // Reduce opacity to fade
    },
});

export default BluetoothScanner;