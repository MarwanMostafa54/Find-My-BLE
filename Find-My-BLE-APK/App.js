import React from "react";
import { StyleSheet, Text, View } from "react-native";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import BluetoothScanner from "./src/BluetoothScanner";

export default function App() {
  return (
    <View style={styles.container}>
      <BluetoothScanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 40,
  },
});
const firebaseConfig = {
  apiKey: "AIzaSyAxemqwyHUVCPNvg3leRWjsvMOcXevjUZ4",
  authDomain: "find-my-db.firebaseapp.com",
  projectId: "find-my-db",
  storageBucket: "find-my-db.firebasestorage.app",
  messagingSenderId: "598807230644",
  appId: "1:598807230644:web:aeb68e78017956ad81bfe1",
  measurementId: "G-BWN36CX1T0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Initialize Firestore and export it
