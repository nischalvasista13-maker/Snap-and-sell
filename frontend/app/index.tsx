import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
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
});