import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [upiId, setUpiId] = useState('');
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAuthAndSetup();

    // Setup app state listener for auto-logout
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: any) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground, check for inactivity
      await checkInactivityTimeout();
    }
    appState.current = nextAppState;
  };

  const checkInactivityTimeout = async () => {
    try {
      const lastActiveTime = await AsyncStorage.getItem('lastActiveTime');
      const authToken = await AsyncStorage.getItem('authToken');

      if (lastActiveTime && authToken) {
        const timeSinceLastActive = Date.now() - parseInt(lastActiveTime);
        
        if (timeSinceLastActive > INACTIVITY_TIMEOUT) {
          // Auto logout - clear auth data
          await AsyncStorage.multiRemove(['authToken', 'lastActiveTime', 'setupCompleted']);
          Alert.alert('Session Expired', 'You have been logged out due to inactivity.', [
            { text: 'OK', onPress: () => router.replace('/signin') }
          ]);
        } else {
          // Update last active time
          await AsyncStorage.setItem('lastActiveTime', Date.now().toString());
        }
      }
    } catch (error) {
      console.error('Error checking inactivity:', error);
    }
  };

  const checkAuthAndSetup = async () => {
    try {
      // Check if user is authenticated
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!authToken) {
        // Not authenticated, go to signin
        router.replace('/signin');
        return;
      }

      // Update last active time
      await AsyncStorage.setItem('lastActiveTime', Date.now().toString());

      // Check if setup is completed
      const response = await axios.get(`${BACKEND_URL}/api/settings`);
      if (response.data.setupCompleted) {
        await AsyncStorage.setItem('setupCompleted', 'true');
        router.replace('/home');
      } else {
        setSetupMode(true);
      }
    } catch (error) {
      console.error('Error checking setup:', error);
      setSetupMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!shopName.trim() || !ownerName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/settings/setup`, {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        upiId: upiId.trim(),
        setupCompleted: true
      });
      await AsyncStorage.setItem('setupCompleted', 'true');
      router.replace('/home');
    } catch (error) {
      console.error('Error saving setup:', error);
      Alert.alert('Error', 'Failed to save setup. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (setupMode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.setupContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="storefront" size={80} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Welcome to POS</Text>
          <Text style={styles.subtitle}>Let's set up your shop</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Shop Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter shop name"
              value={shopName}
              onChangeText={setShopName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Owner Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter owner name"
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>UPI ID (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="yourname@upi"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.helpText}>For UPI payments (can be added later)</Text>
          </View>

          <TouchableOpacity 
            style={styles.setupButton}
            onPress={handleSetup}
            activeOpacity={0.8}
          >
            <Text style={styles.setupButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupContainer: {
    width: '100%',
    padding: 24,
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  setupButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  setupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});