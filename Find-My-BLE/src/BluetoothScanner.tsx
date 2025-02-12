import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { View, Text, StyleSheet, Button, Alert } from 'react-native'; // Import Alert for showing messages
import { db } from '../App';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BluetoothScanner = () => {
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null); // State to track permission status

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync(); // Request foreground location permission
      setLocationPermissionGranted(status === 'granted'); // Update permission status in state
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'To send location data, please grant location permissions in settings.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []); // Run this effect only once on component mount

  const sendDataToDatabase = async (deviceId: string, state: 'active' | 'not_active') => {
    if (locationPermissionGranted !== true) { // Check if permission is granted
      console.error('Location permission not granted. Cannot get location.');
      Alert.alert(
        'Location Denied',
        'Location permission is needed to send location data.',
        [{ text: 'OK' }]
      );
      return; // Exit function if permission is not granted
    }

    try {
      const location = await Location.getCurrentPositionAsync({}); // Now it's safe to get location (hopefully!)
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

      console.log('Data successfully sent to Firestore!');
    } catch (error) {
      console.error('Error sending data to Firestore:', error);
      Alert.alert('Firestore Error', 'Failed to send data to Firestore. Please check console for details.'); // Show alert for Firestore errors
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Scanner</Text>

      <Button
        title="Test Send Data (Active)"
        onPress={() => sendDataToDatabase('TEST_DEVICE_ID_123', 'active')}
      />
      <Button
        title="Test Send Data (Not Active)"
        onPress={() => sendDataToDatabase('TEST_DEVICE_ID_123', 'not_active')}
      />
       {locationPermissionGranted === false && ( // Conditionally render message if permission is denied
        <Text style={styles.permissionWarning}>Location permission denied. Please enable in settings.</Text>
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
  permissionWarning: { // Style for permission warning text
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default BluetoothScanner;