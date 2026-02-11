import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SignIn() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      // Clear any previous session data before storing new session
      await AsyncStorage.multiRemove([
        'authToken', 
        'lastActiveTime', 
        'setupCompleted', 
        'cart',
        'userId',
        'businessId',
        'username'
      ]);

      const response = await axios.post(`${BACKEND_URL}/api/auth/signin`, {
        username: username.trim(),
        password: password
      });

      // Store auth token and user data
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('userId', response.data.userId);
      await AsyncStorage.setItem('businessId', response.data.businessId);
      await AsyncStorage.setItem('username', response.data.username);
      await AsyncStorage.setItem('lastActiveTime', Date.now().toString());

      // Navigate to main app
      router.replace('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Error', 'Invalid username or password');
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="storefront" size={80} color="#007AFF" />
            <Text style={styles.title}>SaleMate</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
              
              {/* Legal Links */}
              <View style={styles.legalContainer}>
                <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}>
                  <Text style={styles.legalText}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.legalDivider}>|</Text>
                <TouchableOpacity onPress={() => router.push('/data-deletion' as any)}>
                  <Text style={styles.legalText}>Data Deletion</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 16,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 16,
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  legalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalText: {
    fontSize: 12,
    color: '#999',
  },
  legalDivider: {
    fontSize: 12,
    color: '#CCC',
  },
});
